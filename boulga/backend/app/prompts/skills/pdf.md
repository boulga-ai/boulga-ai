# Skill : Génération de fichiers PDF

## Bibliothèques disponibles
- `reportlab` — création de PDF (principal) : `reportlab.platypus`, `reportlab.lib`
- `pdfplumber` — lecture seulement, ne pas utiliser pour créer

## Règle absolue
```
print("FILE:/home/user/nom_fichier.pdf")
```
Après `doc.build(elements)` ou `c.save()`, jamais avant.

## Exigences de qualité

**Mise en page**
- Format A4 (`letter` si document américain demandé)
- Marges : 2 cm sur tous les côtés minimum (`72` points = ~2.54 cm)
- En-tête et/ou pied de page si document formel (numéro de page)

**Typographie**
- Titres : Helvetica-Bold ou Times-Bold, 16-18pt
- Corps : Helvetica ou Times-Roman, 11-12pt
- Espacement entre paragraphes : 6-12pt

**Tableaux**
- Utiliser `Table` + `TableStyle` de reportlab
- En-têtes de tableau en gras, fond coloré
- Alternance de couleurs sur les lignes si plus de 5 lignes (`ROWBACKGROUNDS`)
- Largeurs de colonnes adaptées au contenu

**Images et graphiques**
- Ne pas générer d'images externes — utiliser `Drawing` de `reportlab.graphics` si graphique nécessaire

## Interdictions
- Ne pas utiliser `matplotlib` pour insérer des graphiques (non fiable en PDF)
- Ne pas dépasser 5 Mo pour un PDF sans images
- Ne pas laisser de pages vides inutiles

## Exemple de structure minimale
```python
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import cm

path = "/home/user/document.pdf"
doc = SimpleDocTemplate(path, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm, bottomMargin=2*cm)

styles = getSampleStyleSheet()
elements = []

elements.append(Paragraph("Titre du document", styles['Title']))
elements.append(Spacer(1, 0.5*cm))
elements.append(Paragraph("Contenu du paragraphe.", styles['Normal']))

doc.build(elements)
print(f"FILE:{path}")
```
