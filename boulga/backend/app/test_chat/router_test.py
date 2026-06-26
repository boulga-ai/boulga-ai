"""router_test.py — Router FastAPI du MVP de test.

Endpoints :
  POST /api/chat-test         → flux SSE (chat + génération document)
  GET  /api/chat-test/file/{file_id}/{filename}  → téléchargement du document

À brancher dans main.py :
    from app.routers import router_test
    app.include_router(router_test.router)

(ou copier router_test.py dans app/routers/ et adapter les imports)
"""

from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from app.test_chat.chat_test_service import get_generated_path, stream_message

router = APIRouter(prefix="/api/chat-test", tags=["chat-test"])


class Msg(BaseModel):
    role: str
    content: str


class ChatTestRequest(BaseModel):
    model_id: str = "claude-sonnet-4-6"
    messages: list[Msg]


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.post("")
async def chat_test(request: ChatTestRequest):
    history = [{"role": m.role, "content": m.content} for m in request.messages]

    async def gen():
        async for event in stream_message(request.model_id, history):
            yield _sse(event)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/file/{file_id}/{filename}")
async def download_file(file_id: str, filename: str):
    path = get_generated_path(file_id, filename)
    if not path:
        return {"error": "Fichier introuvable"}
    return FileResponse(path, filename=filename)


# Modèles exposés pour le sélecteur frontend
@router.get("/models")
async def list_models():
    return {
        "models": [
            {"id": "claude-haiku-4-5",  "label": "Claude Haiku 4.5"},
            {"id": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6"},
            {"id": "claude-opus-4-6",   "label": "Claude Opus 4.6"},
        ]
    }