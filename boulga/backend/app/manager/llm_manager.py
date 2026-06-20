import base64
from typing import AsyncIterator, Optional

import litellm

from app.config import settings
from app.core.exceptions import BoulgaError
from app.manager.registry import LLMProvider, is_provider_active, resolve_model

# Mapping Boulga model_id → identifiant OpenRouter
_OPENROUTER_MODELS: dict[str, str] = {
    "gemini-2.5-flash":  "google/gemini-2.5-flash",
    "gemini-2.5-pro":    "google/gemini-2.5-pro",
    "claude-haiku-4-5":  "anthropic/claude-haiku-4-5",
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4-6",
    "gpt-5.5-instant":   "openai/gpt-4o-mini",
    "gpt-5.5-pro":       "openai/gpt-4o",
    "deepseek-v4-flash": "deepseek/deepseek-chat",
    "deepseek-v4-pro":   "deepseek/deepseek-r1",
}

# Mapping Boulga model_id → Anthropic model_id (pour le SDK direct)
_ANTHROPIC_MODELS: dict[str, str] = {
    "claude-haiku-4-5":  "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6": "claude-sonnet-4-6",
}

# En-têtes requis par OpenRouter
_OR_HEADERS: dict[str, str] = {
    "HTTP-Referer": "https://boulga.ai",
    "X-Title": "Boulga",
}

# Outil create_file pour Claude
_CLAUDE_CREATE_FILE_TOOL = {
    "name": "create_file",
    "description": (
        "Génère un fichier téléchargeable. Utilise cet outil quand l'utilisateur "
        "demande un document Word, Excel, PDF, CSV ou autre fichier."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "filename": {
                "type": "string",
                "description": "Nom du fichier avec extension (ex: rapport.docx)",
            },
            "format": {
                "type": "string",
                "enum": ["docx", "xlsx", "csv", "txt", "md"],
            },
            "content": {
                "description": (
                    "Contenu: docx→texte Markdown. "
                    "xlsx→liste [{name,rows:[[val,...]]}]. "
                    "csv/txt/md→texte brut."
                ),
            },
        },
        "required": ["filename", "format", "content"],
    },
}


def _or_model(model_id: str) -> str:
    """Retourne le nom complet LiteLLM pour OpenRouter."""
    name = _OPENROUTER_MODELS.get(model_id, model_id)
    return f"openrouter/{name}"


