# SKILL — Génération de présentation PowerPoint (.pptx)

Le LLM sait déjà manipuler python-pptx. Ce skill fixe la qualité visuelle, les mises en page et les choix de slide, pas l'apprentissage des objets.

---

## EXIGENCES DE QUALITÉ

- Crée des slides distinctes selon le contenu : titre, agenda, comparaison, conclusion.
- Utilise une palette cohérente mais différente selon le thème du document.
- Chaque slide doit être lisible : 18-24pt minimum pour les titres, 14-18pt pour les points.
- Les documents structurés doivent contenir au moins 4 slides et une progression logique.
- Les slides doivent éviter le blanc nu généralisé : ajoute des blocs ou des formes décoratives quand cela convient.

---

## RAPPELS TECHNIQUES CRITIQUES

- Utilise les layouts existants (`prs.slide_layouts[...]`) et complète les placeholders au lieu de tout reconstruire manuellement.
- Positionne précisément les zones avec `Inches()` ou `Cm()`.
- Active `word_wrap` sur le `text_frame` pour les textes dynamiques.
- Pour une forme de fond, ajoute-la avec `add_shape()` puis remplis-la avant d’ajouter du texte par-dessus.
- Ne mets pas plus de 5-6 lignes de texte par zone ou slide.

---

## EXEMPLE 1 — Présentation stratégique 4 slides

```python
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

print('🎨 Création de la présentation PowerPoint...')

prs = Presentation()
prs.slide_width = Inches(13.33)
prs.slide_height = Inches(7.5)

PRIMARY = RGBColor(0x0B, 0x1F, 0x3A)
SECONDARY = RGBColor(0x15, 0x65, 0xC0)
ACCENT = RGBColor(0xF5, 0x7C, 0x00)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

# Slide 1 - titre
slide = prs.slides.add_slide(prs.slide_layouts[6])
shape = slide.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
shape.fill.solid()
shape.fill.fore_color.rgb = PRIMARY
shape.line.fill.background()

title_box = slide.shapes.add_textbox(Inches(1), Inches(1.5), Inches(11.33), Inches(1.5))
text_frame = title_box.text_frame
text_frame.text = 'Stratégie e-commerce 2026'
text_frame.paragraphs[0].runs[0].font.size = Pt(48)
text_frame.paragraphs[0].runs[0].font.bold = True
text_frame.paragraphs[0].runs[0].font.color.rgb = WHITE

subtitle = slide.shapes.add_textbox(Inches(1), Inches(3.5), Inches(11.33), Inches(1))
sub_tf = subtitle.text_frame
sub_tf.text = 'Objectifs principaux et priorités d\'investissement'
sub_tf.paragraphs[0].runs[0].font.size = Pt(24)
sub_tf.paragraphs[0].runs[0].font.color.rgb = ACCENT
print('✅ Slide 1 — Titre')

# Slide 2 - agenda
slide = prs.slides.add_slide(prs.slide_layouts[6])
slide.shapes.add_shape(1, Inches(0.5), Inches(0.3), Inches(12.3), Inches(1.0)).fill.solid().fore_color.rgb = SECONDARY
box = slide.shapes.add_textbox(Inches(0.7), Inches(0.4), Inches(11), Inches(0.8))
box_tf = box.text_frame
box_tf.text = 'Agenda'
box_tf.paragraphs[0].runs[0].font.size = Pt(32)
box_tf.paragraphs[0].runs[0].font.bold = True
for i, item in enumerate(['Contexte', 'Objectifs', 'Recommandations', 'Prochaines étapes'], start=1):
    p = box_tf.add_paragraph()
    p.text = f'{i}. {item}'
    p.font.size = Pt(18)
print('✅ Slide 2 — Agenda')

# Slide 3 - points clés
slide = prs.slides.add_slide(prs.slide_layouts[6])
slide.shapes.add_shape(1, Inches(0.3), Inches(0.3), Inches(12.7), Inches(1.2)).fill.solid().fore_color.rgb = RGBColor(0xEE, 0xEE, 0xEE)
box = slide.shapes.add_textbox(Inches(0.7), Inches(0.5), Inches(11), Inches(2.5))
tf = box.text_frame
tf.text = 'Priorités clés'
tf.paragraphs[0].runs[0].font.size = Pt(30)
for line in ['Renforcer le mobile-first.', 'Optimiser le tunnel d\'achat.', 'Augmenter la confiance client.']:
    p = tf.add_paragraph()
    p.text = line
    p.font.size = Pt(20)
print('✅ Slide 3 — Priorités')

# Slide 4 - conclusion
slide = prs.slides.add_slide(prs.slide_layouts[6])
box = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(11), Inches(2))
tf = box.text_frame
tf.text = 'Conclusion'
tf.paragraphs[0].runs[0].font.size = Pt(34)
tf.paragraphs[0].runs[0].font.bold = True
p = tf.add_paragraph()
p.text = 'Ce plan offre une direction claire pour accélérer le commerce en ligne et renforcer la présence locale.'
p.font.size = Pt(18)
print('✅ Slide 4 — Conclusion')

prs.save('document.pptx')
if Path('document.pptx').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ Présentation PowerPoint prête !')
```

