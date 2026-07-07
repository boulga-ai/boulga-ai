"""chat_service.py — Service de chat principal (streaming + génération de documents)."""

import asyncio
import logging
from typing import AsyncIterator, Optional
from uuid import UUID

logger = logging.getLogger(__name__)

from app.core.stream_errors import StreamErrorCode, stream_error
from app.db.repositories.conversation_repository import ConversationRepository
from app.db.repositories.file_repository import FileRepository
from app.db.repositories.message_repository import MessageRepository
from app.db.session import get_supabase
from app.manager.llm_manager import llm_manager
from app.manager.router_agent import router_agent
from app.utils.file_tags import strip_file_tags
from app.prompts.chat_prompts import TITLE_GENERATION_PROMPT
from app.prompts.tool_prompts import get_full_system_prompt
from app.services.quota_service import QuotaService
from app.services.subscription_service import SubscriptionService
from app.utils.file_tools import get_tools_for_provider, IMAGE_GENERATION_TOOL

_ROUTING_TIERS: set[str] = {"source", "fleuve", "ocean"}

_IMAGE_MODELS: dict[str, str] = {
    "openai": "openai/gpt-5-image",
    "gemini": "google/gemini-2.5-flash-image",
}

MODEL_CONTEXT_WINDOWS: dict[str, int] = {
    "gemini-2.5-flash":  1_000_000,
    "gemini-2.5-pro":    2_000_000,
    "gemini-3.5-flash":  1_000_000,
    "claude-haiku-4-5":  200_000,
    "claude-sonnet-4-6": 1_000_000,
    "claude-opus-4-6":   1_000_000,
    "gpt-5.5-instant":   1_000_000,
    "gpt-5.5-pro":       1_000_000,
    "deepseek-v4-flash": 1_000_000,
    "deepseek-v4-pro":   1_000_000,
}

_ECO_PROVIDER = "gemini"
_ECO_MODEL    = "gemini-2.5-flash"
_RECENT_KEEP  = 10
_DOC_DELIMITER = "<!-- boulga:doc -->"
_DELIM_LEN     = len(_DOC_DELIMITER)


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


