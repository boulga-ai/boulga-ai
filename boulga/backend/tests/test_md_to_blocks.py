"""Tests unitaires pour md_to_blocks.parse_document.

Couverture :
- Un test par type de bloc (tous les 13 types)
- Chaque cas de dégradation listé dans le design C1
- Document complet réaliste (round-trip structurel)
- Nettoyage inline ** / * / __ / _
- Texte sans front-matter → ([], {})
- Fuzz léger : aucune entrée ne lève d'exception
- Intégration parse → render_document → bytes (docx)
"""

import pytest

from app.services.md_to_blocks import parse_document, _strip_inline


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fm(**kwargs) -> str:
    """Génère un front-matter YAML minimal valide."""
    lines = [
        f"format: {kwargs.pop('format', 'docx')}",
        f"template: {kwargs.pop('template', 'minimal')}",
        f"filename: {kwargs.pop('filename', 'test')}",
    ]
    for k, v in kwargs.items():
        if isinstance(v, bool):
            # Booléens Python → YAML lowercase sans guillemets
            lines.append(f"{k}: {'true' if v else 'false'}")
        elif isinstance(v, str) and any(c in v for c in ('#', ':', '"', "'")):
            # Valeurs avec caractères spéciaux YAML → guillemets doubles
            escaped = v.replace('"', '\\"')
            lines.append(f'{k}: "{escaped}"')
        else:
            lines.append(f"{k}: {v}")
    return "---\n" + "\n".join(lines) + "\n---\n"


def _doc(body: str, **kwargs) -> str:
    return _fm(**kwargs) + body


def _blocks(body: str, **kwargs) -> list[dict]:
    blocks, _ = parse_document(_doc(body, **kwargs))
    return blocks


def _meta(body: str = "", **kwargs) -> dict:
    _, meta = parse_document(_doc(body, **kwargs))
    return meta


# ── Tests front-matter → meta ─────────────────────────────────────────────────

class TestMeta:
    def test_required_fields_extracted(self):
        m = _meta(format="pdf", template="rapport", filename="mon-rapport")
        assert m["format"] == "pdf"
        assert m["template"] == "rapport"
        assert m["filename"] == "mon-rapport"

    def test_optional_fields_extracted(self):
        m = _meta(company_name="Acme", primary_color="#1565C0")
        assert m["company_name"] == "Acme"
        assert m["primary_color"] == "#1565C0"

    def test_missing_optional_absent_from_meta(self):
        m = _meta()
        assert "company_name" not in m
        assert "primary_color" not in m

    def test_format_missing_returns_empty(self):
        text = "---\ntemplate: minimal\nfilename: test\n---\n# Titre\n"
        blocks, meta = parse_document(text)
        assert blocks == []
        assert meta == {}

    def test_filename_missing_returns_empty(self):
        text = "---\nformat: docx\ntemplate: minimal\n---\n# Titre\n"
        blocks, meta = parse_document(text)
        assert blocks == []
        assert meta == {}


# ── Tests cover_page / header_block ──────────────────────────────────────────

