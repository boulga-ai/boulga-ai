from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.security import get_current_user
from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService
from app.utils.sse import sse_event

router = APIRouter()


@router.post("/api/chat")
async def chat(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
):
    """
    Endpoint SSE de chat.
    Retourne un stream text/event-stream avec les événements :
      data: {"type": "conversation", "id": "...", "is_new": bool}
      data: {"type": "chunk", "text": "..."}
      data: {"type": "title", "title": "..."}
      data: {"type": "done", "message_id": "..."}
      data: {"type": "error", "message": "..."}
    """
    service = ChatService()
    user_id: str = user["sub"]

    async def event_generator():
        async for event in service.stream_message(
            user_id=user_id,
            message=request.message,
            provider=request.provider,
            model_id=request.model_id,
            conversation_id=request.conversation_id,
            file_ids=request.file_ids,
            tool_slug=request.tool_slug,
            auto_route=request.auto_route,
            effort=request.effort,
            enable_search=request.enable_search,
        ):
            yield sse_event(event)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
