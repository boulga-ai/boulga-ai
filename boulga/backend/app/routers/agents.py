"""Router agents métier.

  GET    /api/agents                → liste tous les agents actifs
  GET    /api/agents/me             → agents assignés à l'utilisateur connecté
  POST   /api/agents/{id}/assign    → assigner un agent (Fleuve: 2 max, Océan: tous)
  DELETE /api/agents/{id}/unassign  → désassigner un agent
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.services.subscription_service import SubscriptionService

router = APIRouter()


@router.get("/api/agents")
def list_agents(user: dict = Depends(get_current_user)):
    """Liste tous les agents actifs de la plateforme."""
    svc = SubscriptionService()
    return svc.get_all_agents()


@router.get("/api/agents/me")
def get_my_agents(user: dict = Depends(get_current_user)):
    """Retourne les agents assignés à l'utilisateur connecté."""
    svc = SubscriptionService()
    return svc.get_user_agents(user["sub"])


@router.post("/api/agents/{agent_id}/assign")
def assign_agent(agent_id: str, user: dict = Depends(get_current_user)):
    """Assigne un agent à l'utilisateur. Vérifie la limite selon le tier."""
    svc = SubscriptionService()
    try:
        result = svc.assign_agent(user["sub"], agent_id)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    return result


@router.delete("/api/agents/{agent_id}/unassign")
def unassign_agent(agent_id: str, user: dict = Depends(get_current_user)):
    """Désassigne un agent de l'utilisateur."""
    svc = SubscriptionService()
    try:
        svc.unassign_agent(user["sub"], agent_id)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    return {"status": "unassigned"}
