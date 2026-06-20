from typing import Optional

from app.db.session import get_supabase
from app.db.repositories.tool_prompt_repository import ToolPromptRepository
from app.prompts.chat_prompts import DEFAULT_SYSTEM_PROMPT


def get_tool_prompt(slug: str) -> Optional[str]:
    """
    Lit le prompt spécialisé depuis la table tool_prompts en base.
    Retourne None si le slug est introuvable ou inactif.
    """
    db = get_supabase()
    repo = ToolPromptRepository(db)
    record = repo.get_by_slug(slug)
    if not record:
        return None
    return record.get("system_prompt")


def get_full_system_prompt(tool_slug: Optional[str] = None) -> str:
    """
    Combine le prompt de base Boulga et le prompt spécialisé si un outil est actif.
    Retourne le prompt de base seul si aucun tool_slug n'est fourni ou si le slug est inconnu.
    """
    if not tool_slug:
        return DEFAULT_SYSTEM_PROMPT

    tool_prompt = get_tool_prompt(tool_slug)
    if not tool_prompt:
        return DEFAULT_SYSTEM_PROMPT

    return f"{DEFAULT_SYSTEM_PROMPT}\n\n--- Contexte spécialisé ---\n{tool_prompt}"
