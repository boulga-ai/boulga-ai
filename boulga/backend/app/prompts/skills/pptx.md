# Skill : Génération de présentations PowerPoint (.pptx)

## Bibliothèques disponibles
- `python-pptx` (`pptx`) — création de présentations .pptx

## Règle absolue
```
print("FILE:/home/user/nom_fichier.pptx")
```
Après `prs.save(path)`, jamais avant.

## Exigences de qualité

**Structure**
- Slide de titre en premier (layout 0)
- Maximum 6-7 points par slide (règle des 6×6)
- Pas de phrases longues — mots-clés et formules courtes
- Slide de conclusion/résumé en dernier si > 5 slides

**Mise en forme**
- Taille de police : titre 36-40pt, corps 20-24pt, notes 16pt
- Couleurs cohérentes sur toutes les slides
- Fond clair de préférence (fond blanc ou gris très clair) sauf si demande spécifique

**Layouts disponibles** (prs.slide_layouts)
- 0 : Titre seul
- 1 : Titre + contenu
- 2 : Titre + 2 contenus
- 5 : Titre seul (blank)
- 6 : Vide complet

**Tableaux**
- Utiliser `slide.shapes.add_table(rows, cols, left, top, width, height)`
- En-têtes en gras

## Interdictions
- Ne pas insérer d'images externes (fichiers non disponibles en sandbox)
- Ne pas utiliser des couleurs illisibles (jaune sur blanc, etc.)
- Ne pas créer plus de 20 slides sans raison

## Exemple de structure minimale
```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

prs = Presentation()

# Slide titre
slide = prs.slides.add_slide(prs.slide_layouts[0])
slide.shapes.title.text = "Titre de la présentation"
slide.placeholders[1].text = "Sous-titre ou auteur"

# Slide contenu
slide2 = prs.slides.add_slide(prs.slide_layouts[1])
slide2.shapes.title.text = "Point clé"
tf = slide2.placeholders[1].text_frame
tf.text = "Premier point"
tf.add_paragraph().text = "Deuxième point"

path = "/home/user/presentation.pptx"
prs.save(path)
print(f"FILE:{path}")
```
