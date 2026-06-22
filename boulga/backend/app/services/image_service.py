"""image_service.py — Génération et modification d'images via OpenRouter.

Les modèles image d'OpenRouter retournent les images dans message.images[0].image_url.url
sous forme de data URI (data:image/png;base64,...).

Routing :
  gemini   → google/gemini-2.5-flash-image  (Nano Banana)
  chatgpt  → openai/gpt-5-image-mini
  claude   → google/gemini-2.5-flash-image  (Claude ne génère pas d'images)
  deepseek → google/gemini-2.5-flash-image  (DeepSeek ne génère pas d'images)

Support img2img :
  Si previous_image_bytes est fourni, l'image précédente est passée en contexte
  multimodal → le modèle la modifie au lieu d'en créer une nouvelle.
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

# ── Mapping provider → modèle image OpenRouter ───────────────────────────────

_IMAGE_MODELS: dict[str, str] = {
    "gemini":   "google/gemini-2.5-flash-image",
    "chatgpt":  "openai/gpt-5-image-mini",
    "claude":   "google/gemini-2.5-flash-image",
    "deepseek": "google/gemini-2.5-flash-image",
}

_FALLBACK_PROVIDERS = {"claude", "deepseek"}

_OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"

# Mots-clés indiquant une modification d'image existante
_MODIFY_RE = re.compile(
    r"\b(modifie|modifier|change|changer|ajoute|ajouter|enlève|enlever|"
    r"retire|retirer|remplace|remplacer|transforme|transformer|"
    r"mets|mettre|rends|rendre|adapte|adapter|refais|refaire|"
    r"edit|update|modify|add|remove|change)\b",
    re.IGNORECASE | re.UNICODE,
)


def wants_image_modification(message: str) -> bool:
    """Retourne True si le message semble demander une modification d'image existante."""
    return bool(_MODIFY_RE.search(message))


# ── Service ───────────────────────────────────────────────────────────────────


class ImageGenerationError(Exception):
    pass


async def generate_image(
    provider: str,
    prompt: str,
    user_id: str,
    conversation_id: str | None = None,
    message_id: str | None = None,
    previous_image_bytes: bytes | None = None,
) -> dict:
    """
    Génère ou modifie une image via OpenRouter et la stocke dans Supabase.

    Si previous_image_bytes est fourni, l'image est passée en contexte multimodal
    (img2img) — le modèle modifie l'image existante au lieu d'en créer une nouvelle.

    Retourne :
      {
        "file_id": str,
        "url": str,              # URL signée Supabase (2h)
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

    # ── Construire le message utilisateur (texte seul ou multimodal) ──────────
    if previous_image_bytes:
        b64_img = base64.b64encode(previous_image_bytes).decode()
        user_content = [
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{b64_img}"},
            },
            {"type": "text", "text": prompt},
        ]
    else:
        user_content = prompt  # type: ignore[assignment]

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": user_content}],
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
        "file_id":       record["id"],
        "url":           record.get("signed_url") or f"/api/files/{record['id']}/download",
        "filename":      filename,
        "mime_type":     "image/png",
        "size_bytes":    len(image_bytes),
        "used_fallback": used_fallback,
    }
