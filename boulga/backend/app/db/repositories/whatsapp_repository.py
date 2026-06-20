from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "whatsapp_sessions"


class WhatsAppRepository:
    def __init__(self, db: Client):
        self.db = db

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def get_by_id(self, session_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("id", str(session_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def get_by_phone(self, phone_number: str) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("phone_number", phone_number)
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def get_by_user(self, user_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("user_id", str(user_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def update(self, session_id: UUID, data: dict) -> dict:
        result = (
            self.db.table(TABLE)
            .update(data)
            .eq("id", str(session_id))
            .execute()
        )
        return result.data[0]

    def verify(self, session_id: UUID) -> dict:
        return self.update(session_id, {"verified": True})

    def update_last_activity(self, session_id: UUID) -> dict:
        return self.update(session_id, {"last_activity": "now()"})

    def delete(self, session_id: UUID) -> bool:
        self.db.table(TABLE).delete().eq("id", str(session_id)).execute()
        return True
