"""Router /api/feedback — Feedback utilisateur sur les messages assistant."""

from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.db.repositories.feedback_repository import FeedbackRepository
from app.db.session import get_supabase

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


# ── Schémas ───────────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    message_id: str
    rating:     Literal["up", "down"]
    comment:    Optional[str] = None


class FeedbackResponse(BaseModel):
    id:         str
    message_id: str
    rating:     str
    comment:    Optional[str] = None


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, response_model=FeedbackResponse)
async def submit_feedback(
    req: FeedbackRequest,
    user: dict = Depends(get_current_user),
):
    """
    Enregistre ou met à jour le feedback d'un utilisateur sur un message.
    Un seul feedback par (user_id, message_id) — upsert sur conflit.
    """
    repo = FeedbackRepository(get_supabase())
    record = repo.upsert({
        "user_id":    user["sub"],
        "message_id": req.message_id,
        "rating":     req.rating,
        "comment":    req.comment,
    })
    return FeedbackResponse(
        id=record["id"],
        message_id=record["message_id"],
        rating=record["rating"],
        comment=record.get("comment"),
    )
