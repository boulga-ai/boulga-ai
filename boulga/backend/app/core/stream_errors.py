# boulga/backend/app/core/stream_errors.py
"""Codes d'erreur typés émis dans le flux SSE de chat.

Source unique côté backend. Le frontend miroir vit dans
`boulga/frontend/lib/errorCodes.ts` — garder les deux synchronisés.

Chaque erreur SSE émise par le ChatService porte désormais :
  - `code`    : identifiant stable et typé (cet enum) — le frontend branche dessus
  - `message` : texte lisible (français) destiné à l'affichage de secours

Les valeurs reprennent volontairement les chaînes historiques
("quota_exceeded", …) : un ancien frontend qui lit encore `message` continue
de fonctionner tant que `message` vaut le code (rétrocompat), et le nouveau
frontend lit `code` en priorité avec repli sur `message`.
"""
from enum import Enum


class StreamErrorCode(str, Enum):
    QUOTA_EXCEEDED      = "quota_exceeded"
    MODEL_ACCESS_DENIED = "model_access_denied"
    FILE_QUOTA_EXCEEDED = "file_quota_exceeded"
    CONVERSATION_NOT_FOUND = "conversation_not_found"
    LLM_ERROR           = "llm_error"


# Messages lisibles par défaut (affichage de secours côté frontend).
STREAM_ERROR_MESSAGES: dict[StreamErrorCode, str] = {
    StreamErrorCode.QUOTA_EXCEEDED:         "Quota de messages atteint.",
    StreamErrorCode.MODEL_ACCESS_DENIED:    "Ce modèle n'est pas inclus dans votre offre actuelle.",
    StreamErrorCode.FILE_QUOTA_EXCEEDED:    "Limite de génération de fichiers atteinte.",
    StreamErrorCode.CONVERSATION_NOT_FOUND: "Conversation introuvable.",
    StreamErrorCode.LLM_ERROR:              "Une erreur est survenue. Veuillez réessayer.",
}


def stream_error(code: StreamErrorCode, message: str | None = None) -> dict:
    """Construit un événement SSE d'erreur typé.

    `message` reste lisible par défaut, mais peut être surchargé (ex: message
    d'erreur LLM concret).
    """
    return {
        "type": "error",
        "code": code.value,
        "message": message or STREAM_ERROR_MESSAGES.get(code, code.value),
    }
