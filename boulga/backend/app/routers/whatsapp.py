"""Router WhatsApp Business API.

Endpoints :
  GET  /api/whatsapp/webhook          — vérification Meta (challenge)
  POST /api/whatsapp/webhook          — messages entrants
  GET  /api/whatsapp/status           — numéro lié de l'utilisateur connecté
  POST /api/whatsapp/link             — étape 1 : envoi code OTP
  POST /api/whatsapp/verify           — étape 2 : confirmation et liaison
  POST /api/whatsapp/unlink           — dissocier le numéro
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.security import get_current_user
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schémas ────────────────────────────────────────────────────────────────────

class LinkRequest(BaseModel):
    phone_number: str  # format E.164 : +22670000000


class VerifyRequest(BaseModel):
    code: str


# ── Webhook Meta ───────────────────────────────────────────────────────────────

@router.get("/api/whatsapp/webhook")
async def whatsapp_verify(request: Request):
    """Vérification du webhook par Meta lors de la configuration."""
    params = request.query_params
    mode      = params.get("hub.mode", "")
    token     = params.get("hub.verify_token", "")
    challenge = params.get("hub.challenge", "")

    svc = WhatsAppService()
    result = svc.verify_webhook(mode, token, challenge)
    if result is None:
        raise HTTPException(status_code=403, detail="Token de vérification invalide")

    # Meta attend le challenge en texte brut
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(result)


@router.post("/api/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """
    Réception des messages entrants de Meta.
    Vérifie la signature X-Hub-Signature-256, puis traite le message.
    """
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")

    svc = WhatsAppService()
    if not svc.verify_signature(body, signature):
        raise HTTPException(status_code=403, detail="Signature invalide")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Payload JSON invalide")

    # Parcourir les entrées Meta
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])
            for msg in messages:
                if msg.get("type") != "text":
                    continue  # ignorer images, stickers, etc. pour l'instant
                phone = msg.get("from", "")
                text  = msg.get("text", {}).get("body", "")
                if phone and text:
                    # Fire-and-forget — on ne bloque pas le 200 OK sur le traitement
                    import asyncio
                    asyncio.create_task(svc.handle_message(phone, text))

    # Meta exige un 200 OK rapide
    return {"status": "ok"}


# ── Statut numéro lié ──────────────────────────────────────────────────────────

@router.get("/api/whatsapp/status")
async def whatsapp_status(user: dict = Depends(get_current_user)):
    """Retourne le numéro WhatsApp lié à l'utilisateur connecté, ou null."""
    svc = WhatsAppService()
    phone = svc.get_linked_phone(user["sub"])
    return {"phone": phone}


# ── Liaison ────────────────────────────────────────────────────────────────────

@router.post("/api/whatsapp/link")
async def whatsapp_link(
    body: LinkRequest,
    user: dict = Depends(get_current_user),
):
    """
    Étape 1 : envoie un code OTP au numéro fourni via WhatsApp.
    Le numéro doit être au format E.164 (ex: +22670123456).
    """
    phone = body.phone_number.strip()
    if not phone.startswith("+"):
        raise HTTPException(
            status_code=422,
            detail="Le numéro doit être au format international (ex: +22670123456)",
        )

    svc = WhatsAppService()
    await svc.link_whatsapp(user["sub"], phone)
    return {"message": "Code envoyé. Vérifiez votre WhatsApp."}


@router.post("/api/whatsapp/verify")
async def whatsapp_verify_code(
    body: VerifyRequest,
    user: dict = Depends(get_current_user),
):
    """
    Étape 2 : vérifie le code OTP et lie définitivement le numéro.
    """
    svc = WhatsAppService()
    ok = svc.confirm_link(user["sub"], body.code.strip())
    if not ok:
        raise HTTPException(
            status_code=400,
            detail="Code invalide ou expiré. Recommencez la liaison.",
        )
    phone = svc.get_linked_phone(user["sub"])
    return {"message": "Compte WhatsApp lié avec succès.", "phone": phone}


# ── Dissociation ───────────────────────────────────────────────────────────────

@router.post("/api/whatsapp/unlink")
async def whatsapp_unlink(user: dict = Depends(get_current_user)):
    """Dissocie le numéro WhatsApp du compte utilisateur."""
    svc = WhatsAppService()
    svc.unlink_whatsapp(user["sub"])
    return {"message": "Compte WhatsApp dissocié."}
