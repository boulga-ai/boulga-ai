# SKILL — Génération de fichier Word (.docx)

Le LLM sait déjà manipuler python-docx. Ce skill fixe le niveau de qualité attendu, les règles de design et les pièges à éviter, pas les bases du code.

---

## EXIGENCES DE QUALITÉ

- Adapte le design au sujet, au ton et au contexte de la demande. Deux documents différents doivent être visuellement distincts.
- Proportionnalité : un brief simple mérite un document court et élégant, un brief détaillé mérite un document long, riche, structuré et multi-pages.
- Exploite toutes les possibilités utiles : titres hiérarchiques, en-têtes/pieds de page, listes puces et numérotées, tableaux stylés, encadrés et sauts de page.
- Utilise une palette limitée et cohérente, mais différente selon le document. Ne recopie pas systématiquement les mêmes couleurs ou la même mise en page.
- Donne un rendu professionnel et lisible : espaces suffisants entre sections et typographie soignée.

---

## RAPPELS TECHNIQUES CRITIQUES

- Colorer l’arrière-plan d’une cellule passe par le shading XML : `tc.get_or_add_tcPr().append(shd)` avec `w:fill`. python-docx ne l’expose pas directement.
- Les listes à puces doivent utiliser les styles `List Bullet` ou `List Number`, pas des symboles manuels.
- Pour un saut de page, utilise `doc.add_page_break()` ou `WD_BREAK.PAGE` plutôt que plusieurs retours à la ligne.
- Pour un encadré visible, applique le shading XML à une cellule ou un paragraphe, pas juste à une bordure de tableau.
- Si le document est long, structure-le en sections et sous-sections plutôt qu’en un long bloc de texte.

---

## EXEMPLE 1 — Facture freelance professionnelle

```python
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

print('📄 Création de la facture Word...')

doc = Document()
for section in doc.sections:
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

header = doc.sections[0].header.paragraphs[0]
header.text = 'FACTURE'
header.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = header.runs[0]
run.font.size = Pt(18)
run.font.bold = True
run.font.color.rgb = RGBColor(0x15, 0x65, 0xC0)

print('🧾 Ajout des informations client...')
client = doc.add_paragraph()
client.add_run('Client : ').bold = True
client.add_run('Agence Impact')
client.add_run('\nProjet : ').bold = True
client.add_run('Stratégie marketing digital')
client.add_run('\nDate : ').bold = True
client.add_run('25 juin 2026')

print('📊 Ajout du tableau de facturation...')
table = doc.add_table(rows=1, cols=4)
table.style = 'Table Grid'
headers = ['Description', 'Quantité', 'Prix unitaire', 'Total']
for i, text in enumerate(headers):
    cell = table.rows[0].cells[i]
    cell.text = text
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), '1565C0')
    shd.set(qn('w:color'), 'FFFFFF')
    shd.set(qn('w:val'), 'clear')
    tcPr.append(shd)
    run = cell.paragraphs[0].runs[0]
    run.font.bold = True
    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

items = [
    ('Création de contenu', '12', '50 000 FCFA', '600 000 FCFA'),
    ('Conseil stratégique', '8', '65 000 FCFA', '520 000 FCFA'),
    ('Suivi et ajustements', '4', '40 000 FCFA', '160 000 FCFA'),
]
for row_index, row_values in enumerate(items, start=2):
    row = table.add_row().cells
    for col_index, value in enumerate(row_values):
        cell = row[col_index]
        cell.text = value
        if row_index % 2 == 0:
            tc = cell._tc
            tcPr = tc.get_or_add_tcPr()
            shd = OxmlElement('w:shd')
            shd.set(qn('w:fill'), 'F3F7FF')
            shd.set(qn('w:val'), 'clear')
            tcPr.append(shd)

print('📝 Ajout des notes de paiement...')
notes = doc.add_paragraph()
notes.add_run('Conditions de paiement : ').bold = True
notes.add_run('Paiement à 30 jours. Merci de régler par virement bancaire.')

print('📌 Enregistrement du fichier...')
doc.save('document.docx')
if Path('document.docx').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ Facture Word prête !')
```

## EXEMPLE 2 — Rapport professionnel structuré

```python
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

print('📄 Création du rapport Word...')

doc = Document()
for section in doc.sections:
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

for section in doc.sections:
    header = section.header
    header.paragraphs[0].text = 'Rapport de tendances e-commerce'
    header.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer = section.footer
    footer.paragraphs[0].text = 'Page '
    footer.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

print('🧱 Ajout de la structure...')
doc.add_heading('Rapport de tendances e-commerce', level=0)
doc.add_paragraph(
    'Ce rapport présente une analyse détaillée des tendances du commerce en ligne en Afrique de l\'Ouest et des recommandations stratégiques.'
)

doc.add_heading('1. Contexte', level=1)
doc.add_paragraph(
    'Le marché local est porté par les paiements mobiles, la confiance client et une logistique en amélioration. ' \
    'Ce document analyse les opportunités et les risques.'
)

bullets = doc.add_paragraph(style='List Bullet')
bullets.add_run('Croissance du panier moyen et nombre de transactions en hausse.')
more = doc.add_paragraph(style='List Bullet')
more.add_run('Importance croissante des avis clients et de la conversion mobile.')

print('📑 Ajout des sections détaillées...')
doc.add_heading('2. Analyse des indicateurs', level=1)

table = doc.add_table(rows=1, cols=3)
table.style = 'Table Grid'
for i, header in enumerate(['Indicateur', 'Valeur', 'Tendance']):
    cell = table.rows[0].cells[i]
    cell.text = header
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), '0B1F3A')
    shd.set(qn('w:color'), 'FFFFFF')
    shd.set(qn('w:val'), 'clear')
    tcPr.append(shd)
    cell.paragraphs[0].runs[0].font.bold = True
    cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

rows = [
    ('Taux de conversion', '3,8 %', '↑'),
    ('Panier moyen', '42 300 FCFA', '↑'),
    ('Délais de livraison', '2-4 jours', '→'),
]
for i, row_values in enumerate(rows, start=2):
    row = table.add_row().cells
    for j, value in enumerate(row_values):
        row[j].text = value

print('📌 Ajout des recommandations...')
doc.add_page_break()
doc.add_heading('3. Recommandations', level=1)
doc.add_paragraph('Améliorer l\'expérience mobile, élargir les options de paiement local et renforcer le service client.').bold = True

doc.add_paragraph(style='List Number').add_run('Structurer une communication claire par segment de clientèle.')
doc.add_paragraph(style='List Number').add_run('Optimiser le parcours d\'achat avec des preuves sociales et des garanties.')
doc.add_paragraph(style='List Number').add_run('Mettre en place un suivi et un tableau de bord mensuel.')

print('📌 Enregistrement du rapport...')
doc.save('document.docx')
if Path('document.docx').stat().st_size == 0:
    raise RuntimeError('Le fichier est vide')
print('✅ Rapport Word prêt !')
```

---

## MÉCANIQUE

- Sauvegarde avec le nom exact fourni par la tâche, par exemple `doc.save('document.docx')`.
- Ajoute un `print()` à chaque étape majeure.
- Vérifie que le fichier existe et qu'il n'est pas vide.
