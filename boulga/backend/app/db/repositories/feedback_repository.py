from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "feedback"


class FeedbackRepository:
    def __init__(self, db: Client):
        self.db = db

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def get_by_id(self, feedback_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("id", str(feedback_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def get_by_message(self, message_id: UUID, user_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("message_id", str(message_id))
            .eq("user_id", str(user_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def list_by_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data if result is not None else None

    def upsert(self, data: dict) -> dict:
        result = (
            self.db.table(TABLE)
            .upsert(data, on_conflict="user_id,message_id")
            .execute()
        )
        return result.data[0]
