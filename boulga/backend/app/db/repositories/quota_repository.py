from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "usage_quotas"


class QuotaRepository:
    def __init__(self, db: Client):
        self.db = db

    def get_current(self, user_id: UUID, period_start: str) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("user_id", str(user_id))
            .eq("period_start", period_start)
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def increment_messages(self, quota_id: UUID, count: int = 1) -> dict:
        result = (
            self.db.rpc(
                "increment_quota_messages",
                {"p_quota_id": str(quota_id), "p_count": count},
            ).execute()
        )
        # Fallback : lecture après update direct
        update_result = (
            self.db.table(TABLE)
            .update({"updated_at": "now()"})
            .eq("id", str(quota_id))
            .execute()
        )
        return update_result.data[0] if update_result.data else {}

    def add_messages(self, quota_id: UUID, count: int = 1) -> dict:
        """Incrémente messages_used via SQL brut."""
        result = (
            self.db.table(TABLE)
            .select("messages_used")
            .eq("id", str(quota_id))
            .single()
            .execute()
        )
        new_count = (result.data.get("messages_used") or 0) + count
        update = (
            self.db.table(TABLE)
            .update({"messages_used": new_count, "updated_at": "now()"})
            .eq("id", str(quota_id))
            .execute()
        )
        return update.data[0]

    def add_tokens(self, quota_id: UUID, tokens: int) -> dict:
        result = (
            self.db.table(TABLE)
            .select("tokens_used")
            .eq("id", str(quota_id))
            .single()
            .execute()
        )
        new_tokens = (result.data.get("tokens_used") or 0) + tokens
        update = (
            self.db.table(TABLE)
            .update({"tokens_used": new_tokens, "updated_at": "now()"})
            .eq("id", str(quota_id))
            .execute()
        )
        return update.data[0]

    def add_files(self, quota_id: UUID, count: int = 1) -> dict:
        result = (
            self.db.table(TABLE)
            .select("files_generated")
            .eq("id", str(quota_id))
            .single()
            .execute()
        )
        new_count = (result.data.get("files_generated") or 0) + count
        update = (
            self.db.table(TABLE)
            .update({"files_generated": new_count, "updated_at": "now()"})
            .eq("id", str(quota_id))
            .execute()
        )
        return update.data[0]

    def get_by_id(self, quota_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("id", str(quota_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None
