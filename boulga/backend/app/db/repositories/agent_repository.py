from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "agents"


class AgentRepository:
    def __init__(self, db: Client):
        self.db = db

    def create(self, data: dict) -> dict:
        result = self.db.table(TABLE).insert(data).execute()
        return result.data[0]

    def get_by_id(self, agent_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("id", str(agent_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def get_by_slug(self, slug: str) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("slug", slug)
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def list_active(self) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("active", True)
            .order("name")
            .execute()
        )
        return result.data if result is not None else None

    def update(self, agent_id: UUID, data: dict) -> dict:
        result = (
            self.db.table(TABLE)
            .update(data)
            .eq("id", str(agent_id))
            .execute()
        )
        return result.data[0]
