from __future__ import annotations

import logging
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.platypus.flowables import PageBreak

logger = logging.getLogger(__name__)


def _safe_color(hex_color: Any):
    if not isinstance(hex_color, str):
        return None
    color = hex_color.strip().lstrip("#")
    if len(color) not in (3, 6):
        return None
    if len(color) == 3:
        color = "".join([c * 2 for c in color])
    try:
        return colors.HexColor(f"#{color}")
    except Exception:
        return None


def _style_for_block(block: dict[str, Any]) -> ParagraphStyle:
    base = getSampleStyleSheet()["BodyText"]
    style = ParagraphStyle(
        name="generated",
        parent=base,
        fontSize=block.get("size", 11) if isinstance(block.get("size"), int) else 11,
        leading=max(12, int((block.get("size", 11) or 11) * 1.4)),
        textColor=_safe_color(block.get("color")) or colors.black,
        alignment={
            "left": TA_LEFT,
            "center": TA_CENTER,
            "right": TA_RIGHT,
            "justify": TA_JUSTIFY,
        }.get(block.get("align"), TA_LEFT),
    )
    return style


def _render_heading(block: dict[str, Any], story: list[Any]) -> None:
    text = str(block.get("text", "")).strip()
    if not text:
        return
    style = _style_for_block(block)
    story.append(Paragraph(f"<b>{text}</b>", style))


def _render_paragraph(block: dict[str, Any], story: list[Any]) -> None:
    text = str(block.get("text", "")).strip()
    if not text:
        return
    style = _style_for_block(block)
    if block.get("bold"):
        text = f"<b>{text}</b>"
    if block.get("italic"):
        text = f"<i>{text}</i>"
    story.append(Paragraph(text, style))


def _render_list(block: dict[str, Any], story: list[Any], ordered: bool = False) -> None:
    items = block.get("items")
    if not isinstance(items, list):
        return
    bullet = str(block.get("bullet", "•")) if not ordered else None
    style = _style_for_block(block)
    for idx, item in enumerate(items, start=1):
        if isinstance(item, dict):
            text = str(item.get("text", "")).strip()
        else:
            text = str(item).strip()
        if not text:
            continue
        prefix = f"{idx}. " if ordered else f"{bullet} "
        story.append(Paragraph(prefix + text, style))


def _render_table(block: dict[str, Any], story: list[Any]) -> None:
    headers = block.get("headers")
    rows = block.get("rows")
    if not isinstance(headers, list) or not isinstance(rows, list):
        return
    data = [list(map(str, headers))]
    for row in rows:
        if not isinstance(row, list):
            continue
        data.append([str(cell) for cell in row])
    table = Table(data, hAlign="LEFT")
    style_commands = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    header_bg = _safe_color(block.get("header_bg"))
    if header_bg:
        style_commands.append(("BACKGROUND", (0, 0), (-1, 0), header_bg))
    header_color = _safe_color(block.get("header_color"))
    if header_color:
        style_commands.append(("TEXTCOLOR", (0, 0), (-1, 0), header_color))
    zebra = _safe_color(block.get("zebra"))
    if zebra:
        for row_idx in range(1, len(data)):
            if row_idx % 2 == 0:
                style_commands.append(("BACKGROUND", (0, row_idx), (-1, row_idx), zebra))
    border = _safe_color(block.get("border"))
    if border:
        style_commands.append(("GRID", (0, 0), (-1, -1), 0.5, border))
    table.setStyle(TableStyle(style_commands))
    for row in table._cellvalues:
        for idx, cell in enumerate(row):
            if isinstance(cell, str) and len(cell) > 100:
                row[idx] = Paragraph(cell, _style_for_block(block))
    story.append(table)


def _render_block(block: dict[str, Any], story: list[Any]) -> None:
    content = block.get("content")
    bg = _safe_color(block.get("bg"))
    if isinstance(content, list):
        inner_story: list[Any] = []
        for child in content:
            if isinstance(child, dict):
                _dispatch_block(child, inner_story)
        if bg:
            table = Table([[inner_story]], style=[("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0.5, colors.black)])
            story.append(table)
            return
        story.extend(inner_story)
    elif isinstance(content, str):
        style = _style_for_block(block)
        paragraph = Paragraph(content, style)
        if bg:
            table = Table([[paragraph]], style=[("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0.5, colors.black)])
            story.append(table)
        else:
            story.append(paragraph)


def _render_divider(block: dict[str, Any], story: list[Any]) -> None:
    color = _safe_color(block.get("color")) or colors.black
    story.append(Table([[""]], style=[("LINEBEFORE", (0, 0), (-1, -1), 0.5, color)]))


def _render_spacer(block: dict[str, Any], story: list[Any]) -> None:
    size = block.get("size")
    if isinstance(size, int) and size > 0:
        story.append(Spacer(1, size))


def _render_page_break(block: dict[str, Any], story: list[Any]) -> None:
    story.append(PageBreak())


def _dispatch_block(block: dict[str, Any], story: list[Any]) -> None:
    if not isinstance(block, dict):
        return
    block_type = block.get("type")
    try:
        if block_type == "heading":
            _render_heading(block, story)
        elif block_type == "paragraph":
            _render_paragraph(block, story)
        elif block_type == "bullet_list":
            _render_list(block, story, ordered=False)
        elif block_type == "numbered_list":
            _render_list(block, story, ordered=True)
        elif block_type == "table":
            _render_table(block, story)
        elif block_type == "block":
            _render_block(block, story)
        elif block_type == "divider":
            _render_divider(block, story)
        elif block_type == "spacer":
            _render_spacer(block, story)
        elif block_type == "page_break":
            _render_page_break(block, story)
        else:
            logger.warning("Skipping unknown pdf block type: %s", block_type)
    except Exception as exc:
        logger.warning("Skipping malformed pdf block %s: %s", block_type, exc)


def render_pdf(document: dict[str, Any]) -> tuple[bytes, str]:
    story: list[Any] = []
    title = document.get("title")
    if isinstance(title, str) and title.strip():
        story.append(Paragraph(title.strip(), _style_for_block({"size": 18, "bold": True})))
    blocks = document.get("blocks")
    if isinstance(blocks, list):
        for block in blocks:
            _dispatch_block(block, story)
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    doc.build(story)
    return buffer.getvalue(), "application/pdf"
