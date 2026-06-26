# SKILL — Génération de fichier PDF (.pdf)

Le LLM sait déjà manipuler reportlab. Ce skill fixe le rendu attendu, les proportions et les pièges, pas les bases du code.

---

## EXIGENCES DE QUALITÉ

- Adapte la palette, la structure et le style au type de document. Un rapport, une brochure et une facture doivent être clairement différents.
- Proportionnalité : un brief simple peut rester court; une demande détaillée doit produire un document long, multi-pages et riche.
- Exploite toutes les capacités : titres, tableaux stylés, blocs colorés, sections, sauts de page, listes et encadrés.
- Utilise une palette cohérente et ne recopie pas le même layout d’un document à l’autre.
- Le document doit être aéré, lisible, et professionnel quand la demande le demande.

---

## RAPPELS TECHNIQUES CRITIQUES

- Dans un `Table`, chaque texte long dans une cellule doit être enveloppé dans un `Paragraph` pour le retour à la ligne.
- `leading` doit être au moins `fontSize * 1.4` pour assurer une bonne lisibilité.
- Utilise `KeepTogether` pour empêcher qu’un titre ou un bloc important se retrouve isolé en fin de page.
- Les couleurs doivent être définies avec `colors.HexColor()` ou `colors.<name>` et appliquées sur les styles de style et de tableau.
- Adapte `colWidths` au contenu et fusionne les cellules si nécessaire pour des en-têtes larges.

---

## EXEMPLE 1 — Flyer de service premium

```python
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib import colors
from reportlab.lib.units import cm

print('📄 Création du flyer PDF...')

doc = SimpleDocTemplate('document.pdf', pagesize=A4,
                        topMargin=2*cm, bottomMargin=2*cm,
                        leftMargin=2*cm, rightMargin=2*cm)
styles = getSampleStyleSheet()

accent = colors.HexColor('#1565C0')
background = colors.HexColor('#E3F2FD')
text_color = colors.HexColor('#0B1F3A')

header_style = ParagraphStyle('Header', parent=styles['Heading1'], fontSize=28, leading=34, alignment=TA_CENTER, textColor=accent)
body_style = ParagraphStyle('Body', parent=styles['BodyText'], fontSize=11, leading=16, textColor=text_color)
info_style = ParagraphStyle('Info', parent=styles['BodyText'], fontSize=10, leading=14, textColor=text_color)

story = [Spacer(1, 1*cm), Paragraph('Offre premium de conseil digital', header_style), Spacer(1, 0.4*cm), Paragraph('Accompagnement personnalisé pour freelances et PME qui veulent un impact rapide.', body_style), Spacer(1, 0.8*cm)]

print('📊 Ajout du tableau de services...')
services = [
    ['Service', 'Description', 'Durée'],
    ['Audit digital', 'Analyse complète du site web et des réseaux sociaux', '2 semaines'],
    ['Stratégie contenu', 'Plan éditorial avec formats recommandés', '1 mois'],
    ['Suivi performance', 'Tableau de bord mensuel et recommandations', '3 mois'],
]
table = Table(services, colWidths=[6*cm, 7*cm, 3*cm])

table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), accent),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('ALIGN', (2, 1), (2, -1), 'CENTER'),
    ('BACKGROUND', (0, 1), (-1, -1), background),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#B0BEC5')),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(table)

story.append(Spacer(1, 1*cm))
story.append(Paragraph('Pourquoi choisir cette offre ?', ParagraphStyle('Question', parent=styles['Heading3'], fontSize=14, leading=18, textColor=text_color)))
story.append(Paragraph('Une approche sur mesure, des livrables concrets et une collaboration axée sur l\'impact.', info_style))

print('📌 Enregistrement du flyer...')
doc.build(story)
if Path('document.pdf').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ Flyer PDF prêt !')
```

## EXEMPLE 2 — Rapport multi-pages d’analyse

```python
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.units import cm

print('📄 Création du rapport PDF...')

doc = SimpleDocTemplate('document.pdf', pagesize=A4,
                        topMargin=2*cm, bottomMargin=2*cm,
                        leftMargin=2*cm, rightMargin=2*cm)
styles = getSampleStyleSheet()

accent = colors.HexColor('#2E7D32')
muted = colors.HexColor('#F5F7FA')
text_color = colors.HexColor('#0B1F3A')

heading_style = ParagraphStyle('Heading', parent=styles['Heading1'], fontSize=24, leading=30, textColor=accent)
section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=16, leading=22, textColor=text_color)
body_style = ParagraphStyle('Body', parent=styles['BodyText'], fontSize=11, leading=16, textColor=text_color, alignment=TA_JUSTIFY)

story = [Paragraph('Rapport de tendances e-commerce en Afrique de l\'Ouest', heading_style), Spacer(1, 0.4*cm), Paragraph('Analyse détaillée des opportunités, des freins et des recommandations stratégiques.', body_style), PageBreak()]

print('📑 Ajout du sommaire...')
story.append(Paragraph('Sommaire', section_style))
story.append(Paragraph('1. Contexte\n2. Indicateurs clés\n3. Recommandations\n4. Conclusion', body_style))
story.append(PageBreak())

print('🧾 Ajout des sections...')
story.append(Paragraph('1. Contexte', section_style))
story.append(Paragraph('Le commerce en ligne progresse, soutenu par le mobile et une adoption croissante des services locaux.', body_style))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph('• Croissance du panier moyen.', body_style))
story.append(Paragraph('• Paiements mobiles de plus en plus fréquents.', body_style))
story.append(Paragraph('• Besoin d\'une logistique plus fiable.', body_style))

story.append(PageBreak())

stats = [
    ['Indicateur', 'Valeur'],
    ['Taux de conversion', '3,8 %'],
    ['Panier moyen', '42 300 FCFA'],
    ['Croissance projetée', '24 %'],
]

print('📊 Ajout du tableau de statistiques...')
table = Table(stats, colWidths=[9*cm, 6*cm])
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), accent),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#B0BEC5')),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(table)

story.append(PageBreak())

print('✅ Ajout des recommandations...')
story.append(Paragraph('3. Recommandations', section_style))
story.append(Paragraph('Investir dans le mobile-first, renforcer le service client et améliorer la transparence des livraisons.', body_style))
for recommendation in ['Renforcer les options de paiement local.', 'Optimiser le parcours d\'achat mobile.', 'Mesurer la satisfaction client à chaque étape.']:
    story.append(Paragraph('• ' + recommendation, body_style))

story.append(PageBreak())

story.append(Paragraph('4. Conclusion', section_style))
story.append(Paragraph('Ce rapport propose une feuille de route claire pour accélérer la croissance du e-commerce en Afrique de l\'Ouest.', body_style))

print('📌 Enregistrement du rapport...')
doc.build(story)
if Path('document.pdf').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ Rapport PDF prêt !')
```

---

## MÉCANIQUE

- Sauvegarde avec le nom exact fourni par la tâche, par exemple `SimpleDocTemplate('document.pdf', ...)`.
- Ajoute un `print()` à chaque étape majeure.
- Vérifie que le fichier existe et qu'il n'est pas vide.
