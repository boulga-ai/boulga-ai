from fastapi import APIRouter

from app.manager.registry import get_all_llms
from app.schemas.chat import LLMOut

router = APIRouter()


@router.get("/api/llms", response_model=list[LLMOut])
async def list_llms():
    """
    Retourne la liste complète des LLM et leurs modèles depuis le registre.
    Format : [{ provider, label, description, active, models: [...] }]
    """
    return get_all_llms()
