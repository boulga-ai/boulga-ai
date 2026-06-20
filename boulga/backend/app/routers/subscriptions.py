"""Router abonnements.

  GET /api/subscriptions/me → tier + billing_cycle + quotas restants
"""

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.services.subscription_service import SubscriptionService

router = APIRouter()


@router.get("/api/subscriptions/me")
async def get_my_subscription(user: dict = Depends(get_current_user)):
    """
    Retourne l'abonnement actif de l'utilisateur + quotas.
    Répond toujours (au pire : tier=free avec quotas Gratuit).
    """
    svc = SubscriptionService()
    return svc.get_current(user["sub"])
