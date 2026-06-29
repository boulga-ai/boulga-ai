from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.exceptions import NotFoundError
from app.core.security import get_current_user
from app.db.repositories.conversation_repository import ConversationRepository
from app.db.repositories.file_repository import FileRepository
from app.db.repositories.message_repository import MessageRepository
from app.db.session import get_supabase
from app.schemas.chat import ConversationDetailOut, ConversationOut

router = APIRouter()


@router.get("/api/conversations", response_model=list[ConversationOut])
async def list_conversations(
    user: dict = Depends(get_current_user),
):
    """Liste des conversations de l'utilisateur, triée par updated_at desc."""
    db = get_supabase()
    repo = ConversationRepository(db)
    return repo.list_by_user(UUID(user["sub"]))


@router.get("/api/conversations/{conversation_id}", response_model=ConversationDetailOut)
async def get_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Retourne une conversation avec tous ses messages. 404 si introuvable."""
    db = get_supabase()
    conv_repo = ConversationRepository(db)
    msg_repo = MessageRepository(db)
    file_repo = FileRepository(db)

    conversation = conv_repo.get_by_id(UUID(conversation_id))
    if not conversation or conversation["user_id"] != user["sub"]:
        raise NotFoundError("Conversation introuvable")

    messages = msg_repo.list_by_conversation(UUID(conversation_id))
    generated_files = file_repo.list_by_conversation(UUID(conversation_id))
    return {**conversation, "messages": messages, "generated_files": generated_files}


@router.delete("/api/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Supprime une conversation et tous ses messages (cascade). 404 si introuvable."""
    db = get_supabase()
    conv_repo = ConversationRepository(db)
    msg_repo = MessageRepository(db)

    conversation = conv_repo.get_by_id(UUID(conversation_id))
    if not conversation or conversation["user_id"] != user["sub"]:
        raise NotFoundError("Conversation introuvable")

    msg_repo.delete_by_conversation(UUID(conversation_id))
    conv_repo.delete(UUID(conversation_id))
