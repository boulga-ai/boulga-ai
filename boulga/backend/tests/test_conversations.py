"""test_conversations.py — créer → lister → détail → supprimer."""

from unittest.mock import patch
from uuid import uuid4

from tests.conftest import auth_headers, client, mock_db, mock_redis  # noqa: F401

CONV_ID = str(uuid4())
USER_FREE_ID = "11111111-1111-1111-1111-111111111111"

CONV_RECORD = {
    "id": CONV_ID,
    "user_id": USER_FREE_ID,
    "title": "Test conversation",
    "provider": "gemini",
    "model_id": "gemini-2.5-flash",
    "created_at": "2026-06-15T10:00:00",
    "updated_at": "2026-06-15T10:01:00",
}

_CONV_REPO = "app.db.repositories.conversation_repository.ConversationRepository"
_MSG_REPO  = "app.db.repositories.message_repository.MessageRepository"


def test_list_conversations_empty(client):
    """GET /api/conversations → liste vide."""
    with patch(f"{_CONV_REPO}.list_by_user", return_value=[]):
        res = client.get("/api/conversations", headers=auth_headers("free"))
    assert res.status_code == 200
    assert res.json() == []


def test_list_conversations_with_data(client):
    """GET /api/conversations → liste avec une conversation."""
    with patch(f"{_CONV_REPO}.list_by_user", return_value=[CONV_RECORD]):
        res = client.get("/api/conversations", headers=auth_headers("free"))
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["id"] == CONV_ID


def test_get_conversation_detail(client):
    """GET /api/conversations/{id} → conversation + messages."""
    with (
        patch(f"{_CONV_REPO}.get_by_id", return_value=CONV_RECORD),
        patch(f"{_MSG_REPO}.list_by_conversation", return_value=[]),
    ):
        res = client.get(f"/api/conversations/{CONV_ID}", headers=auth_headers("free"))
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == CONV_ID
    assert "messages" in data


def test_get_conversation_not_found(client):
    """GET /api/conversations/{unknown_id} → 404."""
    with patch(f"{_CONV_REPO}.get_by_id", return_value=None):
        res = client.get(f"/api/conversations/{uuid4()}", headers=auth_headers("free"))
    assert res.status_code == 404


def test_delete_conversation(client):
    """DELETE /api/conversations/{id} → 204."""
    with (
        patch(f"{_CONV_REPO}.get_by_id", return_value=CONV_RECORD),
        patch(f"{_MSG_REPO}.delete_by_conversation", return_value=None),
        patch(f"{_CONV_REPO}.delete", return_value=True),
    ):
        res = client.delete(f"/api/conversations/{CONV_ID}", headers=auth_headers("free"))
    assert res.status_code == 204


def test_conversations_requires_auth(client):
    """GET /api/conversations sans token → 401."""
    res = client.get("/api/conversations")
    assert res.status_code in (401, 403)
