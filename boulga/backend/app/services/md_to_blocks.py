"""
md_to_blocks.py — Parseur Markdown étendu → blocs render_document.

Convertit une réponse LLM en Markdown étendu (front-matter YAML + corps) en une
liste de blocs dict consommable telle quelle par render_document(), sans la modifier.

Signature publique :
    parse_document(text: str) -> tuple[list[dict], dict]

Retourne (blocks, meta) où :
- blocks : list[dict] passable directement à render_document(blocks, ...)
- meta   : dict avec les clés présentes parmi format, template, filename,
           company_name, primary_color

Retourne ([], {}) si le texte n'est pas une demande de génération valide :
  - pas de front-matter YAML (--- en ligne 1)
  - YAML malformé
  - clés requises 'format' ET 'filename' absentes

Ne lève JAMAIS d'exception observable.

---

LIMITE v1 — Rich-text inline :
  Les marqueurs **gras** / *italique* / __gras__ / _italique_ sont RETIRÉS pour
  produire du texte propre (sans astérisques visibles). Ils ne sont PAS convertis
  en mise en forme réelle (runs DOCX gras, styles ReportLab). La conversion
  inline complète est hors périmètre pour cette version.
  Limitation connue : _mot_ peut faussement matcher sur du snake_case.
"""

from __future__ import annotations

import re
from typing import Optional

try:
    import yaml as _yaml
except ImportError:  # pyyaml optionnel — sans lui tout retourne ([], {})
    _yaml = None  # type: ignore[assignment]


# ── Constantes ────────────────────────────────────────────────────────────────

# Doit rester en sync avec les clés de CALLOUT_TYPES dans document_renderer.py
_CALLOUT_TYPES = frozenset({"info", "tip", "warning", "danger", "success", "note"})

_BULLET_STYLES = frozenset({"dot", "star", "square", "check", "arrow"})

_META_KEYS = ("format", "template", "filename", "company_name", "primary_color")

_COVER_PAGE_OPTIONAL = ("subtitle", "author", "institution", "date", "reference", "doc_type")
_HEADER_BLOCK_OPTIONAL = ("subtitle", "reference", "date")

# Patterns compilés à la charge du module pour éviter les recompilations
_FENCE_OPEN_RE     = re.compile(r"^:::\s*(\w*)\s*(.*)?$")
_DIVIDER_RE        = re.compile(r"^-{3,}$")
_NUMBERED_RE       = re.compile(r"^\d+\.\s+(.*)")
_BULLET_RE         = re.compile(r"^[-*]\s+(.*)")
_CHECKBOX_RE       = re.compile(r"^[-*]\s+\[[ xX]\]\s*(.*)")
_HEADING_RE        = re.compile(r"^(#{1,6})\s+(.*)")
_BULLET_STYLE_RE   = re.compile(r"<!--\s*bullet-style\s*:\s*(\w+)\s*-->", re.IGNORECASE)
_PAGEBREAK_RE      = re.compile(r"<!--\s*pagebreak\s*-->", re.IGNORECASE)
_TABLE_SEP_RE      = re.compile(r"^[\|\-\:\s]+$")

# Patterns qui déclenchent un arrêt dans _parse_paragraph
_BLOCK_START_RE = re.compile(
    r"^(:::|<!--\s*(pagebreak|bullet-style)|-{3,}$|\||\d+\.\s|[-*]\s|#{1,6}\s)",
    re.IGNORECASE,
)


# ── Nettoyage inline ──────────────────────────────────────────────────────────

def _strip_inline(text: str) -> str:
    """
    Retire les marqueurs Markdown inline pour produire du texte propre.

    Ordre strict : doubles marqueurs avant simples pour éviter les matchs partiels
    sur des séquences comme __word__.
    """
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"__(.+?)__",     r"\1", text, flags=re.DOTALL)
    text = re.sub(r"\*(.+?)\*",     r"\1", text, flags=re.DOTALL)
    text = re.sub(r"_(.+?)_",       r"\1", text, flags=re.DOTALL)
    return text


# ── Front-matter ──────────────────────────────────────────────────────────────

