"""skill_service.py — Lecture des guides de compétences pour la génération de fichiers."""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_SKILLS_DIR = Path(__file__).parent.parent / "prompts" / "skills"

_SKILL_ALIASES: dict[str, str] = {
    "excel": "excel",
    "xlsx": "excel",
    "xls": "excel",
    "tableur": "excel",
    "spreadsheet": "excel",
    "pdf": "pdf",
    "word": "docx",
    "docx": "docx",
    "doc": "docx",
    "csv": "csv",
    "pptx": "pptx",
    "ppt": "pptx",
    "powerpoint": "pptx",
    "presentation": "pptx",
    "présentation": "pptx",
}


def read_skill(file_type: str) -> str:
    """
    Retourne le contenu du skill.md correspondant au type de fichier demandé.
    Retourne un message d'erreur si le skill est introuvable.
    """
    normalized = _SKILL_ALIASES.get(file_type.lower().strip(), file_type.lower().strip())
    skill_path = _SKILLS_DIR / f"{normalized}.md"

    if not skill_path.exists():
        available = [p.stem for p in _SKILLS_DIR.glob("*.md")]
        logger.warning("Skill introuvable : %s (disponibles : %s)", file_type, available)
        return (
            f"Skill '{file_type}' introuvable. "
            f"Types disponibles : {', '.join(available)}. "
            "Génère le fichier avec les meilleures pratiques Python standards."
        )

    content = skill_path.read_text(encoding="utf-8")
    logger.debug("Skill chargé : %s (%d caractères)", normalized, len(content))
    return content
