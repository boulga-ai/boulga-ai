"""
Routes d'administration — accès réservé aux utilisateurs is_admin = true.

GET  /api/admin/users                        — liste tous les utilisateurs avec leur tier
PATCH /api/admin/users/{user_id}/subscription — changer le tier d'un utilisateur
"""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_admin_user
from app.db.repositories.subscription_repository import SubscriptionRepository
from app.db.repositories.user_repository import UserRepository
from app.db.session import get_supabase

router = APIRouter(prefix="/api/admin", tags=["admin"])

ALLOWED_TIERS = {"free", "goutte", "source", "fleuve", "ocean"}


class UpdateSubscriptionRequest(BaseModel):
    tier: str


@router.get("/users")
async def list_users(_: dict = Depends(get_admin_user)):
    """Retourne la liste de tous les utilisateurs avec leur tier actif."""
    db = get_supabase()
    user_repo = UserRepository(db)
    sub_repo = SubscriptionRepository(db)

    users = user_repo.list_all()

    all_subs_result = db.table("subscriptions").select("*").eq("status", "active").execute()
    all_subs = all_subs_result.data if all_subs_result is not None else []

    subs_by_user: dict[str, dict] = {}
    for sub in all_subs:
        uid = sub.get("user_id")
        if uid and uid not in subs_by_user:
            subs_by_user[uid] = sub

    result = []
    for user in users:
        sub = subs_by_user.get(user["id"])
        result.append({
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "is_admin": bool(user.get("is_admin", False)),
            "created_at": user.get("created_at"),
            "tier": sub["tier"] if sub else "free",
        })

    return result


@router.patch("/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: str,
    req: UpdateSubscriptionRequest,
    _: dict = Depends(get_admin_user),
):
    """Change le tier d'un utilisateur. Annule l'abonnement actif si existant."""
    if req.tier not in ALLOWED_TIERS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tier invalide. Valeurs acceptées : {', '.join(sorted(ALLOWED_TIERS))}",
        )

    db = get_supabase()
    user_repo = UserRepository(db)
    sub_repo = SubscriptionRepository(db)

    user = user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    existing = sub_repo.get_active_by_user(user_id)
    if existing:
        sub_repo.cancel(existing["id"])

    if req.tier != "free":
        sub_repo.create({
            "id": str(uuid4()),
            "user_id": user_id,
            "tier": req.tier,
            "billing_cycle": None,
            "status": "active",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": None,
        })

    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "is_admin": bool(user.get("is_admin", False)),
        "created_at": user.get("created_at"),
        "tier": req.tier,
    }
