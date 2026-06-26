# SKILL — Génération de fichier Excel (.xlsx)

Le LLM sait déjà manipuler openpyxl. Ce skill fixe le rendu attendu, les pièges et la mise en forme utile.

---

## EXIGENCES DE QUALITÉ

- Adapte la structure au type de document : tableaux synthétiques, dashboards ou budgets.
- Les fichiers détaillés doivent comporter plusieurs feuilles, des formules et des formats clairs.
- Les données doivent être immédiatement lisibles : en-têtes formatés, colonnes ajustées, style alterné.
- Deux fichiers différents doivent avoir des palettes de couleurs et des structures distinctes.
- Si le contenu est métier, construis une présentation utile avec totaux et visualisation.

---

## RAPPELS TECHNIQUES CRITIQUES

- Les formules doivent être des chaînes Excel, par exemple `cell.value = '=SUM(B2:B10)'`.
- Pour fusionner des cellules, utilise `ws.merge_cells('A1:D1')` puis ajuste l’alignement.
- Applique des formats numériques avec `number_format` pour les monnaies, pourcentages et dates.
- Ajuste les colonnes avec `ws.column_dimensions[...]` pour éviter les colonnes coupées.
- Pour un graphique, utilise `BarChart()` ou `LineChart()` avec `Reference()` sur les cellules pertinentes.

---

## EXEMPLE 1 — Dashboard de ventes

```python
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, Reference

print('📊 Création du tableau de bord Excel...')

wb = Workbook()
ws = wb.active
ws.title = 'Résumé'

headers = ['Commercial', 'Mois', 'Ventes', 'Objectif', '% Atteinte']
for col, label in enumerate(headers, start=1):
    cell = ws.cell(row=1, column=col, value=label)
    cell.font = Font(bold=True, color='FFFFFF')
    cell.fill = PatternFill(start_color='1565C0', end_color='1565C0', fill_type='solid')
    cell.alignment = Alignment(horizontal='center')

rows = [
    ('Aminata', 'Janvier', 1_250_000, 1_100_000),
    ('Mamadou', 'Janvier', 980_000, 1_000_000),
    ('Fatou', 'Janvier', 1_100_000, 950_000),
]
for i, (name, month, sales, target) in enumerate(rows, start=2):
    ws.cell(row=i, column=1, value=name)
    ws.cell(row=i, column=2, value=month)
    ws.cell(row=i, column=3, value=sales).number_format = '#,##0 "FCFA"'
    ws.cell(row=i, column=4, value=target).number_format = '#,##0 "FCFA"'
    ws.cell(row=i, column=5, value=f'=C{i}/D{i}').number_format = '0.0%'
    if i % 2 == 0:
        for col in range(1, 6):
            ws.cell(row=i, column=col).fill = PatternFill(start_color='F0F4FF', end_color='F0F4FF', fill_type='solid')

for col in range(1, 6):
    ws.column_dimensions[get_column_letter(col)].width = 18

print('📈 Ajout du graphique...')
chart = BarChart()
chart.title = 'Ventes vs Objectif'
chart.y_axis.title = 'Montant (FCFA)'
chart.x_axis.title = 'Commercial'
values = Reference(ws, min_col=3, min_row=1, max_row=4)
categories = Reference(ws, min_col=1, min_row=2, max_row=4)
chart.add_data(values, titles_from_data=True)
chart.set_categories(categories)
chart.height = 7
chart.width = 14
ws.add_chart(chart, 'H2')

print('📌 Enregistrement du fichier...')
wb.save('document.xlsx')
if Path('document.xlsx').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ Fichier Excel prêt !')
```

## EXEMPLE 2 — Budget opérationnel multi-feuilles

```python
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

print('📄 Création du budget Excel...')

wb = Workbook()
summary = wb.active
summary.title = 'Synthèse'

details = wb.create_sheet('Détails')
hypotheses = wb.create_sheet('Hypothèses')

headers = ['Catégorie', 'Montant prévu', 'Montant réalisé', 'Écart']
for col, label in enumerate(headers, start=1):
    cell = summary.cell(row=1, column=col, value=label)
    cell.font = Font(bold=True, color='FFFFFF')
    cell.fill = PatternFill(start_color='2E7D32', end_color='2E7D32', fill_type='solid')
    cell.alignment = Alignment(horizontal='center')

rows = [
    ('Marketing', 2_400_000, 2_260_000),
    ('Opérations', 1_800_000, 1_920_000),
    ('Développement', 1_100_000, 980_000),
]
for i, (category, planned, actual) in enumerate(rows, start=2):
    summary.cell(row=i, column=1, value=category)
    summary.cell(row=i, column=2, value=planned).number_format = '#,##0'
    summary.cell(row=i, column=3, value=actual).number_format = '#,##0'
    summary.cell(row=i, column=4, value=f'=C{i}-B{i}').number_format = '#,##0'

for col in range(1, 5):
    summary.column_dimensions[get_column_letter(col)].width = 20

print('📝 Ajout des hypothèses...')
hypotheses['A1'] = 'Hypothèse'
hypotheses['B1'] = 'Détail'
hypotheses['A2'] = 'Croissance ventes'
hypotheses['B2'] = '10% de hausse mensuelle'

print('📌 Enregistrement du fichier...')
wb.save('document.xlsx')
if Path('document.xlsx').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ Budget Excel prêt !')
```

---

## MÉCANIQUE

- Sauvegarde avec le nom exact fourni par la tâche, par exemple `wb.save('document.xlsx')`.
- Ajoute un `print()` à chaque étape majeure.
- Vérifie que le fichier existe et qu'il n'est pas vide.
