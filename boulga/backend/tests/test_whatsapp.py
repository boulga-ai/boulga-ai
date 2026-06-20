"""test_whatsapp.py — Webhook Meta et envoi de messages."""

from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import auth_headers, client, mock_db, mock_redis  # noqa: F401


# ── Webhook Verification ───────────────────────────────────────────────────────

def test_webhook_verification_challenge(client):
    """GET /api/whatsapp/webhook avec token valide → retourne le challenge."""
    with patch(
        "app.services.whatsapp_service.WhatsAppService.verify_webhook",
        return_value="test-challenge-12345",
    ):
        res = client.get(
            "/api/whatsapp/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "test-verify-token",
                "hub.challenge": "test-challenge-12345",
            },
        )
        assert res.status_code == 200
        assert "test-challenge-12345" in res.text


def test_webhook_verification_invalid_token(client):
    """GET /api/whatsapp/webhook avec mauvais token → 403."""
    with patch(
        "app.services.whatsapp_service.WhatsAppService.verify_webhook",
        return_value=None,  # token invalide
    ):
        res = client.get(
            "/api/whatsapp/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "wrong-token",
                "hub.challenge": "challenge",
            },
        )
        assert res.status_code == 403


# ── Incoming Message ───────────────────────────────────────────────────────────

def test_incoming_message_processed(client):
    """POST /api/whatsapp/webhook message entrant → 200 (traitement async)."""
    webhook_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "123",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"phone_number_id": "123456789012345"},
                    "messages": [{
                        "from": "+22670000001",
                        "id": "wamid.test",
                        "timestamp": "1718443200",
                        "type": "text",
                        "text": {"body": "Bonjour Boulga !"},
                    }],
                },
                "field": "messages",
            }],
        }],
    }

    import hmac
    import hashlib

    body = b'{"test": "payload"}'
    sig = hmac.new(b"test-meta-secret", body, hashlib.sha256).hexdigest()

    with patch(
        "app.services.whatsapp_service.WhatsAppService.verify_signature",
        return_value=True,
    ):
        res = client.post(
            "/api/whatsapp/webhook",
            json=webhook_payload,
        )
        # Le webhook retourne toujours 200 pour éviter les retries Meta
        assert res.status_code == 200


# ── Status & Link ──────────────────────────────────────────────────────────────

def test_whatsapp_status_no_link(client, mock_db):
    """GET /api/whatsapp/status sans numéro lié → null."""
    with patch(
        "app.services.whatsapp_service.WhatsAppService.get_linked_phone",
        return_value=None,
    ):
        res = client.get("/api/whatsapp/status", headers=auth_headers("source"))
        assert res.status_code == 200


def test_whatsapp_status_requires_auth(client):
    """GET /api/whatsapp/status sans token → 401."""
    res = client.get("/api/whatsapp/status")
    assert res.status_code in (401, 403)


def test_whatsapp_verify_webhook_token_matches():
    """WhatsAppService.verify_webhook retourne le challenge si le token correspond."""
    from app.services.whatsapp_service import WhatsAppService
    with patch("app.services.whatsapp_service.settings") as mock_settings:
        mock_settings.WHATSAPP_VERIFY_TOKEN = "my-secret-token"
        svc = WhatsAppService()
        result = svc.verify_webhook("subscribe", "my-secret-token", "challenge-xyz")
        assert result == "challenge-xyz"


def test_whatsapp_verify_webhook_wrong_token():
    """WhatsAppService.verify_webhook retourne None si le token ne correspond pas."""
    from app.services.whatsapp_service import WhatsAppService
    with patch("app.services.whatsapp_service.settings") as mock_settings:
        mock_settings.WHATSAPP_VERIFY_TOKEN = "correct-token"
        svc = WhatsAppService()
        result = svc.verify_webhook("subscribe", "wrong-token", "challenge-xyz")
        assert result is None
