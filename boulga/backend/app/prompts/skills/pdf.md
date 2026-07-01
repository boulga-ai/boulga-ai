# Skill : Génération de fichiers PDF

## Bibliothèque
`reportlab` — `SimpleDocTemplate` + flowables pour documents longs ; `canvas.Canvas` pour mise en page fixe uniquement.

## Règle absolue
```python
doc.build(elements)     # ou c.save() si canvas direct
print(f"FILE:{path}")   # toujours après build/save, jamais avant
```

## Gotchas critiques — lire avant de coder

**Unités**
- Reportlab travaille en **points** (1 cm ≈ 28.35 pt, 1 pouce = 72 pt).
- Toujours importer `from reportlab.lib.units import cm, inch` et utiliser `2*cm`, `0.5*inch`.
- Ne jamais passer des valeurs brutes en pixels.

**Largeurs de colonnes dans Table**
- La somme des largeurs de colonnes doit correspondre à la largeur utile de la page.
- Largeur utile A4 avec marges 2 cm : `21*cm - 4*cm = 17*cm` (170 pts ≈ 482 pts).
- Si les colonnes dépassent, le tableau déborde silencieusement hors de la page.

**Styles de paragraphe personnalisés**
```python
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
styles = getSampleStyleSheet()
body_style = ParagraphStyle(
    'BodyJustifie',
    parent=styles['Normal'],
    fontSize=11,
    leading=16,         # interlignage = leading, pas lineHeight
    alignment=TA_JUSTIFY,
    spaceAfter=8,
)
```

**Texte justifié** : `alignment=TA_JUSTIFY` — pas de propriété `textAlign`.

**Couleurs**
```python
from reportlab.lib import colors
bleu = colors.HexColor('#1565C0')
marine = colors.HexColor('#0B1F3A')
# Ou via tuple RGB normalisé :
rouge = colors.Color(0.78, 0.16, 0.16)
```

**En-têtes et pieds de page** (avec numéros de page)
```python
from reportlab.platypus import SimpleDocTemplate
from reportlab.lib.pagesizes import A4

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.HexColor('#94A3B8'))
    # Pied de page centré
    canvas.drawCentredString(A4[0]/2, 1.2*cm, f"Page {doc.page}")
    # En-tête
    canvas.drawString(2*cm, A4[1] - 1.5*cm, "Titre du document")
    canvas.restoreState()

doc = SimpleDocTemplate(path, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=3*cm, bottomMargin=2.5*cm)
doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
```

**Fusion de cellules dans Table**
```python
style = TableStyle([
    ('SPAN', (0, 0), (2, 0)),   # fusionne colonnes 0-2 de la ligne 0
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B1F3A')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F7FA')]),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E4EC')),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
])
```

**Saut de page** : `from reportlab.platypus import PageBreak` → `elements.append(PageBreak())`.

**Garder un bloc sur la même page** (éviter les orphelins)
```python
from reportlab.platypus import KeepTogether
elements.append(KeepTogether([titre, tableau]))
```

**Images**
```python
from reportlab.platypus import Image
img = Image("/home/user/logo.png", width=4*cm, height=2*cm)
elements.append(img)
```
Le fichier image doit exister sur le disque. Ne jamais utiliser une URL.

**Polices sûres sans registration** : `'Helvetica'`, `'Helvetica-Bold'`, `'Times-Roman'`, `'Times-Bold'`, `'Courier'`.

**Encodage UTF-8 (accents français)** : Helvetica gère Latin-1. Pour l'arabe ou d'autres scripts, registration de police TTF requise — ne pas l'utiliser sauf demande explicite.

## Exigences de qualité
- Format A4 par défaut, Letter si document américain explicitement demandé.
- Marges minimum : 2 cm sur tous les côtés.
- Tout document formel → pied de page avec numéro de page.
- Titres : Helvetica-Bold, 16-18pt pour H1, 13-14pt pour H2.
- Corps : Helvetica 11pt, interlignage 16pt, justifié.
- Tableaux : en-têtes marine + texte blanc + alternance de lignes + grille fine.
- Espacement entre sections : `Spacer(1, 0.5*cm)`.
- Nom de fichier : minuscules, tirets, sans espaces ni accents.

## Exemple complet
```python
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib import colors
from reportlab.lib.units import cm

path = "/home/user/rapport.pdf"

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.HexColor('#94A3B8'))
    canvas.drawCentredString(A4[0]/2, 1.2*cm, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(path, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2.5*cm, bottomMargin=2.5*cm)

styles = getSampleStyleSheet()
h1 = ParagraphStyle('H1', parent=styles['Heading1'],
    fontSize=16, textColor=colors.HexColor('#0B1F3A'), spaceAfter=12)
body = ParagraphStyle('Body', parent=styles['Normal'],
    fontSize=11, leading=16, alignment=TA_JUSTIFY, spaceAfter=8)

elements = []
elements.append(Paragraph("Rapport Annuel 2026", h1))
elements.append(Spacer(1, 0.5*cm))
elements.append(Paragraph("Ce rapport présente les résultats de l'exercice.", body))
elements.append(Spacer(1, 0.5*cm))

# Tableau
table_data = [
    ["Produit", "Quantité", "Montant (FCFA)"],
    ["Produit A", "50", "150 000"],
    ["Produit B", "120", "180 000"],
]
col_widths = [7*cm, 4*cm, 6*cm]
tbl = Table(table_data, colWidths=col_widths)
tbl.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0B1F3A')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F5F7FA')]),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E4EC')),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
elements.append(tbl)

doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
print(f"FILE:{path}")
```
