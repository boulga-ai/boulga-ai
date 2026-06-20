"""PaymentService — Intégration CinetPay (mobile money, XOF).

Flux :
1. initiate_payment → POST CinetPay → retourne payment_url
2. Utilisateur paye sur CinetPay
3. CinetPay appelle POST /api/payments/webhook
4. handle_webhook → vérifie statut → active_subscription + email reçu
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime

import httpx
import resend

from app.config import settings
from app.db.repositories.payment_repository import PaymentRepository
from app.db.repositories.user_repository import UserRepository
from app.db.session import get_supabase
from app.services.subscription_service import TIER_PRICES, SubscriptionService

logger = logging.getLogger(__name__)

# ── CinetPay API ──────────────────────────────────────────────────────────────

_CINETPAY_BASE     = "https://api-checkout.cinetpay.com/v2"
_CINETPAY_INITIATE = f"{_CINETPAY_BASE}/payment"
_CINETPAY_CHECK    = f"{_CINETPAY_BASE}/payment/check"


def _transaction_id(prefix: str = "BLG") -> str:
    """Génère un ID de transaction unique (max 20 chars, alphanumérique)."""
    short = uuid.uuid4().hex[:14].upper()
    return f"{prefix}{short}"


def _plan_label(tier: str, billing_cycle: str) -> str:
    cycle_label = "mensuel" if billing_cycle == "monthly" else "annuel"
    tier_labels = {
        "goutte": "Goutte",
        "source": "Source",
        "fleuve": "Fleuve",
        "ocean":  "Océan",
    }
    return f"Boulga {tier_labels.get(tier, tier)} — {cycle_label}"


# ── Service ───────────────────────────────────────────────────────────────────

class PaymentService:

    def __init__(self) -> None:
        db = get_supabase()
        self._pay_repo  = PaymentRepository(db)
        self._user_repo = UserRepository(db)
        self._sub_svc   = SubscriptionService()

    # ── Initiation du paiement ────────────────────────────────────────

    async def initiate_payment(
        self,
        user_id: str,
        tier: str,
        billing_cycle: str,
    ) -> str:
        """
        Crée un payment pending, appelle CinetPay, retourne l'URL de paiement.
        Lève ValueError si le tier est invalide.
        """
        if tier not in TIER_PRICES:
            raise ValueError(f"Tier inconnu : {tier!r}")

        amount = TIER_PRICES[tier][billing_cycle]
        txn_id = _transaction_id()

        # Créer l'enregistrement payment en DB
        payment = self._pay_repo.create({
            "user_id":        user_id,
            "external_ref":   txn_id,
            "tier":           tier,
            "billing_cycle":  billing_cycle,
            "amount":         amount,
            "currency":       "XOF",
            "status":         "pending",
        })

        # Récupérer les infos utilisateur pour CinetPay
        user = self._user_repo.get_by_id(uuid.UUID(user_id))

        notify_url = f"{settings.BACKEND_URL}/api/payments/webhook"
        return_url = f"{settings.FRONTEND_URL}/payment/success?txn={txn_id}"
        cancel_url = f"{settings.FRONTEND_URL}/pricing"

        payload = {
            "apikey":          settings.CINETPAY_API_KEY,
            "site_id":         settings.CINETPAY_SITE_ID,
            "transaction_id":  txn_id,
            "amount":          amount,
            "currency":        "XOF",
            "description":     _plan_label(tier, billing_cycle),
            "notify_url":      notify_url,
            "return_url":      return_url,
            "cancel_url":      cancel_url,
            "lang":            "fr",
            "channels":        "ALL",
            "customer_id":     user_id,
            "customer_name":   user.get("name", "") if user else "",
            "customer_email":  user.get("email", "") if user else "",
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(_CINETPAY_INITIATE, json=payload)

        if resp.status_code not in (200, 201):
            logger.error("CinetPay initiate error %s: %s", resp.status_code, resp.text)
            raise RuntimeError("Erreur lors de la création du paiement CinetPay.")

        data = resp.json()
        code = str(data.get("code", ""))
        if code not in ("201", "00"):
            msg = data.get("description") or data.get("message") or "Erreur CinetPay"
            raise RuntimeError(msg)

        payment_url = data.get("data", {}).get("payment_url", "")
        if not payment_url:
            raise RuntimeError("URL de paiement CinetPay manquante.")

        return payment_url

    # ── Webhook CinetPay ──────────────────────────────────────────────

    async def handle_webhook(self, payload: dict) -> dict:
        """
        Traite le callback POST de CinetPay.
        Vérifie le statut via l'API (pas de signature HMAC dans v2).
        Active l'abonnement si succès.
        """
        txn_id = payload.get("cpm_trans_id") or payload.get("transaction_id")
        if not txn_id:
            return {"status": "ignored", "reason": "no_transaction_id"}

        # Vérifier le statut auprès de CinetPay
        verified = await self._verify_with_cinetpay(txn_id)
        if not verified:
            return {"status": "ignored", "reason": "verification_failed"}

        # Retrouver le payment en DB
        payment = self._pay_repo.get_by_external_ref(txn_id)
        if not payment:
            logger.warning("Webhook: payment not found for txn_id=%s", txn_id)
            return {"status": "ignored", "reason": "payment_not_found"}

        if payment.get("status") == "completed":
            return {"status": "already_processed"}

        # Activer l'abonnement
        self._pay_repo.update_status(uuid.UUID(payment["id"]), "completed")
        sub = self._sub_svc.activate_subscription(
            user_id=payment["user_id"],
            tier=payment["tier"],
            billing_cycle=payment["billing_cycle"],
            external_ref=txn_id,
        )

        # Planifier la récompense de parrainage (délai de sécurité 7 jours)
        try:
            from app.services.referral_service import ReferralService
            ReferralService().schedule_reward(payment["user_id"])
        except Exception as exc:
            logger.warning("Referral schedule_reward failed: %s", exc)

        # Envoyer l'email de confirmation
        await self._send_confirmation_email(payment)

        logger.info(
            "Payment completed: user=%s tier=%s cycle=%s",
            payment["user_id"], payment["tier"], payment["billing_cycle"],
        )
        return {"status": "activated", "tier": payment["tier"]}

    async def _verify_with_cinetpay(self, txn_id: str) -> bool:
        """Vérifie le statut du paiement auprès de l'API CinetPay."""
        params = {
            "apikey":         settings.CINETPAY_API_KEY,
            "site_id":        settings.CINETPAY_SITE_ID,
            "transaction_id": txn_id,
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(_CINETPAY_CHECK, json=params)
            if resp.status_code not in (200, 201):
                return False
            data = resp.json()
            # code "00" = succès dans la réponse de vérification
            return str(data.get("code", "")) in ("00", "0")
        except Exception as exc:
            logger.error("CinetPay verify error: %s", exc)
            return False

    async def check_payment_status(self, txn_id: str) -> dict:
        """Polling fallback — appelé depuis la page de retour frontend."""
        payment = self._pay_repo.get_by_external_ref(txn_id)
        if not payment:
            return {"status": "not_found"}
        return {
            "status":        payment.get("status"),
            "tier":          payment.get("tier"),
            "billing_cycle": payment.get("billing_cycle"),
        }

    # ── Email de confirmation (Resend) ────────────────────────────────

    async def _send_confirmation_email(self, payment: dict) -> None:
        if not settings.RESEND_API_KEY:
            return
        try:
            user = self._user_repo.get_by_id(uuid.UUID(payment["user_id"]))
            if not user or not user.get("email"):
                return

            tier_labels = {
                "goutte": "Goutte", "source": "Source",
                "fleuve": "Fleuve", "ocean": "Océan",
            }
            cycle_labels = {"monthly": "mensuel", "annual": "annuel"}
            tier  = payment.get("tier", "")
            cycle = payment.get("billing_cycle", "monthly")
            amount = payment.get("amount", 0)
            label = tier_labels.get(tier, tier)
            cycle_label = cycle_labels.get(cycle, cycle)

            resend.api_key = settings.RESEND_API_KEY
            resend.Emails.send({
                "from":    "Boulga <noreply@boulga.ai>",
                "to":      [user["email"]],
                "subject": f"Confirmation de votre abonnement {label} — Boulga",
                "html": f"""
<p>Bonjour {user.get('name', '')},</p>
<p>Votre abonnement <strong>Boulga {label}</strong> ({cycle_label}) a été activé avec succès.</p>
<p>Montant débité : <strong>{amount:,} FCFA</strong></p>
<p>Vous pouvez utiliser toutes les fonctionnalités incluses dans votre plan immédiatement.</p>
<p>— L'équipe Boulga</p>
                """.strip(),
            })
        except Exception as exc:
            logger.warning("Email confirmation failed: %s", exc)
