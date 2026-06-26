# GRAMMAIRE DE COMPOSITION DE DOCUMENTS

## PRINCIPE

Tu composes un document en assemblant des blocs JSON dans un tableau `blocks`.
La richesse doit être proportionnelle à la demande :

- **Demande simple** (note, lettre, liste courte) → peu de blocs, sobre, aucun effet visuel inutile.
- **Demande pro détaillée** (rapport, analyse, plan stratégique) → hiérarchie claire, couleurs cohérentes, tableaux, encadrés pour les points clés.

Deux demandes différentes produisent deux documents visuellement différents. Tu n'appliques jamais une structure générique : tu composes selon ce que la demande appelle réellement.

---

## LES MÉCANISMES

### `heading` — Titre ou sous-titre de section

```json
{
  "type": "heading",
  "level": 1,
  "text": "Titre de section",
  "color": "#0B1F3A",
  "align": "left",
  "size": 18
}
```

- `level` : entier de 1 (titre principal) à 4 (sous-sous-titre). Construit la hiérarchie visuelle.
- `color` : hex du texte. Tu choisis selon le ton du document.
- `align` : `"left"` (défaut) | `"center"` | `"right"`
- `size` : taille en points. Optionnel — sans indication, le rendu utilise des tailles par défaut.

---

### `paragraph` — Bloc de texte libre

```json
{
  "type": "paragraph",
  "text": "Corps du texte, aussi long que nécessaire.",
  "color": "#333333",
  "align": "justify",
  "size": 11,
  "bold": false,
  "italic": false
}
```

- `bold` / `italic` s'appliquent au paragraphe entier.
- Pour une mise en évidence partielle, préfère un `block` ou deux paragraphes distincts.
- `align` : `"left"` | `"center"` | `"right"` | `"justify"`

---

### `bullet_list` — Liste à puces

```json
{
  "type": "bullet_list",
  "bullet": "▸",
  "items": [
    "Premier élément",
    {"text": "Élément mis en gras", "bold": true},
    {"text": "Élément coloré", "color": "#C62828"}
  ],
  "color": "#444444"
}
```

- `bullet` : le caractère de puce. Tu choisis librement :
  - `•` standard · `▸` `➤` flèche · `▪` `■` carré · `◦` cercle · `–` tiret · `✓` validé
  - Tu peux utiliser des puces différentes pour deux listes distinctes dans le même document.
- `items` : tableau de chaînes simples **ou** d'objets `{"text": "...", "bold": true, "italic": true, "color": "#hex"}`.
- `color` : couleur par défaut de tous les items (surchargée item par item si besoin).

---

### `numbered_list` — Liste numérotée

```json
{
  "type": "numbered_list",
  "items": [
    "Première étape",
    "Deuxième étape",
    {"text": "Étape critique", "bold": true, "color": "#B71C1C"}
  ],
  "color": "#333333"
}
```

- Les numéros (1. 2. 3.) sont générés automatiquement.
- Même logique d'items que `bullet_list`.

---

### `table` — Tableau structuré

```json
{
  "type": "table",
  "headers": ["Désignation", "Quantité", "Prix unitaire", "Total"],
  "rows": [
    ["Prestation A", "1", "150 000 FCFA", "150 000 FCFA"],
    ["Prestation B", "3", "45 000 FCFA", "135 000 FCFA"]
  ],
  "header_bg": "#0B1F3A",
  "header_color": "#FFFFFF",
  "zebra": "#F0F4FF",
  "border": "#CBD5E0"
}
```

- `header_bg` / `header_color` : fond et texte des en-têtes.
- `zebra` : couleur de fond alternée pour les lignes paires (rend les longues tables plus lisibles).
- `border` : couleur des bordures de cellule.
- Toutes ces propriétés sont optionnelles. Un tableau sans couleurs reste valide.

---

### `block` — Encadré coloré

```json
{
  "type": "block",
  "content": "⚠️ Point d'attention : cette clause engage votre responsabilité contractuelle.",
  "bg": "#FFF8E1",
  "text_color": "#E65100",
  "border": "#FFB300"
}
```

- `content` : chaîne de texte **ou** liste de blocs imbriqués.
- `bg` / `text_color` / `border` : hex libres. Tu choisis la signification visuelle :
  - Alerte → fond rouge pâle, texte rouge.
  - Mise en valeur → fond doré, texte brun.
  - Information → fond bleu très clair, texte marine.
  - Succès → fond vert pâle, texte vert foncé.
