# boulga/backend/app/manager/llm_manager.py
import base64
import json
import logging
import re as _re
from typing import AsyncIterator, Optional

import litellm

from app.config import settings
from app.core.exceptions import BoulgaError
from app.manager.registry import is_provider_active, resolve_model

logger = logging.getLogger(__name__)

_OPENROUTER_MODELS: dict[str, str] = {
    "gemini-2.5-flash":  "google/gemini-2.5-flash",
    "gemini-2.5-pro":    "google/gemini-2.5-pro",
    "claude-haiku-4-5":  "anthropic/claude-haiku-4.5",
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
    "claude-opus-4-6":   "anthropic/claude-opus-4.6",
    "gpt-5.5-instant":   "openai/gpt-5.5",
    "gpt-5.5-pro":       "openai/gpt-5.5-pro",
    "deepseek-v4-flash": "deepseek/deepseek-v4-flash",
    "deepseek-v4-pro":   "deepseek/deepseek-v4-pro",
}

_OR_HEADERS: dict[str, str] = {
    "HTTP-Referer": "https://boulga.ai",
    "X-Title": "Boulga",
}

_OR_TEMPERATURE: dict[str, float] = {
    "low": 0.2, "medium": 0.5, "high": 0.8, "max": 1.0,
}

_MAX_OUTPUT_TOKENS: dict[str, int] = {
    "gemini-2.5-flash":  16384,
    "gemini-2.5-pro":    16384,
    "claude-haiku-4-5":  8192,
    "claude-sonnet-4-6": 16384,
    "claude-opus-4-6":   16384,
    "gpt-5.5-instant":   8192,
    "gpt-5.5-pro":       16384,
    "deepseek-v4-flash": 16384,
    "deepseek-v4-pro":   16384,
}


def _max_tokens(model_id: str) -> int:
    return _MAX_OUTPUT_TOKENS.get(model_id, 16384)

_AFFORD_RE = _re.compile(r"can only afford (\d+)")


