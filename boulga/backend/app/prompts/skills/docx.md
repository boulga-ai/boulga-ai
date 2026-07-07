# Skill : Génération de fichiers Word (.docx)

## Bibliothèque
`python-docx` (`from docx import Document`)

## Règle absolue
```python
doc.save(path)
print(f"FILE:{path}")   # toujours après save(), jamais avant
```

## Gotchas critiques — lire avant de coder

**Paragraphes et runs**
- Texte mixte (gras + normal) dans un même paragraphe → `paragraph.add_run()` pour chaque fragment, `run.bold = True` sur le fragment concerné.
- Jamais de `\n` dans un run — utiliser `doc.add_paragraph()` pour chaque ligne.
- Alignement : `from docx.enum.text import WD_ALIGN_PARAGRAPH` → `p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY`.

**Styles**
- Styles natifs à utiliser : `'Heading 1'`, `'Heading 2'`, `'Heading 3'`, `'Normal'`, `'List Bullet'`, `'List Number'`.
- Ne jamais inventer un style — si le style n'existe pas dans le document, python-docx lève une erreur silencieuse ou utilise le style par défaut.
- Puces : ne jamais insérer `•` ou `-` en dur dans le texte du paragraphe. Utiliser `doc.add_paragraph(texte, style='List Bullet')` (ou `'List Number'`) — sinon la liste n'est pas reconnue comme liste par Word (pas de retrait, pas de renumérotation).

**Taille de page**
- `Document()` sans argument part en format **Letter** (8.5"×11"), pas A4 — piège silencieux pour un document destiné à un public francophone.
- Pour forcer A4 :
```python
from docx.shared import Mm
section = doc.sections[0]
section.page_width = Mm(210)
section.page_height = Mm(297)
```

**Tableaux**
- Toujours définir `table.style = 'Table Grid'` — sans ça les bordures sont invisibles.
- Largeurs de colonnes — `table.columns[i].width = Inches(x)` seul est **souvent ignoré** par Word/LibreOffice. Il faut aussi désactiver l'autofit et fixer la largeur de chaque cellule de la colonne :
```python
table.autofit = False
table.allow_autofit = False
for row in table.rows:
    row.cells[i].width = Inches(x)   # répéter pour chaque colonne i
```
- Fusion de cellules : `table.cell(row1, col1).merge(table.cell(row2, col2))` — écrire le texte dans la cellule supérieure gauche seulement.
- Fond de cellule : nécessite XML — utiliser ce snippet exact :
```python
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
def set_cell_bg(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)
```

**Table des matières (TOC)**
- python-docx ne calcule pas de vraie TOC. Solution : utiliser les styles `Heading 1/2/3` pour tous les titres + ajouter ce champ XML qui se met à jour à l'ouverture dans Word :
```python
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
def add_toc(doc):
    paragraph = doc.add_paragraph()
    run = paragraph.add_run()
    fldChar = OxmlElement('w:fldChar')
    fldChar.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = 'TOC \\o "1-3" \\h \\z \\u'
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')
    run._r.append(fldChar)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run._r.append(fldChar3)
```

**En-têtes et pieds de page**
```python
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
section = doc.sections[0]
footer = section.footer
p = footer.paragraphs[0]
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run()
# Numéro de page automatique
fldChar1 = OxmlElement('w:fldChar'); fldChar1.set(qn('w:fldCharType'), 'begin')
instrText = OxmlElement('w:instrText'); instrText.text = 'PAGE'
fldChar2 = OxmlElement('w:fldChar'); fldChar2.set(qn('w:fldCharType'), 'end')
run._r.append(fldChar1); run._r.append(instrText); run._r.append(fldChar2)
```

**Polices sûres** (sans embedding) : Calibri, Arial, Times New Roman, Courier New.
- `run.font.name = 'Arial'`
- `run.font.size = Pt(11)`

**Marges**
```python
from docx.shared import Cm
section = doc.sections[0]
section.top_margin = Cm(2.54)
section.bottom_margin = Cm(2.54)
section.left_margin = Cm(2.54)
section.right_margin = Cm(2.54)
```

**Saut de page** : `doc.add_page_break()` — pas de `\n\n\n`.

**Aligner du texte à droite sur la même ligne qu'un texte à gauche** (en-tête de lettre, sommaire fait main avec points de suite) — utiliser une tabulation, jamais des espaces ou des points en dur :
```python
from docx.enum.text import WD_TAB_ALIGNMENT, WD_TAB_LEADER
p = doc.add_paragraph()
p.paragraph_format.tab_stops.add_tab_stop(Cm(16), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
p.add_run("Chapitre 1\tPage 3")   # \t va jusqu'au taquet, avec points de suite
```

**Espacement entre paragraphes**
```python
from docx.shared import Pt
p.paragraph_format.space_before = Pt(6)
p.paragraph_format.space_after = Pt(6)
```

## Exigences de qualité
- Document > 3 sections → ajouter une TOC après le titre principal.
- Tout document formel → pied de page avec numéro de page centré.
- Titres hiérarchiques : `Heading 1` pour sections, `Heading 2` pour sous-sections.
- Tableau de données → `Table Grid`, en-têtes en gras avec fond `0B1F3A` (marine) texte blanc.
- Marges standard : 2.54 cm sauf demande contraire.
- Nom de fichier : minuscules, tirets, sans espaces ni accents.

## Exemple complet
```python
from docx import Document
from docx.shared import Pt, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# Marges
section = doc.sections[0]
for margin in ['top_margin','bottom_margin','left_margin','right_margin']:
    setattr(section, margin, Cm(2.54))

# Titre
doc.add_heading("Rapport Annuel 2026", level=1)

# Paragraphe justifié
p = doc.add_paragraph("Introduction du document.")
p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

# Tableau
table = doc.add_table(rows=1, cols=3)
table.style = 'Table Grid'
hdr = table.rows[0].cells
for i, txt in enumerate(["Désignation", "Quantité", "Montant (FCFA)"]):
    hdr[i].text = txt
    hdr[i].paragraphs[0].runs[0].bold = True

row = table.add_row().cells
row[0].text = "Produit A"
row[1].text = "10"
row[2].text = "150 000"

path = "/home/user/rapport_2026.docx"
doc.save(path)
print(f"FILE:{path}")
```
