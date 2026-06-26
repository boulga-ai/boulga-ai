"""document_renderer.py — Point d'entrée unifié de génération de documents.

render_document(fmt, document) -> (bytes, mime_type)

Le même JSON de blocs produit un .docx ou un .pdf selon `fmt`.
"""

from __future__ import annotations

from app.test_chat.to_docx import render_docx
from app.test_chat.to_pdf import render_pdf

_MIME = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf":  "application/pdf",
}


def render_document(fmt: str, document: dict) -> tuple[bytes, str]:
    """Rend le document JSON dans le format demandé.

    Lève ValueError si le format est inconnu.
    """
    fmt = (fmt or "").lower().strip()
    if fmt == "docx":
        return render_docx(document), _MIME["docx"]
    if fmt == "pdf":
        return render_pdf(document), _MIME["pdf"]
    raise ValueError(f"Format non supporté : {fmt!r} (attendu: docx, pdf)")