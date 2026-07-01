# Skill : Génération de fichiers CSV

## Bibliothèque
`csv` — module standard Python, toujours disponible.

## Règle absolue
```python
# Fermer le fichier AVANT d'écrire le print
with open(path, 'w', newline='', encoding='utf-8-sig') as f:
    ...
print(f"FILE:{path}")   # après la fermeture du with, jamais avant
```

## Gotchas critiques — lire avant de coder

**Encodage**
- Toujours `utf-8-sig` (UTF-8 avec BOM) — indispensable pour que Excel et LibreOffice ouvrent correctement les accents français sans manipulation manuelle.
- Ne jamais utiliser `utf-8` seul pour un fichier destiné à Excel.

**Séparateur**
- Standard français : `;` (point-virgule). Excel francophone s'ouvre correctement.
- Standard anglais/international : `,` — n'utiliser que si explicitement demandé.
- Ne jamais mélanger les deux dans un même fichier.

**Séparateur décimal**
- En français : `,` pour les décimales (`1 234,56`).
- Si le séparateur de champs est `;`, les virgules décimales ne posent pas de problème.
- Pour des montants entiers (FCFA), pas de décimale : écrire `150000`, pas `150000.00`.

**Champs contenant le séparateur ou des guillemets**
- Le module `csv` gère l'encapsulation automatiquement.
- Pour forcer l'encapsulation sur tous les champs : `quoting=csv.QUOTE_ALL`.
- Pour encapsuler uniquement les champs non numériques : `quoting=csv.QUOTE_NONNUMERIC`.

**Valeurs vides vs zéro**
- `None` → cellule vide dans le CSV.
- `0` → écrit `0`.
- Ne pas écrire `""` là où `0` est attendu pour des montants — cela crée des erreurs dans les formules Excel.

**Grandes quantités de données**
- Écrire ligne par ligne dans le `with` — ne pas charger toutes les données en mémoire avant d'écrire.
- Utiliser `writer.writerow()` dans une boucle, pas `writerows()` sur une liste de 10 000 éléments construite en avance.

**Newlines dans les valeurs**
- Si une cellule peut contenir un retour à la ligne, utiliser `quoting=csv.QUOTE_ALL` pour éviter la corruption du fichier.

**Nom de fichier**
- Minuscules, tirets, sans espaces ni accents : `donnees_clients_2026.csv`.

## Exigences de qualité
- Première ligne = en-têtes obligatoires, en français si l'utilisateur est francophone.
- Pas de ligne vide en début ou fin de fichier.
- En-têtes explicites : `"Montant (FCFA)"` plutôt que `"montant"`.
- Dates au format `DD/MM/YYYY`.

## Interdictions
- `pandas` non installé — ne pas l'utiliser.
- Ne pas mélanger les encodages.
- Ne pas utiliser le dialecte `excel` (séparateur virgule) pour du contenu en français sauf demande.

## Exemple complet
```python
import csv

path = "/home/user/clients_2026.csv"
headers = ["Nom", "Prénom", "Montant (FCFA)", "Date", "Statut"]
rows = [
    ["Ouédraogo", "Aymar", 150000, "01/06/2026", "Payé"],
    ["Traoré", "Fatou", 320000, "15/06/2026", "En attente"],
    ["Kaboré", "Ibrahim", 0, "20/06/2026", "Annulé"],
]

with open(path, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.writer(f, delimiter=';', quoting=csv.QUOTE_NONNUMERIC)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)

print(f"FILE:{path}")
```