class TestHeaderBlocks:
    def test_cover_page_commercial_template(self):
        text = _fm(
            template="commercial",
            title="Rapport Q3",
            subtitle="Analyse",
            author="Jean Dupont",
            institution="Acme",
            date="2024-09-30",
            reference="REF-001",
            doc_type="RAPPORT",
        )
        blocks, _ = parse_document(text)
        assert blocks[0]["type"] == "cover_page"
        assert blocks[0]["title"] == "Rapport Q3"
        assert blocks[0]["subtitle"] == "Analyse"
        assert blocks[0]["author"] == "Jean Dupont"
        assert blocks[0]["institution"] == "Acme"
        assert blocks[0]["date"] == "2024-09-30"
        assert blocks[0]["reference"] == "REF-001"
        assert blocks[0]["doc_type"] == "RAPPORT"

    def test_cover_page_only_title_required(self):
        text = _fm(template="rapport", title="Mon Doc")
        blocks, _ = parse_document(text)
        assert blocks[0]["type"] == "cover_page"
        assert blocks[0]["title"] == "Mon Doc"
        # Champs optionnels absents du bloc
        assert "author" not in blocks[0]
        assert "institution" not in blocks[0]

    def test_header_block_when_cover_false(self):
        text = _fm(template="commercial", title="Note rapide", cover=False)
        blocks, _ = parse_document(text)
        assert blocks[0]["type"] == "header_block"
        assert blocks[0]["title"] == "Note rapide"

    def test_header_block_default_for_minimal(self):
        # template=minimal → cover=false par défaut → header_block
        text = _fm(template="minimal", title="Note courte")
        blocks, _ = parse_document(text)
        assert blocks[0]["type"] == "header_block"

    def test_cover_page_explicit_for_minimal(self):
        # template=minimal + cover: true → cover_page malgré le défaut
        text = _fm(template="minimal", title="Doc minimal avec garde", cover=True)
        blocks, _ = parse_document(text)
        assert blocks[0]["type"] == "cover_page"

    def test_no_title_no_header_block(self):
        blocks = _blocks("# Section\n")
        assert blocks[0]["type"] == "heading"

    def test_header_block_optional_fields(self):
        text = _fm(
            template="minimal",
            title="Contrat",
            subtitle="Sous-titre",
            reference="REF-42",
            date="2024-01-01",
        )
        blocks, _ = parse_document(text)
        b = blocks[0]
        assert b["type"] == "header_block"
        assert b["subtitle"] == "Sous-titre"
        assert b["reference"] == "REF-42"
        assert b["date"] == "2024-01-01"
        # author et institution ignorés pour header_block
        assert "author" not in b


# ── Tests blocs de corps ──────────────────────────────────────────────────────

class TestHeading:
    def test_h1(self):
        b = _blocks("# Titre principal")[0]
        assert b == {"type": "heading", "text": "Titre principal", "level": 1}

    def test_h2(self):
        b = _blocks("## Sous-section")[0]
        assert b == {"type": "heading", "text": "Sous-section", "level": 2}

    def test_h3(self):
        b = _blocks("### Niveau trois")[0]
        assert b == {"type": "heading", "text": "Niveau trois", "level": 3}

    def test_h4_passed_through(self):
        # Le renderer clampe min(max(level,1),3) — le parseur passe tel quel
        b = _blocks("#### Niveau quatre")[0]
        assert b["type"] == "heading"
        assert b["level"] == 4

    def test_heading_strips_inline(self):
        b = _blocks("# Titre **en gras** et *italique*")[0]
        assert b["text"] == "Titre en gras et italique"


class TestParagraph:
    def test_simple(self):
        b = _blocks("Voici un paragraphe simple.")[0]
        assert b == {"type": "paragraph", "text": "Voici un paragraphe simple."}

    def test_multi_line_joined(self):
        body = "Ligne un.\nLigne deux.\nLigne trois."
        b = _blocks(body)[0]
        assert b["type"] == "paragraph"
        assert "Ligne un." in b["text"]
        assert "Ligne deux." in b["text"]

    def test_empty_lines_separate_paragraphs(self):
        body = "Premier.\n\nDeuxième."
        bs = _blocks(body)
        assert len(bs) == 2
        assert bs[0]["text"] == "Premier."
        assert bs[1]["text"] == "Deuxième."

    def test_strips_inline(self):
        b = _blocks("Texte avec **gras** et _italique_.")[0]
        assert "**" not in b["text"]
        assert "_" not in b["text"]
        assert "gras" in b["text"]
        assert "italique" in b["text"]


