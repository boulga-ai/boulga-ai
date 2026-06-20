"""image_service.py — Génération d'images via OpenRouter (chat completions).

Les modèles image d'OpenRouter retournent les images dans message.images[0].image_url.url
sous forme de data URI (data:image/png;base64,...).

Routing :
  gemini   → google/gemini-2.5-flash-image  (Nano Banana)
  chatgpt  → openai/gpt-5-image-mini
  claude   → google/gemini-2.5-flash-image  (Claude ne génère pas d'images)
  deepseek → google/gemini-2.5-flash-image  (DeepSeek ne génère pas d'images)

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

# ── Mapping provider → modèle image OpenRouter ───────────────────────────────

_IMAGE_MODELS: dict[str, str] = {
    "gemini":   "google/gemini-2.5-flash-image",
    "chatgpt":  "openai/gpt-5-image-mini",
    "claude":   "google/gemini-2.5-flash-image",   # fallback
    "deepseek": "google/gemini-2.5-flash-image",   # fallback
}

_FALLBACK_PROVIDERS = {"claude", "deepseek"}

_OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"

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
        "used_fallback": bool,
      }
    """
    model = _IMAGE_MODELS.get(provider, "google/gemini-2.5-flash-image")
    used_fallback = provider in _FALLBACK_PROVIDERS

    if not settings.OPENROUTER_API_KEY:
        raise ImageGenerationError("OPENROUTER_API_KEY non configurée")

    # ── Appel OpenRouter chat completions ─────────────────────────────────────
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt},
        ],
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
                _OPENROUTER_CHAT_URL,
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

    # ── Extraire l'image depuis message.images ─────────────────────────────
    try:
        message = data["choices"][0]["message"]
        images = message.get("images") or []
        if not images:
            # Fallback : vérifier si content contient une data URI
            content = message.get("content") or ""
            if "data:image" in content:
                # Extraire la data URI du texte
                import re
                match = re.search(r"data:image/[^;]+;base64,([A-Za-z0-9+/=]+)", content)
                if match:
                    image_bytes = base64.b64decode(match.group(1))
                else:
                    raise ImageGenerationError("Aucune image dans la réponse OpenRouter")
            else:
                raise ImageGenerationError(f"Aucune image dans la réponse OpenRouter. Contenu: {str(message)[:200]}")
        else:
            img_url = images[0]["image_url"]["url"]
            # Le format est "data:image/png;base64,<base64data>"
            if img_url.startswith("data:"):
                header, b64 = img_url.split(",", 1)
                image_bytes = base64.b64decode(b64)
            else:
                # URL externe → télécharger
                async with httpx.AsyncClient(timeout=30.0) as client:
                    dl = await client.get(img_url)
                    dl.raise_for_status()
                    image_bytes = dl.content
    except ImageGenerationError:
        raise
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
        "file_id":       record["id"],
        "url":           f"/api/files/{record['id']}/download",
        "filename":      filename,
        "mime_type":     "image/png",
        "size_bytes":    len(image_bytes),
        "used_fallback": used_fallback,
    }
