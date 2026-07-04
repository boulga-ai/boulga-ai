# boulga/backend/app/manager/llm_manager.py
import base64
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
    "claude-sonnet-4-6": 32768,
    "claude-opus-4-6":   32768,
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

        finish_reason: str | None = None

        async for chunk in response:
            choice = chunk.choices[0]
            delta = choice.delta
            if delta and delta.content:
                yield {"type": "text", "text": delta.content}
            if choice.finish_reason:
                finish_reason = choice.finish_reason

        if finish_reason == "length":
            yield {
                "type": "text",
                "text": "\n\n⚠️ La réponse a été tronquée. Essaie avec une demande plus courte.",
            }

    # ── Streaming avec boucle d'outils (file generation) ─────────────────

    async def stream_chat_with_tools(
        self,
        provider: str,
        model_id: str,
        messages: list[dict],
        system_prompt: str = "",
        tools: Optional[list[dict]] = None,
        tool_executor=None,
        effort: str = "medium",
        enable_search: bool = False,
        tool_choice: str = "auto",
    ) -> AsyncIterator[dict]:
        """
        Streaming avec boucle agentique : le LLM peut appeler des outils
        (read_skill, generate_file) et reçoit les résultats pour continuer.

        tool_executor : async callable(name: str, args: dict) -> tuple[str, list[dict]]
            Retourne (result_str_pour_llm, [events_sse_a_yielder]).
        """
        self._check_provider_model(provider, model_id)

        import json as _json

        litellm_messages = self._build_messages(messages, system_prompt)
        max_tokens = _max_tokens(model_id)

        for _ in range(6):
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
                kwargs["tools"] = tools
                kwargs["tool_choice"] = tool_choice

            response = await _completion_with_fallback(kwargs)

            text_buffer = ""
            tool_calls_acc: dict[int, dict] = {}
            finish_reason: str | None = None

            async for chunk in response:
                choice = chunk.choices[0]
                delta = choice.delta

                if delta and delta.content:
                    text_buffer += delta.content
                    yield {"type": "text", "text": delta.content}

                if delta and getattr(delta, "tool_calls", None):
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in tool_calls_acc:
                            tool_calls_acc[idx] = {"id": "", "name": "", "arguments": ""}
                        if tc.id:
                            tool_calls_acc[idx]["id"] = tc.id
                        if tc.function:
                            if tc.function.name:
                                tool_calls_acc[idx]["name"] = tc.function.name
                            if tc.function.arguments:
                                tool_calls_acc[idx]["arguments"] += tc.function.arguments

                if choice.finish_reason:
                    finish_reason = choice.finish_reason

            if finish_reason == "length":
                yield {
                    "type": "text",
                    "text": "\n\n⚠️ La réponse a été tronquée.",
                }

            if finish_reason != "tool_calls" or not tool_calls_acc or not tool_executor:
                break

            # Ajouter le tour assistant avec les tool_calls
            assistant_turn: dict = {
                "role": "assistant",
                "content": text_buffer or None,
                "tool_calls": [
                    {
                        "id": v["id"],
                        "type": "function",
                        "function": {"name": v["name"], "arguments": v["arguments"]},
                    }
                    for v in (tool_calls_acc[k] for k in sorted(tool_calls_acc))
                ],
            }
            litellm_messages.append(assistant_turn)

            # Exécuter chaque outil et ajouter les résultats
            for k in sorted(tool_calls_acc):
                tc_data = tool_calls_acc[k]
                try:
                    args = _json.loads(tc_data["arguments"])
                except Exception:
                    args = {}

                yield {
                    "type": "tool_start",
                    "id": tc_data["id"],
                    "tool": tc_data["name"],
                    "args": args,
                }

                result_str, sse_events = await tool_executor(tc_data["name"], args)

                for ev in sse_events:
                    yield ev

                litellm_messages.append({
                    "role": "tool",
                    "tool_call_id": tc_data["id"],
                    "content": result_str,
                })

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
