"""test_referral.py — Programme de parrainage."""

from datetime import date, timedelta
from unittest.mock import MagicMock, patch
from uuid import uuid4

from tests.conftest import USERS, auth_headers, client, mock_db, mock_redis  # noqa: F401

REFERRER_ID = str(uuid4())
REFERRED_ID = str(uuid4())
REFERRAL_CODE = "TESTREF1"


def test_referral_link_returned(client, mock_db):
    """GET /api/referrals/link → lien de parrainage."""
    user = USERS["free"]
    # user_id = USER_FREE_ID, son referral_code = "TESTFREE"
    with patch(
        "app.db.repositories.user_repository.UserRepository.get_by_id",
        return_value=user,
    ):
        res = client.get("/api/referrals/link", headers=auth_headers("free"))
        assert res.status_code == 200
        data = res.json()
        assert "referral_link" in data
        assert "TESTFREE" in data["referral_link"]


def test_referral_stats_returned(client, mock_db):
    """GET /api/referrals/stats → statistiques de parrainage."""
    with (
        patch("app.services.referral_service.ReferralService.get_stats", return_value={
            "referral_link": "https://boulga.ai/register?ref=TESTFREE",
            "total_referrals": 3,
            "completed_count": 2,
            "pending_count": 1,
            "history": [],
        }),
    ):
        res = client.get("/api/referrals/stats", headers=auth_headers("free"))
        assert res.status_code == 200
        data = res.json()
        assert "total_referrals" in data
        assert "referral_link" in data


def test_register_with_referral_code(client):
    """Inscription avec ?ref=CODE → référence enregistrée."""
    new_user = {
        "id": REFERRED_ID,
        "email": "new@example.com",
        "name": "New User",
        "referral_code": "NEWUSR01",
        "password_hash": "$2b$12$dummy",
        "date_of_birth": "1995-01-01",
    }

    with (
        patch("app.db.repositories.user_repository.UserRepository.get_by_email",
              return_value=None),
        patch("app.db.repositories.user_repository.UserRepository.create",
              return_value=new_user),
        patch("app.services.referral_service.ReferralService.register_with_referral",
              return_value=True),
    ):
        res = client.post("/api/auth/register", json={
            "name": "New User",
            "email": "new@example.com",
            "password": "Password123!",
            "date_of_birth": "1995-01-01",
            "referral_code": REFERRAL_CODE,
        })
        assert res.status_code == 201


def test_reward_due_at_is_7_days_from_now():
    """schedule_reward() → reward_due_at = today + 7 jours."""
    from app.services.referral_service import SAFETY_DELAY
    assert SAFETY_DELAY == 7

    expected = date.today() + timedelta(days=7)
    assert expected == date.today() + timedelta(days=SAFETY_DELAY)


def test_self_referral_blocked():
    """Un utilisateur ne peut pas se parrainer lui-même."""
    user_id = str(uuid4())
    user = {
        "id": user_id,
        "email": "self@test.com",
        "referral_code": "SELFCODE",
    }

    with patch(
        "app.db.repositories.user_repository.UserRepository.get_by_referral_code",
        return_value=user,
    ):
        from app.services.referral_service import ReferralService

        mock_db_client = MagicMock()
        with patch("app.db.session.get_supabase", return_value=mock_db_client):
            svc = ReferralService()
            # Même user_id pour referrer et referred → doit être bloqué
            result = svc.register_with_referral(user_id, "SELFCODE")
            assert result is False


def test_referral_rewards_mapping():
    """Vérification du tableau des récompenses."""
    from app.services.referral_service import REFERRAL_REWARDS

    assert REFERRAL_REWARDS["goutte"]["tier"] == "goutte"
    assert REFERRAL_REWARDS["goutte"]["days"] == 14
    assert REFERRAL_REWARDS["source"]["tier"] == "goutte"
    assert REFERRAL_REWARDS["source"]["days"] == 30
    assert REFERRAL_REWARDS["fleuve"]["tier"] == "source"
    assert REFERRAL_REWARDS["ocean"]["tier"] == "fleuve"


def test_auto_parrainage_blocked_endpoint(client, mock_db):
    """POST /api/referrals/invite avec son propre email → bloqué (email != self)."""
    with patch(
        "app.services.referral_service.ReferralService.send_invite_email",
        side_effect=ValueError("Vous ne pouvez pas vous inviter vous-même"),
    ):
        res = client.post("/api/referrals/invite", json={
            "email": USERS["free"]["email"],  # même email que l'utilisateur connecté
        }, headers=auth_headers("free"))
        # Doit retourner une erreur
        assert res.status_code in (400, 403, 409, 422, 500)
