"""test_llms.py — GET /api/llms : 4 LLM, 1 actif (Gemini)."""

from tests.conftest import auth_headers, client  # noqa: F401


def test_llms_returns_four_providers(client):
    res = client.get("/api/llms", headers=auth_headers("free"))
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 4, f"Attendu 4 LLM, reçu {len(data)}: {[d['provider'] for d in data]}"


def test_llms_only_gemini_active(client):
    res = client.get("/api/llms", headers=auth_headers("free"))
    assert res.status_code == 200
    data = res.json()
    active = [d for d in data if d["active"]]
    assert len(active) == 1
    assert active[0]["provider"] == "gemini"


def test_llms_each_has_two_models(client):
    res = client.get("/api/llms", headers=auth_headers("free"))
    data = res.json()
    for llm in data:
        assert len(llm["models"]) == 2, (
            f"{llm['provider']} devrait avoir 2 modèles, a {len(llm['models'])}"
        )


def test_llms_gemini_models_are_correct(client):
    res = client.get("/api/llms", headers=auth_headers("free"))
    data = res.json()
    gemini = next(d for d in data if d["provider"] == "gemini")
    model_ids = {m["id"] for m in gemini["models"]}
    assert "gemini-2.5-flash" in model_ids
    assert "gemini-2.5-pro" in model_ids
