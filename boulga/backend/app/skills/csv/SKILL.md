# SKILL — Génération de fichier CSV (.csv)

Le CSV est simple, mais le fichier doit rester structuré et utile.

---

## EXIGENCES DE QUALITÉ

- La première ligne doit contenir des en-têtes clairs.
- Le contenu doit être utile dès l'ouverture, pas seulement quelques lignes de démonstration.
- Choisis `;` comme séparateur si les données contiennent des virgules.
- Adapte la forme au sujet : liste de clients, suivi de campagne, inventaire, etc.

---

## RAPPELS TECHNIQUES CRITIQUES

- Ouvre le fichier avec `encoding='utf-8-sig'` pour la compatibilité Excel.
- Utilise `newline=''` dans `open()` pour éviter les lignes vides sur Windows.
- Ne mélange pas textes descriptifs et colonnes de données non structurées.

---

## EXEMPLE 1 — Liste clients

```python
import csv
from pathlib import Path

print('📊 Création du fichier CSV...')

headers = ['ID', 'Client', 'Ville', 'Abonnement', 'Statut', 'Date inscription']
rows = [
    [1, 'Alice Sawadogo', 'Ouagadougou', 'Source', 'Actif', '2026-01-15'],
    [2, 'Boubacar Traoré', 'Abidjan', 'Goutte', 'Actif', '2026-02-03'],
    [3, 'Chantal Kaboré', 'Dakar', 'Fleuve', 'Inactif', '2026-03-10'],
    [4, 'Fatou Diallo', 'Bamako', 'Source', 'Actif', '2026-04-01'],
    [5, 'Hassan Coulibaly', 'Lome', 'Source', 'Actif', '2026-05-12'],
]
with open('document.csv', 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.writer(f, delimiter=';')
    writer.writerow(headers)
    writer.writerows(rows)

if Path('document.csv').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ CSV prêt !')
```

## EXEMPLE 2 — Suivi de campagne

```python
import csv
from pathlib import Path

print('📄 Création du fichier CSV de campagne...')

headers = ['Campagne', 'Canal', 'Objectif', 'Clics', 'Conversions']
rows = [
    ['Lancement produit', 'WhatsApp', '500 conversions', 420, 68],
    ['Promotion été', 'Email', '250 conversions', 310, 53],
    ['Réengagement', 'SMS', '120 conversions', 150, 22],
    ['Fidélisation', 'Facebook', '200 conversions', 190, 35],
]
with open('document.csv', 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.writer(f, delimiter=';')
    writer.writerow(headers)
    writer.writerows(rows)

if Path('document.csv').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ CSV de suivi prêt !')
```

---

## MÉCANIQUE

- Sauvegarde avec le nom exact fourni par la tâche.
- Ajoute un `print()` au début et à la fin.
- Vérifie que le fichier existe et qu'il n'est pas vide.