class TestBulletList:
    def test_dash_items(self):
        b = _blocks("- Un\n- Deux\n- Trois")[0]
        assert b["type"] == "bullet_list"
        assert b["items"] == ["Un", "Deux", "Trois"]
        assert "style" not in b   # pas de style explicite → template_default au rendu

    def test_star_items(self):
        b = _blocks("* Alpha\n* Beta")[0]
        assert b["type"] == "bullet_list"
        assert b["items"] == ["Alpha", "Beta"]

    def test_checkbox_check_style(self):
        body = "- [ ] Tâche A\n- [x] Tâche B\n- [X] Tâche C"
        b = _blocks(body)[0]
        assert b["type"] == "bullet_list"
        assert b["style"] == "check"
        assert b["items"] == ["Tâche A", "Tâche B", "Tâche C"]

    def test_bullet_style_directive_dot(self):
        body = "<!-- bullet-style: dot -->\n- A\n- B"
        b = _blocks(body)[0]
        assert b["style"] == "dot"
        assert b["items"] == ["A", "B"]

    def test_bullet_style_directive_arrow(self):
        body = "<!-- bullet-style: arrow -->\n- Étape 1\n- Étape 2"
        b = _blocks(body)[0]
        assert b["style"] == "arrow"

    def test_bullet_style_directive_star(self):
        body = "<!-- bullet-style: star -->\n- Point fort"
        b = _blocks(body)[0]
        assert b["style"] == "star"

    def test_bullet_style_directive_square(self):
        body = "<!-- bullet-style: square -->\n- Item"
        b = _blocks(body)[0]
        assert b["style"] == "square"

    def test_bullet_style_directive_check(self):
        body = "<!-- bullet-style: check -->\n- Item"
        b = _blocks(body)[0]
        assert b["style"] == "check"

    def test_bullet_style_unknown_no_style_key(self):
        # Style inconnu → pas de clé 'style' (template_default au rendu)
        body = "<!-- bullet-style: diamond -->\n- Item"
        b = _blocks(body)[0]
        assert b["type"] == "bullet_list"
        assert "style" not in b

    def test_bullet_strips_inline(self):
        body = "- Item **gras**\n- Item *italique*"
        b = _blocks(body)[0]
        assert b["items"] == ["Item gras", "Item italique"]

    def test_checkbox_and_bullet_not_mixed(self):
        # Une liste checkbox ne doit pas consommer les lignes bullet ordinaires suivantes
        body = "- [ ] Case\n- Item normal"
        blocks = _blocks(body)
        assert blocks[0]["style"] == "check"
        assert blocks[0]["items"] == ["Case"]
        # "- Item normal" est une liste bullet séparée
        assert blocks[1]["type"] == "bullet_list"
        assert "style" not in blocks[1]


class TestNumberedList:
    def test_basic(self):
        body = "1. Premier\n2. Deuxième\n3. Troisième"
        b = _blocks(body)[0]
        assert b["type"] == "numbered_list"
        assert b["items"] == ["Premier", "Deuxième", "Troisième"]

    def test_numbers_ignored(self):
        body = "5. Cinq\n8. Huit\n1. Un"
        b = _blocks(body)[0]
        assert b["items"] == ["Cinq", "Huit", "Un"]

    def test_strips_inline(self):
        body = "1. **Gras** item"
        b = _blocks(body)[0]
        assert b["items"] == ["Gras item"]


class TestTable:
    def test_basic(self):
        body = "| Col A | Col B |\n|-------|-------|\n| V1    | V2    |\n| V3    | V4    |"
        b = _blocks(body)[0]
        assert b["type"] == "table"
        assert b["headers"] == ["Col A", "Col B"]
        assert b["rows"] == [["V1", "V2"], ["V3", "V4"]]

    def test_strips_inline_in_cells(self):
        body = "| **Titre** | *Sous* |\n|-----------|--------|\n| **val**   | ok     |"
        b = _blocks(body)[0]
        assert b["headers"] == ["Titre", "Sous"]
        assert b["rows"][0] == ["val", "ok"]

    def test_short_row_padded(self):
        body = "| A | B | C |\n|---|---|---|\n| x | y |"
        b = _blocks(body)[0]
        assert b["rows"][0] == ["x", "y", ""]

    def test_table_followed_by_paragraph(self):
        body = "| H |\n|---|\n| V |\n\nSuite du texte."
        blocks = _blocks(body)
        assert blocks[0]["type"] == "table"
        assert blocks[1]["type"] == "paragraph"


