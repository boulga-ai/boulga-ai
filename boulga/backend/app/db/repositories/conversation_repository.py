from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "conversations"


class ConversationRepository:
    def __init__(self, db: Client):
        self.db = db

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def get_by_id(self, conversation_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("id", str(conversation_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def list_by_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("user_id", str(user_id))
            .order("updated_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data if result is not None else None

    def update(self, conversation_id: UUID, data: dict) -> dict:
        result = (
            self.db.table(TABLE)
            .update(data)
            .eq("id", str(conversation_id))
            .execute()
        )
        return result.data[0]

    def update_title(self, conversation_id: UUID, title: str) -> dict:
        return self.update(conversation_id, {"title": title})

    def delete(self, conversation_id: UUID) -> bool:
        self.db.table(TABLE).delete().eq("id", str(conversation_id)).execute()
        return True

    def delete_old_by_user(self, user_id: UUID, before_date: str) -> int:
        """Supprime les conversations antérieures à before_date pour gérer l'historique."""
        result = (
            self.db.table(TABLE)
            .delete()
            .eq("user_id", str(user_id))
            .lt("updated_at", before_date)
            .execute()
        )
        return len(result.data)
