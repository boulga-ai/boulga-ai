# SKILL — Génération de fichier texte (.txt)

Le texte est simple, mais le rendu doit rester structuré et adapté au besoin.

---

## EXIGENCES DE QUALITÉ

- Utilise des titres, séparateurs et listes claires.
- Adapte le format au type de contenu : rapport, checklist, log, plan, note.
- Un brief détaillé mérite un texte long, bien organisé, pas un simple paragraphe.

---

## RAPPELS TECHNIQUES CRITIQUES

- Ouvre avec `encoding='utf-8'`.
- Utilise `\n` pour les sauts de ligne et des séparateurs clairs.
- Pas besoin d’effets complexes ; la lisibilité prime.

---

## EXEMPLE 1 — Rapport texte structuré

```python
from pathlib import Path

print('📝 Création du rapport texte...')

content = '''
================================================================================
RAPPORT DE SYNTHÈSE — 2026
================================================================================

Date : 25 juin 2026
Auteur : Boulga IA

--------------------------------------------------------------------------------
RÉSUMÉ EXÉCUTIF
--------------------------------------------------------------------------------

Ce document présente les résultats clés et les recommandations stratégiques pour le trimestre.

POINTS CLÉS :
  • Croissance de 15 % du chiffre d'affaires
  • 340 nouveaux clients acquis
  • Taux de satisfaction : 94 %

--------------------------------------------------------------------------------
RECOMMANDATIONS
--------------------------------------------------------------------------------

  1. Renforcer la présence commerciale dans la région Sahel
  2. Investir dans la formation des équipes techniques
  3. Lancer la version mobile de la plateforme

================================================================================
FIN DU RAPPORT
================================================================================
'''

with open('document.txt', 'w', encoding='utf-8') as f:
    f.write(content.strip())

if Path('document.txt').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ Fichier texte prêt !')
```

## EXEMPLE 2 — Plan d'action détaillé

```python
from pathlib import Path

print('📌 Création du plan d\'action...')

content = '''
=== PLAN D'ACTION ===

OBJECTIF : Lancement de la nouvelle offre Source

ÉTAPES :
  1) Analyse du marché
     - Collecte des besoins clients
     - Étude concurrentielle
  2) Conception de l'offre
     - Définition des prix
     - Choix des canaux de communication
  3) Lancement
     - Création des supports
     - Suivi des premiers retours

INDICATEURS :
  • Nombre de leads
  • Taux de conversion
  • Satisfaction client

=== FIN DU PLAN ===
'''

with open('document.txt', 'w', encoding='utf-8') as f:
    f.write(content.strip())

if Path('document.txt').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ Plan d\'action prêt !')
```

---

## MÉCANIQUE

- Sauvegarde avec le nom exact fourni par la tâche.
- Ajoute un `print()` au début et à la fin.
- Vérifie que le fichier existe et qu'il n'est pas vide.