class TestCallout:
    def test_info_with_label(self):
        body = "::: info Note importante\nContenu de l'info.\n:::"
        b = _blocks(body)[0]
        assert b["type"] == "callout"
        assert b["callout_type"] == "info"
        assert b["label"] == "Note importante"
        assert b["text"] == "Contenu de l'info."

    def test_warning_without_label(self):
        body = "::: warning\nMise en garde.\n:::"
        b = _blocks(body)[0]
        assert b["callout_type"] == "warning"
        assert b["label"] == ""
        assert b["text"] == "Mise en garde."

    def test_tip(self):
        b = _blocks("::: tip Conseil\nTrès utile.\n:::")[0]
        assert b["callout_type"] == "tip"

    def test_danger(self):
        b = _blocks("::: danger Risque\nCritique.\n:::")[0]
        assert b["callout_type"] == "danger"

    def test_success(self):
        b = _blocks("::: success\nValidé.\n:::")[0]
        assert b["callout_type"] == "success"

    def test_note(self):
        b = _blocks("::: note Remarque\nAnnotation.\n:::")[0]
        assert b["callout_type"] == "note"

    def test_multiline_text_preserved(self):
        body = "::: info\nLigne A.\nLigne B.\n:::"
        b = _blocks(body)[0]
        assert "Ligne A." in b["text"]
        assert "Ligne B." in b["text"]

    def test_strips_inline(self):
        body = "::: info **Titre** gras\nTexte *italique*.\n:::"
        b = _blocks(body)[0]
        assert "**" not in b["label"]
        assert "*" not in b["text"]
        assert "Titre" in b["label"]

    def test_pagebreak_inside_fence_not_interpreted(self):
        body = "::: info\n<!-- pagebreak -->\nSuite.\n:::"
        b = _blocks(body)[0]
        assert b["type"] == "callout"
        # Le <!-- pagebreak --> est absorbé comme texte de la fence
        assert "pagebreak" in b["text"].lower()


class TestColoredSection:
    def test_with_title_and_text(self):
        body = "::: colored Points clés\nContenu coloré.\n:::"
        b = _blocks(body)[0]
        assert b["type"] == "colored_section"
        assert b["title"] == "Points clés"
        assert b["text"] == "Contenu coloré."

    def test_without_title(self):
        body = "::: colored\nTexte sans titre.\n:::"
        b = _blocks(body)[0]
        assert b["type"] == "colored_section"
        assert b["title"] == ""
        assert b["text"] == "Texte sans titre."

    def test_strips_inline(self):
        body = "::: colored **Titre gras**\nTexte _italique_.\n:::"
        b = _blocks(body)[0]
        assert "**" not in b["title"]
        assert "_" not in b["text"]


class TestDivider:
    def test_three_dashes(self):
        b = _blocks("---")[0]
        assert b == {"type": "divider"}

    def test_more_dashes(self):
        b = _blocks("------")[0]
        assert b == {"type": "divider"}

    def test_divider_between_paragraphs(self):
        body = "Avant.\n\n---\n\nAprès."
        blocks = _blocks(body)
        assert blocks[0]["type"] == "paragraph"
        assert blocks[1]["type"] == "divider"
        assert blocks[2]["type"] == "paragraph"


class TestPageBreak:
    def test_pagebreak_comment(self):
        b = _blocks("<!-- pagebreak -->")[0]
        assert b == {"type": "page_break"}

    def test_pagebreak_case_insensitive(self):
        b = _blocks("<!-- PAGEBREAK -->")[0]
        assert b == {"type": "page_break"}

    def test_pagebreak_with_spaces(self):
        b = _blocks("<!--  pagebreak  -->")[0]
        assert b == {"type": "page_break"}

    def test_pagebreak_between_blocks(self):
        body = "# Section 1\n\n<!-- pagebreak -->\n\n# Section 2"
        blocks = _blocks(body)
        assert blocks[0]["type"] == "heading"
        assert blocks[1]["type"] == "page_break"
        assert blocks[2]["type"] == "heading"


