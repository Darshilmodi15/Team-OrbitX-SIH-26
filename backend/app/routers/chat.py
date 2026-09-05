from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.chat_models import ConversationSummary, CreateConversationRequest, UpdateConversationRequest
from app.models.user_models import UserProfile
from app.routers.auth import get_current_user_from_header
from app.services.chat_service import chat_storage_service

router = APIRouter(prefix="/api/conversations", tags=["User-owned conversations"])

@router.get("", response_model=List[ConversationSummary])
def list_conversations(user: UserProfile = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    return chat_storage_service.list(db, user.id)

@router.post("", response_model=ConversationSummary, status_code=status.HTTP_201_CREATED)
def create_conversation(request: CreateConversationRequest, user: UserProfile = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    row = chat_storage_service.create(db, user.id, request.title); db.commit(); db.refresh(row)
    return chat_storage_service.serialize(row)

@router.get("/{conversation_id}", response_model=ConversationSummary)
def get_conversation(conversation_id: str, user: UserProfile = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    result = chat_storage_service.get(db, user.id, conversation_id)
    if not result: raise HTTPException(status_code=404, detail="Conversation not found")
    return result

@router.patch("/{conversation_id}", response_model=ConversationSummary)
def rename_conversation(conversation_id: str, request: UpdateConversationRequest, user: UserProfile = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    result = chat_storage_service.rename(db, user.id, conversation_id, request.title)
    if not result: raise HTTPException(status_code=404, detail="Conversation not found")
    db.commit(); return result

@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: str, user: UserProfile = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    if not chat_storage_service.delete(db, user.id, conversation_id): raise HTTPException(status_code=404, detail="Conversation not found")
    db.commit(); return Response(status_code=status.HTTP_204_NO_CONTENT)