class LLMManager:
    """
    Orchestrateur LLM.
    - Génération de fichiers Gemini  → google-genai SDK avec ToolCodeExecution
    - Génération de fichiers Claude  → anthropic SDK avec l'outil create_file
    - Tout le reste                  → LiteLLM + OpenRouter
    """

    # ── Singletons SDK natifs ────────────────────────────────────────────

    _genai_client = None   # google.genai.Client
    _anthropic_client = None  # anthropic.AsyncAnthropic

    def _get_gemini_client(self):
        if self._genai_client is None:
            from google import genai
            self.__class__._genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._genai_client

    def _get_anthropic_client(self):
        if self._anthropic_client is None:
            import anthropic
            self.__class__._anthropic_client = anthropic.AsyncAnthropic(
                api_key=settings.ANTHROPIC_API_KEY
            )
        return self._anthropic_client

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

    # ── Construction des messages LiteLLM ────────────────────────────────

    def _build_messages(
        self,
        messages: list[dict],
        system_prompt: str,
        files: Optional[list[dict]] = None,
    ) -> list[dict]:
        """
        Convertit les messages Boulga (role user/model/assistant) en format
        OpenAI/LiteLLM (role user/assistant/system).
        Les images sont injectées en base64 dans le dernier message utilisateur.
        """
        result: list[dict] = []

        if system_prompt:
            result.append({"role": "system", "content": system_prompt})

        for msg in messages:
            role = msg.get("role", "user")
            # Gemini utilise "model" ; LiteLLM attend "assistant"
            if role == "model":
                role = "assistant"
            result.append({"role": role, "content": msg.get("content", "")})

        # Injecter les fichiers images dans le dernier message utilisateur
        if files:
            image_files = [
                f for f in files if f.get("mime_type", "").startswith("image/")
            ]
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

    # ── Construction des messages google-genai ───────────────────────────

    def _build_gemini_contents(
        self,
        messages: list[dict],
        files: Optional[list[dict]] = None,
    ):
        """
        Convertit les messages Boulga en liste de genai_types.Content
        pour le SDK google-genai natif.
        Les fichiers binaires (images, PDF) sont injectés dans le dernier
        message utilisateur.
        """
        from google.genai import types as genai_types

        contents = []
        for msg in messages:
            role = msg.get("role", "user")
            # Normaliser : "assistant" → "model"
            if role == "assistant":
                role = "model"
            content_text = msg.get("content", "")
            contents.append(
                genai_types.Content(
                    role=role,
                    parts=[genai_types.Part.from_text(text=content_text)],
                )
            )

        # Injecter les fichiers binaires dans le dernier message user
        if files:
            for i in range(len(contents) - 1, -1, -1):
                if contents[i].role == "user":
                    extra_parts = []
                    for f in files:
                        extra_parts.append(
                            genai_types.Part.from_bytes(
                                data=f["data"],
                                mime_type=f["mime_type"],
                            )
                        )
                    contents[i] = genai_types.Content(
                        role="user",
                        parts=list(contents[i].parts) + extra_parts,
                    )
                    break

        return contents

    # ── Chemin Gemini natif (code_execution) ─────────────────────────────

    async def _stream_gemini_code_exec(
        self,
        model_id: str,
        messages: list[dict],
        system_prompt: str = "",
        files: Optional[list[dict]] = None,
    ) -> AsyncIterator[dict]:
        from google.genai import types as genai_types

        client = self._get_gemini_client()
        contents = self._build_gemini_contents(messages, files)

        config_kwargs: dict = {
            "tools": [genai_types.Tool(code_execution=genai_types.ToolCodeExecution())],
        }
        if system_prompt:
            config_kwargs["system_instruction"] = system_prompt

        generate_config = genai_types.GenerateContentConfig(**config_kwargs)

        # Le SDK google-genai expose generate_content_stream de façon synchrone itérable
        # On l'exécute dans un thread pour ne pas bloquer la boucle asyncio
        import asyncio
        loop = asyncio.get_event_loop()

        def _sync_stream():
            return client.models.generate_content_stream(
                model=model_id,
                contents=contents,
                config=generate_config,
            )

        stream = await loop.run_in_executor(None, _sync_stream)

        def _iter_stream():
            for chunk in stream:
                if not chunk.candidates:
                    continue
                for part in chunk.candidates[0].content.parts:
                    yield part

        parts_iter = await loop.run_in_executor(None, lambda: list(_iter_stream()))

        for part in parts_iter:
            if part.thought:
                continue
            if part.inline_data is not None:
                yield {
                    "type": "file_data",
                    "data": bytes(part.inline_data.data),
                    "mime_type": part.inline_data.mime_type,
                }
            elif part.text is not None:
                yield {"type": "text", "text": part.text}
            elif part.executable_code is not None:
                yield {"type": "code", "code": part.executable_code.code}
            elif part.code_execution_result is not None:
                yield {
                    "type": "code_result",
                    "output": part.code_execution_result.output,
                }

    # ── Chemin Claude natif (create_file tool) ───────────────────────────

    async def _stream_claude_create_file(
        self,
        model_id: str,
        messages: list[dict],
        system_prompt: str = "",
        files: Optional[list[dict]] = None,
    ) -> AsyncIterator[dict]:
        import anthropic

        client = self._get_anthropic_client()
        actual_model = _ANTHROPIC_MODELS.get(model_id, model_id)

        # Convertir les messages : "model" → "assistant"
        anthropic_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            if role == "model":
                role = "assistant"
            anthropic_messages.append({"role": role, "content": msg.get("content", "")})

        stream_kwargs: dict = {
            "model": actual_model,
            "max_tokens": 8192,
            "tools": [_CLAUDE_CREATE_FILE_TOOL],
            "messages": anthropic_messages,
        }
        if system_prompt:
            stream_kwargs["system"] = system_prompt

        async with client.messages.stream(**stream_kwargs) as stream:
            async for text_delta in stream.text_stream:
                yield {"type": "text", "text": text_delta}

            final_message = await stream.get_final_message()

        # Chercher un appel d'outil create_file dans la réponse finale
        for block in final_message.content:
            if (
                hasattr(block, "type")
                and block.type == "tool_use"
                and block.name == "create_file"
            ):
                yield {"type": "tool_create_file", "tool_input": block.input}

    # ── Streaming principal ───────────────────────────────────────────────

    async def stream_chat(
        self,
        provider: str,
        model_id: str,
        messages: list[dict],
        system_prompt: str = "",
        files: Optional[list[dict]] = None,
        enable_code_execution: bool = False,
    ) -> AsyncIterator[dict]:
        """
        Async generator — yield des dicts d'événements :
          {"type": "text",             "text": str}
          {"type": "code",             "code": str}
          {"type": "code_result",      "output": str}
          {"type": "file_data",        "data": bytes, "mime_type": str}
          {"type": "tool_create_file", "tool_input": dict}
        """
        self._check_provider_model(provider, model_id)

        if enable_code_execution and provider == "gemini":
            try:
                events = []
                async for event in self._stream_gemini_code_exec(
                    model_id=model_id,
                    messages=messages,
                    system_prompt=system_prompt,
                    files=files,
                ):
                    events.append(event)
                for event in events:
                    yield event
                return
            except Exception:
                # SDK natif indisponible (clé API) → chemin LiteLLM
                pass

        if enable_code_execution and provider == "claude":
            async for event in self._stream_claude_create_file(
                model_id=model_id,
                messages=messages,
                system_prompt=system_prompt,
                files=files,
            ):
                yield event
            return

        # Chemin par défaut : LiteLLM + OpenRouter
        litellm_messages = self._build_messages(messages, system_prompt, files)

        response = await litellm.acompletion(
            model=_or_model(model_id),
            messages=litellm_messages,
            stream=True,
            api_key=settings.OPENROUTER_API_KEY,
            extra_headers=_OR_HEADERS,
        )

        async for chunk in response:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield {"type": "text", "text": delta.content}

    # ── Non-streaming ────────────────────────────────────────────────────

    async def generate_text(
        self,
        provider: str,
        model_id: str,
        prompt: str,
        system_prompt: str = "",
    ) -> str:
        """
        Appel non-streaming — retourne le texte complet.
        Utilisé pour la génération de titres, les résumés d'historique, etc.
        """
        self._check_provider_model(provider, model_id)

        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await litellm.acompletion(
            model=_or_model(model_id),
            messages=messages,
            api_key=settings.OPENROUTER_API_KEY,
            extra_headers=_OR_HEADERS,
        )

        return response.choices[0].message.content or ""


# Singleton — partagé par tous les handlers
llm_manager = LLMManager()
