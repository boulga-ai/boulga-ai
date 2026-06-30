"""file_tools.py — Définitions des outils de génération de fichiers pour LiteLLM."""

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
                    }
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
                },
                "required": ["code", "filename"],
            },
        },
    },
]
