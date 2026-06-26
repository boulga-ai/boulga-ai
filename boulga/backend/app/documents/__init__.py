from .to_docx import render_docx
from .to_pdf import render_pdf


def render_document(fmt: str, document: dict) -> tuple[bytes, str]:
    """Render a composition document to bytes and mime type.

    fmt: 'docx' or 'pdf'
    document: JSON-compatible dict matching the document block schema.
    """
    fmt_lower = fmt.lower()
    if fmt_lower == "docx":
        return render_docx(document)
    if fmt_lower == "pdf":
        return render_pdf(document)
    raise ValueError(f"Unsupported document format: {fmt}")
