"""llm_test.py — Manager LLM minimal pour le MVP de test.

Deux usages :
  - stream_chat()        : streaming texte token par token (chat normal)
  - generate_document()  : appel non-streaming avec le tool create_document,
                           récupère le JSON de blocs produit par le LLM.

Tout passe par LiteLLM → OpenRouter. Modèles Claude only (haiku, sonnet, opus).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, AsyncIterator, Optional

import litellm

logger = logging.getLogger("boulga.llm_test")

# ── Modèles Claude via OpenRouter (POINTS dans les versions) ──────────────────
_MODELS: dict[str, str] = {
    "claude-haiku-4-5":  "anthropic/claude-haiku-4.5",
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
    "claude-opus-4-6":   "anthropic/claude-opus-4.6",
}

# Budget de sortie par modèle (pour ne pas tronquer un gros JSON de document)
_MAX_OUTPUT_TOKENS: dict[str, int] = {
    "claude-haiku-4-5":  8192,
    "claude-sonnet-4-6": 16384,
    "claude-opus-4-6":   16384,
}

_OR_HEADERS = {
    "HTTP-Referer": "https://boulga.ai",
    "X-Title": "Boulga Test",
}


def _or_model(model_id: str) -> str:
    name = _MODELS.get(model_id, model_id)
    return f"openrouter/{name}"


def _api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY", "")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY manquant dans l'environnement (.env)")
    return key


# ── Tool create_document ─────────────────────────────────────────────────────
# La description vend la liberté de composition au LLM, sans figer de valeurs.

CREATE_DOCUMENT_TOOL: dict = {
    "type": "function",
    "function": {
        "name": "create_document",
        "description": (
            "Produit un document téléchargeable (Word .docx ou PDF) quand "
            "l'utilisateur en a besoin. Tu composes le document librement avec "
            "des blocs typés. Appelle cet outil dès que produire un document est "
            "pertinent — n'annonce pas, agis."
        ),
        "parameters": {
            "type": "object",
            "required": ["format", "filename", "summary", "document"],
            "properties": {
                "format": {
                    "type": "string",
                    "enum": ["docx", "pdf"],
                    "description": "Format de sortie.",
                },
                "filename": {
                    "type": "string",
                    "description": "Nom du fichier avec extension, ex: rapport.docx",
                },
                "summary": {
                    "type": "string",
                    "description": "Résumé court (1 phrase) affiché à l'utilisateur.",
                },
                "document": {
                    "type": "object",
                    "description": (
                        "Le document, composé de blocs. Voir les types de blocs et "
                        "leviers de style dans tes instructions. Couleurs = hex de "
                        "ton choix, puces = caractères de ton choix. Compose selon "
                        "la demande."
                    ),
                    "properties": {
                        "title": {"type": "string"},
                        "blocks": {
                            "type": "array",
                            "items": {"type": "object"},
                            "description": "Liste ordonnée de blocs typés.",
                        },
                    },
                    "required": ["blocks"],
                },
            },
        },
    },
}


# ── Construction des messages ────────────────────────────────────────────────

def _build_messages(history: list[dict], system_prompt: str) -> list[dict]:
    msgs: list[dict] = []
    if system_prompt:
        msgs.append({"role": "system", "content": system_prompt})
    for m in history:
        role = m.get("role", "user")
        if role == "model":
            role = "assistant"
        msgs.append({"role": role, "content": m.get("content", "")})
    return msgs


# ── Streaming chat (texte pur) ───────────────────────────────────────────────

async def stream_chat(
    model_id: str,
    history: list[dict],
    system_prompt: str = "",
) -> AsyncIterator[str]:
    """Streame la réponse texte token par token."""
    response = await litellm.acompletion(
        model=_or_model(model_id),
        messages=_build_messages(history, system_prompt),
        stream=True,
        max_tokens=_MAX_OUTPUT_TOKENS.get(model_id, 4096),
        api_key=_api_key(),
        extra_headers=_OR_HEADERS,
        timeout=120,
    )
    async for chunk in response:
        try:
            delta = chunk.choices[0].delta
        except (AttributeError, IndexError):
            continue
        if delta and getattr(delta, "content", None):
            yield delta.content


# ── Génération de document (tool non-streaming) ──────────────────────────────

async def generate_document(
    model_id: str,
    history: list[dict],
    system_prompt: str = "",
) -> dict:
    """Appel non-streaming avec le tool create_document.

    Retourne :
      {"text": str, "tool_call": {"name","arguments"} | None, "finish_reason": str}

    Non-streaming volontairement : le tool call (le JSON) n'a pas besoin d'être
    streamé (on ne le montre pas), et ça évite le bug LiteLLM de perte de
    fragments d'arguments en streaming.
    """
    response = await litellm.acompletion(
        model=_or_model(model_id),
        messages=_build_messages(history, system_prompt),
        stream=False,
        tools=[CREATE_DOCUMENT_TOOL],
        tool_choice="auto",
        max_tokens=_MAX_OUTPUT_TOKENS.get(model_id, 8192),
        api_key=_api_key(),
        extra_headers=_OR_HEADERS,
        timeout=180,
    )

    choice = response.choices[0]
    msg = choice.message
    finish_reason = getattr(choice, "finish_reason", "") or ""

    if finish_reason == "length":
        logger.warning("Réponse tronquée (finish_reason=length) — max_tokens insuffisant")

    text = msg.content or ""
    tool_call: Optional[dict] = None

    if getattr(msg, "tool_calls", None):
        tc = msg.tool_calls[0]
        raw_args = tc.function.arguments
        try:
            arguments = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
        except (json.JSONDecodeError, TypeError):
            # JSON tronqué : on tente une récupération best-effort
            arguments = _salvage_json(raw_args) if isinstance(raw_args, str) else {}
        tool_call = {"name": tc.function.name, "arguments": arguments or {}}

    return {"text": text, "tool_call": tool_call, "finish_reason": finish_reason}


def _salvage_json(raw: str) -> dict:
    """Tente de récupérer un JSON tronqué (document partiel).

    Stratégie simple : si le JSON est coupé, on essaie de fermer les structures
    ouvertes pour récupérer au moins les blocs complets.
    """
    # Tentative directe
    for attempt in (raw, raw + "}", raw + "]}", raw + '"}]}', raw + '"}]}}'):
        try:
            return json.loads(attempt)
        except (json.JSONDecodeError, TypeError):
            continue
    logger.warning("JSON de document irrécupérable après troncature")
    return {}


# ── Titre court (utilitaire) ─────────────────────────────────────────────────

async def generate_title(model_id: str, first_message: str) -> str:
    try:
        response = await litellm.acompletion(
            model=_or_model(model_id),
            messages=[
                {"role": "system", "content":
                 "Génère un titre de 3-5 mots pour cette conversation. "
                 "Réponds uniquement avec le titre, sans ponctuation finale."},
                {"role": "user", "content": first_message[:300]},
            ],
            stream=False,
            max_tokens=20,
            api_key=_api_key(),
            extra_headers=_OR_HEADERS,
            timeout=30,
        )
        return (response.choices[0].message.content or "").strip().strip('"')[:80]
    except Exception:
        return "Nouvelle conversation"