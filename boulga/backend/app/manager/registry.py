from enum import Enum
from typing import Optional

from pydantic import BaseModel


class LLMProvider(str, Enum):
    gemini = "gemini"
    claude = "claude"
    openai = "openai"
    deepseek = "deepseek"


class ModelTier(str, Enum):
    low = "low"
    high = "high"


class ModelInfo(BaseModel):
    id: str
    label: str
    tier: ModelTier
    description: str


class LLMInfo(BaseModel):
    provider: LLMProvider
    label: str
    description: str
    active: bool
    models: list[ModelInfo]


LLM_REGISTRY: dict[LLMProvider, LLMInfo] = {
    LLMProvider.gemini: LLMInfo(
        provider=LLMProvider.gemini,
        label="Gemini",
        description=(
            "Analyse de fichiers longs, PDF et recherche documentaire. "
            "Performant sur les tâches multimodales et les longs contextes."
        ),
        active=True,
        models=[
            ModelInfo(
                id="gemini-2.5-flash",
                label="Gemini 2.5 Flash",
                tier=ModelTier.low,
                description="Rapide et économique. Idéal pour la majorité des tâches quotidiennes.",
            ),
            ModelInfo(
                id="gemini-2.5-pro",
                label="Gemini 2.5 Pro",
                tier=ModelTier.high,
                description="Modèle avancé pour les analyses complexes et les très longs contextes.",
            ),
        ],
    ),
    LLMProvider.claude: LLMInfo(
        provider=LLMProvider.claude,
        label="Claude",
        description=(
            "Raisonnement structuré, analyse juridique et textes complexes. "
            "Reconnu pour sa précision et ses réponses nuancées."
        ),
        active=True,
        models=[
            ModelInfo(
                id="claude-haiku-4-5",
                label="Claude Haiku 4.5",
                tier=ModelTier.low,
                description="Rapide et efficace pour les tâches courantes.",
            ),
            ModelInfo(
                id="claude-sonnet-4-6",
                label="Claude Sonnet 4.6",
                tier=ModelTier.high,
                description="Raisonnement avancé et analyse approfondie.",
            ),
        ],
    ),
    LLMProvider.openai: LLMInfo(
        provider=LLMProvider.openai,
        label="ChatGPT",
        description=(
            "Créativité, rédaction et brainstorming. "
            "Polyvalent et performant sur une large variété de tâches."
        ),
        active=True,
        models=[
            ModelInfo(
                id="gpt-5.5-instant",
                label="GPT-5.5 Instant",
                tier=ModelTier.low,
                description="Réponses rapides pour les tâches créatives courantes.",
            ),
            ModelInfo(
                id="gpt-5.5-pro",
                label="GPT-5.5 Pro",
                tier=ModelTier.high,
                description="Créativité et rédaction au plus haut niveau.",
            ),
        ],
    ),
    LLMProvider.deepseek: LLMInfo(
        provider=LLMProvider.deepseek,
        label="DeepSeek",
        description=(
            "Code, développement et débogage. "
            "Spécialisé dans la génération et l'analyse de code avec une grande rigueur technique."
        ),
        active=True,
        models=[
            ModelInfo(
                id="deepseek-v4-flash",
                label="DeepSeek V4 Flash",
                tier=ModelTier.low,
                description="Génération de code rapide et efficace.",
            ),
            ModelInfo(
                id="deepseek-v4-pro",
                label="DeepSeek V4 Pro",
                tier=ModelTier.high,
                description="Analyse et génération de code avancées.",
            ),
        ],
    ),
}

# Accès modèles par tier d'abonnement
# free    : gemini-2.5-flash uniquement
# goutte  : gemini-2.5-flash + deepseek-v4-flash (éco seulement)
# source  : tous LLM, tous modèles (low + high) — même accès que fleuve
# fleuve  : identique source — la différence est dans les quotas et fonctionnalités
# ocean   : tous LLM, tous modèles (identique source/fleuve pour les modèles)
_TIER_ACCESS: dict[str, list[str]] = {
    "free": ["gemini-2.5-flash"],
    "goutte": ["gemini-2.5-flash", "deepseek-v4-flash"],
}
_ALL_MODELS = [m.id for llm in LLM_REGISTRY.values() for m in llm.models]
_TIER_ACCESS["source"] = _ALL_MODELS
_TIER_ACCESS["fleuve"] = _ALL_MODELS
_TIER_ACCESS["ocean"] = _ALL_MODELS


def get_all_llms() -> list[LLMInfo]:
    """Retourne la liste de tous les LLM du registre."""
    return list(LLM_REGISTRY.values())


def resolve_model(provider: str, model_id: str) -> tuple[LLMInfo, ModelInfo]:
    """
    Résout (provider, model_id) → (LLMInfo, ModelInfo).
    Lève ValueError si le provider ou le modèle est introuvable.
    """
    try:
        llm_provider = LLMProvider(provider)
    except ValueError:
        raise ValueError(f"Provider inconnu : {provider!r}")

    llm = LLM_REGISTRY.get(llm_provider)
    if not llm:
        raise ValueError(f"Provider introuvable dans le registre : {provider!r}")

    for model in llm.models:
        if model.id == model_id:
            return llm, model

    raise ValueError(f"Modèle {model_id!r} introuvable pour le provider {provider!r}")


def is_provider_active(provider: str) -> bool:
    """Retourne True si le provider est actif dans le registre."""
    try:
        llm_provider = LLMProvider(provider)
    except ValueError:
        return False
    llm = LLM_REGISTRY.get(llm_provider)
    return llm.active if llm else False


def get_models_for_tier(tier: str) -> list[str]:
    """Retourne la liste des model_id accessibles pour un tier d'abonnement."""
    return _TIER_ACCESS.get(tier, _TIER_ACCESS["free"])