async def _completion_with_fallback(kwargs: dict):
    try:
        return await litellm.acompletion(**kwargs)
    except litellm.ContextWindowExceededError:
        max_tokens = kwargs.get("max_tokens")
        if isinstance(max_tokens, int) and max_tokens > 8192:
            fallback_tokens = max(max_tokens // 2, 8192)
            logger.warning(
                "Context window exceeded model=%s; retrying with max_tokens=%s (was %s)",
                kwargs.get("model"),
                fallback_tokens,
                max_tokens,
            )
            kwargs["max_tokens"] = fallback_tokens
            return await litellm.acompletion(**kwargs)
        raise
    except Exception as exc:
        err = str(exc)
        if "402" in err:
            match = _AFFORD_RE.search(err)
            if match:
                affordable = int(match.group(1))
                requested = kwargs.get("max_tokens", 0)
                if 100 < affordable < requested:
                    logger.warning(
                        "Credits insufficient model=%s; retrying with max_tokens=%s (requested %s)",
                        kwargs.get("model"),
                        affordable,
                        requested,
                    )
                    kwargs["max_tokens"] = affordable
                    return await litellm.acompletion(**kwargs)
        raise


def _or_model(model_id: str) -> str:
    name = _OPENROUTER_MODELS.get(model_id, model_id)
    return f"openrouter/{name}"


def _tools_with_cache(tools: list[dict]) -> list[dict]:
    """Pose un breakpoint cache_control sur la dernière définition d'outil.

    Le schéma d'outil (GENERATE_DOCUMENT_TOOL) est stable entre les tours ; le
    marquer permet aux providers qui le supportent de mettre en cache la partie
    `tools` du préfixe. Copie défensive pour ne pas muter la constante partagée.
    """
    if not tools:
        return tools
    cached = [dict(t) for t in tools]
    cached[-1] = {**cached[-1], "cache_control": {"type": "ephemeral"}}
    return cached


GENERATE_DOCUMENT_TOOL: dict = {
    "type": "function",
    "function": {
        "name": "generate_document",
        "description": (
            "Génère un fichier Word (DOCX) ou PDF structuré et mis en page. "
            "Utilise cet outil quand l'utilisateur demande de créer, "
            "générer ou exporter un document."
        ),
        "parameters": {
            "type": "object",
            "required": ["format", "filename", "template", "blocks"],
            "additionalProperties": False,
            "properties": {
                "format": {
                    "type": "string",
                    "enum": ["docx", "pdf", "xlsx"],
                    "description": (
                        "Format de sortie : "
                        "docx (Word — le plus courant, mise en page riche) ; "
                        "pdf (PDF — lecture, partage, impression) ; "
                        "xlsx (Excel — données tabulaires, tableaux de bord, reporting chiffré)."
                    ),
                },
                "filename": {
                    "type": "string",
                    "description": "Nom du fichier sans extension (ex: rapport-marketing-q3).",
                },
                "template": {
                    "type": "string",
                    "enum": ["commercial", "rapport", "contrat", "rh", "minimal"],
                    "description": (
                        "Template de mise en page : "
                        "commercial (proposition, offre, devis, présentation client) ; "
                        "rapport (analyse, audit, bilan, reporting chiffré) ; "
                        "contrat (accord, convention, CGV, lettre formelle) ; "
                        "rh (fiche de poste, contrat de travail, note interne) ; "
                        "minimal (note simple, document court sans page de garde)."
                    ),
                },
                "primary_color": {
                    "type": "string",
                    "description": (
                        "Couleur principale hex optionnelle (ex: #1565C0). "
                        "Remplace la couleur primaire du template si fournie. "
                        "À utiliser si l'utilisateur mentionne ses couleurs de marque."
                    ),
                },
                "company_name": {
                    "type": "string",
                    "description": (
                        "Nom de l'entreprise ou de l'organisation, "
                        "affiché dans l'en-tête courant. Optionnel."
                    ),
                },
                "blocks": {
                    "type": "array",
                    "description": "Liste ordonnée de blocs de contenu du document.",
                    "items": {
                        "type": "object",
                        "required": ["type"],
                        "additionalProperties": False,
                        "properties": {
                            "type": {
                                "type": "string",
                                "enum": [
                                    "cover_page",
                                    "header_block",
                                    "heading",
                                    "paragraph",
                                    "bullet_list",
                                    "numbered_list",
                                    "table",
                                    "colored_section",
                                    "callout",
                                    "page_break",
                                    "divider",
                                ],
                                "description": (
                                    "cover_page: page de garde complète (toujours en PREMIER bloc) — "
                                    "title, subtitle, author, institution, date, reference, doc_type. "
                                    "header_block: titre compact sans page de garde (pour notes courtes). "
                                    "heading: titre de section (level 1-3). "
                                    "paragraph: texte courant. "
                                    "bullet_list: liste à puces (style: dot|star|square|check|arrow). "
                                    "numbered_list: liste numérotée. "
                                    "table: tableau avec en-têtes et lignes. "
                                    "colored_section: bloc avec fond coloré (titre + texte). "
                                    "callout: encadré sémantique (callout_type + label + text). "
                                    "page_break: saut de page. "
                                    "divider: ligne de séparation."
                                ),
                            },
                            "text":        {"type": "string"},
                            "level":       {"type": "integer", "minimum": 1, "maximum": 3},
                            "title":       {"type": "string"},
                            "subtitle":    {"type": "string"},
                            "reference":   {"type": "string"},
                            "date":        {"type": "string"},
                            "label":       {"type": "string"},
                            "author":      {"type": "string", "description": "Auteur (pour cover_page)."},
                            "institution": {"type": "string", "description": "Entreprise ou institution (pour cover_page)."},
                            "doc_type":    {"type": "string", "description": "Catégorie du document (pour cover_page), ex: RAPPORT D'ACTIVITE, PROPOSITION COMMERCIALE."},
                            "style": {
                                "type": "string",
                                "enum": ["dot", "star", "square", "check", "arrow"],
                                "description": "Style de puce pour bullet_list.",
                            },
                            "callout_type": {
                                "type": "string",
                                "enum": ["info", "tip", "warning", "danger", "success", "note"],
                                "description": (
                                    "Type sémantique pour callout : "
                                    "info (bleu — information neutre, contexte, définition) ; "
                                    "tip (vert — conseil pratique, bonne pratique, astuce) ; "
                                    "warning (orange — mise en garde, précaution) ; "
                                    "danger (rouge — erreur critique, risque, blocage) ; "
                                    "success (vert clair — résultat positif, validation) ; "
                                    "note (gris — annotation, remarque secondaire)."
                                ),
                            },
                            "items": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "headers": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "rows": {
                                "type": "array",
                                "items": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                            },
                        },
                    },
                },
            },
        },
    },
}


class LLMManager:

    def _check_provider_model(self, provider: str, model_id: str) -> None:
        if not is_provider_active(provider):
            raise BoulgaError(
                f"Le provider '{provider}' n'est pas encore disponible.",
                status_code=400,
                code="PROVIDER_INACTIVE",
            )
        try:
            resolve_model(provider, model_id)
        except ValueError as exc:
            raise BoulgaError(str(exc), status_code=400, code="MODEL_NOT_FOUND")

    def _build_messages(
        self,
        messages: list[dict],
        system_prompt: str,
        files: Optional[list[dict]] = None,
    ) -> list[dict]:
        result: list[dict] = []

        if system_prompt:
            # cache_control "ephemeral" sur le bloc de contenu system : les providers
            # qui le supportent (Anthropic, Gemini via OpenRouter) mettent en cache ce
            # préfixe stable ; les autres ignorent simplement le champ.
            result.append({
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": system_prompt,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
            })

        for msg in messages:
            role = msg.get("role", "user")
            if role == "model":
                role = "assistant"
            result.append({"role": role, "content": msg.get("content", "")})

        if files:
            image_files = [f for f in files if f.get("mime_type", "").startswith("image/")]
            if image_files:
                for i in range(len(result) - 1, -1, -1):
                    if result[i]["role"] == "user":
                        parts: list[dict] = []
                        text = result[i].get("content", "")
                        if text:
                            parts.append({"type": "text", "text": text})
                        for f in image_files:
                            b64 = base64.b64encode(f["data"]).decode()
                            mime = f["mime_type"]
                            parts.append({
                                "type": "image_url",
                                "image_url": {"url": f"data:{mime};base64,{b64}"},
                            })
                        result[i] = {"role": "user", "content": parts}
                        break

        return result

    # ── Streaming texte pur ───────────────────────────────────────────────

    async def stream_chat(
        self,
        provider: str,
        model_id: str,
        messages: list[dict],
        system_prompt: str = "",
        files: Optional[list[dict]] = None,
        effort: str = "medium",
        enable_search: bool = False,
    ) -> AsyncIterator[dict]:
        self._check_provider_model(provider, model_id)

        litellm_messages = self._build_messages(messages, system_prompt, files)

        max_tokens = _max_tokens(model_id)
        logger.debug("LLM stream_chat model=%s provider=%s max_tokens=%d", model_id, provider, max_tokens)
        kwargs = {
            "model": _or_model(model_id),
            "messages": litellm_messages,
            "stream": True,
            "temperature": _OR_TEMPERATURE.get(effort, 0.5),
            "max_tokens": max_tokens,
            "api_key": settings.OPENROUTER_API_KEY,
            "extra_headers": _OR_HEADERS,
            "timeout": 600,
        }
        response = await _completion_with_fallback(kwargs)

        async for chunk in response:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield {"type": "text", "text": delta.content}

    # ── Streaming texte + tools ────────────────────────────────────────────

    async def stream_chat_with_tools(
        self,
        provider: str,
        model_id: str,
        messages: list[dict],
        system_prompt: str = "",
        files: Optional[list[dict]] = None,
        effort: str = "medium",
        tools: Optional[list[dict]] = None,
    ) -> AsyncIterator[dict]:
        self._check_provider_model(provider, model_id)

        litellm_messages = self._build_messages(messages, system_prompt, files)

        max_tokens = _max_tokens(model_id)
        logger.debug("LLM stream_chat_with_tools model=%s provider=%s", model_id, provider)
        kwargs: dict = {
            "model": _or_model(model_id),
            "messages": litellm_messages,
            "stream": True,
            "temperature": _OR_TEMPERATURE.get(effort, 0.5),
            "max_tokens": max_tokens,
            "api_key": settings.OPENROUTER_API_KEY,
            "extra_headers": _OR_HEADERS,
            "timeout": 600,
        }
        if tools:
            kwargs["tools"] = _tools_with_cache(tools)
            kwargs["tool_choice"] = "auto"

        response = await _completion_with_fallback(kwargs)

        tool_call_name = ""
        tool_call_args = ""
        finish_reason: str | None = None

        async for chunk in response:
            choice = chunk.choices[0]
            delta = choice.delta

            if delta and delta.content:
                yield {"type": "text", "text": delta.content}

            if delta and delta.tool_calls:
                for tc in delta.tool_calls:
                    if tc.function and tc.function.name:
                        tool_call_name = tc.function.name
                    if tc.function and tc.function.arguments:
                        tool_call_args += tc.function.arguments

            if choice.finish_reason:
                finish_reason = choice.finish_reason

        logger.info(
            "stream_chat_with_tools finished: finish_reason=%s tool_name=%s args_len=%d",
            finish_reason, tool_call_name or "(none)", len(tool_call_args),
        )

        if finish_reason == "length":
            yield {
                "type": "text",
                "text": "\n\n⚠️ La réponse a été tronquée. Essaie avec une demande plus courte.",
            }

        if tool_call_name and tool_call_args:
            try:
                parsed = json.loads(tool_call_args)
                yield {"type": "tool_call", "name": tool_call_name, "arguments": parsed}
            except json.JSONDecodeError:
                logger.warning(
                    "Tool call JSON tronqué pour %s (len=%d, finish_reason=%s)",
                    tool_call_name, len(tool_call_args), finish_reason,
                )
                yield {
                    "type": "text",
                    "text": "\n\n⚠️ La génération du document a échoué (réponse tronquée). Réessaie en simplifiant ta demande.",
                }

    # ── Non-streaming texte ──────────────────────────────────────────────

    async def generate_text(
        self,
        provider: str,
        model_id: str,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 512,
        log_finish_reason: bool = False,
    ) -> str:
        self._check_provider_model(provider, model_id)

        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": _or_model(model_id),
            "messages": messages,
            "max_tokens": max_tokens,
            "api_key": settings.OPENROUTER_API_KEY,
            "extra_headers": _OR_HEADERS,
            "timeout": 60,
        }
        response = await _completion_with_fallback(kwargs)

        finish_reason = getattr(response.choices[0], "finish_reason", None)
        if log_finish_reason and finish_reason:
            logger.info(
                "LLM generate_text finish_reason=%s model=%s provider=%s max_tokens=%s",
                finish_reason,
                model_id,
                provider,
                max_tokens,
            )

        return response.choices[0].message.content or ""


llm_manager = LLMManager()
