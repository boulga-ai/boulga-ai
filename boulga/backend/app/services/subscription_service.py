"""SubscriptionService — Gestion des abonnements et accès LLM/agents.

Règles d'accès :
  free    : Gemini Flash uniquement, 0 fichier, pas de comparaison
  goutte  : Gemini + DeepSeek Flash, 3 fichiers/mois, pas de comparaison
  source  : tous LLMs, 20 fichiers/mois, comparaison, routage auto, WhatsApp
  fleuve  : idem source + 2 agents au choix, 50 fichiers/mois
  ocean   : tout illimité (cap fair-use 50M tokens), 8 agents + custom
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from uuid import UUID

import resend

from app.config import settings
from app.db.repositories.subscription_repository import SubscriptionRepository
from app.db.repositories.quota_repository import QuotaRepository
from app.db.repositories.user_agent_repository import UserAgentRepository
from app.db.repositories.agent_repository import AgentRepository
from app.db.repositories.user_repository import UserRepository
from app.db.session import get_supabase
from app.manager.registry import get_models_for_tier, is_provider_active
from app.services.quota_service import TIER_LIMITS, QuotaService

logger = logging.getLogger(__name__)

# ── Constantes d'accès ────────────────────────────────────────────────────────

COMPARE_TIERS:  set[str] = {"source", "fleuve", "ocean"}
WHATSAPP_TIERS: set[str] = {"source", "fleuve", "ocean"}
AGENT_TIERS:    set[str] = {"fleuve", "ocean"}

FLEUVE_AGENT_LIMIT = 2
OCEAN_AGENT_LIMIT  = 999_999

# Prix FCFA (monthly | annual)
TIER_PRICES: dict[str, dict[str, int]] = {
    "goutte": {"monthly":  2_999, "annual":  29_990},
    "source": {"monthly":  5_999, "annual":  59_990},
    "fleuve": {"monthly":  9_999, "annual":  99_990},
    "ocean":  {"monthly": 29_999, "annual": 299_990},
}

# Durée de service selon le cycle de facturation
BILLING_DAYS: dict[str, int] = {
    "monthly": 30,
    "annual":  365,  # 10 mois payés = 12 mois de service
}


# ── Service ───────────────────────────────────────────────────────────────────

class SubscriptionService:

    def __init__(self) -> None:
        db = get_supabase()
        self._sub_repo    = SubscriptionRepository(db)
        self._quota_repo  = QuotaRepository(db)
        self._ua_repo     = UserAgentRepository(db)
        self._agent_repo  = AgentRepository(db)
        self._user_repo   = UserRepository(db)

    # ── Tier helpers ──────────────────────────────────────────────────

    def get_tier(self, user_id: str) -> str:
        sub = self._sub_repo.get_active_by_user(UUID(user_id))
        return sub["tier"] if sub else "free"

    def get_current(self, user_id: str) -> dict:
        """
        Retourne le statut complet :
          tier, billing_cycle, status, expires_at + quota restant synchrone.
        """
        sub = self._sub_repo.get_active_by_user(UUID(user_id))
        tier = sub["tier"] if sub else "free"

        # Quota synchrone (Postgres uniquement pour cet endpoint)
        from app.services.quota_service import _period_start_db, _period_end
        period_start = _period_start_db(tier)
        limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        quota = self._quota_repo.get_current(UUID(user_id), period_start)

        msg_used = quota.get("messages_used", 0) if quota else 0
        fil_used = quota.get("files_generated", 0) if quota else 0
        tok_used = quota.get("tokens_used", 0) if quota else 0

        tok_limit = limits.get("tokens", 0) or 0
        fil_limit = limits.get("files", 0)
        msg_limit = limits["messages"]

        return {
            "tier":               tier,
            "billing_cycle":      sub.get("billing_cycle") if sub else None,
            "status":             sub.get("status", "free") if sub else "free",
            "expires_at":         sub.get("expires_at") if sub else None,
            "messages_remaining": max(0, msg_limit - msg_used),
            "messages_limit":     msg_limit,
            "files_remaining":    max(0, fil_limit - fil_used),
            "tokens_remaining":   max(0, tok_limit - tok_used) if tok_limit else -1,
            "period_end":         _period_end(tier),
        }

    # ── Checks d'accès ────────────────────────────────────────────────

    def check_can_use_model(self, user_id: str, provider: str, model_id: str) -> bool:
        tier = self.get_tier(user_id)
        if not is_provider_active(provider):
            return False
        allowed = get_models_for_tier(tier)
        return model_id in allowed

    def check_can_compare(self, user_id: str) -> bool:
        return self.get_tier(user_id) in COMPARE_TIERS

    def check_can_use_agent(self, user_id: str, agent_id: str) -> bool:
        tier = self.get_tier(user_id)
        if tier not in AGENT_TIERS:
            return False
        if tier == "ocean":
            return True
        # Fleuve : l'agent doit être assigné et le quota ne dépasse pas 2
        ua = self._ua_repo.get(UUID(user_id), UUID(agent_id))
        return ua is not None

    # ── Activation / désactivation ────────────────────────────────────

    def activate_subscription(
        self,
        user_id: str,
        tier: str,
        billing_cycle: str,
        external_ref: str | None = None,
    ) -> dict:
        """
        Crée ou met à jour l'abonnement actif.
        Réinitialise le quota de la nouvelle période.
        """
        # Expirer l'abonnement précédent s'il existe
        current = self._sub_repo.get_active_by_user(UUID(user_id))
        if current and current.get("tier") != "free":
            self._sub_repo.expire(UUID(current["id"]))

        # Calculer la date d'expiration
        days = BILLING_DAYS.get(billing_cycle, 30)
        expires_at = (date.today() + timedelta(days=days)).isoformat()

        # Créer le nouvel abonnement
        sub_data: dict = {
            "user_id":       user_id,
            "tier":          tier,
            "billing_cycle": billing_cycle,
            "status":        "active",
            "started_at":    date.today().isoformat(),
            "expires_at":    expires_at,
        }
        if external_ref:
            sub_data["external_ref"] = external_ref

        sub = self._sub_repo.create(sub_data)

        # Réinitialiser le quota (nouvelle période)
        self._reset_quota(user_id, tier)

        logger.info("Subscription activated: user=%s tier=%s cycle=%s", user_id, tier, billing_cycle)
        return sub

    def _reset_quota(self, user_id: str, tier: str) -> None:
        from app.services.quota_service import _period_start_db
        period_start = _period_start_db(tier)
        limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        existing = self._quota_repo.get_current(UUID(user_id), period_start)
        if not existing:
            self._quota_repo.create({
                "user_id":         user_id,
                "period_start":    period_start,
                "messages_limit":  limits["messages"],
                "messages_used":   0,
                "files_generated": 0,
                "tokens_used":     0,
            })

    def expire_subscriptions(self) -> int:
        """
        Cron job : expire les abonnements dont expires_at < aujourd'hui
        et les repasse en free.
        Retourne le nombre d'abonnements expirés.
        """
        today = date.today().isoformat()
        db = get_supabase()
        # Récupérer les abonnements actifs non-gratuits expirés
        res = (
            db.table("subscriptions")
            .select("*")
            .eq("status", "active")
            .neq("tier", "free")
            .lt("expires_at", today)
            .execute()
        )
        expired = res.data or []
        count = 0
        for sub in expired:
            self._sub_repo.expire(UUID(sub["id"]))
            # Créer un abonnement free de remplacement
            self._sub_repo.create({
                "user_id":       sub["user_id"],
                "tier":          "free",
                "billing_cycle": None,
                "status":        "active",
                "started_at":    today,
                "expires_at":    None,
            })
            count += 1
            logger.info("Subscription expired → free: user_id=%s", sub["user_id"])

        return count

    # ── Agents ───────────────────────────────────────────────────────

    def assign_agent(self, user_id: str, agent_id: str) -> dict:
        """Assigne un agent à l'utilisateur. Lève ValueError si quota dépassé."""
        tier = self.get_tier(user_id)
        if tier not in AGENT_TIERS:
            raise ValueError("Les agents sont disponibles à partir du plan Fleuve.")

        # Vérifier que l'agent existe
        agent = self._agent_repo.get_by_id(UUID(agent_id))
        if not agent:
            raise ValueError("Agent introuvable.")

        # Vérifier que l'agent n'est pas déjà assigné
        existing = self._ua_repo.get(UUID(user_id), UUID(agent_id))
        if existing:
            return existing  # déjà assigné — idempotent

        if tier == "fleuve":
            count = self._ua_repo.count_by_user(UUID(user_id))
            if count >= FLEUVE_AGENT_LIMIT:
                raise ValueError(
                    f"Le plan Fleuve permet d'assigner {FLEUVE_AGENT_LIMIT} agents maximum. "
                    "Passez au plan Océan pour accéder à tous les agents."
                )

        return self._ua_repo.assign(UUID(user_id), UUID(agent_id))

    # ── Rappels d'expiration (cron — TODO: planifier via Railway cron) ──────

    def send_expiry_reminders(self) -> int:
        """
        À appeler quotidiennement.
        Envoie un email aux utilisateurs dont l'abonnement expire dans exactement 3 jours.
        Retourne le nombre d'emails envoyés.
        """
        if not settings.RESEND_API_KEY:
            return 0

        target_date = (date.today() + timedelta(days=3)).isoformat()
        db = get_supabase()
        res = (
            db.table("subscriptions")
            .select("*")
            .eq("status", "active")
            .neq("tier", "free")
            .eq("expires_at", target_date)
            .execute()
        )
        subs = res.data or []

        tier_labels = {
            "goutte": "Goutte", "source": "Source",
            "fleuve": "Fleuve", "ocean": "Océan",
        }
        count = 0
        resend.api_key = settings.RESEND_API_KEY
        for sub in subs:
            try:
                user = self._user_repo.get_by_id(UUID(sub["user_id"]))
                if not user or not user.get("email"):
                    continue
                label = tier_labels.get(sub["tier"], sub["tier"])
                resend.Emails.send({
                    "from":    "Boulga <noreply@boulga.ai>",
                    "to":      [user["email"]],
                    "subject": f"Votre abonnement {label} expire dans 3 jours",
                    "html": (
                        f"<p>Bonjour {user.get('name', '')},</p>"
                        f"<p>Votre abonnement <strong>Boulga {label}</strong> expire le "
                        f"<strong>{sub['expires_at']}</strong>.</p>"
                        "<p>Pour continuer à bénéficier de tous vos avantages, renouvelez dès maintenant.</p>"
                        f'<p><a href="{settings.FRONTEND_URL}/pricing" '
                        'style="display:inline-block;padding:12px 24px;background:#1565C0;'
                        'color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">'
                        "Renouveler mon abonnement</a></p>"
                        "<p>— L'équipe Boulga</p>"
                    ),
                })
                count += 1
            except Exception as exc:
                logger.warning("Expiry reminder failed for user=%s: %s", sub["user_id"], exc)

        return count

    def unassign_agent(self, user_id: str, agent_id: str) -> bool:
        tier = self.get_tier(user_id)
        if tier not in AGENT_TIERS:
            raise ValueError("Accès non autorisé.")
        return self._ua_repo.unassign(UUID(user_id), UUID(agent_id))

    def get_user_agents(self, user_id: str) -> list[dict]:
        return self._ua_repo.list_by_user(UUID(user_id))

    def get_all_agents(self) -> list[dict]:
        return self._agent_repo.list_active()
