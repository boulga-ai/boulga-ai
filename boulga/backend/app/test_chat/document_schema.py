"""document_schema.py — Grammaire compositionnelle des documents.

Le LLM ne génère PAS de code. Il produit un JSON décrivant le document avec
des blocs typés. Le backend convertit ce JSON en Word/PDF.

Principe : on ne donne pas au LLM une liste fermée de valeurs. On lui donne
des MÉCANISMES (heading, paragraph, list, table, block à fond...) et des
LEVIERS LIBRES (couleur = hex au choix, puce = caractère au choix, taille,
poids, alignement). Le LLM décide s'il utilise un mécanisme et comment il
l'habille.

Robustesse : tout est optionnel sauf le strict nécessaire. Un JSON tronqué
ou partiel doit produire un document avec les blocs valides, jamais un crash.
"""

from __future__ import annotations

from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field


# ── Blocs ────────────────────────────────────────────────────────────────────
# Chaque bloc a un "type". Toutes les propriétés de style sont optionnelles :
# absentes → défaut sobre. Le LLM les fournit quand il le juge pertinent.


class Heading(BaseModel):
    type: Literal["heading"] = "heading"
    level: int = Field(default=1, ge=1, le=4)
    text: str = ""
    color: Optional[str] = None          # hex "#RRGGBB" au choix
    align: Optional[str] = None          # "left" | "center" | "right"
    size: Optional[int] = None           # taille en points, sinon défaut par niveau


class Paragraph(BaseModel):
    type: Literal["paragraph"] = "paragraph"
    text: str = ""
    color: Optional[str] = None
    align: Optional[str] = None          # "left" | "center" | "right" | "justify"
    size: Optional[int] = None
    bold: Optional[bool] = None
    italic: Optional[bool] = None


class ListItem(BaseModel):
    """Un item de liste peut être un simple texte ou un texte stylé."""
    text: str = ""
    color: Optional[str] = None
    bold: Optional[bool] = None
    italic: Optional[bool] = None


class BulletList(BaseModel):
    type: Literal["bullet_list"] = "bullet_list"
    # Le caractère de puce est libre : • ▸ ➤ ▪ ■ ◦ – ✓ … ou autre au choix du LLM
    bullet: str = "•"
    items: list[Union[str, ListItem]] = Field(default_factory=list)
    color: Optional[str] = None          # couleur par défaut des items
    size: Optional[int] = None


class NumberedList(BaseModel):
    type: Literal["numbered_list"] = "numbered_list"
    items: list[Union[str, ListItem]] = Field(default_factory=list)
    color: Optional[str] = None
    size: Optional[int] = None


class Table(BaseModel):
    type: Literal["table"] = "table"
    headers: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)
    header_bg: Optional[str] = None      # fond d'en-tête, hex au choix
    header_color: Optional[str] = None   # couleur du texte d'en-tête
    zebra: Optional[str] = None          # couleur des lignes alternées
    border: Optional[str] = None         # couleur des bordures


class Block(BaseModel):
    """Encadré à fond coloré : alertes, mises en avant, callouts.

    Le LLM choisit le fond et la couleur du texte selon le sens qu'il veut
    donner (rouge pâle = alerte, or = bonus, etc.). Peut contenir du texte
    simple OU d'autres blocs imbriqués.
    """
    type: Literal["block"] = "block"
    text: Optional[str] = None           # contenu texte simple
    content: Optional[list[dict]] = None  # OU blocs imbriqués (paragraphes, listes...)
    bg: Optional[str] = None             # fond, hex au choix
    text_color: Optional[str] = None
    border: Optional[str] = None
    align: Optional[str] = None


class Divider(BaseModel):
    type: Literal["divider"] = "divider"
    color: Optional[str] = None
    thickness: Optional[int] = None


class Spacer(BaseModel):
    type: Literal["spacer"] = "spacer"
    size: Optional[int] = None           # hauteur en points


class PageBreak(BaseModel):
    type: Literal["page_break"] = "page_break"


# Union de tous les blocs (pour référence / documentation)
AnyBlock = Union[
    Heading, Paragraph, BulletList, NumberedList,
    Table, Block, Divider, Spacer, PageBreak,
]


class Document(BaseModel):
    title: Optional[str] = None
    blocks: list[dict] = Field(default_factory=list)
    # On garde blocks en list[dict] volontairement : la validation stricte par
    # bloc se fait dans le convertisseur (tolérant aux blocs partiels/inconnus),
    # ce qui évite qu'un seul bloc malformé fasse échouer tout le document.


# ── Schéma JSON exposé au LLM (description du tool) ───────────────────────────
# Décrit la STRUCTURE attendue. Les valeurs de style restent libres.

DOCUMENT_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string", "description": "Titre du document (optionnel)"},
        "blocks": {
            "type": "array",
            "description": (
                "Liste ordonnée de blocs. Chaque bloc a un champ 'type'. "
                "Types: heading, paragraph, bullet_list, numbered_list, table, "
                "block, divider, spacer, page_break. Toutes les propriétés de "
                "style (color, bg, align, size, bold, bullet...) sont optionnelles "
                "et libres : les couleurs sont des hex #RRGGBB de ton choix, les "
                "puces des caractères de ton choix. Compose selon la demande."
            ),
            "items": {"type": "object"},
        },
    },
    "required": ["blocks"],
}