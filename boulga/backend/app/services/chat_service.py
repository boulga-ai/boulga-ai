"""chat_service.py — Service de chat principal.

Le LLM décide seul, via tool calling, quand générer un fichier.
Aucune détection d'intent par regex ou mots-clés côté service.
"""

import json as _json
import logging
import re as _re
from typing import AsyncIterator, Optional
from uuid import UUID

logger = logging.getLogger(__name__)

from app.db.repositories.conversation_repository import ConversationRepository
from app.db.repositories.message_repository import MessageRepository
from app.db.session import get_supabase
from app.manager.llm_manager import CREATE_DOCUMENT_TOOL, llm_manager
from app.manager.router_agent import router_agent
from app.prompts.chat_prompts import TITLE_GENERATION_PROMPT
from app.prompts.tool_prompts import get_full_system_prompt
from app.services.quota_service import QuotaService
from app.services.subscription_service import SubscriptionService

# Tiers autorisés à utiliser le Routage Automatique (Source+)
_ROUTING_TIERS: set[str] = {"source", "fleuve", "ocean"}

# ── Constantes ───────────────────────────────────────────────────────────────

MODEL_CONTEXT_WINDOWS: dict[str, int] = {
    "gemini-2.5-flash":  1_000_000,
    "gemini-2.5-pro":    2_000_000,
    "claude-haiku-4-5":  200_000,
    "claude-sonnet-4-6": 200_000,
    "claude-opus-4-6":   200_000,
    "gpt-5.5-instant":   128_000,
    "gpt-5.5-pro":       200_000,
    "deepseek-v4-flash": 128_000,
    "deepseek-v4-pro":   128_000,
}

_ECO_PROVIDER = "gemini"
_ECO_MODEL    = "gemini-2.5-flash"
_RECENT_KEEP  = 10


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


# ── Service ──────────────────────────────────────────────────────────────────

