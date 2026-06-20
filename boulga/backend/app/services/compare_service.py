"""
CompareService — Mode Comparaison multi-LLM en parallèle.

Architecture SSE :
  - Un asyncio.Queue collecte les événements de tous les providers.
  - Chaque provider tourne dans sa propre Task asyncio avec un timeout de 30s.
  - Une sentinelle (None) dans la queue signale la fin d'un provider.
  - Le générateur principal vide la queue jusqu'à avoir reçu toutes les sentinelles.
"""
import asyncio
import time
import uuid
from typing import AsyncIterator
from uuid import UUID

from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.repositories.comparison_repository import ComparisonRepository
from app.db.repositories.subscription_repository import SubscriptionRepository
from app.db.session import get_supabase
from app.manager.llm_manager import llm_manager
from app.prompts.chat_prompts import DEFAULT_SYSTEM_PROMPT
from app.services.file_service import FileService
from app.utils.sse import sse_event

COMPARE_TIMEOUT_SEC = 30
SOURCE_PLUS_TIERS = {"source", "fleuve", "ocean"}


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


class CompareService:
    def __init__(self) -> None:
        db = get_supabase()
        self._repo = ComparisonRepository(db)
        self._sub_repo = SubscriptionRepository(db)

    def _get_tier(self, user_id: str) -> str:
        sub = self._sub_repo.get_active_by_user(UUID(user_id))
        return sub["tier"] if sub else "free"

    def _prepare_files(
        self, file_ids: list[str], provider: str
    ) -> tuple[str, list[dict]]:
        svc = FileService()
        text_parts: list[str] = []
        binary_files: list[dict] = []
        for fid in file_ids:
            try:
                result = svc.get_file_content_for_llm(fid, provider)
                if result["type"] == "text":
                    text_parts.append(
                        f"[Fichier : {result['name']}]\n{result['content']}"
                    )
                else:
                    binary_files.append(result)
            except Exception:
                pass
        return "\n\n---\n\n".join(text_parts), binary_files

    async def compare(
        self,
        user_id: str,
        prompt: str,
        providers_models: list[dict],
        file_ids: list[str] | None = None,
    ) -> AsyncIterator[str]:
        tier = self._get_tier(user_id)
        if tier not in SOURCE_PLUS_TIERS:
            raise ForbiddenError(
                "Le Mode Comparaison est disponible à partir du plan Source."
            )

        file_ids = file_ids or []
        session_id = str(uuid.uuid4())
        self._repo.create_session({
            "id": session_id,
            "user_id": user_id,
            "prompt": prompt,
        })

        queue: asyncio.Queue[str | None] = asyncio.Queue()
        n = len(providers_models)

        async def stream_one(provider: str, model_id: str) -> None:
            try:
                text_context, binary_files = self._prepare_files(file_ids, provider)
                user_content = (
                    f"{text_context}\n\n---\n\n{prompt}" if text_context else prompt
                )
                messages = [{"role": "user", "content": user_content}]
                start = time.monotonic()
                content = ""

                async with asyncio.timeout(COMPARE_TIMEOUT_SEC):
                    async for event in llm_manager.stream_chat(
                        provider=provider,
                        model_id=model_id,
                        messages=messages,
                        system_prompt=DEFAULT_SYSTEM_PROMPT,
                        files=binary_files if binary_files else None,
                    ):
                        if event.get("type") != "text":
                            continue
                        text = event["text"]
                        content += text
                        await queue.put(sse_event({
                            "type": "compare_chunk",
                            "provider": provider,
                            "model": model_id,
                            "text": text,
                        }))

                latency_ms = int((time.monotonic() - start) * 1000)
                tokens = _estimate_tokens(content)

                self._repo.create_result({
                    "session_id": session_id,
                    "provider": provider,
                    "model_id": model_id,
                    "content": content,
                    "tokens_used": tokens,
                    "latency_ms": latency_ms,
                })

                await queue.put(sse_event({
                    "type": "compare_done",
                    "provider": provider,
                    "model": model_id,
                    "latency_ms": latency_ms,
                    "tokens": tokens,
                }))

            except TimeoutError:
                await queue.put(sse_event({
                    "type": "compare_error",
                    "provider": provider,
                    "model": model_id,
                    "message": f"Délai dépassé ({COMPARE_TIMEOUT_SEC}s)",
                }))
            except Exception as exc:
                await queue.put(sse_event({
                    "type": "compare_error",
                    "provider": provider,
                    "model": model_id,
                    "message": str(exc),
                }))
            finally:
                await queue.put(None)  # sentinelle

        tasks = [
            asyncio.create_task(stream_one(pm["provider"], pm["model_id"]))
            for pm in providers_models
        ]

        done = 0
        while done < n:
            event = await queue.get()
            if event is None:
                done += 1
                continue
            yield event

        yield sse_event({"type": "all_done", "session_id": session_id})
        await asyncio.gather(*tasks, return_exceptions=True)

    def get_history(self, user_id: str) -> list[dict]:
        return self._repo.list_sessions_by_user(UUID(user_id))

    def get_session(self, user_id: str, session_id: str) -> dict:
        session = self._repo.get_session_with_results(UUID(session_id))
        if not session or session.get("user_id") != user_id:
            raise NotFoundError("Session introuvable")
        return session
