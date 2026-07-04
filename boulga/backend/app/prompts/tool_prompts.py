from typing import Optional

from app.db.session import get_supabase
from app.db.repositories.tool_prompt_repository import ToolPromptRepository
from app.prompts.chat_prompts import DEFAULT_SYSTEM_PROMPT, IMAGE_GENERATION_ADDENDUM

_IMAGE_PROVIDERS: set[str] = {"openai", "gemini"}


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


def get_full_system_prompt(tool_slug: Optional[str] = None, provider: str = "") -> str:
    """
    Construit le prompt système complet.
    - Ajoute l'addendum image si le provider supporte la génération d'images.
    - Ajoute le prompt spécialisé si un tool_slug est fourni.
    """
    base = DEFAULT_SYSTEM_PROMPT
    if provider in _IMAGE_PROVIDERS:
        base = base + IMAGE_GENERATION_ADDENDUM

    if not tool_slug:
        return base

    tool_prompt = get_tool_prompt(tool_slug)
    if not tool_prompt:
        return base

    return f"{base}\n\n--- Contexte spécialisé ---\n{tool_prompt}"
