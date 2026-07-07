"""file_tags.py — Marqueur interne `<!--file:{...}-->` liant un message à ses fichiers générés."""

import re

FILE_TAG_PATTERN = re.compile(r"\n?<!--file:\{.*?\}-->", re.DOTALL)


def strip_file_tags(content: str) -> str:
    """Retire les marqueurs de fichiers du texte affiché/renvoyé au LLM."""
    return FILE_TAG_PATTERN.sub("", content or "").strip()