## EXEMPLE 2 — Présentation produit dynamique

```python
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

print('🚀 Création de la présentation produit...')

prs = Presentation()
prs.slide_width = Inches(13.33)
prs.slide_height = Inches(7.5)

GREEN = RGBColor(0x2E, 0x7D, 0x32)
YELLOW = RGBColor(0xFF, 0xC1, 0x07)
DARK = RGBColor(0x23, 0x2A, 0x33)

slide = prs.slides.add_slide(prs.slide_layouts[6])
shape = slide.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
shape.fill.solid(); shape.fill.fore_color.rgb = RGBColor(0xFA, 0xF3, 0xDD)

title_box = slide.shapes.add_textbox(Inches(1), Inches(1.5), Inches(11), Inches(1.5))
text_frame = title_box.text_frame
text_frame.text = 'Nouveau produit 2026'
text_frame.paragraphs[0].runs[0].font.size = Pt(44)
text_frame.paragraphs[0].runs[0].font.bold = True

slide = prs.slides.add_slide(prs.slide_layouts[6])
box = slide.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(11), Inches(1.2))
box_tf = box.text_frame
box_tf.text = 'Proposition de valeur'
box_tf.paragraphs[0].runs[0].font.size = Pt(28)
for i, line in enumerate(['Interface locale simple', 'Paiements mobiles intégrés', 'Support en français'], start=1):
    p = box_tf.add_paragraph()
    p.text = f'{i}. {line}'
    p.font.size = Pt(18)

slide = prs.slides.add_slide(prs.slide_layouts[6])
bg = slide.shapes.add_shape(1, Inches(0.3), Inches(0.3), Inches(12.7), Inches(6.8))
bg.fill.solid(); bg.fill.fore_color.rgb = DARK
box = slide.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(12), Inches(2.5))
box_tf = box.text_frame
box_tf.text = 'Feuille de route'
box_tf.paragraphs[0].runs[0].font.size = Pt(34)
for step in ['Prototype', 'Tests utilisateur', 'Lancement', 'Suivi']:
    p = box_tf.add_paragraph()
    p.text = step
    p.font.size = Pt(18)
print('✅ Présentation produit prête !')

prs.save('document.pptx')
if Path('document.pptx').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ Présentation PowerPoint prête !')
```

---

## MÉCANIQUE

- Sauvegarde avec le nom exact fourni par la tâche, par exemple `prs.save('document.pptx')`.
- Ajoute un `print()` à chaque étape majeure.
- Vérifie que le fichier existe et qu'il n'est pas vide.
