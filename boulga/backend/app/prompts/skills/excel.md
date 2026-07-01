# Skill : Génération de fichiers Excel (.xlsx)

## Bibliothèque
`openpyxl` — principal. `xlsxwriter` si graphiques complexes demandés.

## Règle absolue
```python
wb.save(path)
print(f"FILE:{path}")   # toujours après save(), jamais avant
```

## Gotchas critiques — lire avant de coder

**Couleurs dans openpyxl**
- `PatternFill` et `Font` prennent le hex **sans `#`** : `fgColor="1565C0"`, `color="FFFFFF"`.
- Ne jamais passer `"#1565C0"` — la cellule restera sans couleur silencieusement.

**Formules**
- openpyxl écrit les formules comme strings : `cell.value = "=SUM(A2:A100)"`.
- openpyxl **ne calcule pas** les formules — la valeur sera calculée à l'ouverture dans Excel/LibreOffice.
- Pour un résultat immédiatement lisible dans le fichier, calculer en Python et écrire la valeur.

**Cellules fusionnées**
- `ws.merge_cells('A1:D1')` — écrire la valeur **uniquement** dans `ws['A1']`, pas dans les autres cellules fusionnées (elles sont vides).
- Appliquer le style sur `ws['A1']` uniquement.

**Bordures**
```python
from openpyxl.styles import Border, Side
thin = Side(style='thin')
border = Border(left=thin, right=thin, top=thin, bottom=thin)
cell.border = border
```

**Validation de données (dropdown)**
```python
from openpyxl.worksheet.datavalidation import DataValidation
dv = DataValidation(type="list", formula1='"Oui,Non,En cours"', allow_blank=True)
ws.add_data_validation(dv)
dv.add(ws['C2:C100'])
```

**Graphiques**
```python
from openpyxl.chart import BarChart, Reference
chart = BarChart()
chart.type = "col"
chart.title = "Ventes mensuelles"
data = Reference(ws, min_col=2, min_row=1, max_row=12)
cats = Reference(ws, min_col=1, min_row=2, max_row=12)
chart.add_data(data, titles_from_data=True)
chart.set_categories(cats)
chart.width = 15; chart.height = 10
ws.add_chart(chart, "E2")
```

**Hauteur de ligne / largeur de colonne**
```python
ws.row_dimensions[1].height = 25        # en points
ws.column_dimensions['A'].width = 25    # en caractères approximatifs
```

**Protection de feuille**
```python
ws.protection.sheet = True
ws.protection.password = "motdepasse"
```

**Impression**
```python
ws.print_title_rows = '1:1'             # répéter la ligne 1 sur chaque page imprimée
ws.page_setup.fitToPage = True
ws.page_setup.fitToWidth = 1
```

**Hyperlien dans une cellule**
```python
cell.hyperlink = "https://boulga.ai"
cell.style = "Hyperlink"
```

## Exigences de qualité
- En-têtes : gras, fond `1565C0` (bleu Boulga), texte `FFFFFF`.
- Première ligne figée : `ws.freeze_panes = 'A2'`.
- Filtre automatique : `ws.auto_filter.ref = ws.dimensions`.
- Largeurs de colonnes explicites sur toutes les colonnes de données.
- Montants FCFA : `cell.number_format = '#,##0" FCFA"'`.
- Dates : `cell.number_format = 'DD/MM/YYYY'`.
- Pourcentages : `cell.number_format = '0.00%'`.
- Nom de feuille explicite (pas "Sheet1"), max 31 caractères.
- Nom de fichier : minuscules, tirets, sans espaces ni accents.

## Interdictions
- `pandas` non installé — ne pas l'utiliser.
- Chemins Windows (`C:\...`) interdits — toujours `/home/user/`.
- Ne pas dépasser 1 Mo pour des données tabulaires simples.

## Exemple complet
```python
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Ventes 2026"

# En-têtes
headers = ["Produit", "Quantité", "Prix unitaire (FCFA)", "Total (FCFA)"]
thin = Side(style='thin')
border = Border(left=thin, right=thin, top=thin, bottom=thin)

for col, h in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=h)
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="1565C0")
    cell.alignment = Alignment(horizontal="center", vertical="center")
    cell.border = border

# Données
data = [
    ["Produit A", 50, 3000, "=B2*C2"],
    ["Produit B", 120, 1500, "=B3*C3"],
]
for row_data in data:
    ws.append(row_data)

# Formats numériques
for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
    row[2].number_format = '#,##0" FCFA"'
    row[3].number_format = '#,##0" FCFA"'

# Largeurs
ws.column_dimensions['A'].width = 20
ws.column_dimensions['B'].width = 12
ws.column_dimensions['C'].width = 22
ws.column_dimensions['D'].width = 18

ws.freeze_panes = 'A2'
ws.auto_filter.ref = ws.dimensions
ws.row_dimensions[1].height = 25

path = "/home/user/ventes_2026.xlsx"
wb.save(path)
print(f"FILE:{path}")
```
