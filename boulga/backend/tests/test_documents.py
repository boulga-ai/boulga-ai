import os
from pathlib import Path

from app.documents import render_document


def test_render_document_docx_and_pdf(tmp_path):
    document = {
        "title": "Test document",
        "blocks": [
            {"type": "heading", "level": 1, "text": "Titre principal", "color": "#1565C0"},
            {"type": "paragraph", "text": "Un paragraphe simple.", "italic": True},
            {"type": "bullet_list", "bullet": "*", "items": ["Point 1", {"text": "Point 2", "bold": True}]},
            {"type": "numbered_list", "items": ["Item A", "Item B"]},
            {"type": "table", "headers": ["Col 1", "Col 2"], "rows": [["A1", "B1"], ["A2", "B2"]], "header_bg": "#F0F0F0"},
            {"type": "block", "content": [{"type": "paragraph", "text": "Texte dans bloc coloré."}], "bg": "#EFEFEF"},
            {"type": "divider", "color": "#000000"},
            {"type": "spacer", "size": 24},
            {"type": "page_break"},
            {"type": "paragraph", "text": "Après saut de page."},
        ],
    }

    docx_bytes, docx_mime = render_document("docx", document)
    pdf_bytes, pdf_mime = render_document("pdf", document)

    assert docx_mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert pdf_mime == "application/pdf"
    assert isinstance(docx_bytes, (bytes, bytearray))
    assert isinstance(pdf_bytes, (bytes, bytearray))
    assert len(docx_bytes) > 0
    assert len(pdf_bytes) > 0

    docx_path = Path(tmp_path / "document.docx")
    pdf_path = Path(tmp_path / "document.pdf")
    docx_path.write_bytes(docx_bytes)
    pdf_path.write_bytes(pdf_bytes)
    assert docx_path.exists()
    assert pdf_path.exists()
    assert docx_path.stat().st_size > 0
    assert pdf_path.stat().st_size > 0
