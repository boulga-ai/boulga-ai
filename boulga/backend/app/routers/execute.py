from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.services.code_execution_service import CodeExecutionService

router = APIRouter(prefix="/api/test", tags=["test"])


class ExecuteRequest(BaseModel):
    code: str
    user_id: str
    conversation_id: str | None = None
    message_id: str | None = None
    timeout: int = 60


@router.post("/execute")
async def execute_code(body: ExecuteRequest):
    """
    Endpoint de test pour l'exécution de code Python dans une sandbox E2B.
    Disponible uniquement hors production.

    Le code peut générer des fichiers et les signaler via stdout :
        print("FILE:/home/user/mon_fichier.xlsx")

    Les fichiers sont uploadés sur Supabase et les URLs signées sont retournées.
    """
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")

    svc = CodeExecutionService()
    result = await svc.execute(
        code=body.code,
        user_id=body.user_id,
        conversation_id=body.conversation_id,
        message_id=body.message_id,
        timeout=body.timeout,
    )

    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "files": result.files,
        "error": result.error,
        "success": result.error is None,
    }