class ChatService:
    def __init__(self) -> None:
        db = get_supabase()
        self._conv_repo = ConversationRepository(db)
        self._msg_repo  = MessageRepository(db)
        self._file_repo = FileRepository(db)
        self._quota_svc = QuotaService()
        self._sub_svc   = SubscriptionService()

    # ── Fichiers uploadés ──────────────────────────────────────────────

    def _prepare_files(
        self,
        file_ids: list[str],
        provider: str,
    ) -> tuple[str, list[dict]]:
        from app.services.file_service import FileService

        text_parts: list[str] = []
        binary_files: list[dict] = []
        if not file_ids:
            return "", []

        svc = FileService()
        for fid in file_ids:
            try:
                fc = svc.get_file_content_for_llm(fid, provider)
                if not fc:
                    continue
                if fc["type"] == "binary":
                    binary_files.append({
                        "data":      fc["data"],
                        "mime_type": fc["mime_type"],
                        "name":      fc.get("name", ""),
                    })
                else:
                    name    = fc.get("name", "fichier")
                    content = fc.get("content", "")
                    text_parts.append(f"[Contenu du fichier : {name}]\n{content}")
            except Exception:
                pass

        return "\n\n".join(text_parts), binary_files

    # ── Contexte long ─────────────────────────────────────────────────

    async def _summarize_messages(self, messages: list[dict]) -> str:
        text = "\n".join(
            f"{m.get('role', 'user').upper()}: {m.get('content', '')[:500]}"
            for m in messages
        )
        prompt = (
            "Résume brièvement cette conversation en 4-6 phrases clés "
            "(points importants, décisions prises, contexte nécessaire) :\n\n" + text
        )
        try:
            return await llm_manager.generate_text(
                provider=_ECO_PROVIDER,
                model_id=_ECO_MODEL,
                prompt=prompt,
            )
        except Exception:
            return "[Résumé de l'historique indisponible]"

    async def _prepare_history(
        self, history: list[dict], model_id: str
    ) -> list[dict]:
        context_window = MODEL_CONTEXT_WINDOWS.get(model_id, 128_000)
        threshold      = int(context_window * 0.8)
        total_tokens   = sum(_estimate_tokens(m.get("content", "")) for m in history)

        if total_tokens <= threshold or len(history) <= _RECENT_KEEP:
            return history

        recent  = history[-_RECENT_KEEP:]
        older   = history[:-_RECENT_KEEP]
        summary = await self._summarize_messages(older)

        return [
            {"role": "user",  "content": f"[Résumé de l'historique précédent : {summary}]"},
            {"role": "model", "content": "Compris, je tiens compte de cet historique."},
        ] + recent

    # ── Streaming principal ────────────────────────────────────────────

    async def stream_message(
        self,
        user_id: str,
        message: str,
        provider: str = "gemini",
        model_id: str = "gemini-2.5-flash",
        conversation_id: Optional[str] = None,
        file_ids: Optional[list[str]] = None,
        tool_slug: Optional[str] = None,
        auto_route: bool = False,
        effort: str = "medium",
        enable_search: bool = False,
    ) -> AsyncIterator[dict]:
        file_ids = file_ids or []
        is_new   = conversation_id is None

        # a. Créer ou vérifier la conversation
        if is_new:
            conv = await asyncio.to_thread(self._conv_repo.create, {
                "user_id":  user_id,
                "provider": provider,
                "model_id": model_id,
            })
            conversation_id = conv["id"]
        else:
            conv = await asyncio.to_thread(self._conv_repo.get_by_id, UUID(conversation_id))
            if not conv or conv.get("user_id") != user_id:
                yield stream_error(StreamErrorCode.CONVERSATION_NOT_FOUND)
                return

        yield {"type": "conversation", "id": conversation_id, "is_new": is_new}

        # b. Tier unique — une seule requête SQL pour tous les checks
        tier = await asyncio.to_thread(self._sub_svc.get_tier, user_id)

        if not await self._quota_svc.is_message_allowed(user_id, tier=tier):
            yield stream_error(StreamErrorCode.QUOTA_EXCEEDED)
            return

        if not self._sub_svc.check_can_use_model(user_id, provider, model_id, tier=tier):
            yield stream_error(StreamErrorCode.MODEL_ACCESS_DENIED)
            return

        # c. Routage Automatique
        if auto_route and tier in _ROUTING_TIERS:
            try:
                route = await router_agent.route(message, tier)
                provider = route["provider"]
                model_id = route["model_id"]
                yield {
                    "type": "routing", "provider": provider,
                    "model": model_id, "reason": route["reason"],
                }
            except Exception:
                pass

        # d. Enregistrer message user
        await asyncio.to_thread(self._msg_repo.create, {
            "conversation_id": conversation_id,
            "role":    "user",
            "content": message,
            "provider": provider,
            "model_id": model_id,
        })

        # e. Préparer contexte
        history         = await asyncio.to_thread(self._msg_repo.list_recent_by_conversation, UUID(conversation_id))
        text_context, binary_files = await asyncio.to_thread(self._prepare_files, file_ids, provider)
        system_prompt   = get_full_system_prompt(tool_slug, provider=provider)
        history_for_llm = await self._prepare_history(history, model_id)

        llm_messages = [
            {
                "role": "model" if m.get("role") == "assistant" else m.get("role", "user"),
                "content": strip_file_tags(m.get("content", "")),
            }
            for m in history_for_llm
        ]

        if text_context:
            for i in range(len(llm_messages) - 1, -1, -1):
                if llm_messages[i]["role"] == "user":
                    llm_messages[i] = {
                        **llm_messages[i],
                        "content": llm_messages[i]["content"] + f"\n\n{text_context}",
                    }
                    break

        files_arg = binary_files if binary_files else None

        # f. Appel LLM — streaming avec outils (file generation) + détection délimiteur
        full_response = ""
        _doc_parts: list[str] | None = None
        _pending = ""
        _generated_files: list[dict] = []

        async def _tool_executor(name: str, args: dict) -> tuple[str, list[dict]]:
            """Exécute read_skill ou generate_file et retourne (résultat_llm, events_sse)."""
            if name == "read_skill":
                from app.services.skill_service import read_skill
                content = await asyncio.to_thread(read_skill, args.get("file_type", ""))
                return content, [
                    {"type": "tool_result", "tool": name, "success": True, "output": ""},
                ]

            if name == "generate_file":
                if not await self._quota_svc.is_file_allowed(user_id, tier=tier):
                    return "Erreur : quota de fichiers dépassé.", [
                        stream_error(StreamErrorCode.FILE_QUOTA_EXCEEDED),
                        {"type": "tool_result", "tool": name, "success": False,
                         "error": "Quota de génération de fichiers atteint."},
                    ]
                from app.services.code_execution_service import CodeExecutionService
                svc = CodeExecutionService()
                result = await svc.execute(
                    code=args.get("code", ""),
                    user_id=user_id,
                    conversation_id=conversation_id,
                    message_id=None,
                    timeout=300,
                )
                events: list[dict] = []
                if result.error:
                    events.append({
                        "type": "tool_result", "tool": name, "success": False,
                        "error": result.error[:300],
                    })
                    return f"Erreur sandbox : {result.error}", events
                if not result.files:
                    events.append({
                        "type": "tool_result", "tool": name, "success": True,
                        "output": result.stdout[:200],
                    })
                    return f"Exécuté. stdout={result.stdout[:200]}", events
                for f in result.files:
                    _generated_files.append(f)
                    fid = f.get("file_id")
                    events.append({
                        "type":      "file_ready",
                        "file_id":   fid,
                        "filename":  f.get("name"),
                        "mime_type": f.get("mime_type"),
                        "size":      f.get("size_bytes"),
                        "url":       f"/api/files/{fid}/download",
                        "message_id": None,
                    })
                events.append({
                    "type": "tool_result", "tool": name, "success": True,
                    "output": result.stdout[:200],
                    "filename": result.files[0]["name"] if result.files else "",
                })
                result_summary = (
                    f"Fichier généré avec succès : {', '.join(f['name'] for f in result.files)}. "
                    f"stdout={result.stdout[:100]}"
                )
                try:
                    await self._quota_svc.consume_file(user_id)
                except Exception:
                    pass
                return result_summary, events

            if name == "generate_image":
                if any(f.get("mime_type") == "image/png" for f in _generated_files):
                    return (
                        "Une image a déjà été générée pour cette demande. "
                        "N'appelle plus generate_image, arrête-toi là.",
                        [],
                    )
                if not await self._quota_svc.is_image_allowed(user_id):
                    return "Erreur : quota d'images dépassé.", [
                        stream_error(StreamErrorCode.IMAGE_QUOTA_EXCEEDED),
                    ]
                img_model = _IMAGE_MODELS.get(provider, "")
                if not img_model:
                    return "Génération d'image non disponible pour ce modèle.", [
                        {"type": "tool_result", "tool": name, "success": False,
                         "error": "Provider non supporté pour la génération d'image."},
                    ]
                import uuid as _uuid_img
                prompt      = args.get("prompt", "")
                aspect      = args.get("aspect_ratio", "1:1")
                fname       = f"image_{_uuid_img.uuid4().hex[:8]}.png"
                try:
                    rec = await self._generate_image(
                        prompt=prompt,
                        image_model=img_model,
                        aspect_ratio=aspect,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        filename=fname,
                    )
                    _generated_files.append(rec)
                    fid = rec["file_id"]
                    img_events: list[dict] = [
                        {
                            "type":      "file_ready",
                            "file_id":   fid,
                            "filename":  rec["name"],
                            "mime_type": rec["mime_type"],
                            "size":      rec["size_bytes"],
                            "url":       f"/api/files/{fid}/download",
                            "message_id": None,
                        },
                        {
                            "type": "tool_result", "tool": name, "success": True,
                            "output": f"Image générée : {fname}", "filename": fname,
                        },
                    ]
                    try:
                        await self._quota_svc.consume_image(user_id)
                    except Exception:
                        pass
                    return f"Image générée avec succès : {fname}", img_events
                except Exception as exc:
                    logger.error("Image generation failed: %s", exc)
                    return f"Erreur génération image : {exc}", [
                        {"type": "tool_result", "tool": name, "success": False,
                         "error": str(exc)[:200]},
                    ]

            return f"Outil inconnu : {name}", []

        _chat_tools = get_tools_for_provider(provider)

        try:
            async for event in llm_manager.stream_chat_with_tools(
                provider=provider,
                model_id=model_id,
                messages=llm_messages,
                system_prompt=system_prompt,
                tools=_chat_tools,
                tool_executor=_tool_executor,
                effort=effort,
                tool_choice="auto",
            ):
                if event["type"] == "text":
                    if _doc_parts is not None:
                        _doc_parts.append(event["text"])
                        yield {"type": "doc_chunk", "text": event["text"]}
                    else:
                        _pending += event["text"]
                        dp = _pending.find(_DOC_DELIMITER)
                        if dp != -1:
                            before = _pending[:dp]
                            if before:
                                full_response += before
                                yield {"type": "chunk", "text": before}
                            remainder = _pending[dp + _DELIM_LEN:]
                            _doc_parts = [remainder]
                            if remainder:
                                yield {"type": "doc_chunk", "text": remainder}
                            _pending = ""
                        else:
                            safe = max(0, len(_pending) - _DELIM_LEN + 1)
                            if safe > 0:
                                flush = _pending[:safe]
                                full_response += flush
                                yield {"type": "chunk", "text": flush}
                                _pending = _pending[safe:]
                else:
                    yield event

        except Exception as exc:
            raw = getattr(exc, "message", str(exc))
            if "402" in raw or "credits" in raw.lower() or "afford" in raw.lower():
                msg = "Service temporairement indisponible. Veuillez réessayer dans quelques instants."
            else:
                msg = raw if len(raw) < 200 else "Une erreur est survenue. Veuillez réessayer."
            logger.error("LLM error provider=%s model=%s: %s", provider, model_id, raw[:300])
            yield stream_error(StreamErrorCode.LLM_ERROR, msg)
            return

        if _doc_parts is None and _pending:
            full_response += _pending
            yield {"type": "chunk", "text": _pending}

        # g. Fallback si le LLM n'a envoyé aucun texte conversationnel
        if not full_response.strip() and _doc_parts is not None:
            fallback = "Je génère le document pour vous..."
            full_response = fallback
            yield {"type": "chunk", "text": fallback}

        # h. Enregistrer réponse assistant
        import json as _json_svc
        _content_to_save = full_response
        for _f in _generated_files:
            _tag = _json_svc.dumps({
                "id": _f.get("file_id"), "name": _f.get("name"),
                "mime": _f.get("mime_type"), "size": _f.get("size_bytes"),
            }, ensure_ascii=False)
            _content_to_save += f"\n<!--file:{_tag}-->"

        assistant_msg = await asyncio.to_thread(self._msg_repo.create, {
            "conversation_id": conversation_id,
            "role":    "assistant",
            "content": _content_to_save,
            "provider": provider,
            "model_id": model_id,
        })

        # i-bis. Patch message_id sur les file_ready E2B déjà émis
        if _generated_files:
            for _f in _generated_files:
                fid = _f.get("file_id")
                mid = assistant_msg["id"]
                # Écriture durable en DB
                try:
                    await asyncio.to_thread(self._file_repo.update_message_id, fid, mid)
                except Exception:
                    pass
                # Patch frontend SSE
                yield {
                    "type":       "file_message_id",
                    "file_id":    fid,
                    "message_id": mid,
                }

        # i. Génération de document (basée sur le contenu Markdown)
        if _doc_parts is not None:
            raw_doc = "".join(_doc_parts).lstrip()
            if raw_doc:
                async for file_event in self._handle_content_document(
                    raw_doc,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    message_id=assistant_msg["id"],
                ):
                    yield file_event

        # i. Quota
        try:
            await self._quota_svc.consume_message(user_id)
            await self._quota_svc.consume_tokens(user_id, _estimate_tokens(full_response))
        except Exception:
            pass

        # j. Titre si nouvelle conversation
        if is_new:
            try:
                title_prompt = TITLE_GENERATION_PROMPT.format(message=message[:300])
                raw_title = await llm_manager.generate_text(
                    provider=_ECO_PROVIDER,
                    model_id=_ECO_MODEL,
                    prompt=title_prompt,
                )
                title = raw_title.strip().strip('"').strip("'")[:100]
                await asyncio.to_thread(self._conv_repo.update_title, UUID(conversation_id), title)
                yield {"type": "title", "title": title}
            except Exception:
                pass

        # k. Done
        yield {"type": "done", "message_id": assistant_msg["id"]}

    # ── Génération d'image via OpenRouter ────────────────────────────────

    async def _generate_image(
        self,
        prompt: str,
        image_model: str,
        aspect_ratio: str,
        user_id: str,
        conversation_id: str,
        filename: str,
    ) -> dict:
        import base64
        import httpx
        from app.config import settings
        from app.services.file_service import FileService

        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            if image_model.startswith("google/"):
                # Gemini : chat/completions avec modalities
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": image_model,
                        "modalities": ["text", "image"],
                        "messages": [
                            {
                                "role": "user",
                                "content": [{"type": "text", "text": prompt}],
                            }
                        ],
                    },
                )
                if not resp.is_success:
                    raise ValueError(f"HTTP {resp.status_code} Gemini image: {resp.text[:400]}")
                data = resp.json()
                message = data["choices"][0]["message"]
                data_url = None

                images = message.get("images") or []
                if images:
                    data_url = images[0]["image_url"]["url"]
                else:
                    content = message.get("content", [])
                    if not isinstance(content, str):
                        for item in content:
                            if isinstance(item, dict) and item.get("type") == "image_url":
                                data_url = item["image_url"]["url"]
                                break

                if not data_url:
                    raise ValueError(f"Aucune image dans la réponse Gemini. Message: {str(message)[:200]}")
                b64 = data_url.split(",", 1)[1]
                image_bytes = base64.b64decode(b64)
            else:
                # OpenAI et autres : unified images endpoint
                resp = await client.post(
                    "https://openrouter.ai/api/v1/images",
                    headers=headers,
                    json={
                        "model": image_model,
                        "prompt": prompt,
                        "aspect_ratio": aspect_ratio,
                        "output_format": "png",
                    },
                )
                if not resp.is_success:
                    raise ValueError(f"HTTP {resp.status_code} OpenAI image: {resp.text[:400]}")
                data = resp.json()
                b64 = data["data"][0]["b64_json"]
                image_bytes = base64.b64decode(b64)

        svc = FileService()
        record = await asyncio.to_thread(
            svc.store_generated_file,
            user_id, filename, image_bytes, "image/png", conversation_id, None,
        )

        return {
            "file_id":   record["id"],
            "name":      filename,
            "mime_type": "image/png",
            "size_bytes": len(image_bytes),
        }

    # ── Génération de document via Markdown étendu ─────────────────────

    async def _handle_content_document(
        self,
        raw_markdown: str,
        user_id: str,
        conversation_id: str,
        message_id: str,
    ) -> AsyncIterator[dict]:
        from app.services.document_renderer import render_document
        from app.services.file_service import FileService
        from app.services.md_to_blocks import parse_document

        if not await self._quota_svc.is_file_allowed(user_id):
            yield stream_error(StreamErrorCode.FILE_QUOTA_EXCEEDED)
            return

        blocks, meta = await asyncio.to_thread(parse_document, raw_markdown)
        if not blocks:
            logger.warning(
                "Content document parsing produced no blocks (len=%d)",
                len(raw_markdown),
            )
            return

        fmt      = meta.get("format", "docx")
        template = meta.get("template", "minimal")
        raw_name = meta.get("filename", "document")
        options  = {
            k: meta[k]
            for k in ("primary_color", "company_name")
            if meta.get(k)
        }

        safe_name = raw_name.strip().replace("/", "-").replace("\\", "-")[:80]
        filename  = f"{safe_name}.{fmt}"

        try:
            file_bytes, mime_type = await asyncio.to_thread(
                render_document, blocks, fmt, template, options or None
            )
        except Exception as exc:
            logger.error("Document render failed: %s", exc)
            return

        try:
            file_svc = FileService()
            record = await asyncio.to_thread(
                file_svc.store_generated_file,
                user_id=user_id,
                filename=filename,
                content=file_bytes,
                mime_type=mime_type,
                conversation_id=conversation_id,
                message_id=message_id,
            )
            await self._quota_svc.consume_file(user_id)
        except Exception as exc:
            logger.error("File storage failed: %s", exc)
            return

        file_id = record["id"]
        download_url = f"/api/files/{file_id}/download"

        try:
            import json as _json
            from uuid import UUID as _UUID
            msg = await asyncio.to_thread(self._msg_repo.get_by_id, _UUID(message_id))
            if msg:
                tag_data = _json.dumps({
                    "id": file_id, "name": filename,
                    "mime": mime_type, "size": len(file_bytes),
                }, ensure_ascii=False)
                tag = f"\n<!--file:{tag_data}-->"
                await asyncio.to_thread(
                    self._msg_repo.update_content,
                    message_id,
                    (msg.get("content") or "") + tag,
                )
        except Exception:
            pass

        yield {
            "type":       "file_ready",
            "file_id":    file_id,
            "filename":   filename,
            "mime_type":  mime_type,
            "size":       len(file_bytes),
            "url":        download_url,
            "message_id": message_id,
        }