# ── Tests inline stripping ─────────────────────────────────────────────────────

class TestStripInline:
    def test_bold_double_star(self):
        assert _strip_inline("du **texte gras** ici") == "du texte gras ici"

    def test_italic_star(self):
        assert _strip_inline("du *italique* ici") == "du italique ici"

    def test_bold_double_underscore(self):
        assert _strip_inline("du __gras__ ici") == "du gras ici"

    def test_italic_underscore(self):
        assert _strip_inline("du _italique_ ici") == "du italique ici"

    def test_mixed(self):
        result = _strip_inline("**A** et *B* et __C__ et _D_")
        assert result == "A et B et C et D"

    def test_double_before_single(self):
        # __mot__ ne doit pas laisser _mot_ résiduel
        assert _strip_inline("__mot__") == "mot"

    def test_no_markers_unchanged(self):
        assert _strip_inline("texte normal") == "texte normal"

    def test_stripped_in_paragraph(self):
        b = _blocks("Texte **important** et _subtil_.")[0]
        assert "**" not in b["text"]
        assert "important" in b["text"]
        assert "subtil" in b["text"]

    def test_stripped_in_list_items(self):
        body = "- **Gras**\n- *Italique*\n- __Souligné__"
        b = _blocks(body)[0]
        assert b["items"] == ["Gras", "Italique", "Souligné"]

    def test_stripped_in_table_cells(self):
        body = "| **En-tête** |\n|-------------|\n| *valeur*    |"
        b = _blocks(body)[0]
        assert b["headers"] == ["En-tête"]
        assert b["rows"][0] == ["valeur"]

    def test_stripped_in_callout_label_and_text(self):
        body = "::: info **Label gras**\nTexte *italique*.\n:::"
        b = _blocks(body)[0]
        assert b["label"] == "Label gras"
        assert b["text"] == "Texte italique."


# ── Tests de dégradation (garantie centrale) ──────────────────────────────────

