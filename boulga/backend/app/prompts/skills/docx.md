# Skill : Génération de fichiers Word (.docx)

## Bibliothèques disponibles
- `python-docx` (`docx`) — création et mise en forme de .docx

## Règle absolue
```
print("FILE:/home/user/nom_fichier.docx")
```
Après `doc.save(path)`, jamais avant.

## Exigences de qualité

**Structure du document**
- Utiliser les styles natifs Word : `'Heading 1'`, `'Heading 2'`, `'Normal'`, `'List Bullet'`
- Table des matières automatique si document > 3 sections (utiliser les styles Heading)
- Marges standard : 2.54 cm (1 pouce) si non spécifié

**Tableaux**
- Style de tableau propre : en-têtes en gras, bordures visibles
- Largeurs de colonnes explicites si le contenu l'exige
- `table.style = 'Table Grid'` pour un rendu professionnel simple

**Mise en forme**
- Titres principaux : `Heading 1` (auto-formaté par Word)
- Sous-titres : `Heading 2`
- Corps : `Normal`
- Ne pas abuser du gras/italique — réserver aux éléments vraiment importants

**Listes**
- `'List Bullet'` pour les puces
- `'List Number'` pour les listes numérotées

## Interdictions
- Ne pas manipuler directement le XML interne (risque de corruption)
- Ne pas mélanger les formats de marges (utiliser `Inches` ou `Cm` de manière cohérente)
- Ne pas créer de styles personnalisés complexes (compatibilité variable)

## Exemple de structure minimale
```python
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# Titre
doc.add_heading("Titre Principal", level=1)

# Paragraphe
p = doc.add_paragraph("Contenu du document.")

# Tableau
table = doc.add_table(rows=1, cols=3)
table.style = 'Table Grid'
hdr = table.rows[0].cells
hdr[0].text = "Colonne A"
hdr[1].text = "Colonne B"
hdr[2].text = "Colonne C"
row = table.add_row().cells
row[0].text = "Valeur 1"
row[1].text = "Valeur 2"
row[2].text = "1 000 FCFA"

path = "/home/user/document.docx"
doc.save(path)
print(f"FILE:{path}")
```
