from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "files"


class FileRepository:
    def __init__(self, db: Client):
        self.db = db

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def get_by_id(self, file_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("id", str(file_id))
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

    def count_by_user_in_period(
        self, user_id: UUID, period_start: str, period_end: str
    ) -> int:
        result = (
            self.db.table(TABLE)
            .select("id", count="exact")
            .eq("user_id", str(user_id))
            .gte("created_at", period_start)
            .lte("created_at", period_end)
            .execute()
        )
        return result.count or 0

    def list_by_conversation(self, conversation_id: UUID) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("id, original_name, mime_type, size_bytes, message_id, created_at")
            .eq("conversation_id", str(conversation_id))
            .order("created_at")
            .execute()
        )
        return result.data or []

    def delete(self, file_id: UUID) -> bool:
        self.db.table(TABLE).delete().eq("id", str(file_id)).execute()
        return True
