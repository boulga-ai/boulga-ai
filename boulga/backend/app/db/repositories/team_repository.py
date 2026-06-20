from typing import Optional
from uuid import UUID

from supabase import Client

TABLE = "team_members"
MAX_TEAM_SIZE = 10  # Limite Océan


class TeamRepository:
    def __init__(self, db: Client):
        self.db = db

    def add_member(self, owner_user_id: UUID, member_user_id: UUID, role: str = "member") -> dict:
        result = (
            self.db.table(TABLE)
            .insert({
                "owner_user_id": str(owner_user_id),
                "member_user_id": str(member_user_id),
                "role": role,
            })
            .execute()
        )
        return result.data[0]

    def get_member(self, owner_user_id: UUID, member_user_id: UUID) -> Optional[dict]:
        result = (
            self.db.table(TABLE)
            .select("*")
            .eq("owner_user_id", str(owner_user_id))
            .eq("member_user_id", str(member_user_id))
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None

    def update_member(self, owner_user_id: UUID, member_user_id: UUID, data: dict) -> dict:
        result = (
            self.db.table(TABLE)
            .update(data)
            .eq("owner_user_id", str(owner_user_id))
            .eq("member_user_id", str(member_user_id))
            .execute()
        )
        return result.data[0]

    def mark_joined(self, owner_user_id: UUID, member_user_id: UUID) -> dict:
        return self.update_member(
            owner_user_id,
            member_user_id,
            {"joined_at": "now()"},
        )

    def remove_member(self, owner_user_id: UUID, member_user_id: UUID) -> bool:
        self.db.table(TABLE).delete().eq("owner_user_id", str(owner_user_id)).eq(
            "member_user_id", str(member_user_id)
        ).execute()
        return True

    def list_by_owner(self, owner_user_id: UUID) -> list[dict]:
        result = (
            self.db.table(TABLE)
            .select("*, users!member_user_id(id, name, email)")
            .eq("owner_user_id", str(owner_user_id))
            .order("invited_at", desc=True)
            .execute()
        )
        return result.data if result is not None else None

    def count_by_owner(self, owner_user_id: UUID) -> int:
        result = (
            self.db.table(TABLE)
            .select("id", count="exact")
            .eq("owner_user_id", str(owner_user_id))
            .execute()
        )
        return result.count or 0

    def is_full(self, owner_user_id: UUID) -> bool:
        return self.count_by_owner(owner_user_id) >= MAX_TEAM_SIZE
