"""test_compare.py — Compare multi-LLM (Source+) ; user Gratuit → 403."""

from unittest.mock import MagicMock, patch, AsyncMock

from tests.conftest import auth_headers, client, mock_db, mock_redis  # noqa: F401

COMPARE_PAYLOAD = {
    "prompt": "Explique le machine learning",
    "providers": [
        {"provider": "gemini", "model_id": "gemini-2.5-flash"},
        {"provider": "gemini", "model_id": "gemini-2.5-pro"},
    ],
}


def test_compare_blocked_for_free_user(client, mock_db):
    """POST /api/compare avec tier free → 403."""
    with patch(
        "app.services.compare_service.CompareService._get_tier",
        return_value="free",
    ):
        res = client.post("/api/compare", json=COMPARE_PAYLOAD, headers=auth_headers("free"))
        assert res.status_code == 403


def test_compare_blocked_for_goutte_user(client, mock_db):
    """POST /api/compare avec tier goutte → 403."""
    with patch(
        "app.services.compare_service.CompareService._get_tier",
        return_value="goutte",
    ):
        res = client.post("/api/compare", json=COMPARE_PAYLOAD, headers=auth_headers("goutte"))
        assert res.status_code == 403


def test_compare_source_plus_tiers():
    """SOURCE_PLUS_TIERS contient bien source, fleuve, ocean."""
    from app.services.compare_service import SOURCE_PLUS_TIERS
    assert "source" in SOURCE_PLUS_TIERS
    assert "fleuve" in SOURCE_PLUS_TIERS
    assert "ocean" in SOURCE_PLUS_TIERS
    assert "free" not in SOURCE_PLUS_TIERS
    assert "goutte" not in SOURCE_PLUS_TIERS


def test_compare_history_requires_auth(client):
    """GET /api/compare/history sans token → 401."""
    res = client.get("/api/compare/history")
    assert res.status_code in (401, 403)


def test_compare_requires_at_least_two_providers(client):
    """POST /api/compare avec 1 seul provider → 422."""
    with patch(
        "app.services.compare_service.CompareService._get_tier",
        return_value="source",
    ):
        res = client.post("/api/compare", json={
            "prompt": "Test",
            "providers": [{"provider": "gemini", "model_id": "gemini-2.5-flash"}],
        }, headers=auth_headers("source"))
        assert res.status_code == 422
