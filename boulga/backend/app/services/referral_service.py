"""ReferralService — Programme de parrainage Boulga.

Flux :
1. À l'inscription avec ?ref=CODE → register_with_referral(new_user_id, code)
   - Trouve le parrain via referral_code
   - Crée un enregistrement referrals (status=pending, reward_due_at=NULL)
2. Quand le filleul souscrit (PaymentService.handle_webhook) → schedule_reward(referred_user_id)
   - Set reward_due_at = aujourd'hui + 7 jours (délai anti-fraude)
3. Cron process_pending_rewards() (quotidien)
   - get_pending_rewards() → referrals dont reward_due_at <= NOW()
   - Pour chaque → _grant_reward + complete + _notify_referrer
4. Endpoints : get_referral_link, get_stats, send_invite_email
"""

from __future__ import annotations

import logging
import uuid
from datetime import date, timedelta

import httpx
import resend

from app.config import settings
from app.db.repositories.referral_repository import ReferralRepository
from app.db.repositories.subscription_repository import SubscriptionRepository
from app.db.repositories.user_repository import UserRepository
from app.db.session import get_supabase

logger = logging.getLogger(__name__)

# ── Constantes ────────────────────────────────────────────────────────────────

# Récompenses accordées au parrain selon le tier souscrit par le filleul
REFERRAL_REWARDS: dict[str, dict] = {
    "goutte": {"tier": "goutte", "days": 14, "label": "14 jours Goutte"},
    "source": {"tier": "goutte", "days": 30, "label": "1 mois Goutte"},
    "fleuve": {"tier": "source", "days": 30, "label": "1 mois Source"},
    "ocean":  {"tier": "fleuve", "days": 30, "label": "1 mois Fleuve"},
}

TIER_ORDER       = ["free", "goutte", "source", "fleuve", "ocean"]
SAFETY_DELAY     = 7   # jours avant d'accorder la récompense (anti-fraude)


# ── Service ───────────────────────────────────────────────────────────────────

