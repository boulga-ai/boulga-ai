"""Router /api/search — Recherche plein texte dans les conversations.

Utilise ILIKE sur messages.content (simple, efficace pour commencer).
Retourne les conversations contenant le terme avec un extrait du message pertinent.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.db.session import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["search"])

_EXCERPT_CHARS = 120  # longueur max de l'extrait retourné


def _make_excerpt(content: str, query: str, length: int = _EXCERPT_CHARS) -> str:
    """Extrait un fragment du contenu centré autour de la première occurrence du terme."""
    lower = content.lower()
    idx = lower.find(query.lower())
    if idx < 0:
        return content[:length].rstrip() + ("…" if len(content) > length else "")

    start = max(0, idx - length // 3)
    end   = min(len(content), start + length)
    excerpt = content[start:end].strip()
    if start > 0:
        excerpt = "…" + excerpt
    if end < len(content):
        excerpt += "…"
    return excerpt


# ── Schémas de réponse ────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    conversation_id:    str
    conversation_title: str | None
    updated_at:         str
    excerpt:            str


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[SearchResult])
async def search_conversations(
    q: str = Query(..., min_length=2, max_length=200),
    user: dict = Depends(get_current_user),
):
    """
    Recherche dans les messages de l'utilisateur courant.
    Retourne au maximum 20 conversations avec un extrait du message le plus pertinent.
    """
    db = get_supabase()
    user_id = user["sub"]

    try:
        # Recherche ILIKE dans les messages de l'utilisateur
        res = (
            db.table("messages")
            .select(
                "id, content, conversation_id, created_at, "
                "conversations!inner(id, title, updated_at, user_id)"
            )
            .ilike("content", f"%{q}%")
            .eq("conversations.user_id", user_id)
            .eq("role", "assistant")
            .order("conversations.updated_at", desc=True)
            .limit(50)
            .execute()
        )
    except Exception as exc:
        logger.error("Search error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la recherche.",
        )

    messages = res.data or []

    # Dédupliquer par conversation_id (garder le plus récent)
    seen: set[str] = set()
    results: list[SearchResult] = []
    for msg in messages:
        conv_id = msg.get("conversation_id")
        if not conv_id or conv_id in seen:
            continue
        seen.add(conv_id)

        conv = msg.get("conversations") or {}
        if isinstance(conv, list):
            conv = conv[0] if conv else {}

        results.append(SearchResult(
            conversation_id=conv_id,
            conversation_title=conv.get("title"),
            updated_at=conv.get("updated_at", msg.get("created_at", "")),
            excerpt=_make_excerpt(msg.get("content", ""), q),
        ))

        if len(results) >= 20:
            break

    return results
