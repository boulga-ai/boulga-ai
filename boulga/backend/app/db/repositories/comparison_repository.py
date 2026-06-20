from typing import Optional
from uuid import UUID

from supabase import Client

SESSION_TABLE = "comparison_sessions"
RESULT_TABLE = "comparison_results"


class ComparisonRepository:
    def __init__(self, db: Client):
        self.db = db

    def create_session(self, data: dict) -> dict:
        result = self.db.table(SESSION_TABLE).insert(data).execute()
        return result.data[0]

    def get_session_by_id(self, session_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(SESSION_TABLE)
            .select("*")
            .eq("id", str(session_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def get_session_with_results(self, session_id: UUID) -> Optional[dict]:
        session = self.get_session_by_id(session_id)
        if not session:
            return None
        results = (
            self.db.table(RESULT_TABLE)
            .select("*")
            .eq("session_id", str(session_id))
            .order("created_at")
            .execute()
        )
        session["results"] = results.data
        return session

    def create_result(self, data: dict) -> dict:
        result = self.db.table(RESULT_TABLE).insert(data).execute()
        return result.data[0]

    def list_sessions_by_user(
        self, user_id: UUID, limit: int = 20, offset: int = 0
    ) -> list[dict]:
        result = (
            self.db.table(SESSION_TABLE)
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data if result is not None else None
