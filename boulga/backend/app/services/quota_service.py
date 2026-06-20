"""QuotaService — Compteurs Redis (temps réel) + persistance Supabase.

Architecture :
- Redis  : compteurs rapides pour les checks temps réel (incr / get)
- Supabase : persistance durable (survit aux redémarrages, analytics)

Clés Redis :
  boulga:q:msg:{user_id}:{period}   — messages utilisés
  boulga:q:tok:{user_id}:{period}   — tokens utilisés (Océan cap 50M)
  boulga:q:fil:{user_id}:{period}   — fichiers générés
"""

from __future__ import annotations

import calendar
import logging
from datetime import date
from uuid import UUID

import redis.asyncio as aioredis

from app.config import settings
from app.db.repositories.quota_repository import QuotaRepository
from app.db.repositories.subscription_repository import SubscriptionRepository
from app.db.session import get_supabase

logger = logging.getLogger(__name__)

# ── Limites par tier ──────────────────────────────────────────────────────────

TIER_LIMITS: dict[str, dict] = {
    "free":   {"messages": 10,          "files": 0,       "tokens": 0,          "images_daily": 1,   "images_monthly": 0,          "period": "daily"},
    "goutte": {"messages": 600,         "files": 3,       "tokens": 0,          "images_daily": 0,   "images_monthly": 10,         "period": "monthly"},
    "source": {"messages": 800,         "files": 20,      "tokens": 0,          "images_daily": 0,   "images_monthly": 50,         "period": "monthly"},
    "fleuve": {"messages": 2_000,       "files": 50,      "tokens": 0,          "images_daily": 0,   "images_monthly": 150,        "period": "monthly"},
    "ocean":  {"messages": 999_999_999, "files": 999_999, "tokens": 50_000_000, "images_daily": 0,   "images_monthly": 999_999,    "period": "monthly"},
}

OCEAN_TOKEN_CAP = 50_000_000


# ── Helpers de période ────────────────────────────────────────────────────────

def _period_key(tier: str) -> str:
    today = date.today()
    if TIER_LIMITS.get(tier, {}).get("period") == "daily":
        return today.isoformat()
    return f"{today.year}-{today.month:02d}"


def _period_start_db(tier: str) -> str:
    """Clé period_start compatible avec la table usage_quotas (existante)."""
    today = date.today()
    if TIER_LIMITS.get(tier, {}).get("period") == "daily":
        return today.isoformat()
    return date(today.year, today.month, 1).isoformat()


def _period_end(tier: str) -> str:
    today = date.today()
    if TIER_LIMITS.get(tier, {}).get("period") == "daily":
        return today.isoformat()
    last_day = calendar.monthrange(today.year, today.month)[1]
    return date(today.year, today.month, last_day).isoformat()


# ── Service ───────────────────────────────────────────────────────────────────

