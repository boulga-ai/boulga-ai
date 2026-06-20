"""WhatsAppService — Intégration WhatsApp Business API (Meta).

Fonctions principales :
- verify_webhook   : valide le token de vérification Meta (GET webhook)
- handle_message   : traite un message entrant et répond via LLM
- link_whatsapp    : associe un numéro au compte (étape 1 : envoi code SMS)
- confirm_link     : confirme le code et lie définitivement le numéro
- unlink_whatsapp  : dissocie le numéro du compte
- send_message     : envoie un message texte via l'API Meta Graph
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import random
import string
from datetime import datetime, timedelta
from uuid import UUID

import httpx

from app.config import settings
from app.db.session import get_supabase

logger = logging.getLogger(__name__)

# ── Constantes ────────────────────────────────────────────────────────────────

_META_API_VERSION = "v21.0"
_META_BASE_URL    = f"https://graph.facebook.com/{_META_API_VERSION}"
_CODE_LENGTH      = 6
_CODE_TTL_MINUTES = 10

# Message envoyé aux numéros non liés
_ACTIVATION_MSG = (
    "Bonjour ! Pour utiliser Boulga IA sur WhatsApp, "
    "liez votre compte sur : {frontend_url}/settings\n\n"
    "Boulga — L'IA accessible à tous."
)

# Tiers autorisés à utiliser le Bot WhatsApp (Source+)
_WHATSAPP_TIERS: set[str] = {"source", "fleuve", "ocean"}


# ── Service ───────────────────────────────────────────────────────────────────

class WhatsAppService:

    def __init__(self) -> None:
        self._db = get_supabase()

    # ── Vérification webhook Meta ──────────────────────────────────────

    def verify_webhook(self, mode: str, token: str, challenge: str) -> str | None:
        """
        Valide la requête GET de vérification envoyée par Meta.
        Retourne le challenge si valide, None sinon.
        """
        if (
            mode == "subscribe"
            and token == settings.WHATSAPP_VERIFY_TOKEN
        ):
            return challenge
        return None

    def verify_signature(self, body: bytes, signature: str) -> bool:
        """Vérifie la signature X-Hub-Signature-256 des webhooks entrants."""
        if not settings.META_APP_SECRET:
            return True  # dev sans secret configuré
        expected = "sha256=" + hmac.new(
            settings.META_APP_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()  # type: ignore[attr-defined]
        return hmac.compare_digest(expected, signature)

    # ── Traitement des messages entrants ──────────────────────────────

    async def handle_message(
        self,
        phone: str,
        message_text: str,
        media_url: str | None = None,
    ) -> None:
        """
        Traite un message WhatsApp entrant.
        - Phone non lié → envoie le lien d'activation
        - Phone lié     → appelle le LLM et envoie la réponse complète
        """
        user_id = self._find_user_by_phone(phone)

        if not user_id:
            activation = _ACTIVATION_MSG.format(
                frontend_url=settings.FRONTEND_URL
            )
            await self.send_message(phone, activation)
            return

        # Vérifier le tier (Source+ requis)
        tier = self._get_tier(user_id)
        if tier not in _WHATSAPP_TIERS:
            await self.send_message(
                phone,
                "Le Bot WhatsApp est disponible à partir du plan Source. "
                f"Améliorez votre plan sur {settings.FRONTEND_URL}/pricing",
            )
            return

        # Appel LLM — collecter la réponse complète (pas de streaming WA)
        from app.services.chat_service import ChatService  # import tardif

        svc = ChatService()
        full_response = ""
        provider, model_id = self._get_default_provider(user_id)

        try:
            async for event in svc.stream_message(
                user_id=user_id,
                message=message_text,
                provider=provider,
                model_id=model_id,
            ):
                if event.get("type") == "chunk":
                    full_response += event.get("text", "")
                elif event.get("type") == "error":
                    full_response = "Une erreur s'est produite. Veuillez réessayer."
                    break
        except Exception as exc:
            logger.error("WhatsApp LLM error for phone %s: %s", phone, exc)
            full_response = "Une erreur s'est produite. Veuillez réessayer."

        if full_response:
            # WhatsApp limite à 4096 caractères par message
            for chunk in _split_text(full_response, max_length=4000):
                await self.send_message(phone, chunk)

    # ── Liaison de numéro ─────────────────────────────────────────────

    async def link_whatsapp(self, user_id: str, phone_number: str) -> None:
        """
        Étape 1 : génère un code OTP et l'envoie par SMS (via WhatsApp).
        Stocke le code en DB avec expiration.
        """
        code = _generate_code(_CODE_LENGTH)
        expires_at = (
            datetime.utcnow() + timedelta(minutes=_CODE_TTL_MINUTES)
        ).isoformat()

        # Upsert dans la table whatsapp_sessions
        self._db.table("whatsapp_sessions").upsert({
            "user_id":    user_id,
            "phone":      phone_number,
            "otp_code":   code,
            "otp_expires": expires_at,
            "linked":     False,
        }, on_conflict="user_id").execute()

        # Envoyer le code par WhatsApp
        msg = (
            f"Votre code de vérification Boulga : *{code}*\n\n"
            f"Ce code expire dans {_CODE_TTL_MINUTES} minutes."
        )
        await self.send_message(phone_number, msg)

    def confirm_link(self, user_id: str, code: str) -> bool:
        """
        Étape 2 : vérifie le code OTP et lie définitivement le numéro.
        Retourne True si la liaison est réussie.
        """
        res = (
            self._db.table("whatsapp_sessions")
            .select("*")
            .eq("user_id", user_id)
            .eq("linked", False)
            .maybe_single()
            .execute()
        )
        session = res.data if res else None
        if not session:
            return False

        # Vérifier le code et l'expiration
        if session.get("otp_code") != code:
            return False
        expires_at = session.get("otp_expires")
        if expires_at and datetime.utcnow().isoformat() > expires_at:
            return False

        # Marquer comme lié
        self._db.table("whatsapp_sessions").update(
            {"linked": True, "otp_code": None, "otp_expires": None}
        ).eq("user_id", user_id).execute()

        return True

    def unlink_whatsapp(self, user_id: str) -> None:
        """Dissocie le numéro WhatsApp du compte."""
        self._db.table("whatsapp_sessions").delete().eq("user_id", user_id).execute()

    def get_linked_phone(self, user_id: str) -> str | None:
        """Retourne le numéro lié ou None."""
        res = (
            self._db.table("whatsapp_sessions")
            .select("phone")
            .eq("user_id", user_id)
            .eq("linked", True)
            .maybe_single()
            .execute()
        )
        data = res.data if res else None
        return data["phone"] if data else None

    # ── Envoi de message ──────────────────────────────────────────────

    async def send_message(self, phone: str, text: str) -> None:
        """Envoie un message texte via l'API Meta WhatsApp Business."""
        if not settings.WHATSAPP_PHONE_ID or not settings.WHATSAPP_TOKEN:
            logger.warning("WhatsApp non configuré — message non envoyé à %s", phone)
            return

        url = f"{_META_BASE_URL}/{settings.WHATSAPP_PHONE_ID}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "text",
            "text": {"body": text},
        }
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code not in (200, 201):
                    logger.error(
                        "WhatsApp API error %s: %s", resp.status_code, resp.text
                    )
            except Exception as exc:
                logger.error("WhatsApp send_message network error: %s", exc)

    # ── Helpers privés ────────────────────────────────────────────────

    def _find_user_by_phone(self, phone: str) -> str | None:
        res = (
            self._db.table("whatsapp_sessions")
            .select("user_id")
            .eq("phone", phone)
            .eq("linked", True)
            .maybe_single()
            .execute()
        )
        data = res.data if res else None
        return data["user_id"] if data else None

    def _get_tier(self, user_id: str) -> str:
        from app.db.repositories.subscription_repository import SubscriptionRepository
        repo = SubscriptionRepository(self._db)
        sub = repo.get_active_by_user(UUID(user_id))
        return sub["tier"] if sub else "free"

    def _get_default_provider(self, user_id: str) -> tuple[str, str]:
        """Retourne (provider, model_id) par défaut pour l'utilisateur."""
        # TODO: lire les préférences utilisateur depuis la DB
        return "gemini", "gemini-2.5-flash"


# ── Helpers module ────────────────────────────────────────────────────────────

def _generate_code(length: int) -> str:
    return "".join(random.choices(string.digits, k=length))


def _split_text(text: str, max_length: int = 4000) -> list[str]:
    """Découpe le texte en tranches ≤ max_length caractères."""
    if len(text) <= max_length:
        return [text]
    parts = []
    while text:
        parts.append(text[:max_length])
        text = text[max_length:]
    return parts