def _parse_frontmatter(text: str) -> tuple[dict, str, bool]:
    """
    Tente de parser le front-matter YAML au début du texte.

    Retourne (yaml_dict, corps_restant, succès).
    En cas d'échec, retourne ({}, texte_original, False).
    """
    if _yaml is None or not text.startswith("---"):
        return {}, text, False

    # Consomme la ligne d'ouverture '---'
    after_open = text[3:]
    if after_open.startswith("\r\n"):
        after_open = after_open[2:]
    elif after_open.startswith("\n"):
        after_open = after_open[1:]
    else:
        return {}, text, False

    # Cherche la ligne de fermeture '---' (avec espaces trailing tolérés)
    end_match = re.search(r"\n---[ \t]*(\n|$)", after_open)
    if not end_match:
        return {}, text, False

    fm_content = after_open[: end_match.start()]
    body       = after_open[end_match.end() :]

    try:
        data = _yaml.safe_load(fm_content)
        if not isinstance(data, dict):
            return {}, text, False
        return data, body, True
    except Exception:
        return {}, text, False


def _build_frontmatter_block(data: dict) -> Optional[dict]:
    """
    Construit un bloc cover_page ou header_block depuis le dict YAML.
    Retourne None si 'title' est absent ou vide.
    """
    title = str(data.get("title", "")).strip()
    if not title:
        return None

    template = str(data.get("template", "minimal")).strip()

    # Détermine cover_page vs header_block
    cover_val = data.get("cover")
    if cover_val is None:
        use_cover = template != "minimal"   # défaut : true sauf minimal
    else:
        use_cover = bool(cover_val)

    if use_cover:
        block: dict = {"type": "cover_page", "title": title}
        for key in _COVER_PAGE_OPTIONAL:
            val = data.get(key)
            if val is not None:
                block[key] = str(val).strip()
    else:
        block = {"type": "header_block", "title": title}
        for key in _HEADER_BLOCK_OPTIONAL:
            val = data.get(key)
            if val is not None:
                block[key] = str(val).strip()

    return block


def _extract_meta(data: dict) -> dict:
    """Extrait les clés de rendu depuis le dict YAML."""
    return {k: str(data[k]).strip() for k in _META_KEYS if k in data}


# ── Helpers table ─────────────────────────────────────────────────────────────

def _is_table_separator(line: str) -> bool:
    """Vrai si la ligne est une ligne de séparation Markdown (|---|---|)."""
    stripped = line.strip()
    return (
        bool(stripped)
        and stripped.startswith("|")
        and "-" in stripped
        and bool(_TABLE_SEP_RE.match(stripped))
    )


# ── Parseurs de blocs ─────────────────────────────────────────────────────────

def _parse_fence_block(lines: list[str], i: int) -> tuple[int, dict]:
    """
    Parse un bloc ::: ... ::: depuis la ligne i.

    Si le mot-clé est inconnu → dégradation paragraph avec le contenu brut.
    Si la fence n'est pas fermée (EOF) → paragraph avec le contenu accumulé.
    <!-- pagebreak --> à l'intérieur est absorbé comme texte (non interprété).
    """
    opening = lines[i].strip()
    i += 1

    m = _FENCE_OPEN_RE.match(opening)
    keyword = (m.group(1) or "").strip().lower() if m else ""
    extra   = (m.group(2) or "").strip()         if m else ""

    inner: list[str] = []
    closed = False
    while i < len(lines):
        if lines[i].strip() == ":::":
            closed = True
            i += 1
            break
        inner.append(lines[i])
        i += 1

    inner_text = "\n".join(inner).strip()

    if keyword == "colored":
        return i, {
            "type":  "colored_section",
            "title": _strip_inline(extra),
            "text":  _strip_inline(inner_text),
        }

    if keyword in _CALLOUT_TYPES:
        return i, {
            "type":         "callout",
            "callout_type": keyword,
            "label":        _strip_inline(extra),
            "text":         _strip_inline(inner_text),
        }

    # Mot-clé inconnu → dégradation paragraph (contenu brut de la fence)
    raw_parts = [opening] + inner
    if closed:
        raw_parts.append(":::")
    return i, {"type": "paragraph", "text": _strip_inline("\n".join(raw_parts).strip())}


