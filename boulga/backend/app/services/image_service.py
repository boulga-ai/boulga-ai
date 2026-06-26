"""image_service.py — Génération d'images via OpenRouter.

Providers supportés : gemini, chatgpt (openai)
Providers non supportés : claude, deepseek → retourner is_image_supported() = False

Le caller (chat_service) vérifie is_image_supported() avant d'appeler generate_image().
"""

from __future__ import annotations

import base64
import logging
import re
import uuid
from datetime import date

import httpx

from app.config import settings
from app.services.file_service import FileService

logger = logging.getLogger(__name__)

# ── Providers qui supportent la génération d'images ──────────────────────────

_IMAGE_SUPPORTED_PROVIDERS: set[str] = {"gemini", "chatgpt", "openai"}

# Mapping provider → modèle image OpenRouter
_IMAGE_MODELS: dict[str, str] = {
    "gemini":  "google/gemini-2.5-flash-image",
    "chatgpt": "openai/gpt-5-image-mini",
    "openai":  "openai/gpt-5-image-mini",
}

_OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"


def is_image_supported(provider: str) -> bool:
    """Retourne True si ce provider peut générer des images."""
    return provider in _IMAGE_SUPPORTED_PROVIDERS


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
    Seuls gemini et chatgpt/openai sont supportés.

    Retourne :
      {
        "file_id": str,
        "url": str,
        "filename": str,
        "mime_type": "image/png",
        "size_bytes": int,
      }
    """
    if not is_image_supported(provider):
        raise ImageGenerationError(
            f"{provider.capitalize()} ne supporte pas la génération d'images."
        )

    model = _IMAGE_MODELS.get(provider)
    if not model:
        raise ImageGenerationError(f"Modèle image introuvable pour {provider}")

    if not settings.OPENROUTER_API_KEY:
        raise ImageGenerationError("OPENROUTER_API_KEY non configurée")

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.FRONTEND_URL,
        "X-Title": "Boulga AI",
    }

    # ── Appel OpenRouter ──────────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(_OPENROUTER_CHAT_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:400]
        raise ImageGenerationError(
            f"OpenRouter image error {exc.response.status_code}: {body}"
        ) from exc
    except Exception as exc:
        raise ImageGenerationError(f"Erreur réseau génération image: {exc}") from exc

    # ── Extraire l'image (message.images ou data URI dans content) ────────────
    try:
        msg = data["choices"][0]["message"]
        images = msg.get("images") or []
        if images:
            img_url = images[0]["image_url"]["url"]
            if img_url.startswith("data:"):
                _, b64 = img_url.split(",", 1)
                image_bytes = base64.b64decode(b64)
            else:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    dl = await client.get(img_url)
                    dl.raise_for_status()
                    image_bytes = dl.content
        else:
            content = msg.get("content") or ""
            match = re.search(r"data:image/[^;]+;base64,([A-Za-z0-9+/=]+)", content)
            if match:
                image_bytes = base64.b64decode(match.group(1))
            else:
                raise ImageGenerationError(
                    f"Aucune image dans la réponse OpenRouter. Contenu: {str(msg)[:200]}"
                )
    except ImageGenerationError:
        raise
    except Exception as exc:
        raise ImageGenerationError(f"Réponse image inattendue: {exc}") from exc

    # ── Stocker dans Supabase ─────────────────────────────────────────────────
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
        "file_id":    record["id"],
        "url":        record.get("signed_url") or f"/api/files/{record['id']}/download",
        "filename":   filename,
        "mime_type":  "image/png",
        "size_bytes": len(image_bytes),
    }
