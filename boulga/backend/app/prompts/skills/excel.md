# Skill : Génération de fichiers Excel

## Bibliothèques disponibles
- `openpyxl` — création et mise en forme de fichiers .xlsx (principal)
- `xlsxwriter` — alternative si des graphiques sont demandés

## Règle absolue
Quand le fichier est prêt, signale-le via stdout **sur sa propre ligne** :
```
print("FILE:/home/user/nom_fichier.xlsx")
```
Fais-le **après** `wb.save(path)`, jamais avant.

## Exigences de qualité

**Structure**
- Première ligne = en-têtes : gras, fond coloré (`#1565C0` bleu Boulga ou `#0B1F3A` marine), texte blanc
- Largeurs de colonnes adaptées au contenu (`ws.column_dimensions['A'].width = 20`)
- Première ligne figée (`ws.freeze_panes = 'A2'`)
- Filtre automatique sur les en-têtes si tableau de données (`ws.auto_filter.ref = ws.dimensions`)

**Formatage des données**
- Montants en FCFA : format nombre `#,##0" FCFA"` ou colonne dédiée
- Dates : format `DD/MM/YYYY`
- Pourcentages : format `0.00%`
- Nombres négatifs en rouge si pertinent

**Nommage**
- Nom de feuille explicite (pas "Sheet1") — max 31 caractères
- Nom de fichier en minuscules avec tirets, sans espaces ni accents

## Interdictions
- Ne pas utiliser `pandas` (non installé)
- Ne pas utiliser de chemins Windows (`C:\...`) — toujours `/home/user/`
- Ne pas laisser de cellules vides là où une valeur 0 est attendue
- Ne pas dépasser 1 Mo pour les fichiers de données tabulaires simples

## Exemple de structure minimale
```python
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Données"

# En-têtes
headers = ["Colonne A", "Colonne B"]
for col, h in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=h)
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="1565C0")

# Données
ws.append(["val1", 1000])

# Largeurs
ws.column_dimensions['A'].width = 20
ws.column_dimensions['B'].width = 15
ws.freeze_panes = 'A2'

path = "/home/user/fichier.xlsx"
wb.save(path)
print(f"FILE:{path}")
```