def _parse_table_block(lines: list[str], i: int) -> tuple[int, dict]:
    """Parse un tableau Markdown depuis la ligne d'en-têtes (ligne i)."""

    def split_row(line: str) -> list[str]:
        return [c.strip() for c in line.strip().strip("|").split("|")]

    headers = [_strip_inline(h) for h in split_row(lines[i])]
    i += 1

    # Consomme la/les ligne(s) de séparation
    while i < len(lines) and _is_table_separator(lines[i]):
        i += 1

    rows: list[list[str]] = []
    while i < len(lines) and lines[i].strip().startswith("|"):
        cells = [_strip_inline(c) for c in split_row(lines[i])]
        # Complète les lignes courtes (le renderer gère déjà, mais on normalise)
        while len(cells) < len(headers):
            cells.append("")
        rows.append(cells)
        i += 1

    return i, {"type": "table", "headers": headers, "rows": rows}


def _parse_bullet_list(
    lines: list[str],
    i: int,
    *,
    style: Optional[str] = None,
    checkbox: bool = False,
) -> tuple[int, dict]:
    """Parse une liste à puces depuis la ligne i."""
    items: list[str] = []

    while i < len(lines):
        line = lines[i]
        if checkbox:
            m = _CHECKBOX_RE.match(line)
        else:
            # Ne pas consommer les lignes checkbox dans une liste ordinaire
            if _CHECKBOX_RE.match(line):
                break
            m = _BULLET_RE.match(line)

        if m:
            items.append(_strip_inline(m.group(1).strip()))
            i += 1
        else:
            break

    block: dict = {"type": "bullet_list", "items": items}
    if style is not None:
        block["style"] = style
    return i, block


def _parse_numbered_list(lines: list[str], i: int) -> tuple[int, dict]:
    """Parse une liste numérotée depuis la ligne i (les numéros réels sont ignorés)."""
    items: list[str] = []
    while i < len(lines):
        m = _NUMBERED_RE.match(lines[i])
        if m:
            items.append(_strip_inline(m.group(1).strip()))
            i += 1
        else:
            break
    return i, {"type": "numbered_list", "items": items}


def _parse_paragraph(lines: list[str], i: int) -> tuple[int, dict]:
    """
    Accumule les lignes consécutives non-vides / non-spéciales en un paragraph.

    Si la première ligne est elle-même un block-starter non capturé par les règles
    précédentes, elle est quand même consommée (une seule ligne) pour éviter une
    boucle infinie dans _parse_body.
    """
    parts: list[str] = []
    start_i = i

    while i < len(lines):
        stripped = lines[i].strip()
        if not stripped:
            break
        is_starter = bool(_BLOCK_START_RE.match(stripped))
        if is_starter and i > start_i:
            # Arrêt propre si on a déjà du contenu : le block-starter sera traité
            # au prochain tour de la boucle principale
            break
        parts.append(stripped)
        i += 1
        if is_starter:
            # Première ligne = block-starter non capturé : on la consomme et on
            # s'arrête pour garantir la progression
            break

    return i, {"type": "paragraph", "text": _strip_inline(" ".join(parts))}


# ── Boucle principale ─────────────────────────────────────────────────────────

