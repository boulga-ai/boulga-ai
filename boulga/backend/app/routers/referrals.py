"""Router /api/referrals — Programme de parrainage."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.security import get_current_user
from app.services.referral_service import ReferralService

router = APIRouter(prefix="/api/referrals", tags=["referrals"])


# ── Lien de parrainage ────────────────────────────────────────────────────────

@router.get("/link")
async def get_referral_link(user: dict = Depends(get_current_user)):
    """Retourne le lien de parrainage unique de l'utilisateur."""
    svc = ReferralService()
    return {"referral_link": svc.get_referral_link(user["sub"])}


# ── Statistiques ──────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_referral_stats(user: dict = Depends(get_current_user)):
    """Retourne les stats de parrainage : lien, compteurs, historique."""
    svc = ReferralService()
    return svc.get_stats(user["sub"])


# ── Invitation par email ──────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    email: EmailStr


@router.post("/invite", status_code=status.HTTP_200_OK)
async def send_invite(req: InviteRequest, user: dict = Depends(get_current_user)):
    """Envoie un email d'invitation via Resend."""
    svc = ReferralService()
    try:
        await svc.send_invite_email(user["sub"], str(req.email))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'envoi de l'invitation : {exc}",
        )
    return {"sent": True}
