# Skill : Génération de présentations PowerPoint (.pptx)

## Bibliothèque
`python-pptx` (`from pptx import Presentation`)

## Règle absolue
```python
prs.save(path)
print(f"FILE:{path}")   # toujours après save(), jamais avant
```

## Gotchas critiques — lire avant de coder

**Unités : tout est en EMU**
- `Inches(1)` = 914400 EMU, `Pt(1)` = 12700 EMU, `Cm(1)` = 360000 EMU.
- Ne jamais passer des entiers bruts pour des positions/tailles — utiliser `Inches()`, `Pt()` ou `Cm()`.
- Dimensions de slide par défaut : 10" × 7.5" (paysage). Widescreen 16:9 :
```python
from pptx.util import Inches
prs.slide_width = Inches(13.33)
prs.slide_height = Inches(7.5)
```

**Placeholders vs formes libres**
- Les layouts ont des placeholders numérotés. Index 0 = titre, index 1 = corps — mais cela varie selon le layout.
- Toujours vérifier via `[ph.placeholder_format.idx for ph in slide.placeholders]` si un placeholder n'est pas trouvé.
- Pour du contenu positionné précisément, utiliser `slide.shapes.add_textbox(left, top, width, height)`.

**Texte dans un placeholder**
```python
tf = slide.placeholders[1].text_frame
tf.text = "Premier point"             # efface et remplace
p = tf.add_paragraph()                # ajouter une ligne supplémentaire
p.text = "Deuxième point"
p.level = 1                           # indentation (0 = premier niveau)
```
- `tf.text = "..."` **efface** tout le text_frame avant d'écrire — utiliser `add_paragraph()` pour les lignes suivantes.

**Couleurs**
```python
from pptx.dml.color import RGBColor
run.font.color.rgb = RGBColor(0x15, 0x65, 0xC0)   # bleu Boulga
run.font.color.rgb = RGBColor(0x0B, 0x1F, 0x3A)   # marine
```
- `RGBColor` prend 3 entiers 0-255, **pas** une string hex.

**Fond de slide**
```python
background = slide.background
fill = background.fill
fill.solid()
fill.fore_color.rgb = RGBColor(0x0B, 0x1F, 0x3A)
```

**Tableaux**
```python
from pptx.util import Inches
rows, cols = 4, 3
left, top = Inches(0.5), Inches(2)
width, height = Inches(9), Inches(3)
table = slide.shapes.add_table(rows, cols, left, top, width, height).table
# En-tête
for col_idx in range(cols):
    cell = table.cell(0, col_idx)
    cell.text = f"Colonne {col_idx+1}"
    cell.fill.solid()
    cell.fill.fore_color.rgb = RGBColor(0x0B, 0x1F, 0x3A)
    run = cell.text_frame.paragraphs[0].runs[0]
    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    run.font.bold = True
```

**Formes (rectangles, flèches, etc.)**
```python
from pptx.util import Inches, Pt
from pptx.enum.shapes import MSO_SHAPE_TYPE
shape = slide.shapes.add_shape(
    MSO_SHAPE_TYPE.ROUNDED_RECTANGLE,   # ou 1 pour rectangle simple
    Inches(1), Inches(1), Inches(3), Inches(1)
)
shape.fill.solid()
shape.fill.fore_color.rgb = RGBColor(0x15, 0x65, 0xC0)
shape.line.color.rgb = RGBColor(0x15, 0x65, 0xC0)
```

**Notes de présentation**
```python
notes_slide = slide.notes_slide
notes_slide.notes_text_frame.text = "Notes du présentateur ici."
```

**Overflow de texte**
- python-pptx ne réduit pas automatiquement la taille du texte — ajuster `run.font.size = Pt(18)` manuellement selon le contenu.

## Layouts disponibles (prs.slide_layouts)
| Index | Type |
|---|---|
| 0 | Titre seul (page de garde) |
| 1 | Titre + contenu |
| 2 | Titre + 2 contenus côte à côte |
| 5 | Titre seul (section) |
| 6 | Vide complet |

## Exigences de qualité
- Slide de titre en premier (layout 0), slide de conclusion si > 5 slides.
- Règle 6×6 : max 6 points par slide, max 6 mots par point.
- Taille police : titre 36-40pt, corps 20-24pt.
- Couleurs cohérentes : utiliser marine `0B1F3A` et bleu `1565C0` de la charte.
- Fond clair (blanc/gris très clair) par défaut, sauf demande contraire.
- Nom de fichier : minuscules, tirets, sans espaces ni accents.

## Interdictions
- Ne pas insérer d'images externes (non disponibles en sandbox).
- Ne pas créer > 20 slides sans raison.
- Ne pas utiliser de couleurs illisibles (jaune sur blanc, rouge sur rouge…).

## Exemple complet
```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

prs = Presentation()
# Format widescreen 16:9
prs.slide_width = Inches(13.33)
prs.slide_height = Inches(7.5)

# Slide de titre
slide = prs.slides.add_slide(prs.slide_layouts[0])
slide.shapes.title.text = "Rapport de performance Q2 2026"
slide.placeholders[1].text = "Boulga Corporation — Juillet 2026"

# Slide contenu
slide2 = prs.slides.add_slide(prs.slide_layouts[1])
slide2.shapes.title.text = "Résultats clés"
tf = slide2.placeholders[1].text_frame
tf.text = "Chiffre d'affaires : 12,5 M FCFA"
for point in ["Croissance : +34% vs Q1", "Nouveaux clients : 280", "NPS : 72"]:
    p = tf.add_paragraph()
    p.text = point
    p.level = 1

path = "/home/user/rapport_q2_2026.pptx"
prs.save(path)
print(f"FILE:{path}")
```