def _parse_body(lines: list[str]) -> list[dict]:
    """Convertit les lignes du corps en liste de blocs."""
    blocks: list[dict] = []
    i = 0

    while i < len(lines):
        line    = lines[i]
        stripped = line.strip()

        # Ignorer les lignes vides
        if not stripped:
            i += 1
            continue

        # 2. Fence ouvrante :::
        if stripped.startswith(":::"):
            try:
                i, block = _parse_fence_block(lines, i)
                blocks.append(block)
            except Exception:
                blocks.append({"type": "paragraph", "text": _strip_inline(stripped)})
                i += 1
            continue

        # 3. <!-- pagebreak -->
        if _PAGEBREAK_RE.fullmatch(stripped):
            blocks.append({"type": "page_break"})
            i += 1
            continue

        # 4. Divider --- (3+ tirets, ligne seule, hors front-matter déjà consommé)
        if _DIVIDER_RE.fullmatch(stripped):
            blocks.append({"type": "divider"})
            i += 1
            continue

        # 5. Table (ligne commençant par | suivie d'une ligne séparateur)
        if stripped.startswith("|"):
            # Lookahead pour confirmer : la prochaine ligne non-vide est un séparateur
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines) and _is_table_separator(lines[j]):
                try:
                    i, block = _parse_table_block(lines, i)
                    blocks.append(block)
                except Exception:
                    blocks.append({"type": "paragraph", "text": _strip_inline(stripped)})
                    i += 1
                continue
            # Pas une table → tombe en catch-all

        # 6. Liste numérotée
        if _NUMBERED_RE.match(stripped):
            try:
                i, block = _parse_numbered_list(lines, i)
                blocks.append(block)
            except Exception:
                blocks.append({"type": "paragraph", "text": _strip_inline(stripped)})
                i += 1
            continue

        # 7. Directive <!-- bullet-style: X --> suivie d'une liste à puces
        m = _BULLET_STYLE_RE.fullmatch(stripped)
        if m:
            style_name: Optional[str] = m.group(1).lower()
            if style_name not in _BULLET_STYLES:
                style_name = None   # style inconnu → template_default au rendu
            i += 1
            # Saute les lignes vides entre la directive et la liste
            while i < len(lines) and not lines[i].strip():
                i += 1
            if i < len(lines) and _BULLET_RE.match(lines[i].strip()):
                try:
                    i, block = _parse_bullet_list(lines, i, style=style_name)
                    blocks.append(block)
                except Exception:
                    pass   # directive sans liste valide → ignorée
            continue

        # 8. Checkbox GFM : - [ ] / - [x]
        if _CHECKBOX_RE.match(stripped):
            try:
                i, block = _parse_bullet_list(lines, i, style="check", checkbox=True)
                blocks.append(block)
            except Exception:
                blocks.append({"type": "paragraph", "text": _strip_inline(stripped)})
                i += 1
            continue

        # 9. Liste à puces ordinaire : - item / * item
        if _BULLET_RE.match(stripped):
            try:
                i, block = _parse_bullet_list(lines, i, style=None)
                blocks.append(block)
            except Exception:
                blocks.append({"type": "paragraph", "text": _strip_inline(stripped)})
                i += 1
            continue

        # 10. Heading # / ## / ###
        m2 = _HEADING_RE.match(stripped)
        if m2:
            level = len(m2.group(1))
            blocks.append({
                "type":  "heading",
                "text":  _strip_inline(m2.group(2).strip()),
                "level": level,  # renderer clampe min(max(level,1),3) — on passe tel quel
            })
            i += 1
            continue

        # 11. Catch-all paragraph
        prev_i = i
        try:
            i, block = _parse_paragraph(lines, i)
            if block.get("text"):
                blocks.append(block)
        except Exception:
            blocks.append({"type": "paragraph", "text": _strip_inline(stripped)})
            i += 1
            continue

        # Garde-fou anti-boucle infinie : si _parse_paragraph n'a pas avancé
        if i == prev_i:
            i += 1

    return blocks


# ── Point d'entrée public ─────────────────────────────────────────────────────

def parse_document(text: str) -> tuple[list[dict], dict]:
    """
    Parse un document Markdown étendu (front-matter YAML + corps) en blocs render_document.

    Retourne (blocks, meta) prêts pour render_document(blocks, meta["format"], ...).
    Retourne ([], {}) si le texte n'est pas une demande de génération valide.
    Ne lève JAMAIS d'exception observable.
    """
    try:
        return _parse_document_unsafe(text)
    except Exception:
        return [], {}


def _parse_document_unsafe(text: str) -> tuple[list[dict], dict]:
    blocks: list[dict] = []

    fm_data, body, fm_ok = _parse_frontmatter(text)

    # Sans front-matter valide ou YAML malformé → pas un document de génération
    if not fm_ok:
        return [], {}

    # 'format' ET 'filename' sont requis pour une demande de rendu valide
    if "format" not in fm_data or "filename" not in fm_data:
        return [], {}

    meta = _extract_meta(fm_data)

    # Bloc d'en-tête (cover_page ou header_block) depuis le front-matter
    header_block = _build_frontmatter_block(fm_data)
    if header_block:
        blocks.append(header_block)

    # Corps
    body_lines = body.splitlines()
    blocks.extend(_parse_body(body_lines))

    return blocks, meta