- Utilise les encadrés avec parcimonie — un document surchargé perd son impact.

---

### `divider` — Ligne de séparation

```json
{"type": "divider", "color": "#CBD5E0", "thickness": 1}
```

- Pour couper visuellement deux sections distinctes.
- `thickness` : épaisseur en points. 1 est discret ; 2-3 pour marquer une rupture forte.

---

### `spacer` — Espace vertical

```json
{"type": "spacer", "size": 16}
```

- `size` : hauteur en points. 8–12 pour un petit espace, 24–48 pour aérer des sections.

---

### `page_break` — Saut de page

```json
{"type": "page_break"}
```

- Force le contenu suivant sur une nouvelle page. Utile pour les rapports multi-sections.

---

## LES LEVIERS LIBRES

**Couleur** — tout hex `#RRGGBB`. Tu choisis selon le sens :
- Rapport financier sobre → marine foncé `#0B1F3A`, gris moyen `#4A5568`
- Alerte → fond `#FFEBEE`, texte `#C62828`
- Mise en valeur → fond `#FFF8E1`, texte `#E65100`
- Document RH ou légal → tons neutres, noir/gris
- Rapport créatif ou marketing → palette plus colorée, titres vifs
- Tu n'es limité à aucune palette. Adapte au sujet, pas à une charte.

**Puces** — choisis le caractère selon le registre :
- Professionnel sobre : `•` ou `–`
- Points d'action : `▸` ou `➤`
- Liste de validation : `✓`
- Points structurels : `▪` ou `■`
- Tu peux varier d'une liste à l'autre dans le même document.

**Taille** — en points. Corps courant : 11–12. Intro ou paragraphe d'accroche : 13–14. Titres : 16–24 selon le niveau.

**Alignement** — `left` pour le corps (défaut), `center` pour les titres de page de garde, `right` pour des montants ou dates, `justify` pour du texte long.

**Hiérarchie** — level 1 = section principale, level 2 = sous-section, level 3 = détail. Ne descends pas en dessous de 3 sauf raison spécifique.

---

## EXEMPLES

> Ces exemples montrent la liberté de composition. Les couleurs choisies ne sont pas un modèle à recopier — adapte toujours au sujet réel.

---

### Exemple 1 — Facture (document sobre, fonctionnel, peu de blocs)

```json
{
  "title": "FACTURE N° 2026-042",
  "blocks": [
    {
      "type": "paragraph",
      "text": "Prestataire : Koné Design Studio\nDate : 25 juin 2026\nClient : SARL BatiPro, Ouagadougou",
      "size": 11
    },
    {"type": "divider", "color": "#CBD5E0"},
    {
      "type": "table",
      "headers": ["Désignation", "Qté", "Prix unit.", "Total"],
      "rows": [
        ["Identité visuelle (logo + charte)", "1", "180 000 FCFA", "180 000 FCFA"],
        ["Maquettes site web (5 pages)", "1", "250 000 FCFA", "250 000 FCFA"],
        ["Formation équipe (2h)", "1", "60 000 FCFA", "60 000 FCFA"]
      ],
      "header_bg": "#1E293B",
      "header_color": "#FFFFFF",
      "zebra": "#F8FAFC",
      "border": "#E2E8F0"
    },
    {"type": "spacer", "size": 12},
    {
      "type": "paragraph",
      "text": "TOTAL TTC : 490 000 FCFA",
      "bold": true,
      "align": "right",
      "size": 13
    },
    {"type": "divider", "color": "#CBD5E0"},
    {
      "type": "paragraph",
      "text": "Règlement : virement mobile money ou espèces sous 15 jours.\nContact : kone.design@email.com — +226 70 00 00 00",
      "size": 10,
      "color": "#64748B"
    }
  ]
}
```

---

### Exemple 2 — Rapport d'analyse stratégique (riche, hiérarchisé, encadrés, couleurs)

