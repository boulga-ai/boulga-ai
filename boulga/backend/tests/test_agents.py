"""test_agents.py — Agents métier : Fleuve (2 max), Océan (illimité)."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

from tests.conftest import auth_headers, client, mock_db, mock_redis  # noqa: F401

AGENT_1_ID = str(uuid4())
AGENT_2_ID = str(uuid4())
AGENT_3_ID = str(uuid4())

AGENT_RECORD = lambda aid: {  # noqa: E731
    "id": aid,
    "slug": f"agent-{aid[:8]}",
    "name": "Agent Test",
    "description": "Un agent de test",
    "icon": "🤖",
    "category": "test",
    "active": True,
}


def test_list_agents_returns_data(client, mock_db):
    """GET /api/agents → liste les agents actifs."""
    agents = [AGENT_RECORD(AGENT_1_ID), AGENT_RECORD(AGENT_2_ID)]
    mock_db.table.return_value.execute.return_value = MagicMock(data=agents)

    res = client.get("/api/agents", headers=auth_headers("fleuve"))
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_assign_agent_fleuve_first_two_ok(client, mock_db):
    """User Fleuve : 1er et 2e agents assignés → OK."""
    with (
        patch("app.services.subscription_service.SubscriptionService.get_tier", return_value="fleuve"),
        patch("app.db.repositories.agent_repository.AgentRepository.get_by_id",
              return_value=AGENT_RECORD(AGENT_1_ID)),
        patch("app.db.repositories.user_agent_repository.UserAgentRepository.get",
              return_value=None),
        patch("app.db.repositories.user_agent_repository.UserAgentRepository.count_by_user",
              return_value=0),
        patch("app.db.repositories.user_agent_repository.UserAgentRepository.assign",
              return_value={"user_id": "fleuve-id", "agent_id": AGENT_1_ID}),
    ):
        res = client.post(
            f"/api/agents/{AGENT_1_ID}/assign",
            headers=auth_headers("fleuve"),
        )
        assert res.status_code == 200


def test_assign_agent_fleuve_third_blocked(client, mock_db):
    """User Fleuve : 3e assignation → 403."""
    with (
        patch("app.services.subscription_service.SubscriptionService.get_tier", return_value="fleuve"),
        patch("app.db.repositories.agent_repository.AgentRepository.get_by_id",
              return_value=AGENT_RECORD(AGENT_3_ID)),
        patch("app.db.repositories.user_agent_repository.UserAgentRepository.get",
              return_value=None),
        patch("app.db.repositories.user_agent_repository.UserAgentRepository.count_by_user",
              return_value=2),  # Déjà 2 assignés
    ):
        res = client.post(
            f"/api/agents/{AGENT_3_ID}/assign",
            headers=auth_headers("fleuve"),
        )
        assert res.status_code == 403


def test_assign_agent_ocean_unlimited(client, mock_db):
    """User Océan : peut assigner autant d'agents que voulu."""
    with (
        patch("app.services.subscription_service.SubscriptionService.get_tier", return_value="ocean"),
        patch("app.db.repositories.agent_repository.AgentRepository.get_by_id",
              return_value=AGENT_RECORD(AGENT_3_ID)),
        patch("app.db.repositories.user_agent_repository.UserAgentRepository.get",
              return_value=None),
        patch("app.db.repositories.user_agent_repository.UserAgentRepository.assign",
              return_value={"user_id": "ocean-id", "agent_id": AGENT_3_ID}),
    ):
        res = client.post(
            f"/api/agents/{AGENT_3_ID}/assign",
            headers=auth_headers("ocean"),
        )
        # Ocean n'est pas bloqué
        assert res.status_code == 200


def test_assign_agent_free_blocked(client, mock_db):
    """User Gratuit : assignation → 403."""
    with (
        patch("app.services.subscription_service.SubscriptionService.get_tier", return_value="free"),
    ):
        res = client.post(
            f"/api/agents/{AGENT_1_ID}/assign",
            headers=auth_headers("free"),
        )
        assert res.status_code == 403


def test_fleuve_agent_limit_is_two():
    """La constante FLEUVE_AGENT_LIMIT vaut bien 2."""
    from app.services.subscription_service import FLEUVE_AGENT_LIMIT
    assert FLEUVE_AGENT_LIMIT == 2
