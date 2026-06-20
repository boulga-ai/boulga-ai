from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "user_agents"


class UserAgentRepository:
    def __init__(self, db: Client):
        self.db = db

    def assign(self, user_id: UUID, agent_id: UUID) -> dict:
        result = (
            self.db.table(TABLE)
            .insert({"user_id": str(user_id), "agent_id": str(agent_id)})
            .execute()
        )
        return result.data[0]

    def unassign(self, user_id: UUID, agent_id: UUID) -> bool:
        self.db.table(TABLE).delete().eq("user_id", str(user_id)).eq("agent_id", str(agent_id)).execute()
        return True

    def list_by_user(self, user_id: UUID) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("*, agents(*)")
            .eq("user_id", str(user_id))
            .order("assigned_at", desc=True)
            .execute()
        )
        return result.data if result is not None else None

    def count_by_user(self, user_id: UUID) -> int:
        result = (
            self.db.table(TABLE)
            .select("id", count="exact")
            .eq("user_id", str(user_id))
            .execute()
        )
        return result.count or 0

    def get(self, user_id: UUID, agent_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("user_id", str(user_id))
            .eq("agent_id", str(agent_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None