```json
{
  "title": "Analyse de marché — Secteur Fintech Afrique de l'Ouest 2026",
  "blocks": [
    {
      "type": "block",
      "content": "Ce rapport synthétise les tendances du marché fintech en Afrique de l'Ouest sur le premier semestre 2026. Il est destiné aux décideurs et investisseurs.",
      "bg": "#EFF6FF",
      "text_color": "#1E40AF",
      "border": "#BFDBFE"
    },
    {"type": "spacer", "size": 20},
    {
      "type": "heading",
      "level": 1,
      "text": "1. Contexte et dynamiques du marché",
      "color": "#0F172A",
      "size": 17
    },
    {
      "type": "paragraph",
      "text": "Le marché fintech ouest-africain a connu une croissance de 34 % au S1 2026, portée principalement par l'adoption du mobile money dans les zones rurales et la réglementation favorable de l'UEMOA.",
      "align": "justify",
      "size": 11
    },
    {
      "type": "heading",
      "level": 2,
      "text": "Facteurs clés de croissance",
      "color": "#1D4ED8",
      "size": 13
    },
    {
      "type": "bullet_list",
      "bullet": "▸",
      "items": [
        "Taux de pénétration mobile : 78 % en zone urbaine, 52 % en zone rurale",
        {"text": "Réglementation bac à sable BCEAO active depuis janvier 2026", "bold": true},
        "Investissements VC : +120 M$ sur la période vs 87 M$ en S1 2025"
      ]
    },
    {"type": "spacer", "size": 16},
    {
      "type": "heading",
      "level": 1,
      "text": "2. Comparatif des acteurs principaux",
      "color": "#0F172A",
      "size": 17
    },
    {
      "type": "table",
      "headers": ["Acteur", "Pays", "Segments", "Levée 2025", "Croissance"],
      "rows": [
        ["Wave", "Sénégal / CI", "P2P, marchands", "47 M$", "+41 %"],
        ["MoMo (MTN)", "Régional", "Transfert, épargne", "Interne MTN", "+29 %"],
        ["FloatPay", "Ghana / Bénin", "B2B, paiement API", "12 M$", "+67 %"],
        ["Sama Money", "Mali / BF", "Diaspora", "6 M$", "+38 %"]
      ],
      "header_bg": "#1E3A8A",
      "header_color": "#FFFFFF",
      "zebra": "#F0F4FF",
      "border": "#C7D2FE"
    },
    {"type": "spacer", "size": 20},
    {
      "type": "heading",
      "level": 1,
      "text": "3. Risques identifiés",
      "color": "#0F172A",
      "size": 17
    },
    {
      "type": "block",
      "content": "⚠️ Risque réglementaire majeur : la directive BCEAO sur la capitalisation des EME entre en vigueur en Q4 2026. Plusieurs acteurs de taille moyenne pourraient ne pas satisfaire le seuil de 2 Mds FCFA.",
      "bg": "#FEF2F2",
      "text_color": "#991B1B",
      "border": "#FCA5A5"
    },
    {"type": "spacer", "size": 8},
    {
      "type": "numbered_list",
      "items": [
        "Risque réglementaire : capitalisation EME (Q4 2026)",
        "Risque de change : instabilité CFA/USD sur les levées en devises",
        {"text": "Risque opérationnel : dépendance aux réseaux 3G/4G encore instables hors capitales", "italic": true},
        "Risque concurrentiel : entrée des banques traditionnelles sur le segment mobile"
      ]
    },
    {"type": "page_break"},
    {
      "type": "heading",
      "level": 1,
      "text": "4. Recommandations",
      "color": "#0F172A",
      "size": 17
    },
    {
      "type": "block",
      "content": "✓ Priorité : positionner les offres sur les segments B2B API et épargne digitale, sous-exploités par les leaders actuels.",
      "bg": "#F0FDF4",
      "text_color": "#166534",
      "border": "#86EFAC"
    },
    {"type": "spacer", "size": 8},
    {
      "type": "bullet_list",
      "bullet": "✓",
      "items": [
        "S'aligner sur la directive capitalisation avant Q3 2026",
        "Développer des partenariats avec les réseaux d'agents ruraux existants",
        "Investir dans l'interopérabilité multidevise (FCFA / GHS / NGN)"
      ],
      "color": "#166534"
    },
    {"type": "divider", "color": "#E2E8F0"},
    {
      "type": "paragraph",
      "text": "Rapport produit par l'équipe Veille & Stratégie — Boulga Analytics, juin 2026.",
      "size": 10,
      "color": "#94A3B8",
      "align": "center"
    }
  ]
}
```

---

## RÈGLE FINALE

N'utilise **que** les blocs pertinents pour la demande.
Un document simple n'a pas besoin d'encadrés colorés, de sauts de page ou de tableaux. Une facture n'a pas besoin de 4 niveaux de titres.
Compose juste, pas chargé. La sobriété bien placée est aussi un choix de composition.
