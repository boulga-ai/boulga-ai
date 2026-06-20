"""test_health.py — GET / et GET /health."""

from tests.conftest import client  # noqa: F401  (pour pytest)


def test_root_returns_200(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "running"
    assert "name" in data
    assert "version" in data


def test_health_returns_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "env" in data
