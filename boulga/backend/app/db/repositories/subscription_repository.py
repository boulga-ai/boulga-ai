from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "subscriptions"


class SubscriptionRepository:
    def __init__(self, db: Client):
        self.db = db

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def get_by_id(self, subscription_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("id", str(subscription_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def get_active_by_user(self, user_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("user_id", str(user_id))
            .eq("status", "active")
            .order("created_at", desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def list_by_user(self, user_id: UUID) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .execute()
        )
        return result.data if result is not None else None

    def update(self, subscription_id: UUID, data: dict) -> dict:
        result = (
            self.db.table(TABLE)
            .update(data)
            .eq("id", str(subscription_id))
            .execute()
        )
        return result.data[0]

    def cancel(self, subscription_id: UUID) -> dict:
        return self.update(subscription_id, {"status": "cancelled"})

    def expire(self, subscription_id: UUID) -> dict:
        return self.update(subscription_id, {"status": "expired"})
