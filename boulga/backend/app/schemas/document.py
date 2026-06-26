from __future__ import annotations

from typing import Any, List, Optional, Union

from pydantic import BaseModel, Extra, Field, root_validator


class DocumentSchema(BaseModel):
    """
    Représente un document composé de blocs JSON.

    Le LLM produit un objet librement selon les règles suivantes :
      - title est optionnel,
      - blocks est une liste de blocs structurés,
      - toutes les propriétés de style sont optionnelles,
      - les couleurs restent des chaînes hexadécimales si fournies,
      - un bloc partiellement tronqué doit pouvoir être accepté.
    """

    title: Optional[str] = None
    blocks: List["DocumentBlock"] = Field(default_factory=list)

    class Config:
        extra = Extra.ignore


class BaseBlock(BaseModel):
    """Base de tous les blocs. """

    type: Optional[str] = None

    class Config:
        extra = Extra.ignore


class HeadingBlock(BaseBlock):
    type: str = "heading"
    level: Optional[int] = None
    text: Optional[str] = None
    color: Optional[str] = None
    align: Optional[str] = None
    size: Optional[int] = None


class ParagraphBlock(BaseBlock):
    type: str = "paragraph"
    text: Optional[str] = None
    color: Optional[str] = None
    align: Optional[str] = None
    size: Optional[int] = None
    bold: Optional[bool] = None
    italic: Optional[bool] = None


class TextItem(BaseModel):
    text: Optional[str] = None
    color: Optional[str] = None
    bold: Optional[bool] = None
    italic: Optional[bool] = None

    class Config:
        extra = Extra.ignore


ListItem = Union[str, TextItem]


class BulletListBlock(BaseBlock):
    type: str = "bullet_list"
    bullet: Optional[str] = None
    items: List[ListItem] = Field(default_factory=list)
    color: Optional[str] = None


class NumberedListBlock(BaseBlock):
    type: str = "numbered_list"
    items: List[ListItem] = Field(default_factory=list)
    color: Optional[str] = None


class TableBlock(BaseBlock):
    type: str = "table"
    headers: List[str] = Field(default_factory=list)
    rows: List[List[Any]] = Field(default_factory=list)
    header_bg: Optional[str] = None
    header_color: Optional[str] = None
    zebra: Optional[str] = None
    border: Optional[str] = None


class BlockContainer(BaseBlock):
    type: str = "block"
    content: Optional[Union[str, List["DocumentBlock"]]] = None
    bg: Optional[str] = None
    text_color: Optional[str] = None
    border: Optional[str] = None


class DividerBlock(BaseBlock):
    type: str = "divider"
    color: Optional[str] = None
    thickness: Optional[int] = None


class SpacerBlock(BaseBlock):
    type: str = "spacer"
    size: Optional[int] = None


class PageBreakBlock(BaseBlock):
    type: str = "page_break"


class UnknownBlock(BaseBlock):
    """Bloc générique pour les données partielles ou inconnues.

    Cela permet de ne jamais échouer si un bloc est tronqué, mal typé ou
    si son type n'est pas reconnu.
    """

    raw: dict = Field(default_factory=dict)

    @root_validator(pre=True)
    def capture_raw(cls, values: dict) -> dict:
        values["raw"] = dict(values)
        return values

    class Config:
        extra = Extra.allow


DocumentBlock = Union[
    HeadingBlock,
    ParagraphBlock,
    BulletListBlock,
    NumberedListBlock,
    TableBlock,
    BlockContainer,
    DividerBlock,
    SpacerBlock,
    PageBreakBlock,
    UnknownBlock,
]


# Support de l'auto-référence pour `BlockContainer.content`.
DocumentSchema.update_forward_refs()
BlockContainer.update_forward_refs()
