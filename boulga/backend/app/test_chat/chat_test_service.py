"""chat_test_service.py — Service de chat du MVP.

UN SEUL flux, streaming, avec le tool create_document disponible (tool_choice=auto).
Le LLM décide seul : soit il streame du texte, soit il appelle create_document.

Mécanique :
  - On streame avec stream=True + tools.
  - Les deltas de texte sont renvoyés en temps réel (events "chunk").
  - Les deltas de tool_call sont accumulés (le JSON arrive en fragments).
  - À la fin : si un tool_call create_document a été produit, on rend le document
    et on émet "file_ready". Sinon, le texte streamé est la réponse finale.

Pas de regex, pas de détection de mots-clés. Le LLM décide via tool calling.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import AsyncIterator, Optional

import litellm

from app.test_chat.document_renderer import render_document
from app.test_chat.llm_test import (
    CREATE_DOCUMENT_TOOL, _MAX_OUTPUT_TOKENS, _OR_HEADERS, _api_key, _or_model,
)
from app.test_chat.prompt_test import document_system

logger = logging.getLogger("boulga.chat_test")

# Répertoire temporaire pour les fichiers générés (MVP)
_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "_generated")
os.makedirs(_OUTPUT_DIR, exist_ok=True)


def _build_messages(history: list[dict], system_prompt: str) -> list[dict]:
    msgs: list[dict] = [{"role": "system", "content": system_prompt}]
    for m in history:
        role = m.get("role", "user")
        if role == "model":
            role = "assistant"
        msgs.append({"role": role, "content": m.get("content", "")})
    return msgs


def _accumulate_tool_args(acc: dict, delta_tool_calls) -> None:
    """Accumule les fragments d'arguments d'un tool call à travers les chunks."""
    for tc in delta_tool_calls:
        idx = getattr(tc, "index", 0) or 0
        slot = acc.setdefault(idx, {"name": None, "args": ""})
        fn = getattr(tc, "function", None)
        if fn is not None:
            if getattr(fn, "name", None):
                slot["name"] = fn.name
            if getattr(fn, "arguments", None):
                slot["args"] += fn.arguments


def _parse_args(raw: str) -> dict:
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        # Récupération best-effort d'un JSON tronqué
        for suffix in ("}", "]}", '"}]}', '"}]}}', '"}}]}}'):
            try:
                return json.loads(raw + suffix)
            except (json.JSONDecodeError, TypeError):
                continue
        logger.warning("Arguments tool tronqués, irrécupérables")
        return {}


async def stream_message(
    model_id: str,
    history: list[dict],
) -> AsyncIterator[dict]:
    """Flux principal. Yield des events :
      {"type":"chunk","text":...}            texte en temps réel
      {"type":"building"}                    le LLM a choisi de générer un document
      {"type":"file_ready","file_id",...}    document prêt
      {"type":"error","message":...}
      {"type":"done"}
    """
    system = document_system()  # chat + skill (le tool est toujours dispo)
    messages = _build_messages(history, system)

    text_parts: list[str] = []
    tool_acc: dict[int, dict] = {}
    finish_reason = ""

    try:
        response = await litellm.acompletion(
            model=_or_model(model_id),
            messages=messages,
            stream=True,
            tools=[CREATE_DOCUMENT_TOOL],
            tool_choice="auto",
            max_tokens=_MAX_OUTPUT_TOKENS.get(model_id, 8192),
            api_key=_api_key(),
            extra_headers=_OR_HEADERS,
            timeout=180,
        )

        async for chunk in response:
            try:
                choice = chunk.choices[0]
            except (AttributeError, IndexError):
                continue
            delta = getattr(choice, "delta", None)
            if getattr(choice, "finish_reason", None):
                finish_reason = choice.finish_reason
            if delta is None:
                continue
            # Texte
            if getattr(delta, "content", None):
                text_parts.append(delta.content)
                yield {"type": "chunk", "text": delta.content}
            # Tool call (fragments)
            if getattr(delta, "tool_calls", None):
                _accumulate_tool_args(tool_acc, delta.tool_calls)

    except Exception as exc:
        yield {"type": "error", "message": f"Erreur LLM : {exc}"}
        return

    if finish_reason == "length":
        logger.warning("Réponse tronquée (length) — document possiblement partiel")

    # Le LLM a-t-il appelé create_document ?
    doc_call = None
    for slot in tool_acc.values():
        if slot.get("name") == "create_document":
            doc_call = slot
            break

    if doc_call is None:
        # Réponse texte simple
        yield {"type": "done"}
        return

    # Génération du document
    yield {"type": "building"}

    args = _parse_args(doc_call["args"])
    fmt = (args.get("format") or "docx").lower()
    filename = args.get("filename") or f"document.{fmt}"
    summary = args.get("summary") or ""
    document = args.get("document") or {}

    if not document.get("blocks"):
        yield {"type": "error", "message": "Le document généré est vide."}
        yield {"type": "done"}
        return

    try:
        data, mime = render_document(fmt, document)
    except ValueError as exc:
        yield {"type": "error", "message": str(exc)}
        yield {"type": "done"}
        return
    except Exception as exc:
        yield {"type": "error", "message": f"Erreur de rendu : {exc}"}
        yield {"type": "done"}
        return

    file_id = uuid.uuid4().hex
    safe_name = filename.replace("/", "_").replace("\\", "_")
    path = os.path.join(_OUTPUT_DIR, f"{file_id}_{safe_name}")
    with open(path, "wb") as f:
        f.write(data)

    yield {
        "type": "file_ready",
        "file_id": file_id,
        "filename": safe_name,
        "mime_type": mime,
        "size_bytes": len(data),
        "summary": summary,
        "format": fmt,
    }
    yield {"type": "done"}


def get_generated_path(file_id: str, filename: str) -> Optional[str]:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    path = os.path.join(_OUTPUT_DIR, f"{file_id}_{safe_name}")
    return path if os.path.exists(path) else None