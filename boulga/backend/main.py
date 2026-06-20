from fastapi import FastAPI
from app.config import settings
from app.core.cors import setup_cors
from app.core.exceptions import setup_exception_handlers
from app.routers import (
    auth, llms, chat, conversations, files, compare, whatsapp,
    payments, subscriptions, agents, referrals, feedback, search, admin,
)

app = FastAPI(
    title="Boulga API",
    version="1.0.0",
    description="Boulga — Plateforme IA multi-modèles pour l'Afrique de l'Ouest",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

setup_cors(app)
setup_exception_handlers(app)

app.include_router(auth.router)
app.include_router(llms.router)
app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(files.router)
app.include_router(compare.router)
app.include_router(whatsapp.router)
app.include_router(payments.router)
app.include_router(subscriptions.router)
app.include_router(agents.router)
app.include_router(referrals.router)
app.include_router(feedback.router)
app.include_router(search.router)
app.include_router(admin.router)


@app.post("/api/internal/cron/expiry-reminders", include_in_schema=False)
async def cron_expiry_reminders(x_cron_secret: str | None = None):
    """
    Endpoint interne appelé quotidiennement (Railway cron ou cURL).
    Envoie les emails de rappel d'expiration (J-3).
    Protégé par CRON_SECRET dans les env vars (optionnel).
    """
    from app.config import settings as _s
    from app.services.subscription_service import SubscriptionService
    if _s.CRON_SECRET and x_cron_secret != _s.CRON_SECRET:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Forbidden")
    count = SubscriptionService().send_expiry_reminders()
    return {"reminders_sent": count}


@app.get("/")
async def root():
    return {"name": "Boulga API", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}
