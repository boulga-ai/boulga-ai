"""file_tools.py — Définitions des outils de génération de fichiers pour LiteLLM."""

_IMAGE_PROVIDERS: set[str] = {"openai", "gemini"}

FILE_GENERATION_TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "read_skill",
            "description": (
                "Lit le guide de compétences pour générer un type de fichier spécifique. "
                "Appelle cet outil AVANT d'écrire du code, pour connaître les bibliothèques "
                "disponibles, les exigences de qualité et les interdictions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "file_type": {
                        "type": "string",
                        "enum": ["excel", "pdf", "docx", "csv", "pptx"],
                        "description": "Le type de fichier à générer.",
                    },
                    "description": {
                        "type": "string",
                        "description": (
                            "Phrase naturelle décrivant ce que tu fais à cette étape "
                            "(ex: 'Je lis le guide pour créer un rapport Word professionnel'). "
                            "Visible par l'utilisateur."
                        ),
                    },
                },
                "required": ["file_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_file",
            "description": (
                "Exécute du code Python dans un sandbox sécurisé pour générer un fichier. "
                "Le code DOIT signaler le fichier généré avec : print('FILE:/home/user/nom.ext') "
                "sur une ligne dédiée, après la sauvegarde. "
                "Appelle read_skill en premier pour connaître les bonnes pratiques."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Code Python complet et autonome à exécuter dans le sandbox.",
                    },
                    "filename": {
                        "type": "string",
                        "description": "Nom du fichier attendu avec extension (ex: rapport_ventes.xlsx).",
                    },
                    "description": {
                        "type": "string",
                        "description": (
                            "Phrase naturelle décrivant ce que tu génères "
                            "(ex: 'Je construis le rapport PFE avec styles, titres et bibliographie'). "
                            "Visible par l'utilisateur."
                        ),
                    },
                },
                "required": ["code", "filename"],
            },
        },
    },
]

IMAGE_GENERATION_TOOL: dict = {
    "type": "function",
    "function": {
        "name": "generate_image",
        "description": (
            "Génère une image à partir d'une description textuelle. "
            "Utilise cet outil uniquement quand l'utilisateur demande explicitement "
            "une image, illustration, photo, logo ou visuel."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": (
                        "Description détaillée de l'image en anglais. "
                        "Inclure style, composition, couleurs et contexte."
                    ),
                },
                "aspect_ratio": {
                    "type": "string",
                    "enum": ["1:1", "16:9", "9:16"],
                    "description": "Format de l'image. Défaut : 1:1.",
                },
                "description": {
                    "type": "string",
                    "description": (
                        "Phrase décrivant ce que tu génères "
                        "(ex: 'Je génère une illustration d\\'un marché africain animé'). "
                        "Visible par l'utilisateur."
                    ),
                },
            },
            "required": ["prompt"],
        },
    },
}


def get_tools_for_provider(provider: str) -> list[dict]:
    """Retourne les outils disponibles selon le provider sélectionné."""
    tools = list(FILE_GENERATION_TOOLS)
    if provider in _IMAGE_PROVIDERS:
        tools.append(IMAGE_GENERATION_TOOL)
    return tools
