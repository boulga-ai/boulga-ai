import base64
import json
import logging
from typing import AsyncIterator, Optional

import litellm

from app.config import settings
from app.core.exceptions import BoulgaError
from app.manager.registry import is_provider_active, resolve_model

logger = logging.getLogger(__name__)

# Mapping Boulga model_id → identifiant OpenRouter
_OPENROUTER_MODELS: dict[str, str] = {
    # Gemini (Google)
    "gemini-2.5-flash":  "google/gemini-2.5-flash",
    "gemini-2.5-pro":    "google/gemini-2.5-pro",
    # Claude (Anthropic) — OpenRouter utilise des points dans le numéro de version
    "claude-haiku-4-5":  "anthropic/claude-haiku-4.5",
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
    "claude-opus-4-6":   "anthropic/claude-opus-4.6",
    # ChatGPT (OpenAI)
    "gpt-5.5-instant":   "openai/gpt-4o-mini",
    "gpt-5.5-pro":       "openai/gpt-4o",
    # DeepSeek
    "deepseek-v4-flash": "deepseek/deepseek-chat",
    "deepseek-v4-pro":   "deepseek/deepseek-r1",
}

# En-têtes requis par OpenRouter
_OR_HEADERS: dict[str, str] = {
    "HTTP-Referer": "https://boulga.ai",
    "X-Title": "Boulga",
}

# Mapping effort → température
_OR_TEMPERATURE: dict[str, float] = {
    "low": 0.2, "medium": 0.5, "high": 0.8, "max": 1.0,
}

# Max tokens par modèle pour les sorties longues
_MAX_OUTPUT_TOKENS: dict[str, int] = {
    "gemini-2.5-flash":  16384,
    "gemini-2.5-pro":    16384,
    "claude-haiku-4-5":  8192,
    "claude-sonnet-4-6": 16384,
    "claude-opus-4-6":   16384,
    "gpt-5.5-instant":   16384,
    "gpt-5.5-pro":       16384,
    "deepseek-v4-flash": 16384,
    "deepseek-v4-pro":   16384,
}


def _max_tokens(model_id: str) -> int:
    return _MAX_OUTPUT_TOKENS.get(model_id, 8192)

async def _completion_with_fallback(kwargs: dict):
    try:
        return await litellm.acompletion(**kwargs)
    except litellm.ContextWindowExceededError as exc:
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

# ── Tool create_file (schéma universel OpenRouter) ───────────────────────────
#
# Règles de compatibilité maximale (Gemini, Claude, GPT, DeepSeek) :
#   - Toutes les propriétés dans required
#   - additionalProperties: false sur les objets
#
# Phase 1 : le LLM signale l'intention et le format (sans code).
# Phase 2 : _handle_file_creation charge le SKILL.md et génère le code via un second appel LLM.
# Phase 3 : CodeExecutor exécute le code généré.
#
CREATE_FILE_TOOL: dict = {
    "type": "function",
    "function": {
        "name": "create_file",
        "description": (
            "Génère un fichier téléchargeable quand l'utilisateur demande un document "
            "(Word, Excel, PDF, PowerPoint, CSV, texte). "
            "Appelle cet outil avec le format, le nom de fichier et un résumé du contenu attendu. "
            "Le backend se charge de générer le fichier — tu n'as pas besoin d'écrire de code."
        ),
        "parameters": {
            "type": "object",
            "additionalProperties": False,
            "required": ["filename", "format", "summary"],
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "Nom du fichier avec extension (ex: rapport_ventes.xlsx)",
                },
                "format": {
                    "type": "string",
                    "enum": ["docx", "xlsx", "pdf", "pptx", "csv", "txt"],
                    "description": "Format du fichier",
                },
                "summary": {
                    "type": "string",
                    "description": (
                        "Description précise du contenu attendu (2-5 phrases). "
                        "Inclure : structure, données à mettre, style souhaité, langue. "
                        "Ex: 'Rapport de ventes mensuel avec tableau des 5 meilleurs produits, "
                        "graphique en barres, style professionnel bleu marine.'"
                    ),
                },
            },
        },
    },
}

