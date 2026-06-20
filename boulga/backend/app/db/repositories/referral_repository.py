from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "referrals"


class ReferralRepository:
    def __init__(self, db: Client):
        self.db = db

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def get_by_id(self, referral_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("id", str(referral_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def get_by_referred(self, referred_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("referred_id", str(referred_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def list_by_referrer(self, referrer_id: UUID) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("referrer_id", str(referrer_id))
            .order("created_at", desc=True)
            .execute()
        )
        return result.data if result is not None else None

    def count_completed_by_referrer(self, referrer_id: UUID) -> int:
        result = (
            self.db.table(TABLE)
            .select("id", count="exact")
            .eq("referrer_id", str(referrer_id))
            .eq("status", "completed")
            .execute()
        )
        return result.count or 0

    def get_pending_rewards(self) -> list[dict]:
        """Retourne les parrainages en attente dont la récompense est due."""
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("status", "pending")
            .lte("reward_due_at", "now()")
            .execute()
        )
        return result.data if result is not None else None

    def update(self, referral_id: UUID, data: dict) -> dict:
        result = (
            self.db.table(TABLE)
            .update(data)
            .eq("id", str(referral_id))
            .execute()
        )
        return result.data[0]

    def complete(self, referral_id: UUID) -> dict:
        return self.update(
            referral_id,
            {"status": "completed", "reward_granted_at": "now()"},
        )

    def cancel(self, referral_id: UUID) -> dict:
        return self.update(referral_id, {"status": "cancelled"})