class QuotaService:

    def __init__(self) -> None:
        self._db = get_supabase()
        self._quota_repo = QuotaRepository(self._db)
        self._sub_repo   = SubscriptionRepository(self._db)
        self._redis: aioredis.Redis | None = None

    # ── Redis (lazy + dégradation gracieuse) ──────────────────────────

    def _get_redis(self) -> aioredis.Redis | None:
        if self._redis is None:
            try:
                self._redis = aioredis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=2,
                )
            except Exception as exc:
                logger.warning("Redis unavailable: %s", exc)
        return self._redis

    async def _rget(self, key: str) -> int:
        r = self._get_redis()
        if not r:
            return 0
        try:
            val = await r.get(key)
            return int(val) if val else 0
        except Exception:
            return 0

    async def _rincr(self, key: str, ttl: int, amount: int = 1) -> int:
        r = self._get_redis()
        if not r:
            return 0
        try:
            count = await r.incrby(key, amount)
            if count == amount:
                await r.expire(key, ttl)
            return count
        except Exception:
            return 0

    # ── Tier helpers ──────────────────────────────────────────────────

    def _get_tier(self, user_id: str) -> str:
        sub = self._sub_repo.get_active_by_user(UUID(user_id))
        return sub["tier"] if sub else "free"

    def _redis_ttl(self, tier: str) -> int:
        if TIER_LIMITS.get(tier, {}).get("period") == "daily":
            return 2 * 86_400
        return 35 * 86_400

    # ── Redis key builders ────────────────────────────────────────────

    def _mk_msg(self, uid: str, period: str) -> str:
        return f"boulga:q:msg:{uid}:{period}"

    def _mk_tok(self, uid: str, period: str) -> str:
        return f"boulga:q:tok:{uid}:{period}"

    def _mk_fil(self, uid: str, period: str) -> str:
        return f"boulga:q:fil:{uid}:{period}"

    def _mk_img(self, uid: str, period: str) -> str:
        return f"boulga:q:img:{uid}:{period}"

    # ── Postgres helpers ──────────────────────────────────────────────

    def _get_or_create_quota(self, user_id: str, tier: str) -> dict:
        limits      = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        period_start = _period_start_db(tier)
        quota = self._quota_repo.get_current(UUID(user_id), period_start)
        if not quota:
            quota = self._quota_repo.create({
                "user_id":         user_id,
                "period_start":    period_start,
                "messages_limit":  limits["messages"],
                "messages_used":   0,
                "files_generated": 0,
                "tokens_used":     0,
            })
        return quota

    # ── Consommation ─────────────────────────────────────────────────

    async def consume_message(self, user_id: str) -> None:
        tier   = self._get_tier(user_id)
        period = _period_key(tier)
        ttl    = self._redis_ttl(tier)

        await self._rincr(self._mk_msg(user_id, period), ttl)

        try:
            quota = self._get_or_create_quota(user_id, tier)
            self._quota_repo.add_messages(UUID(quota["id"]))
        except Exception as exc:
            logger.warning("quota persist message failed: %s", exc)

    async def consume_tokens(self, user_id: str, count: int) -> None:
        if count <= 0:
            return
        tier   = self._get_tier(user_id)
        period = _period_key(tier)
        ttl    = self._redis_ttl(tier)

        await self._rincr(self._mk_tok(user_id, period), ttl, count)

        try:
            quota = self._get_or_create_quota(user_id, tier)
            self._quota_repo.add_tokens(UUID(quota["id"]), count)
            if tier == "ocean":
                total = (quota.get("tokens_used") or 0) + count
                if total >= OCEAN_TOKEN_CAP:
                    logger.warning(
                        "OCEAN TOKEN CAP EXCEEDED user_id=%s tokens=%d",
                        user_id, total,
                    )
        except Exception as exc:
            logger.warning("quota persist tokens failed: %s", exc)

    async def consume_file(self, user_id: str) -> None:
        tier   = self._get_tier(user_id)
        period = _period_key(tier)
        ttl    = self._redis_ttl(tier)

        await self._rincr(self._mk_fil(user_id, period), ttl)

        try:
            quota = self._get_or_create_quota(user_id, tier)
            self._quota_repo.add_files(UUID(quota["id"]))
        except Exception as exc:
            logger.warning("quota persist file failed: %s", exc)

    # ── Lecture du quota restant ──────────────────────────────────────

    async def get_remaining(self, user_id: str) -> dict:
        tier   = self._get_tier(user_id)
        period = _period_key(tier)
        limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])

        msg_used = await self._rget(self._mk_msg(user_id, period))
        if msg_used == 0:
            # Fallback Postgres si Redis est vide (premier message ou après redémarrage)
            quota_db = self._quota_repo.get_current(UUID(user_id), _period_start_db(tier))
            if quota_db:
                msg_used = quota_db.get("messages_used") or 0

        tok_used = await self._rget(self._mk_tok(user_id, period))
        fil_used = await self._rget(self._mk_fil(user_id, period))

        msg_limit = limits["messages"]
        fil_limit = limits["files"]
        tok_limit = limits["tokens"] or 0

        return {
            "tier":               tier,
            "messages_used":      msg_used,
            "messages_limit":     msg_limit,
            "messages_remaining": max(0, msg_limit - msg_used),
            "files_remaining":    max(0, fil_limit - fil_used),
            # -1 = illimité (plans non-ocean), valeur réelle pour ocean
            "tokens_remaining":   max(0, tok_limit - tok_used) if tok_limit else -1,
            "period_end":         _period_end(tier),
        }

    # ── Vérifications ─────────────────────────────────────────────────

    async def is_message_allowed(self, user_id: str) -> bool:
        tier = self._get_tier(user_id)
        if tier == "ocean":
            # Seul le cap de tokens bloque l'Océan
            period   = _period_key(tier)
            tok_used = await self._rget(self._mk_tok(user_id, period))
            return tok_used < OCEAN_TOKEN_CAP
        remaining = await self.get_remaining(user_id)
        return remaining["messages_remaining"] > 0

    async def is_file_allowed(self, user_id: str) -> bool:
        tier = self._get_tier(user_id)
        if tier == "ocean":
            return True
        remaining = await self.get_remaining(user_id)
        return remaining["files_remaining"] > 0

    async def consume_image(self, user_id: str) -> None:
        """Consomme 1 crédit image + 5 messages équivalents."""
        tier   = self._get_tier(user_id)
        period = _period_key(tier)
        ttl    = self._redis_ttl(tier)

        await self._rincr(self._mk_img(user_id, period), ttl)
        # Une image = 5 messages équivalents sur le quota messages
        await self._rincr(self._mk_msg(user_id, period), ttl, 5)

        try:
            quota = self._get_or_create_quota(user_id, tier)
            self._quota_repo.add_files(UUID(quota["id"]))  # réutilise le compteur fichiers
        except Exception as exc:
            logger.warning("quota persist image failed: %s", exc)

    async def is_image_allowed(self, user_id: str) -> bool:
        """Vérifie si l'utilisateur peut générer une image selon son plan."""
        tier   = self._get_tier(user_id)
        limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        period = _period_key(tier)

        # Gratuit : 1 image/jour
        if tier == "free":
            daily_limit = limits["images_daily"]
            if daily_limit == 0:
                return False
            used = await self._rget(self._mk_img(user_id, period))
            return used < daily_limit

        # Océan : illimité (fair use)
        if tier == "ocean":
            return True

        # Autres plans payants : quota mensuel
        monthly_limit = limits.get("images_monthly", 0)
        if monthly_limit == 0:
            return False
        used = await self._rget(self._mk_img(user_id, period))
        return used < monthly_limit
