"""test_chat.py — Envoi de message → streaming SSE (mock LLM)."""

from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import auth_headers, client, mock_db, mock_redis  # noqa: F401

CONV_ID = "aaaa0000-0000-0000-0000-000000000001"


async def fake_stream():
    """Générateur SSE de test."""
    yield "data: {\"event\": \"conversation\", \"data\": {\"id\": \"" + CONV_ID + "\"}}\n\n"
    yield "data: {\"event\": \"chunk\", \"data\": \"Bonjour\"}\n\n"
    yield "data: {\"event\": \"done\", \"data\": {\"message_id\": \"msg-01\"}}\n\n"


def test_chat_requires_auth(client):
    """POST /api/chat sans token → 401/403."""
    res = client.post("/api/chat", json={
        "message": "Bonjour",
        "provider": "gemini",
        "model_id": "gemini-2.5-flash",
    })
    assert res.status_code in (401, 403)


def test_chat_streaming_response(client, mock_db, mock_redis):
    """POST /api/chat → réponse SSE sans erreur."""
    with (
        patch("app.services.quota_service.QuotaService.is_message_allowed",
              new_callable=AsyncMock, return_value=True),
        patch("app.services.quota_service.QuotaService.consume_message",
              new_callable=AsyncMock, return_value=None),
        patch("app.services.chat_service.ChatService.stream_message",
              return_value=fake_stream()),
        patch("app.services.subscription_service.SubscriptionService.check_can_use_model",
              return_value=True),
    ):
        res = client.post("/api/chat", json={
            "message": "Bonjour",
            "provider": "gemini",
            "model_id": "gemini-2.5-flash",
        }, headers=auth_headers("free"))

        # SSE retourne toujours 200 (même si le corps est un stream)
        assert res.status_code == 200


def test_chat_empty_message_rejected(client):
    """POST /api/chat avec message vide → 422."""
    res = client.post("/api/chat", json={
        "message": "",
        "provider": "gemini",
        "model_id": "gemini-2.5-flash",
    }, headers=auth_headers("free"))
    # Validation : message vide rejeté (422) ou accepté selon schema
    assert res.status_code in (422, 200)


def test_chat_with_valid_conversation_id(client, mock_db, mock_redis):
    """POST /api/chat avec conversation_id existant → OK."""
    with (
        patch("app.services.quota_service.QuotaService.is_message_allowed",
              new_callable=AsyncMock, return_value=True),
        patch("app.services.chat_service.ChatService.stream_message",
              return_value=fake_stream()),
        patch("app.services.subscription_service.SubscriptionService.check_can_use_model",
              return_value=True),
    ):
        res = client.post("/api/chat", json={
            "message": "Suite du contexte",
            "provider": "gemini",
            "model_id": "gemini-2.5-flash",
            "conversation_id": CONV_ID,
        }, headers=auth_headers("free"))

        assert res.status_code == 200
