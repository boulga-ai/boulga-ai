from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "users"


class UserRepository:
    def __init__(self, db: Client):
        self.db = db

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def get_by_id(self, user_id: UUID) -> Optional[dict]:
        result = self.db.table(TABLE).select("*").eq("id", str(user_id)).maybe_single().execute()
        return result.data if result is not None else None

    def get_by_email(self, email: str) -> Optional[dict]:
        result = self.db.table(TABLE).select("*").eq("email", email.lower()).maybe_single().execute()
        return result.data if result is not None else None

    def get_by_referral_code(self, code: str) -> Optional[dict]:
        result = self.db.table(TABLE).select("*").eq("referral_code", code).maybe_single().execute()
        return result.data if result is not None else None

    def update(self, user_id: UUID, data: dict) -> dict:
        result = self.db.table(TABLE).update(data).eq("id", str(user_id)).execute()
        return result.data[0]

    def verify_email(self, user_id: UUID) -> dict:
        return self.update(user_id, {"email_verified": True})

    def delete(self, user_id: UUID) -> bool:
        self.db.table(TABLE).delete().eq("id", str(user_id)).execute()
        return True

    def list_all(self, limit: int = 200) -> list[dict]:
        result = self.db.table(TABLE).select("*").order("created_at", desc=True).limit(limit).execute()
        return result.data if result else []