class TestDegradation:
    def test_no_frontmatter_returns_empty(self):
        """Texte sans front-matter → ([], {})."""
        text = "# Titre\n\nParagraphe normal."
        blocks, meta = parse_document(text)
        assert blocks == []
        assert meta == {}

    def test_malformed_yaml_returns_empty(self):
        """YAML malformé → ([], {}), pas d'exception."""
        text = "---\nformat: docx\nfilename: test\n: invalid: : yaml\n---\n# Titre\n"
        blocks, meta = parse_document(text)
        assert isinstance(blocks, list)
        assert isinstance(meta, dict)
        # Sans YAML valide, on ne peut pas rendre
        assert meta == {}

    def test_fence_never_closed_produces_block_with_content(self):
        """Fence ::: non fermée avec keyword connu → callout ou paragraph, jamais d'exception.

        Comportement choisi : un keyword reconnu produit toujours le bloc correspondant
        même sans fermeture explicite (le LLM peut avoir tronqué). Le contenu est préservé.
        """
        body = "::: info Label\nContenu non fermé.\nJamais de fermeture."
        b = _blocks(body)[0]
        assert b["type"] in ("callout", "paragraph")
        content_str = b.get("text", "") + b.get("label", "")
        assert "Contenu non fermé" in content_str or "Label" in content_str or "info" in content_str.lower()

    def test_unknown_fence_type_becomes_paragraph(self):
        """Type ::: inconnu (ex: danger2) → paragraph."""
        body = "::: danger2 Label\nContenu.\n:::"
        b = _blocks(body)[0]
        assert b["type"] == "paragraph"

    def test_fence_with_no_keyword_becomes_paragraph(self):
        """Fence ::: sans mot-clé → paragraph."""
        body = ":::\nContenu sans type.\n:::"
        b = _blocks(body)[0]
        assert b["type"] == "paragraph"

    def test_unknown_bullet_style_no_style_key(self):
        """bullet-style inconnu → pas de clé 'style' (template_default au rendu)."""
        body = "<!-- bullet-style: hexagon -->\n- Item A\n- Item B"
        b = _blocks(body)[0]
        assert b["type"] == "bullet_list"
        assert "style" not in b
        assert b["items"] == ["Item A", "Item B"]

    def test_table_short_rows_padded(self):
        """Lignes courtes complétées par '' — renderer gère déjà, on normalise."""
        body = "| A | B | C |\n|---|---|---|\n| x |"
        b = _blocks(body)[0]
        assert b["rows"][0] == ["x", "", ""]

    def test_heading_level_4_passed_through(self):
        """#### n'est pas clampé par le parseur — le renderer s'en charge."""
        b = _blocks("#### Niveau 4")[0]
        assert b["level"] == 4

    def test_pagebreak_inside_fence_absorbed(self):
        """<!-- pagebreak --> dans une fence → texte de la fence, pas page_break."""
        body = "::: info\n<!-- pagebreak -->\nSuite.\n:::"
        blocks = _blocks(body)
        # Doit produire UN callout (ou un paragraph si dégradé), pas un page_break
        assert all(b["type"] != "page_break" for b in blocks)
        assert blocks[0]["type"] == "callout"

    def test_empty_lines_between_blocks_ignored(self):
        """Les lignes vides entre blocs sont ignorées sans générer de blocs vides."""
        body = "\n\n# Titre\n\n\n- Item\n\n\n---\n\n"
        blocks = _blocks(body)
        types = [b["type"] for b in blocks]
        assert "heading" in types
        assert "bullet_list" in types
        assert "divider" in types
        # Pas de blocs vides ou parasites
        for b in blocks:
            assert b.get("text", "x") != "" or b["type"] in ("divider", "page_break")

    def test_pipe_line_not_table_without_separator(self):
        """Une ligne avec | sans ligne séparateur suivante → paragraph."""
        body = "| pas une table\nSuite."
        blocks = _blocks(body)
        # Doit être paragraph, pas table
        assert blocks[0]["type"] == "paragraph"

    def test_bullet_style_directive_without_following_list_ignored(self):
        """Directive bullet-style sans liste suivante → ignorée."""
        body = "<!-- bullet-style: arrow -->\n# Titre"
        blocks = _blocks(body)
        # La directive est ignorée, le heading est parsé normalement
        assert blocks[0]["type"] == "heading"

    def test_never_raises_on_empty_string(self):
        result = parse_document("")
        assert isinstance(result, tuple)
        assert result == ([], {})

    def test_never_raises_on_only_dashes(self):
        result = parse_document("---")
        assert isinstance(result, tuple)

    def test_no_format_no_filename_returns_empty(self):
        text = "---\ntemplate: minimal\ntitle: Titre\n---\n# Contenu\n"
        blocks, meta = parse_document(text)
        assert blocks == []
        assert meta == {}


# ── Fuzz léger : aucune entrée ne lève d'exception ───────────────────────────

class TestNoException:
    GARBAGE_INPUTS = [
        "",
        "---",
        "---\n---",
        "---\nformat: docx\nfilename: x\n---\n",
        "::: \n" * 10,
        ":::\n" * 5,
        "| | \n|--|\n" * 3,
        "# " * 200,
        "- " * 200,
        "\x00\x01\x02\x03",
        "---\n" * 50,
        "**" * 100,
        "---\nformat: docx\nfilename: test\n---\n" + ("# H\n" * 100),
        "---\nformat: docx\nfilename: test\n---\n" + ("::: info\n" * 5),
        "---\nformat: docx\nfilename: test\n---\n| " + "A | " * 50 + "\n",
        "---\n: bad yaml ::\n---\n",
        "---\nformat: docx\nfilename: test\n---\n<!-- pagebreak -->\n" * 20,
        "a" * 10_000,
    ]

    @pytest.mark.parametrize("inp", GARBAGE_INPUTS)
    def test_no_exception(self, inp: str):
        result = parse_document(inp)
        assert isinstance(result, tuple)
        assert len(result) == 2
        blocks, meta = result
        assert isinstance(blocks, list)
        assert isinstance(meta, dict)


