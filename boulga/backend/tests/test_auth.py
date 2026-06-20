"""test_auth.py — register → login → me → logout (flux complet)."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

from tests.conftest import USERS, auth_headers, client, mock_db, mock_redis  # noqa: F401

NEW_USER_ID = str(uuid4())


def _make_user(email="test@example.com", name="Test User", password="Password123!"):
    from app.core.security import hash_password
    return {
        "id": NEW_USER_ID,
        "email": email,
        "name": name,
        "referral_code": "ABCD1234",
        "date_of_birth": "1990-06-15",
        "password_hash": hash_password(password),
        "email_verified": False,
    }


# ── Register ───────────────────────────────────────────────────────────────────

def test_register_creates_user(client):
    """POST /api/auth/register → 201 avec token."""
    user = _make_user()
    with (
        patch("app.db.repositories.user_repository.UserRepository.get_by_email",
              return_value=None),
        patch("app.db.repositories.user_repository.UserRepository.create",
              return_value=user),
    ):
        res = client.post("/api/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "Password123!",
            "date_of_birth": "1990-06-15",
        })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "test@example.com"
    assert "password_hash" not in data["user"]


def test_register_duplicate_email(client):
    """POST /api/auth/register avec email existant → 409."""
    existing = _make_user()
    with patch("app.db.repositories.user_repository.UserRepository.get_by_email",
               return_value=existing):
        res = client.post("/api/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "Password123!",
            "date_of_birth": "1990-06-15",
        })
    assert res.status_code == 409
    assert "Email" in res.json()["detail"]


def test_register_short_password(client):
    """Mot de passe < 8 caractères → 422."""
    res = client.post("/api/auth/register", json={
        "name": "Test",
        "email": "test@example.com",
        "password": "abc",
        "date_of_birth": "1990-01-01",
    })
    assert res.status_code == 422


# ── Login ──────────────────────────────────────────────────────────────────────

def test_login_valid_credentials(client):
    """POST /api/auth/login → 200 avec token."""
    user = _make_user()
    with patch("app.db.repositories.user_repository.UserRepository.get_by_email",
               return_value=user):
        res = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "Password123!",
        })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"


def test_login_wrong_password(client):
    """Mauvais mot de passe → 401."""
    user = _make_user()
    with patch("app.db.repositories.user_repository.UserRepository.get_by_email",
               return_value=user):
        res = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "WrongPassword!",
        })
    assert res.status_code == 401


def test_login_unknown_email(client):
    """Email inconnu → 401."""
    with patch("app.db.repositories.user_repository.UserRepository.get_by_email",
               return_value=None):
        res = client.post("/api/auth/login", json={
            "email": "unknown@example.com",
            "password": "Password123!",
        })
    assert res.status_code == 401


# ── Me ─────────────────────────────────────────────────────────────────────────

def test_me_returns_user(client):
    """GET /api/auth/me avec token valide → profil utilisateur."""
    user = USERS["free"]
    with patch("app.db.repositories.user_repository.UserRepository.get_by_id",
               return_value=user):
        res = client.get("/api/auth/me", headers=auth_headers("free"))
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == user["email"]
    assert "password_hash" not in data


def test_me_without_token(client):
    """GET /api/auth/me sans token → 401 ou 403."""
    res = client.get("/api/auth/me")
    assert res.status_code in (401, 403)


# ── Logout ─────────────────────────────────────────────────────────────────────

def test_logout_returns_ok(client):
    """POST /api/auth/logout → 200."""
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert "message" in res.json()
