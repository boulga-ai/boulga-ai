"""RouterAgent — Routage Automatique Intelligent de Boulga.

Logique en deux passes :
1. Règles rapides par mots-clés (0 ms, 0 coût API)
2. Fallback : appel LLM léger (Gemini Flash) pour classification JSON

Le provider retourné est toujours vérifié contre le tier de l'utilisateur
et l'état actif du registre. En cas d'indisponibilité, fallback sur gemini.
"""

from __future__ import annotations

import json
import logging
import re

from app.manager.registry import get_models_for_tier, is_provider_active
from app.prompts.routing_prompts import ROUTING_PROMPT

logger = logging.getLogger(__name__)

# ── Constantes ────────────────────────────────────────────────────────────────

_FALLBACK_PROVIDER = "gemini"
_FALLBACK_MODEL    = "gemini-2.5-flash"

# Modèle éco par provider pour le routage automatique
_ROUTE_MAP: dict[str, tuple[str, str]] = {
    "deepseek": ("deepseek", "deepseek-v4-flash"),
    "claude":   ("claude",   "claude-haiku-4-5"),
    "openai":   ("openai",   "gpt-5.5-instant"),
    "gemini":   ("gemini",   "gemini-2.5-flash"),
}

# Tiers éligibles à claude-sonnet (au lieu de haiku)
_HIGH_TIER_CLAUDE: set[str] = {"fleuve", "ocean"}

# ── Règles par mots-clés ─────────────────────────────────────────────────────

_CODE_RE = re.compile(
    r"\b(code|débogu|debug|fonction|function|algorithme|script|class|variable|"
    r"boucle|loop|array|dictionnaire|dict|sql|api|endpoint|bug|erreur de syntaxe|"
    r"compil|import|module|library|framework|django|fastapi|react|next\.?js|"
    r"typescript|javascript|python|java|c\+\+|rust|bash|shell|"
    r"docker|kubernetes|git|déployer|deploy)\b",
    re.IGNORECASE,
)

_LEGAL_RE = re.compile(
    r"\b(contrat|juridique|loi|droit|ohada|clause|avocat|tribunal|légal|"
    r"législation|procédure|contentieux|litige|compliance|conformité|"
    r"réglementation|article\s+\d|constitution|ordonnance|décret|statuts)\b",
    re.IGNORECASE,
)

_CREATIVE_RE = re.compile(
    r"\b(rédige|écris un|créatif|marketing|publicité|pub|campagne|slogan|"
    r"storytelling|post (facebook|instagram|linkedin|twitter|whatsapp)|"
    r"newsletter|copywriting|accroche|pitch|présentation commerciale)\b",
    re.IGNORECASE,
)

_FILE_RE = re.compile(
    r"\b(résume|synthétise|analyse ce (document|fichier|pdf|rapport)|"
    r"extrais les|traduis ce|recherche sur|que dit ce|quels sont les points)\b",
    re.IGNORECASE,
)


def _keyword_route(prompt: str) -> str | None:
    if _CODE_RE.search(prompt):
        return "deepseek"
    if _LEGAL_RE.search(prompt):
        return "claude"
    if _CREATIVE_RE.search(prompt):
        return "openai"
    if _FILE_RE.search(prompt):
        return "gemini"
    return None


# ── RouterAgent ───────────────────────────────────────────────────────────────

class RouterAgent:

    async def route(self, prompt: str, user_tier: str) -> dict[str, str]:
        """
        Retourne {"provider": str, "model_id": str, "reason": str}.

        Ordre de priorité :
        1. Mots-clés rapides
        2. Classification Gemini Flash
        3. Fallback gemini-2.5-flash
        """
        allowed_models = get_models_for_tier(user_tier)

        # Passe 1 — mots-clés
        kw = _keyword_route(prompt)
        if kw:
            result = self._resolve(kw, user_tier, allowed_models)
            if result:
                reason_map = {
                    "deepseek": "Code détecté → DeepSeek",
                    "claude":   "Analyse juridique → Claude",
                    "openai":   "Rédaction créative → ChatGPT",
                    "gemini":   "Document long → Gemini",
                }
                result["reason"] = reason_map[kw]
                return result

        # Passe 2 — classification LLM
        try:
            llm_provider, llm_reason = await self._llm_classify(prompt)
            result = self._resolve(llm_provider, user_tier, allowed_models)
            if result:
                result["reason"] = llm_reason
                return result
        except Exception:
            pass

        # Passe 3 — fallback
        return {
            "provider": _FALLBACK_PROVIDER,
            "model_id": _FALLBACK_MODEL,
            "reason":   "Gemini — choix par défaut",
        }

    def _resolve(
        self,
        provider: str,
        tier: str,
        allowed_models: list[str],
    ) -> dict[str, str] | None:
        """Valide provider + accessibilité tier. None = indisponible."""
        if not is_provider_active(provider):
            return None

        # Upgrade claude haiku → sonnet pour fleuve+
        if provider == "claude" and tier in _HIGH_TIER_CLAUDE:
            model_id = "claude-sonnet-4-6"
        else:
            _, model_id = _ROUTE_MAP.get(provider, (_FALLBACK_PROVIDER, _FALLBACK_MODEL))

        if model_id not in allowed_models:
            return None

        return {
            "provider": provider,
            "model_id": model_id,
            "reason":   "",  # rempli par l'appelant
        }

    async def _llm_classify(self, prompt: str) -> tuple[str, str]:
        """Appelle Gemini Flash pour classifier. Retourne (provider, reason)."""
        # Import tardif pour éviter le cycle d'import
        from app.manager.llm_manager import llm_manager  # noqa: PLC0415

        try:
            raw = await llm_manager.generate_text(
                provider="gemini",
                model_id="gemini-2.5-flash",
                prompt=f"Requête à classifier :\n\n{prompt[:1000]}",
                system_prompt=ROUTING_PROMPT,
            )
            match = re.search(r"\{[^}]+\}", raw, re.DOTALL)
            if match:
                data = json.loads(match.group())
                provider = str(data.get("provider", "gemini")).lower().strip()
                reason   = str(data.get("reason", "")).strip()
                if provider in _ROUTE_MAP:
                    return provider, reason or f"Boulga a choisi {provider.capitalize()}"
        except Exception as exc:
            logger.warning("RouterAgent LLM classify failed: %s", exc)

        return "gemini", "Routage par défaut"


# Singleton — une instance par worker suffit
router_agent = RouterAgent()