class ChatService:
    def __init__(self) -> None:
        db = get_supabase()
        self._conv_repo = ConversationRepository(db)
        self._msg_repo  = MessageRepository(db)
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
            conv = self._conv_repo.create({
                "user_id":  user_id,
                "provider": provider,
                "model_id": model_id,
            })
            conversation_id = conv["id"]
        else:
            conv = self._conv_repo.get_by_id(UUID(conversation_id))
            if not conv or conv.get("user_id") != user_id:
                yield {"type": "error", "message": "Conversation introuvable"}
                return

        yield {"type": "conversation", "id": conversation_id, "is_new": is_new}

        # b. Quotas
        if not await self._quota_svc.is_message_allowed(user_id):
            yield {"type": "error", "message": "quota_exceeded"}
            return

        if not self._sub_svc.check_can_use_model(user_id, provider, model_id):
            yield {"type": "error", "message": "model_access_denied"}
            return

        # c. Routage Automatique
        tier = self._sub_svc.get_tier(user_id)
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

        # e. Enregistrer message user
        self._msg_repo.create({
            "conversation_id": conversation_id,
            "role":    "user",
            "content": message,
            "provider": provider,
            "model_id": model_id,
        })

        # f. Préparer contexte
        history         = self._msg_repo.list_by_conversation(UUID(conversation_id))
        text_context, binary_files = self._prepare_files(file_ids, provider)
        system_prompt   = get_full_system_prompt(tool_slug)
        history_for_llm = await self._prepare_history(history, model_id)

        # Injecter la grammaire de composition JSON uniquement quand create_document
        # est disponible — pas lors d'un chat sans outils (économie de tokens).
        from app.skills import load_document_skill
        _doc_skill = load_document_skill()
        if _doc_skill:
            system_prompt = system_prompt + "\n\n---\n" + _doc_skill

        # Remplacer les tags <!--boulga-file:...--> par un placeholder lisible
        # pour que le LLM garde le contexte de ce qu'il a généré.
        _file_tag_re = _re.compile(r'<!--boulga-file:(\{.*?\})-->', _re.DOTALL)

        def _tag_to_context(match: _re.Match) -> str:
            try:
                data = _json.loads(match.group(1))
                name = data.get("name", "fichier")
                summary = data.get("summary", "")
                if summary:
                    return f"\n[Fichier généré : {name} — {summary}]"
                return f"\n[Fichier généré : {name}]"
            except Exception:
                return "\n[Fichier généré]"

        llm_messages = [
            {
                "role": "model" if m.get("role") == "assistant" else m.get("role", "user"),
                "content": _file_tag_re.sub(_tag_to_context, m.get("content", "")).strip(),
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

        # g. Appel LLM — streaming avec outils (tool_choice="auto")
        # Texte streamé token par token, tool_call accumulé jusqu'à la fin du stream.
        full_response = ""
        tool_call_result: dict | None = None

        try:
            async for event in llm_manager.stream_with_tools(
                provider=provider,
                model_id=model_id,
                messages=llm_messages,
                system_prompt=system_prompt,
                files=files_arg,
                tools=[CREATE_DOCUMENT_TOOL],
                effort=effort,
            ):
                if event["type"] == "chunk":
                    full_response += event["text"]
                    yield {"type": "chunk", "text": event["text"]}
                elif event["type"] == "tool_call":
                    tool_call_result = event

        except Exception as exc:
            yield {"type": "error", "message": getattr(exc, "message", str(exc))}
            return

        # h. Enregistrer réponse assistant
        assistant_msg = self._msg_repo.create({
            "conversation_id": conversation_id,
            "role":    "assistant",
            "content": full_response,
            "provider": provider,
            "model_id": model_id,
        })

        # i. Quota message
        try:
            await self._quota_svc.consume_message(user_id)
            await self._quota_svc.consume_tokens(user_id, _estimate_tokens(full_response))
        except Exception:
            pass

        # j. Génération de fichier — deux chemins selon l'outil appelé
        if tool_call_result and tool_call_result.get("name") == "create_document":
            msg_id = assistant_msg["id"] if assistant_msg else None
            async for event in self._handle_document_creation(
                tool_call_result["arguments"],
                user_id=user_id,
                conversation_id=conversation_id,
                message_id=msg_id,
            ):
                yield event

        # k. Titre si nouvelle conversation
        if is_new:
            try:
                title_prompt = TITLE_GENERATION_PROMPT.format(message=message[:300])
                raw_title = await llm_manager.generate_text(
                    provider=_ECO_PROVIDER,
                    model_id=_ECO_MODEL,
                    prompt=title_prompt,
                )
                title = raw_title.strip().strip('"').strip("'")[:100]
                self._conv_repo.update_title(UUID(conversation_id), title)
                yield {"type": "title", "title": title}
            except Exception:
                pass

        # m. Done
        yield {"type": "done", "message_id": assistant_msg["id"]}

    # ── Persistance metadata fichier dans le message ──────────────────

    def _embed_file_tag(
        self,
        message_id: str | None,
        url: str,
        name: str,
        size: int,
        mime_type: str,
        summary: str = "",
    ) -> None:
        """
        Appende un tag JSON caché dans le contenu du message en DB.
        Permet de reconstruire fileReady au rechargement de la conversation.
        Format : <!--boulga-file:{...}-->
        """
        if not message_id:
            return
        try:
            from uuid import UUID as _UUID
            tag = "<!--boulga-file:" + _json.dumps({
                "url":      url,
                "name":     name,
                "size":     size,
                "mimeType": mime_type,
                "summary":  summary,
            }) + "-->"
            msg = self._msg_repo.get_by_id(_UUID(message_id))
            if msg:
                new_content = (msg.get("content") or "") + tag
                self._msg_repo.update_content(message_id, new_content)
        except Exception:
            logger.error("Échec _embed_file_tag pour message_id=%s", message_id, exc_info=True)

    # ── Rendu de document via JSON de blocs (create_document) ─────────

    async def _handle_document_creation(
        self,
        arguments: dict,
        user_id: str,
        conversation_id: str | None,
        message_id: str | None,
    ):
        """
        Convertit le JSON de blocs produit par le LLM en fichier docx ou pdf,
        sans aucun deuxième appel LLM ni exécution de code Python.

        Flux :
          1. Valide quota fichier
          2. Appelle render_document(fmt, doc_dict) → (bytes, mime)
          3. Stocke le fichier, embed le tag <!--boulga-file-->
          4. Yield file_ready
        """
        from app.documents import render_document
        from app.services.file_service import FileService

        if not await self._quota_svc.is_file_allowed(user_id):
            yield {
                "type":    "file_generation_error",
                "message": "Limite de fichiers atteinte. Passez à un plan supérieur.",
            }
            return

        fmt      = arguments.get("format", "docx")
        filename = arguments.get("filename", f"document.{fmt}")
        summary  = arguments.get("summary", "")
        doc_data = arguments.get("document", {})

        yield {"type": "file_building", "step": f"⚙️ Rendu du document {fmt.upper()}…"}

        try:
            file_bytes, mime_type = render_document(fmt, doc_data)
        except Exception as exc:
            yield {"type": "file_generation_error", "message": f"Erreur de rendu : {exc}"}
            return

        try:
            file_svc = FileService()
            record = file_svc.store_generated_file(
                user_id=user_id,
                filename=filename,
                content=file_bytes,
                mime_type=mime_type,
                conversation_id=conversation_id,
                message_id=message_id,
            )
            await self._quota_svc.consume_file(user_id)
        except Exception as store_err:
            yield {
                "type":    "file_generation_error",
                "message": f"Erreur stockage fichier : {store_err}",
            }
            return

        display_url = f"/api/files/{record['id']}/download"
        self._embed_file_tag(
            message_id=message_id,
            url=display_url,
            name=filename,
            size=len(file_bytes),
            mime_type=mime_type,
            summary=summary,
        )

        yield {
            "type":       "file_ready",
            "file_id":    record["id"],
            "filename":   filename,
            "mime_type":  mime_type,
            "size_bytes": len(file_bytes),
            "url":        record.get("signed_url") or display_url,
            "is_image":   False,
            "summary":    summary,
        }

    # ── Génération de fichier depuis tool_call ─────────────────────────

    async def _handle_file_creation(
        self,
        arguments: dict,
        user_id: str,
        conversation_id: str | None,
        message_id: str | None,
        provider: str,
        model_id: str,
    ) -> AsyncIterator[dict]:
        """
        Génère le fichier en deux phases avec boucle de correction (max 3 tentatives) :
        - Phase 2 : charge le SKILL.md du format → appel LLM → code Python.
        - Phase 3 : exécute le code en subprocess isolé (os.chdir(tmpdir) déjà fait).
        Si le code plante ou ne produit pas de fichier valide, l'erreur est renvoyée
        au LLM qui corrige et réessaie. Maximum _MAX_ATTEMPTS tentatives.
        """
        from pathlib import Path as _Path
        from app.services.code_executor import CodeExecutor
        from app.services.file_service import FileService
        from app.skills import load_skill

        _MAX_ATTEMPTS = 3

        if not await self._quota_svc.is_file_allowed(user_id):
            yield {
                "type":    "file_generation_error",
                "message": "Limite de fichiers atteinte. Passez à un plan supérieur.",
            }
            return

        fmt      = arguments.get("format", "txt")
        filename = arguments.get("filename", f"document.{fmt}")
        summary  = arguments.get("summary", "")

        # ── System prompt pour la génération de code ──
        skill = load_skill(fmt)
        system_for_code = (
            (skill + "\n\n---\n") if skill else
            "Tu es un générateur de code Python pour créer des fichiers bureautiques.\n"
        ) + (
            "Génère uniquement du code Python, sans markdown, sans explication, sans balises ```.\n"
            f"Sauvegarde le fichier avec ce nom exact : `{filename}` "
            f"(ex: doc.save('{filename}')). Le répertoire de travail est déjà positionné.\n"
            "Utilise print() à chaque étape clé pour montrer l'avancement."
        )

        def _clean(raw: str) -> str:
            s = _re.sub(r'^```(?:python)?\n?', '', raw.strip(), flags=_re.MULTILINE)
            return _re.sub(r'\n?```$', '', s.strip(), flags=_re.MULTILINE).strip()

        executor   = CodeExecutor()
        last_error: str | None = None
        last_code: str | None = None
        file_bytes: bytes | None = None
        mime_type:  str   | None = None

        for attempt in range(1, _MAX_ATTEMPTS + 1):

            # ── Phase 2 : génération / correction du code ──
            if attempt == 1:
                yield {"type": "file_building", "step": f"⚙️ Génération du code {fmt.upper()}..."}
                prompt = (
                    f"Génère le code Python pour créer ce fichier {fmt.upper()} "
                    f"nommé '{filename}'.\n"
                    f"Sauvegarde le fichier sous ce nom exact : `{filename}`.\n"
                    f"Contenu attendu : {summary}"
                )
            else:
                yield {"type": "file_building", "step": f"🔧 Correction en cours (tentative {attempt}/{_MAX_ATTEMPTS})..."}
                prompt = (
                    f"Le code précédent pour générer '{filename}' a échoué.\n"
                    f"Voici le code complet qui a échoué :\n```python\n{last_code or ''}\n```\n"
                    f"Traceback / message d'erreur complet :\n{last_error or 'Aucune sortie fournie.'}\n\n"
                    f"Le code ci-dessus a produit cette erreur. Corrige le code et renvoie la version corrigée complète via create_file. "
                    f"Ne reproduis pas la même erreur.\n"
                    f"Génère le code Python corrigé pour créer ce fichier {fmt.upper()} "
                    f"nommé '{filename}'.\n"
                    f"Sauvegarde le fichier sous ce nom exact : `{filename}`.\n"
                    f"Contenu : {summary}"
                )
            code_max_tokens = {
                "gemini-2.5-flash":  16384,
                "gemini-2.5-pro":    16384,
                "claude-haiku-4-5":  8192,
                "claude-sonnet-4-6": 16384,
                "claude-opus-4-6":   16384,
                "gpt-5.5-instant":   16384,
                "gpt-5.5-pro":       16384,
                "deepseek-v4-flash": 16384,
                "deepseek-v4-pro":   16384,
            }.get(model_id, 8192)

            try:
                raw_code = await llm_manager.generate_text(
                    provider=provider,
                    model_id=model_id,
                    prompt=prompt,
                    system_prompt=system_for_code,
                    max_tokens=code_max_tokens,
                    log_finish_reason=True,
                )
            except Exception as exc:
                yield {"type": "file_generation_error", "message": f"Erreur LLM : {exc}"}
                return

            last_code = _clean(raw_code)
            code = last_code
            if not code:
                last_error = "Code vide retourné par le LLM."
                continue

            # ── Phase 3 : exécution du code ──
            # os.chdir(tmpdir) est injecté par CodeExecutor — aucune variable magique nécessaire.
            logs: list[str] = []
            file_bytes = None
            mime_type  = None
            exec_error: str | None = None

            async for event in executor.execute_streaming(code, timeout=90.0):
                if event["type"] == "log":
                    logs.append(event["line"])
                    yield {"type": "file_building", "step": event["line"]}
                elif event["type"] == "done":
                    # Validation : bonne extension + taille > 0
                    expected_ext = f".{fmt}"
                    valid = [
                        f for f in event.get("files", [])
                        if _Path(f["filename"]).suffix.lower() == expected_ext
                        and len(f["content"]) > 0
                    ]
                    if valid:
                        file_bytes = valid[0]["content"]
                        mime_type  = valid[0]["mime_type"]
                    elif event.get("files"):
                        # Fichier produit mais mauvaise extension — on l'accepte quand même
                        first = event["files"][0]
                        if len(first["content"]) > 0:
                            file_bytes = first["content"]
                            mime_type  = first["mime_type"]
                        else:
                            exec_error = "Fichier produit vide (taille 0)."
                    else:
                        exec_error = f"Aucun fichier .{fmt} produit par le script."
                elif event["type"] == "error":
                    exec_error = event["message"]

            if file_bytes is not None and mime_type is not None:
                break  # succès — sortir de la boucle de correction

            last_error = "\n".join(logs[-40:]) + (f"\nErreur : {exec_error}" if exec_error else "\nAucun fichier produit.")

        else:
            # Toutes les tentatives ont échoué
            yield {
                "type":    "file_generation_error",
                "message": f"Échec après {_MAX_ATTEMPTS} tentatives.\n{last_error or ''}",
            }
            return

        # ── Stockage et réponse ──
        try:
            file_svc = FileService()
            record = file_svc.store_generated_file(
                user_id=user_id,
                filename=filename,
                content=file_bytes,
                mime_type=mime_type,
                conversation_id=conversation_id,
                message_id=message_id,
            )
            await self._quota_svc.consume_file(user_id)
        except Exception as store_err:
            yield {
                "type":    "file_generation_error",
                "message": f"Erreur stockage fichier : {store_err}",
            }
            return

        display_url = f"/api/files/{record['id']}/download"
        self._embed_file_tag(
            message_id=message_id,
            url=display_url,
            name=filename,
            size=len(file_bytes),
            mime_type=mime_type,
            summary=summary,
        )

        yield {
            "type":       "file_ready",
            "file_id":    record["id"],
            "filename":   filename,
            "mime_type":  mime_type,
            "size_bytes": len(file_bytes),
            "url":        record.get("signed_url") or display_url,
            "is_image":   False,
            "summary":    summary,
        }
