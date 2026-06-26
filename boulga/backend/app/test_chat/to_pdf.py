"""to_pdf.py — Convertit un document JSON (grammaire compositionnelle) en PDF.

Même JSON que to_docx. Robustesse identique : bloc malformé ignoré, jamais fatal.
"""

from __future__ import annotations

import io
import logging
from typing import Any, Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable, KeepInFrame, PageBreak, Paragraph, SimpleDocTemplate,
    Spacer, Table, TableStyle,
)

logger = logging.getLogger("boulga.to_pdf")

_ALIGN = {"left": TA_LEFT, "center": TA_CENTER, "right": TA_RIGHT, "justify": TA_JUSTIFY}
_HEADING_SIZE = {1: 20, 2: 16, 3: 13, 4: 11.5}

_styles = getSampleStyleSheet()


def _color(value: Optional[str], default=None):
    if not value or not isinstance(value, str):
        return default
    v = value.strip()
    if not v.startswith("#"):
        v = "#" + v
    if len(v) != 7:
        return default
    try:
        return colors.HexColor(v)
    except (ValueError, Exception):
        return default


def _escape(text: Any) -> str:
    """Échappe le texte pour le mini-HTML de reportlab Paragraph."""
    s = str(text) if text is not None else ""
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _para_style(name: str, *, size=11, leading=None, color=None, align=None,
                bold=False, italic=False) -> ParagraphStyle:
    c = _color(color, colors.HexColor("#1A1A1A"))
    style = ParagraphStyle(
        name,
        parent=_styles["Normal"],
        fontSize=size,
        leading=leading or size * 1.4,
        textColor=c,
        alignment=_ALIGN.get(align, TA_LEFT),
        fontName="Helvetica-Bold" if bold else "Helvetica",
    )
    if italic and not bold:
        style.fontName = "Helvetica-Oblique"
    return style


# ── Rendu des blocs (chaque fonction ajoute des flowables à `story`) ─────────

def _render_heading(story, b: dict) -> None:
    level = b.get("level", 1)
    try:
        level = max(1, min(int(level), 4))
    except (ValueError, TypeError):
        level = 1
    size = b.get("size") or _HEADING_SIZE.get(level, 13)
    style = _para_style(
        f"H{level}", size=size, color=b.get("color") or "#0B1F3A",
        align=b.get("align"), bold=True,
    )
    style.spaceBefore = 10
    style.spaceAfter = 5
    story.append(Paragraph(_escape(b.get("text", "")), style))


def _render_paragraph(story, b: dict) -> None:
    style = _para_style(
        "Body", size=b.get("size") or 11, color=b.get("color"),
        align=b.get("align"), bold=bool(b.get("bold")), italic=bool(b.get("italic")),
    )
    style.spaceAfter = 6
    story.append(Paragraph(_escape(b.get("text", "")), style))


def _render_bullet_list(story, b: dict) -> None:
    bullet = b.get("bullet") or "•"
    if not isinstance(bullet, str) or not bullet:
        bullet = "•"
    color = b.get("color")
    size = b.get("size") or 11
    for item in b.get("items", []):
        if isinstance(item, dict):
            text = item.get("text", "")
            c = item.get("color") or color
            bold = item.get("bold")
        else:
            text, c, bold = item, color, None
        style = _para_style("Bullet", size=size, color=c, bold=bool(bold))
        style.leftIndent = 14
        style.spaceAfter = 3
        story.append(Paragraph(f"{_escape(bullet)}&nbsp;&nbsp;{_escape(text)}", style))


def _render_numbered_list(story, b: dict) -> None:
    color = b.get("color")
    size = b.get("size") or 11
    for i, item in enumerate(b.get("items", []), start=1):
        if isinstance(item, dict):
            text = item.get("text", "")
            c = item.get("color") or color
            bold = item.get("bold")
        else:
            text, c, bold = item, color, None
        style = _para_style("Num", size=size, color=c, bold=bool(bold))
        style.leftIndent = 14
        style.spaceAfter = 3
        story.append(Paragraph(f"{i}.&nbsp;&nbsp;{_escape(text)}", style))


