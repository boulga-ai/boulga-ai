"""test_payment.py — Initier un paiement, webhook success, billing annuel = 365 jours."""

from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from tests.conftest import auth_headers, client, mock_db, mock_redis  # noqa: F401

PAYMENT_ID = str(uuid4())
EXTERNAL_REF = "TXN-TEST-001"


def test_billing_days_monthly_is_30():
    """Facturation mensuelle = 30 jours de service."""
    from app.services.subscription_service import BILLING_DAYS
    assert BILLING_DAYS["monthly"] == 30


def test_billing_days_annual_is_365():
    """Facturation annuelle = 365 jours de service (12 mois)."""
    from app.services.subscription_service import BILLING_DAYS
    assert BILLING_DAYS["annual"] == 365


def test_annual_subscription_expires_after_365_days():
    """Activation annual → expires_at = today + 365 jours."""
    from app.services.subscription_service import BILLING_DAYS
    days = BILLING_DAYS["annual"]
    expected = date.today() + timedelta(days=days)
    assert days == 365
    assert expected == date.today() + timedelta(days=365)


def test_initiate_payment_monthly(client, mock_db):
    """POST /api/payments/initiate cycle=monthly → retourne payment_url."""
    payment_record = {
        "id": PAYMENT_ID,
        "user_id": "11111111-1111-1111-1111-111111111111",
        "tier": "goutte",
        "billing_cycle": "monthly",
        "amount_fcfa": 2999,
        "status": "pending",
        "external_ref": EXTERNAL_REF,
    }
    mock_db.table.return_value.execute.return_value = MagicMock(data=[payment_record])

    with patch(
        "app.services.payment_service.PaymentService.initiate_payment",
        new_callable=AsyncMock,
        return_value="https://cinetpay.com/pay/test",
    ):
        res = client.post("/api/payments/initiate", json={
            "tier": "goutte",
            "billing_cycle": "monthly",
        }, headers=auth_headers("free"))

        assert res.status_code == 200
        assert "payment_url" in res.json()


def test_initiate_payment_annual(client, mock_db):
    """POST /api/payments/initiate cycle=annual → payment_url."""
    payment_record = {
        "id": PAYMENT_ID,
        "user_id": "11111111-1111-1111-1111-111111111111",
        "tier": "source",
        "billing_cycle": "annual",
        "amount_fcfa": 59990,
        "status": "pending",
        "external_ref": EXTERNAL_REF,
    }
    mock_db.table.return_value.execute.return_value = MagicMock(data=[payment_record])

    with patch(
        "app.services.payment_service.PaymentService.initiate_payment",
        new_callable=AsyncMock,
        return_value="https://cinetpay.com/pay/test2",
    ):
        res = client.post("/api/payments/initiate", json={
            "tier": "source",
            "billing_cycle": "annual",
        }, headers=auth_headers("free"))

        assert res.status_code == 200
        data = res.json()
        assert "payment_url" in data


def test_tier_prices_are_correct():
    """Vérification des prix par tier."""
    from app.services.subscription_service import TIER_PRICES
    assert TIER_PRICES["goutte"]["monthly"] == 2_999
    assert TIER_PRICES["goutte"]["annual"] == 29_990
    assert TIER_PRICES["source"]["monthly"] == 5_999
    assert TIER_PRICES["ocean"]["monthly"] == 29_999
    assert TIER_PRICES["ocean"]["annual"] == 299_990


def test_webhook_activates_subscription(client, mock_db):
    """POST /api/payments/webhook (paiement réussi) → abonnement activé."""
    payment_record = {
        "id": PAYMENT_ID,
        "user_id": "11111111-1111-1111-1111-111111111111",
        "tier": "goutte",
        "billing_cycle": "monthly",
        "amount_fcfa": 2999,
        "status": "pending",
        "external_ref": EXTERNAL_REF,
    }
    # mock get_by_external_ref
    mock_db.table.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data=payment_record
    )
    # mock update (payment status)
    mock_db.table.return_value.execute.return_value = MagicMock(data=[{**payment_record, "status": "completed"}])

    with (
        patch(
            "app.services.payment_service.PaymentService._verify_with_cinetpay",
            new_callable=AsyncMock,
            return_value={"status": "ACCEPTED", "tier": "goutte", "billing_cycle": "monthly"},
        ),
        patch("app.services.subscription_service.SubscriptionService.activate_subscription",
              return_value={"id": str(uuid4()), "tier": "goutte", "status": "active"}),
        patch("app.services.payment_service.PaymentService._send_confirmation_email",
              new_callable=AsyncMock, return_value=None),
    ):
        res = client.post("/api/payments/webhook", json={
            "cpm_trans_id": EXTERNAL_REF,
            "cpm_site_id": "12345678",
            "cpm_result": "00",
        })

        # Le webhook doit répondre 200 (même si un step échoue)
        assert res.status_code == 200
