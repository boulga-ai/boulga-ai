"""Fixtures partagées pour tous les tests backend Boulga.

Stratégie :
  - Variables d'env configurées AVANT toute importation de l'app.
  - Supabase (create_client) et Redis (from_url) patchés globalement.
  - JWT générés avec le secret de test pour simuler des utilisateurs par tier.
  - Chaque fixture d'utilisateur expose (user_data, headers) pour simplifier
    les tests authentifiés.
"""

# ── Variables d'environnement de test (avant tout import app) ─────────────────

import os

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-anon-key")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret")
os.environ.setdefault("JWT_EXPIRE_MINUTES", "60")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("RESEND_API_KEY", "re_test_key")
os.environ.setdefault("CINETPAY_API_KEY", "test-cinetpay-key")
os.environ.setdefault("CINETPAY_SITE_ID", "12345678")
os.environ.setdefault("CINETPAY_SECRET", "test-cinetpay-secret")
os.environ.setdefault("WHATSAPP_TOKEN", "test-wa-token")
os.environ.setdefault("WHATSAPP_PHONE_ID", "123456789012345")
os.environ.setdefault("WHATSAPP_VERIFY_TOKEN", "test-verify-token")
os.environ.setdefault("META_APP_SECRET", "test-meta-secret")
os.environ.setdefault("CRON_SECRET", "test-cron-secret")
os.environ.setdefault("APP_ENV", "test")

# ── Imports ───────────────────────────────────────────────────────────────────

from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

# ── IDs de test fixes ─────────────────────────────────────────────────────────

USER_FREE_ID    = "11111111-1111-1111-1111-111111111111"
USER_GOUTTE_ID  = "22222222-2222-2222-2222-222222222222"
USER_SOURCE_ID  = "33333333-3333-3333-3333-333333333333"
USER_FLEUVE_ID  = "44444444-4444-4444-4444-444444444444"
USER_OCEAN_ID   = "55555555-5555-5555-5555-555555555555"

USERS: dict[str, dict] = {
    "free": {
        "id": USER_FREE_ID,
        "email": "free@boulga.test",
        "name": "Test Free",
        "referral_code": "TESTFREE",
        "date_of_birth": "1990-01-01",
        "password_hash": "$2b$12$dummy_hash_for_testing_only",
        "tier": "free",
    },
    "goutte": {
        "id": USER_GOUTTE_ID,
        "email": "goutte@boulga.test",
        "name": "Test Goutte",
        "referral_code": "TESTGOUTE",
        "date_of_birth": "1990-01-01",
        "password_hash": "$2b$12$dummy_hash_for_testing_only",
        "tier": "goutte",
    },
    "source": {
        "id": USER_SOURCE_ID,
        "email": "source@boulga.test",
        "name": "Test Source",
        "referral_code": "TESTSRC",
        "date_of_birth": "1990-01-01",
        "password_hash": "$2b$12$dummy_hash_for_testing_only",
        "tier": "source",
    },
    "fleuve": {
        "id": USER_FLEUVE_ID,
        "email": "fleuve@boulga.test",
        "name": "Test Fleuve",
        "referral_code": "TESTFLV",
        "date_of_birth": "1990-01-01",
        "password_hash": "$2b$12$dummy_hash_for_testing_only",
        "tier": "fleuve",
    },
    "ocean": {
        "id": USER_OCEAN_ID,
        "email": "ocean@boulga.test",
        "name": "Test Océan",
        "referral_code": "TESTOCN",
        "date_of_birth": "1990-01-01",
        "password_hash": "$2b$12$dummy_hash_for_testing_only",
        "tier": "ocean",
    },
}


# ── Générateurs de tokens ──────────────────────────────────────────────────────

def make_token(tier: str) -> str:
    """Génère un JWT de test pour un tier donné."""
    # Import après configuration de JWT_SECRET
    from app.core.security import create_jwt
    user = USERS[tier]
    return create_jwt({"sub": user["id"], "email": user["email"]})


def auth_headers(tier: str) -> dict:
    return {"Authorization": f"Bearer {make_token(tier)}"}


# ── Fixture : client de test avec Supabase et Redis mockés ────────────────────

@pytest.fixture(scope="function")
def mock_db():
    """Mock du client Supabase. Chaque test configure les retours qu'il veut."""
    mock_client = MagicMock()
    # Chaîne de méthodes Supabase par défaut : retourne une liste vide
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.neq.return_value = mock_table
    mock_table.lt.return_value = mock_table
    mock_table.lte.return_value = mock_table
    mock_table.gte.return_value = mock_table
    mock_table.in_.return_value = mock_table
    mock_table.ilike.return_value = mock_table
    mock_table.order.return_value = mock_table
    mock_table.limit.return_value = mock_table
    mock_table.maybe_single.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[], count=0)
    return mock_client


@pytest.fixture(scope="function")
def mock_redis():
    """Mock du client Redis."""
    mock_r = MagicMock()
    mock_r.get.return_value = None
    mock_r.set.return_value = True
    mock_r.incr.return_value = 1
    mock_r.expire.return_value = True
    mock_r.ttl.return_value = -2
    return mock_r


@pytest.fixture(scope="function")
def client(mock_db, mock_redis):
    """TestClient FastAPI avec Supabase et Redis patchés.

    On patche app.db.session.get_supabase (après cache clear) pour que
    chaque appel dans les routers/services retourne mock_db.
    """
    from app.db import session as db_session
    from app.config import get_settings

    get_settings.cache_clear()
    db_session.get_supabase.cache_clear()

    with (
        patch.object(db_session, "get_supabase", return_value=mock_db),
        patch("redis.from_url", return_value=mock_redis),
    ):
        from main import app
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c

    db_session.get_supabase.cache_clear()
    get_settings.cache_clear()