def _render_table(story, b: dict) -> None:
    headers = b.get("headers", []) or []
    rows = b.get("rows", []) or []
    col_count = max(len(headers), max((len(r) for r in rows), default=0))
    if col_count == 0:
        return

    cell_style = _para_style("Cell", size=9.5)
    head_style = _para_style(
        "CellHead", size=9.5,
        color=b.get("header_color") or ("#FFFFFF" if b.get("header_bg") else "#1A1A1A"),
        bold=True,
    )

    data = []
    if headers:
        data.append([
            Paragraph(_escape(headers[i]) if i < len(headers) else "", head_style)
            for i in range(col_count)
        ])
    for row in rows:
        data.append([
            Paragraph(_escape(row[i]) if i < len(row) else "", cell_style)
            for i in range(col_count)
        ])

    if not data:
        return

    avail = A4[0] - 4 * cm
    col_w = avail / col_count
    table = Table(data, colWidths=[col_w] * col_count)

    ts = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    border = _color(b.get("border"), colors.HexColor("#D0D0D0"))
    ts.append(("GRID", (0, 0), (-1, -1), 0.5, border))

    header_bg = _color(b.get("header_bg"))
    if header_bg and headers:
        ts.append(("BACKGROUND", (0, 0), (-1, 0), header_bg))

    zebra = _color(b.get("zebra"))
    if zebra:
        start = 1 if headers else 0
        for r_idx in range(start, len(data)):
            if (r_idx - start) % 2 == 1:
                ts.append(("BACKGROUND", (0, r_idx), (-1, r_idx), zebra))

    table.setStyle(TableStyle(ts))
    story.append(table)
    story.append(Spacer(1, 6))


def _render_block(story, b: dict) -> None:
    """Encadré à fond coloré : une cellule de tableau avec BACKGROUND."""
    bg = _color(b.get("bg"), colors.HexColor("#F2F2F2"))
    text_color = b.get("text_color")
    align = b.get("align")

    inner = []
    if b.get("text") is not None:
        style = _para_style("BlockText", size=b.get("size") or 11,
                            color=text_color, align=align)
        inner.append(Paragraph(_escape(b.get("text", "")), style))
    elif isinstance(b.get("content"), list):
        for child in b["content"]:
            if isinstance(child, dict):
                if text_color and "color" not in child:
                    child = {**child, "color": text_color}
                _render_block_dispatch(inner, child)

    if not inner:
        return

    avail = A4[0] - 4 * cm
    wrapper = Table([[inner]], colWidths=[avail])
    style = [
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    bc = _color(b.get("border"))
    if bc:
        style.append(("BOX", (0, 0), (-1, -1), 1, bc))
    wrapper.setStyle(TableStyle(style))
    story.append(wrapper)
    story.append(Spacer(1, 6))


def _render_divider(story, b: dict) -> None:
    color = _color(b.get("color"), colors.HexColor("#999999"))
    thickness = b.get("thickness") or 1
    try:
        thickness = float(thickness)
    except (ValueError, TypeError):
        thickness = 1
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=thickness, color=color))
    story.append(Spacer(1, 4))


def _render_spacer(story, b: dict) -> None:
    size = b.get("size") or 12
    try:
        size = float(size)
    except (ValueError, TypeError):
        size = 12
    story.append(Spacer(1, size))


def _render_page_break(story, b: dict) -> None:
    story.append(PageBreak())


_DISPATCH = {
    "heading": _render_heading,
    "paragraph": _render_paragraph,
    "bullet_list": _render_bullet_list,
    "numbered_list": _render_numbered_list,
    "table": _render_table,
    "block": _render_block,
    "divider": _render_divider,
    "spacer": _render_spacer,
    "page_break": _render_page_break,
}


def _render_block_dispatch(story, b: dict) -> None:
    btype = b.get("type")
    handler = _DISPATCH.get(btype)
    if handler is None:
        logger.warning("Bloc de type inconnu ignoré: %r", btype)
        return
    try:
        handler(story, b)
    except Exception as exc:
        logger.warning("Bloc %r ignoré (erreur de rendu): %s", btype, exc)


def render_pdf(document: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
    )

    story: list = []

    title = document.get("title")
    if title:
        tstyle = _para_style("Title", size=24, color="#0B1F3A", align="center", bold=True)
        tstyle.spaceAfter = 14
        story.append(Paragraph(_escape(title), tstyle))

    blocks = document.get("blocks", [])
    if not isinstance(blocks, list):
        blocks = []

    for b in blocks:
        if isinstance(b, dict):
            _render_block_dispatch(story, b)
        else:
            logger.warning("Bloc non-dict ignoré: %r", type(b))

    if not story:
        story.append(Paragraph("(Document vide)", _para_style("Empty")))

    doc.build(story)
    return buf.getvalue()