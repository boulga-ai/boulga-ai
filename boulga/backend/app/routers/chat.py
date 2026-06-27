import asyncio

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.security import get_current_user
from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService
from app.utils.sse import sse_event

router = APIRouter()

_KEEPALIVE_INTERVAL = 15
_SENTINEL = object()


@router.post("/api/chat")
async def chat(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
):
    service = ChatService()
    user_id: str = user["sub"]

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def producer():
            try:
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
                    await queue.put(event)
            except Exception as exc:
                await queue.put({"type": "error", "message": str(exc)[:200]})
            finally:
                await queue.put(_SENTINEL)

        task = asyncio.create_task(producer())

        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=_KEEPALIVE_INTERVAL)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    continue

                if item is _SENTINEL:
                    break
                yield sse_event(item)
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
