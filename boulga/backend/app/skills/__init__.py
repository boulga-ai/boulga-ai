from pathlib import Path

_SKILLS_DIR = Path(__file__).parent

_VALID_FORMATS = {"docx", "xlsx", "pdf", "pptx", "csv", "txt"}


def load_skill(fmt: str) -> str:
    """
    Charge le SKILL.md pour le format demandé (génération de code Python).
    Retourne une chaîne vide si le format est inconnu ou si le fichier n'existe pas.
    """
    if fmt not in _VALID_FORMATS:
        return ""
    skill_path = _SKILLS_DIR / fmt / "SKILL.md"
    if not skill_path.exists():
        return ""
    return skill_path.read_text(encoding="utf-8")


def load_document_skill() -> str:
    """
    Charge la grammaire de composition JSON pour create_document (docx/pdf).
    Injectée dynamiquement dans le system prompt quand l'outil create_document est disponible.
    Retourne une chaîne vide si le fichier n'existe pas.
    """
    skill_path = _SKILLS_DIR / "document" / "SKILL.md"
    if not skill_path.exists():
        return ""
    return skill_path.read_text(encoding="utf-8")
