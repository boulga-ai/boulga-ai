from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "payments"


class PaymentRepository:
    def __init__(self, db: Client):
        self.db = db

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def get_by_id(self, payment_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("id", str(payment_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def get_by_external_ref(self, external_ref: str) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("external_ref", external_ref)
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def update_status(self, payment_id: UUID, status: str) -> dict:
        result = (
            self.db.table(TABLE)
            .update({"status": status})
            .eq("id", str(payment_id))
            .execute()
        )
        return result.data[0]

    def list_by_user(self, user_id: UUID, limit: int = 20, offset: int = 0) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data if result is not None else None