class ReferralService:

    def __init__(self) -> None:
        db = get_supabase()
        self._ref_repo  = ReferralRepository(db)
        self._user_repo = UserRepository(db)
        self._sub_repo  = SubscriptionRepository(db)

    # ── Enregistrement du filleul ────────────────────────────────────────

    def register_with_referral(self, new_user_id: str, referral_code: str) -> bool:
        """
        À appeler à l'inscription si un code de parrainage est fourni.
        Crée un lien referrals (status=pending).
        Retourne True si créé, False si le code est invalide ou déjà utilisé.
        """
        # Un filleul ne peut avoir qu'un seul parrain
        existing = self._ref_repo.get_by_referred(uuid.UUID(new_user_id))
        if existing:
            return False

        referrer = self._user_repo.get_by_referral_code(referral_code)
        if not referrer:
            return False

        # Anti-fraude : l'utilisateur ne peut pas se parrainer lui-même
        if referrer["id"] == new_user_id:
            return False

        self._ref_repo.create({
            "referrer_id":   referrer["id"],
            "referred_id":   new_user_id,
            "status":        "pending",
            "reward_due_at": None,
        })
        logger.info(
            "Referral created: referrer=%s referred=%s",
            referrer["id"], new_user_id,
        )
        return True

    # ── Planification de la récompense ───────────────────────────────────

    def schedule_reward(self, referred_user_id: str) -> None:
        """
        Appelé par PaymentService après activation du premier abonnement.
        Planifie la récompense avec SAFETY_DELAY jours de délai.
        Idempotent : ignoré si déjà planifié ou si le filleul n'a pas de parrain.
        """
        ref = self._ref_repo.get_by_referred(uuid.UUID(referred_user_id))
        if not ref:
            return
        if ref.get("reward_due_at") is not None:
            return  # déjà planifiée
        if ref.get("status") != "pending":
            return  # déjà complétée ou annulée

        reward_due = (date.today() + timedelta(days=SAFETY_DELAY)).isoformat()
        self._ref_repo.update(uuid.UUID(ref["id"]), {"reward_due_at": reward_due})
        logger.info(
            "Reward scheduled: referral=%s due=%s", ref["id"], reward_due,
        )

    # ── Traitement des récompenses (cron) ─────────────────────────────────

    def process_pending_rewards(self) -> int:
        """
        Cron job quotidien : accorde les récompenses dont reward_due_at est passé.
        Retourne le nombre de récompenses accordées.
        """
        pending = self._ref_repo.get_pending_rewards()
        count = 0
        for ref in pending:
            try:
                sub = self._sub_repo.get_active_by_user(uuid.UUID(ref["referred_id"]))
                tier = sub["tier"] if sub else "free"

                if tier not in REFERRAL_REWARDS:
                    # Filleul retourné en gratuit → annuler la récompense
                    self._ref_repo.cancel(uuid.UUID(ref["id"]))
                    continue

                self._grant_reward(ref["referrer_id"], tier)
                self._ref_repo.complete(uuid.UUID(ref["id"]))
                self._notify_referrer(ref["referrer_id"], tier)
                count += 1
            except Exception as exc:
                logger.error("Error processing referral %s: %s", ref["id"], exc)

        return count

    def _grant_reward(self, referrer_id: str, referred_tier: str) -> None:
        """
        Accorde la récompense au parrain :
        - Même tier ou supérieur → étend expires_at
        - Tier inférieur → monte temporairement au tier récompensé
        """
        reward = REFERRAL_REWARDS[referred_tier]
        reward_tier = reward["tier"]
        reward_days = reward["days"]

        current_sub = self._sub_repo.get_active_by_user(uuid.UUID(referrer_id))
        current_tier = current_sub["tier"] if current_sub else "free"

        current_idx = TIER_ORDER.index(current_tier) if current_tier in TIER_ORDER else 0
        reward_idx  = TIER_ORDER.index(reward_tier)

        # Calculer la nouvelle date d'expiration
        if current_sub and current_sub.get("expires_at"):
            try:
                base = date.fromisoformat(current_sub["expires_at"])
            except (TypeError, ValueError):
                base = date.today()
        else:
            base = date.today()
        new_expires = base + timedelta(days=reward_days)

        if current_idx >= reward_idx and current_sub:
            # Même niveau ou supérieur → juste étendre
            self._sub_repo.update(
                uuid.UUID(current_sub["id"]),
                {"expires_at": new_expires.isoformat()},
            )
        else:
            # Niveau inférieur → créer un abonnement temporaire au niveau récompensé
            if current_sub and current_tier != "free":
                self._sub_repo.expire(uuid.UUID(current_sub["id"]))
            self._sub_repo.create({
                "user_id":       referrer_id,
                "tier":          reward_tier,
                "billing_cycle": "referral",
                "status":        "active",
                "started_at":    date.today().isoformat(),
                "expires_at":    new_expires.isoformat(),
            })

        logger.info(
            "Reward granted: referrer=%s tier=%s days=%d expires=%s",
            referrer_id, reward_tier, reward_days, new_expires,
        )

    def _notify_referrer(self, referrer_id: str, referred_tier: str) -> None:
        """Notifie le parrain via WhatsApp (si lié) ou par email (fallback)."""
        reward = REFERRAL_REWARDS[referred_tier]
        user = self._user_repo.get_by_id(uuid.UUID(referrer_id))
        if not user:
            return

        message = (
            f"Bonne nouvelle ! L'un de vos filleuls vient de souscrire à Boulga. "
            f"Vous avez reçu {reward['label']} en récompense. Profitez-en !"
        )

        # WhatsApp en priorité
        phone = self._get_linked_whatsapp(referrer_id)
        if phone and settings.WHATSAPP_PHONE_ID and settings.WHATSAPP_TOKEN:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        future = pool.submit(
                            asyncio.run,
                            self._send_whatsapp(phone, message),
                        )
                        future.result(timeout=10)
                else:
                    loop.run_until_complete(self._send_whatsapp(phone, message))
                return
            except Exception as exc:
                logger.warning("WhatsApp notification failed: %s — falling back to email", exc)

        # Fallback email
        if user.get("email") and settings.RESEND_API_KEY:
            try:
                resend.api_key = settings.RESEND_API_KEY
                resend.Emails.send({
                    "from":    "Boulga <noreply@boulga.ai>",
                    "to":      [user["email"]],
                    "subject": "Récompense de parrainage Boulga reçue !",
                    "html": (
                        f"<p>Bonjour {user.get('name', '')},</p>"
                        f"<p>{message}</p>"
                        "<p>Continuez à partager votre lien pour gagner encore plus d'accès.</p>"
                        "<p>— L'équipe Boulga</p>"
                    ),
                })
            except Exception as exc:
                logger.warning("Referral email notification failed: %s", exc)

    def _get_linked_whatsapp(self, user_id: str) -> str | None:
        db = get_supabase()
        try:
            res = (
                db.table("whatsapp_sessions")
                .select("phone_number")
                .eq("user_id", user_id)
                .eq("active", True)
                .maybe_single()
                .execute()
            )
            return res.data.get("phone_number") if res.data else None
        except Exception:
            return None

    async def _send_whatsapp(self, phone: str, message: str) -> None:
        url = f"https://graph.facebook.com/v21.0/{settings.WHATSAPP_PHONE_ID}/messages"
        headers = {"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"}
        payload = {
            "messaging_product": "whatsapp",
            "to":   phone,
            "type": "text",
            "text": {"body": message},
        }
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json=payload, headers=headers)

    # ── Stats & lien de parrainage ─────────────────────────────────────────

    def get_referral_link(self, user_id: str) -> str:
        user = self._user_repo.get_by_id(uuid.UUID(user_id))
        if not user or not user.get("referral_code"):
            return ""
        return f"{settings.FRONTEND_URL}/r/{user['referral_code']}"

    def get_stats(self, user_id: str) -> dict:
        referrals = self._ref_repo.list_by_referrer(uuid.UUID(user_id))

        history = []
        for ref in referrals:
            referred = self._user_repo.get_by_id(uuid.UUID(ref["referred_id"]))
            history.append({
                "id":                ref["id"],
                "referred_name":     referred.get("name", "—") if referred else "—",
                "status":            ref["status"],
                "reward_due_at":     ref.get("reward_due_at"),
                "reward_granted_at": ref.get("reward_granted_at"),
                "created_at":        ref.get("created_at"),
            })

        completed_count = sum(1 for r in referrals if r.get("status") == "completed")
        pending_count   = sum(1 for r in referrals if r.get("status") == "pending")

        return {
            "referral_link":   self.get_referral_link(user_id),
            "total_referrals": len(referrals),
            "completed_count": completed_count,
            "pending_count":   pending_count,
            "history":         history,
        }

    # ── Invitation par email ──────────────────────────────────────────────

    async def send_invite_email(self, referrer_id: str, email: str) -> None:
        referrer = self._user_repo.get_by_id(uuid.UUID(referrer_id))
        if not referrer or not settings.RESEND_API_KEY:
            return

        link = self.get_referral_link(referrer_id)
        referrer_name = referrer.get("name", "Un ami")

        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from":    "Boulga <noreply@boulga.ai>",
            "to":      [email],
            "subject": f"{referrer_name} vous invite sur Boulga IA",
            "html": (
                f"<p>Bonjour,</p>"
                f"<p><strong>{referrer_name}</strong> vous invite à rejoindre <strong>Boulga</strong> — "
                "la plateforme IA accessible depuis l'Afrique de l'Ouest.</p>"
                "<p>Accédez à Gemini, Claude, ChatGPT et DeepSeek depuis une interface unique, "
                "en payant en mobile money (Orange, Moov, MTN, Wave).</p>"
                f'<p><a href="{link}" style="display:inline-block;padding:12px 24px;'
                'background:#1565C0;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">'
                "Rejoindre Boulga</a></p>"
                "<p>— L'équipe Boulga</p>"
            ),
        })
