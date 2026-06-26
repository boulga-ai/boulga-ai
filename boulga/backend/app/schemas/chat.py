from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ModelOut(BaseModel):
    id: str
    label: str
    tier: str
    description: str


class LLMOut(BaseModel):
    provider: str
    label: str
    description: str
    active: bool
    models: list[ModelOut]


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    provider: str = "gemini"
    model_id: str = "gemini-2.5-flash"
    file_ids: list[str] = []
    tool_slug: Optional[str] = None
    auto_route: bool = False  # Routage Automatique Intelligent (branché au prompt 8)
    effort: str = "medium"        # Niveau d'effort : low | medium | high | max
    enable_search: bool = False   # Recherche web (Gemini + Claude uniquement)


class ConversationOut(BaseModel):
    id: str
    user_id: str
    title: Optional[str] = None
    provider: Optional[str] = None
    model_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    provider: Optional[str] = None
    model_id: Optional[str] = None
    created_at: datetime


class ConversationDetailOut(BaseModel):
    id: str
    user_id: str
    title: Optional[str] = None
    provider: Optional[str] = None
    model_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: list[MessageOut]
