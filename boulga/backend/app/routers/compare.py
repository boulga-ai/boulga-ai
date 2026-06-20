from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.exceptions import ForbiddenError
from app.core.security import get_current_user
from app.services.compare_service import CompareService

router = APIRouter()


# ── Schémas ───────────────────────────────────────────────────────────────────

class ProviderModel(BaseModel):
    provider: str
    model_id: str


class CompareRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=32_000)
    providers: list[ProviderModel] = Field(..., min_length=2, max_length=4)
    file_ids: list[str] = []


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/api/compare")
async def compare(
    request: CompareRequest,
    user: dict = Depends(get_current_user),
):
    """
    Lance une comparaison multi-LLM en streaming SSE.
    Tier minimum requis : Source.
    Retourne un flux d'événements :
      compare_chunk, compare_done, compare_error, all_done
    """
    svc = CompareService()

    # Vérification du tier avant d'ouvrir le flux
    # (ForbiddenError sera capturée par le handler d'exceptions globales)
    tier_check_svc = CompareService()
    tier = tier_check_svc._get_tier(user["sub"])
    from app.services.compare_service import SOURCE_PLUS_TIERS
    if tier not in SOURCE_PLUS_TIERS:
        raise ForbiddenError(
            "Le Mode Comparaison est disponible à partir du plan Source."
        )

    providers_models = [
        {"provider": pm.provider, "model_id": pm.model_id}
        for pm in request.providers
    ]

    async def event_generator():
        async for event in svc.compare(
            user_id=user["sub"],
            prompt=request.prompt,
            providers_models=providers_models,
            file_ids=request.file_ids,
        ):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/api/compare/history")
async def compare_history(user: dict = Depends(get_current_user)):
    """Liste les sessions de comparaison de l'utilisateur connecté."""
    svc = CompareService()
    return svc.get_history(user["sub"])


@router.get("/api/compare/{session_id}")
async def compare_session(
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """Retourne les résultats complets d'une session de comparaison."""
    svc = CompareService()
    return svc.get_session(user["sub"], session_id)
