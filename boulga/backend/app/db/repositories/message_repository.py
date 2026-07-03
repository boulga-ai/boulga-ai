from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "messages"


class MessageRepository:
    def __init__(self, db: Client):
        self.db = db

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def get_by_id(self, message_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("id", str(message_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def list_by_conversation(
        self, conversation_id: UUID, limit: int = 100, offset: int = 0
    ) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("conversation_id", str(conversation_id))
            .order("created_at", desc=False)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data if result is not None else []

    def list_recent_by_conversation(
        self, conversation_id: UUID, limit: int = 50
    ) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("conversation_id", str(conversation_id))
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        data = result.data if result is not None else []
        return list(reversed(data))

    def count_by_conversation(self, conversation_id: UUID) -> int:
        result = (
            self.db.table(TABLE)
            .select("id", count="exact")
            .eq("conversation_id", str(conversation_id))
            .execute()
        )
        return result.count or 0

    def update_content(self, message_id: str, content: str) -> None:
        self.db.table(TABLE).update({"content": content}).eq("id", message_id).execute()

    def delete_by_conversation(self, conversation_id: UUID) -> bool:
        self.db.table(TABLE).delete().eq("conversation_id", str(conversation_id)).execute()
        return True

    def delete(self, message_id: UUID) -> bool:
        self.db.table(TABLE).delete().eq("id", str(message_id)).execute()
        return True