# ── Document complet réaliste ─────────────────────────────────────────────────

REALISTIC_DOCUMENT = """\
---
format: docx
template: rapport
filename: bilan-q3-2024
company_name: Acme SARL
primary_color: "#0B1F3A"
title: Bilan Commercial Q3 2024
subtitle: Analyse des performances
author: Jean Dupont
institution: Acme SARL
date: 30 septembre 2024
reference: REF-2024-Q3
doc_type: RAPPORT D'ACTIVITÉ
---

# Introduction

Ce rapport présente les **résultats** du troisième trimestre 2024.

## Chiffres clés

<!-- bullet-style: check -->
- Chiffre d'affaires : 12,5M FCFA
- Nouveaux clients : 42
- Taux de satisfaction : 94%

## Répartition par segment

| Segment   | CA (FCFA)  | Part   |
|-----------|------------|--------|
| PME       | 7 200 000  | 57,6 % |
| Startups  | 3 800 000  | 30,4 % |
| Grandes   | 1 500 000  | 12,0 % |

::: success Objectif atteint
Le seuil de 10M FCFA a été dépassé pour la première fois.
:::

::: warning Point de vigilance
La marge sur le segment Grandes entreprises reste sous les 15%.
:::

::: colored Recommandation stratégique
Concentrer les efforts commerciaux sur les PME et Startups au Q4.
:::

<!-- pagebreak -->

## Détail des actions

1. Lancement de la campagne WhatsApp
2. Recrutement de 3 commerciaux terrain
3. Révision de la grille tarifaire

<!-- bullet-style: arrow -->
- Prochaine étape : revue mensuelle en octobre
- Responsable : Direction commerciale

---

## Annexes

### Tableau de bord complet

Voir le fichier Excel joint.
"""


class TestRealisticDocument:
    def setup_method(self):
        self.blocks, self.meta = parse_document(REALISTIC_DOCUMENT)

    def test_meta_extracted(self):
        assert self.meta["format"] == "docx"
        assert self.meta["template"] == "rapport"
        assert self.meta["filename"] == "bilan-q3-2024"
        assert self.meta["company_name"] == "Acme SARL"
        assert self.meta["primary_color"] == "#0B1F3A"

    def test_cover_page_first(self):
        assert self.blocks[0]["type"] == "cover_page"
        assert self.blocks[0]["title"] == "Bilan Commercial Q3 2024"
        assert self.blocks[0]["author"] == "Jean Dupont"

    def test_has_headings(self):
        types = [b["type"] for b in self.blocks]
        assert "heading" in types

    def test_has_bullet_list_check(self):
        check_lists = [b for b in self.blocks if b.get("type") == "bullet_list" and b.get("style") == "check"]
        assert len(check_lists) >= 1

    def test_has_table(self):
        tables = [b for b in self.blocks if b["type"] == "table"]
        assert len(tables) == 1
        assert tables[0]["headers"] == ["Segment", "CA (FCFA)", "Part"]
        assert len(tables[0]["rows"]) == 3

    def test_has_callout_success(self):
        callouts = [b for b in self.blocks if b.get("type") == "callout" and b.get("callout_type") == "success"]
        assert len(callouts) == 1
        assert "10M" in callouts[0]["text"]

    def test_has_callout_warning(self):
        callouts = [b for b in self.blocks if b.get("type") == "callout" and b.get("callout_type") == "warning"]
        assert len(callouts) == 1

    def test_has_colored_section(self):
        colored = [b for b in self.blocks if b["type"] == "colored_section"]
        assert len(colored) == 1
        assert colored[0]["title"] == "Recommandation stratégique"

    def test_has_page_break(self):
        assert any(b["type"] == "page_break" for b in self.blocks)

    def test_has_numbered_list(self):
        assert any(b["type"] == "numbered_list" for b in self.blocks)

    def test_has_arrow_bullet_list(self):
        arrow = [b for b in self.blocks if b.get("type") == "bullet_list" and b.get("style") == "arrow"]
        assert len(arrow) >= 1

    def test_has_divider(self):
        assert any(b["type"] == "divider" for b in self.blocks)

    def test_no_inline_markers_in_any_text_field(self):
        """Aucun bloc ne doit contenir ** ou __ dans ses champs textuels."""
        text_fields = ("text", "title", "subtitle", "label")
        for block in self.blocks:
            for field in text_fields:
                val = block.get(field, "")
                assert "**" not in val, f"** trouvé dans {block['type']}.{field}: {val!r}"
                assert "__" not in val, f"__ trouvé dans {block['type']}.{field}: {val!r}"

    def test_block_order_coherent(self):
        types = [b["type"] for b in self.blocks]
        # La page de garde doit être en premier
        assert types[0] == "cover_page"
        # Tous les types connus, aucun type inconnu
        known = {
            "cover_page", "header_block", "heading", "paragraph",
            "bullet_list", "numbered_list", "table", "colored_section",
            "callout", "page_break", "divider",
        }
        for t in types:
            assert t in known, f"Type inconnu : {t}"

    def test_all_blocks_are_dicts_with_type(self):
        for block in self.blocks:
            assert isinstance(block, dict)
            assert "type" in block