CREATE_DOCUMENT_TOOL: dict = {
    "type": "function",
    "function": {
        "name": "create_document",
        "description": (
            "Produit un document téléchargeable (Word ou PDF) quand l'utilisateur en a besoin. "
            "Tu composes le document librement avec des blocs typés en JSON. "
            "Appelle cet outil quand un document est pertinent."
        ),
        "parameters": {
            "type": "object",
            "additionalProperties": False,
            "required": ["format", "filename", "summary", "document"],
            "properties": {
                "format": {
                    "type": "string",
                    "enum": ["docx", "pdf"],
                    "description": "Format de sortie du document.",
                },
                "filename": {
                    "type": "string",
                    "description": "Nom du fichier avec extension.",
                },
                "summary": {
                    "type": "string",
                    "description": "Résumé court affiché à l'utilisateur.",
                },
                "document": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "title": {"type": "string"},
                        "blocks": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "additionalProperties": True,
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "enum": [
                                            "heading",
                                            "paragraph",
                                            "bullet_list",
                                            "numbered_list",
                                            "table",
                                            "block",
                                            "divider",
                                            "spacer",
                                            "page_break",
                                        ],
                                    },
                                    "text": {"type": "string"},
                                    "level": {"type": "integer"},
                                    "color": {"type": "string"},
                                    "align": {"type": "string"},
                                    "size": {"type": "integer"},
                                    "bold": {"type": "boolean"},
                                    "italic": {"type": "boolean"},
                                    "bullet": {"type": "string"},
                                    "items": {
                                        "type": "array",
                                        "items": {"type": ["string", "object"]},
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
                                    "content": {
                                        "oneOf": [
                                            {"type": "string"},
                                            {"type": "array", "items": {"type": "object"}},
                                        ]
                                    },
                                    "bg": {"type": "string"},
                                    "text_color": {"type": "string"},
                                    "border": {"type": "string"},
                                    "header_bg": {"type": "string"},
                                    "header_color": {"type": "string"},
                                    "zebra": {"type": "string"},
                                    "thickness": {"type": "integer"},
                                },
                            },
                        },
                    },
                },
            },
        },
    },
}


def _or_model(model_id: str) -> str:
    """Retourne le nom complet LiteLLM pour OpenRouter."""
    name = _OPENROUTER_MODELS.get(model_id, model_id)
    return f"openrouter/{name}"


