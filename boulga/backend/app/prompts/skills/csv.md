# Skill : Génération de fichiers CSV

## Bibliothèques disponibles
- `csv` — module standard Python (toujours disponible)

## Règle absolue
```
print("FILE:/home/user/nom_fichier.csv")
```
Après fermeture du fichier, jamais avant.

## Exigences de qualité

**Encodage et séparateur**
- Encodage : `utf-8-sig` (UTF-8 avec BOM) pour compatibilité Excel/LibreOffice
- Séparateur : `;` (point-virgule) — standard français
- Dialecte : ne pas utiliser `excel` (virgule) sauf si explicitement demandé

**Structure**
- Première ligne = en-têtes obligatoires
- En-têtes en français si l'utilisateur est francophone
- Pas de ligne vide en début ou fin de fichier

**Formatage des données**
- Montants FCFA : nombre seul (sans symbole dans la valeur, mettre le symbole dans l'en-tête)
- Dates : `DD/MM/YYYY`
- Décimales : virgule `,` comme séparateur décimal (standard français)
- Valeurs avec `;` ou `"` : l'encapsulation avec `quoting=csv.QUOTE_NONNUMERIC` gère cela

## Interdictions
- Ne pas utiliser `pandas` (non installé)
- Ne pas mélanger encodages

## Exemple de structure minimale
```python
import csv

path = "/home/user/donnees.csv"
with open(path, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.writer(f, delimiter=';')
    writer.writerow(["Nom", "Montant (FCFA)", "Date"])
    writer.writerow(["Alpha", 150000, "01/06/2026"])
    writer.writerow(["Bêta", 320000, "15/06/2026"])

print(f"FILE:{path}")
```