# ── Intégration : parse → render_document → bytes ────────────────────────────

class TestIntegration:
    def test_parse_then_render_docx_no_exception(self):
        """Round-trip complet : parse_document → render_document → bytes non vides."""
        try:
            from app.services.document_renderer import render_document
        except ImportError:
            pytest.skip("document_renderer non disponible (dépendances absentes)")

        blocks, meta = parse_document(REALISTIC_DOCUMENT)
        assert blocks, "Aucun bloc parsé"

        result = render_document(blocks, fmt="docx", template=meta.get("template", "minimal"))
        file_bytes, mime_type = result

        assert isinstance(file_bytes, bytes)
        assert len(file_bytes) > 0
        assert "wordprocessingml" in mime_type or mime_type == (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

    def test_empty_blocks_render_gracefully(self):
        """render_document avec liste vide ne doit pas lever d'exception."""
        try:
            from app.services.document_renderer import render_document
        except ImportError:
            pytest.skip("document_renderer non disponible")

        file_bytes, _ = render_document([], fmt="docx", template="minimal")
        assert isinstance(file_bytes, bytes)
        assert len(file_bytes) > 0

    def test_all_block_types_render_without_exception(self):
        """Chaque type de bloc produit du DOCX sans exception."""
        try:
            from app.services.document_renderer import render_document
        except ImportError:
            pytest.skip("document_renderer non disponible")

        all_blocks = [
            {"type": "cover_page", "title": "Test", "subtitle": "Sous", "author": "A",
             "institution": "I", "date": "D", "reference": "R", "doc_type": "T"},
            {"type": "header_block", "title": "Header", "subtitle": "Sub"},
            {"type": "heading", "text": "H1", "level": 1},
            {"type": "heading", "text": "H2", "level": 2},
            {"type": "heading", "text": "H3", "level": 3},
            {"type": "paragraph", "text": "Paragraphe de test."},
            {"type": "bullet_list", "items": ["A", "B"], "style": "check"},
            {"type": "bullet_list", "items": ["C", "D"]},
            {"type": "numbered_list", "items": ["Un", "Deux"]},
            {"type": "table", "headers": ["Col1", "Col2"], "rows": [["a", "b"], ["c", ""]]},
            {"type": "colored_section", "title": "Titre", "text": "Texte"},
            {"type": "callout", "callout_type": "info", "label": "Info", "text": "Contenu"},
            {"type": "callout", "callout_type": "warning", "label": "", "text": "Alerte"},
            {"type": "divider"},
            {"type": "page_break"},
        ]

        file_bytes, _ = render_document(all_blocks, fmt="docx", template="minimal")
        assert isinstance(file_bytes, bytes)
        assert len(file_bytes) > 0