class LLMManager:
    """
    Orchestrateur LLM — tout passe par LiteLLM + OpenRouter.

    Méthodes publiques :
      stream_with_tools() — streaming texte + outils simultanés (chemin principal)
      stream_chat()       — streaming texte pur, sans outils (comparaison, etc.)
      call_with_tools()   — non-streaming avec outils (fallback si streaming+tools défaillant)
      generate_text()     — non-streaming sans outils (titres, résumés, routage)
    """

    # ── Validation ──────────────────────────────────────────────────────

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

    # ── Construction des messages ────────────────────────────────────────

    def _build_messages(
        self,
        messages: list[dict],
        system_prompt: str,
        files: Optional[list[dict]] = None,
    ) -> list[dict]:
        """
        Convertit les messages Boulga en format OpenAI/LiteLLM.
        Fichiers binaires injectés en base64 dans le dernier message user.
        """
        result: list[dict] = []

        if system_prompt:
            result.append({"role": "system", "content": system_prompt})

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

    # ── Streaming texte + outils ─────────────────────────────────────────

    async def stream_with_tools(
        self,
        provider: str,
        model_id: str,
        messages: list[dict],
        system_prompt: str = "",
        files: Optional[list[dict]] = None,
        tools: Optional[list[dict]] = None,
        effort: str = "medium",
    ) -> AsyncIterator[dict]:
        """
        Streaming avec outils (tool_choice="auto").

        Yield :
          {"type": "chunk", "text": str}                        — deltas de texte en temps réel
          {"type": "tool_call", "name": str, "arguments": dict} — outil appelé (fin de stream)

        Les fragments d'arguments du tool_call sont accumulés pendant le stream
        (le code Python arrive en morceaux) et parsés en JSON à la fin.
        """
        self._check_provider_model(provider, model_id)

        litellm_messages = self._build_messages(messages, system_prompt, files)

        max_tokens = _max_tokens(model_id)
        logger.debug("LLM stream_with_tools model=%s provider=%s max_tokens=%d", model_id, provider, max_tokens)
        kwargs: dict = {
            "model": _or_model(model_id),
            "messages": litellm_messages,
            "stream": True,
            "temperature": _OR_TEMPERATURE.get(effort, 0.5),
            "max_tokens": max_tokens,
            "api_key": settings.OPENROUTER_API_KEY,
            "extra_headers": _OR_HEADERS,
            "timeout": 120,
            "tool_choice": "auto",
        }
        if tools:
            kwargs["tools"] = tools

        tool_calls_acc: dict[int, dict] = {}

        response = await _completion_with_fallback(kwargs)

        async for chunk in response:
            choice = chunk.choices[0]
            delta = choice.delta

            # Deltas de texte → yield immédiatement
            if delta and delta.content:
                yield {"type": "chunk", "text": delta.content}

            # Deltas de tool_call → accumuler
            if delta and delta.tool_calls:
                for tc_delta in delta.tool_calls:
                    idx = tc_delta.index
                    if idx not in tool_calls_acc:
                        tool_calls_acc[idx] = {"id": "", "name": "", "arguments": ""}
                    if tc_delta.id:
                        tool_calls_acc[idx]["id"] = tc_delta.id
                    if tc_delta.function:
                        if tc_delta.function.name:
                            tool_calls_acc[idx]["name"] += tc_delta.function.name
                        if tc_delta.function.arguments:
                            tool_calls_acc[idx]["arguments"] += tc_delta.function.arguments

        if tool_calls_acc:
            tc = tool_calls_acc[0]
            try:
                arguments = json.loads(tc["arguments"]) if tc["arguments"] else {}
                yield {"type": "tool_call", "name": tc["name"], "arguments": arguments}
            except json.JSONDecodeError:
                logger.error(
                    "Tool call JSON tronqué pour %s (len=%d) — fichier non généré",
                    tc["name"],
                    len(tc["arguments"] or ""),
                )
                yield {"type": "chunk", "text": "\n\n⚠️ La génération du document a échoué (réponse tronquée). Réessaie en simplifiant ta demande."}

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
        """
        Streaming texte pur, sans outils.
        Utilisé pour le chat normal (sans génération de fichier).
        Yield : {"type": "text", "text": str}
        """
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
            "timeout": 60,
        }
        response = await _completion_with_fallback(kwargs)

        async for chunk in response:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield {"type": "text", "text": delta.content}

    # ── Non-streaming avec outils ────────────────────────────────────────

    async def call_with_tools(
        self,
        provider: str,
        model_id: str,
        messages: list[dict],
        system_prompt: str = "",
        files: Optional[list[dict]] = None,
        tools: Optional[list[dict]] = None,
        effort: str = "medium",
        tool_choice: str | dict = "auto",
    ) -> dict:
        """
        Appel non-streaming avec outils.
        Utilisé pour la génération de fichiers.

        Retourne :
          {
            "text": str,               # Réponse textuelle du LLM
            "tool_call": dict | None,  # {"name": str, "arguments": dict} si outil appelé
          }
        """
        self._check_provider_model(provider, model_id)

        litellm_messages = self._build_messages(messages, system_prompt, files)

        max_tokens = _max_tokens(model_id)
        logger.debug("LLM call_with_tools model=%s provider=%s max_tokens=%d", model_id, provider, max_tokens)
        kwargs: dict = {
            "model": _or_model(model_id),
            "messages": litellm_messages,
            "stream": False,
            "temperature": _OR_TEMPERATURE.get(effort, 0.5),
            "max_tokens": max_tokens,
            "api_key": settings.OPENROUTER_API_KEY,
            "extra_headers": _OR_HEADERS,
            "timeout": 60,  # 60s max — évite un blocage indéfini
        }

        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = tool_choice

        response = await _completion_with_fallback(kwargs)
        msg = response.choices[0].message

        text = msg.content or ""
        tool_call: dict | None = None

        if hasattr(msg, "tool_calls") and msg.tool_calls:
            tc = msg.tool_calls[0]
            try:
                raw_args = tc.function.arguments
                # arguments peut être une string JSON ou déjà un dict
                arguments = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
            except (json.JSONDecodeError, Exception):
                arguments = {}
            tool_call = {
                "name": tc.function.name,
                "arguments": arguments,
            }

        return {"text": text, "tool_call": tool_call}

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
        """
        Appel non-streaming sans outils.
        Utilisé pour titres, résumés, routage.
        """
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
            if finish_reason == "length":
                logger.warning(
                    "Code tronqué — max_tokens insuffisant for model=%s provider=%s max_tokens=%s",
                    model_id,
                    provider,
                    max_tokens,
                )

        return response.choices[0].message.content or ""


# Singleton
llm_manager = LLMManager()
