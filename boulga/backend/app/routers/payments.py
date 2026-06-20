"""Router paiements CinetPay.

  POST /api/payments/initiate   → démarre un paiement, retourne payment_url
  POST /api/payments/webhook    → callback CinetPay après paiement
  GET  /api/payments/status     → polling statut d'une transaction
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.security import get_current_user
from app.services.payment_service import PaymentService

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schémas ────────────────────────────────────────────────────────────────────

class InitiateRequest(BaseModel):
    tier:          str  # "goutte" | "source" | "fleuve" | "ocean"
    billing_cycle: str  # "monthly" | "annual"


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/api/payments/initiate")
async def initiate_payment(
    body: InitiateRequest,
    user: dict = Depends(get_current_user),
):
    """Crée un paiement CinetPay et retourne l'URL de redirection."""
    svc = PaymentService()
    try:
        payment_url = await svc.initiate_payment(
            user_id=user["sub"],
            tier=body.tier,
            billing_cycle=body.billing_cycle,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {"payment_url": payment_url}


@router.post("/api/payments/webhook")
async def payment_webhook(request: Request):
    """
    Callback CinetPay — appelé après un paiement (succès ou échec).
    CinetPay attend un HTTP 200 rapide.
    """
    try:
        payload = await request.json()
    except Exception:
        # CinetPay peut envoyer form-encoded ou JSON
        form = await request.form()
        payload = dict(form)

    svc = PaymentService()
    try:
        result = await svc.handle_webhook(payload)
    except Exception as exc:
        logger.error("Webhook processing error: %s", exc)
        return {"status": "error"}

    return result


@router.get("/api/payments/status")
async def payment_status(txn: str, user: dict = Depends(get_current_user)):
    """Polling statut — appelé depuis la page de confirmation."""
    svc = PaymentService()
    return await svc.check_payment_status(txn)
