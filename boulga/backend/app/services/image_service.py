"""image_service.py — Génération d'images via OpenRouter.

Routing par provider :
  gemini   → google/gemini-2.5-flash   (génération image native Imagen 3)
  chatgpt  → openai/gpt-image-1        (successeur DALL-E 3, juin 2026)
  claude   → openai/gpt-image-1        (Claude ne génère pas d'images)
  deepseek → openai/gpt-image-1        (DeepSeek ne génère pas d'images)

L'image générée est stockée dans le bucket Supabase "generated-files".
"""

from __future__ import annotations

import base64
import logging
import uuid
from datetime import date

import httpx

from app.config import settings
from app.services.file_service import FileService

logger = logging.getLogger(__name__)

# ── Mapping provider → modèle image ──────────────────────────────────────────

_IMAGE_MODELS: dict[str, str] = {
    "gemini":   "google/gemini-2.5-flash",
    "chatgpt":  "openai/gpt-image-1",
    "claude":   "openai/gpt-image-1",
    "deepseek": "openai/gpt-image-1",
}

# Providers qui ne font pas de génération d'images nativement
_FALLBACK_PROVIDERS = {"claude", "deepseek"}

_OPENROUTER_IMAGE_URL = "https://openrouter.ai/api/v1/images/generations"

# ── Service ───────────────────────────────────────────────────────────────────


class ImageGenerationError(Exception):
    pass


async def generate_image(
    provider: str,
    prompt: str,
    user_id: str,
    conversation_id: str | None = None,
    message_id: str | None = None,
) -> dict:
    """
    Génère une image via OpenRouter et la stocke dans Supabase.

    Retourne :
      {
        "file_id": str,
        "url": str,            # /api/files/{id}/download
        "filename": str,
        "mime_type": "image/png",
        "size_bytes": int,
        "used_fallback": bool, # True si provider ne supporte pas la génération
      }
    """
    model = _IMAGE_MODELS.get(provider, "openai/gpt-image-1")
    used_fallback = provider in _FALLBACK_PROVIDERS

    if not settings.OPENROUTER_API_KEY:
        raise ImageGenerationError("OPENROUTER_API_KEY non configurée")

    # ── Appel OpenRouter ──────────────────────────────────────────────────
    payload = {
        "model": model,
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "quality": "high",
        "response_format": "b64_json",
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.FRONTEND_URL,
        "X-Title": "Boulga AI",
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                _OPENROUTER_IMAGE_URL,
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:400]
        raise ImageGenerationError(f"OpenRouter image error {exc.response.status_code}: {body}") from exc
    except Exception as exc:
        raise ImageGenerationError(f"Erreur réseau génération image: {exc}") from exc

    # ── Décoder l'image ───────────────────────────────────────────────────
    try:
        b64 = data["data"][0]["b64_json"]
        image_bytes = base64.b64decode(b64)
    except (KeyError, IndexError, Exception) as exc:
        raise ImageGenerationError(f"Réponse image inattendue: {exc}") from exc

    # ── Stocker dans Supabase ─────────────────────────────────────────────
    today = date.today().strftime("%Y%m%d")
    short_id = str(uuid.uuid4())[:8]
    filename = f"image_{today}_{short_id}.png"

    file_svc = FileService()
    record = file_svc.store_generated_file(
        user_id=user_id,
        filename=filename,
        content=image_bytes,
        mime_type="image/png",
        conversation_id=conversation_id,
        message_id=message_id,
    )

    return {
        "file_id":      record["id"],
        "url":          f"/api/files/{record['id']}/download",
        "filename":     filename,
        "mime_type":    "image/png",
        "size_bytes":   len(image_bytes),
        "used_fallback": used_fallback,
    }
