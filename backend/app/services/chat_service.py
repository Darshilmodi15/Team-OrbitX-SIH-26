import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4
from sqlalchemy.orm import Session

from app.db.models import ChatHistory, Conversation
from app.models.chat_models import ConversationSummary, StoredChatMessage


class ChatStorageService:
    def _owned(self, db: Session, user_id: str, conversation_id: str) -> Optional[Conversation]:
        return db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == user_id).first()

    def list(self, db: Session, user_id: str, limit: int = 50) -> List[ConversationSummary]:
        rows = db.query(Conversation).filter(Conversation.user_id == user_id).order_by(Conversation.updated_at.desc()).limit(limit).all()
        return [self.serialize(row) for row in rows]

    def create(self, db: Session, user_id: str, title: str = "New conversation", conversation_id: Optional[str] = None) -> Conversation:
        row = Conversation(id=conversation_id or str(uuid4()), user_id=user_id, title=title.strip() or "New conversation")
        db.add(row); db.flush()
        return row

    def get(self, db: Session, user_id: str, conversation_id: str) -> Optional[ConversationSummary]:
        row = self._owned(db, user_id, conversation_id)
        return self.serialize(row) if row else None

    def delete(self, db: Session, user_id: str, conversation_id: str) -> bool:
        row = self._owned(db, user_id, conversation_id)
        if not row: return False
        db.delete(row); db.flush(); return True

    def rename(self, db: Session, user_id: str, conversation_id: str, title: str) -> Optional[ConversationSummary]:
        row = self._owned(db, user_id, conversation_id)
        if not row: return None
        row.title = title.strip(); row.updated_at = datetime.now(timezone.utc); db.flush()
        return self.serialize(row)

    def context(self, db: Session, user_id: str, conversation_id: str, limit: int = 12) -> Optional[List[Dict[str, str]]]:
        row = self._owned(db, user_id, conversation_id)
        if not row: return None
        messages = db.query(ChatHistory).filter(ChatHistory.conversation_id == row.id).order_by(ChatHistory.created_at.desc()).limit(limit).all()
        return [{"role": m.role, "text": m.message} for m in reversed(messages)]

    def append(self, db: Session, user_id: str, conversation_id: str, role: str, content: str, language: str = "en", metadata: Optional[Dict[str, Any]] = None):
        row = self._owned(db, user_id, conversation_id)
        if not row: return None
        message = ChatHistory(user_id=user_id, conversation_id=conversation_id, session_id=conversation_id, role=role, message=content, language=language, sources_used_json=json.dumps(metadata) if metadata else None)
        db.add(message); row.updated_at = datetime.now(timezone.utc); db.flush(); return message

    def serialize(self, row: Conversation) -> ConversationSummary:
        return ConversationSummary(id=row.id, title=row.title, created_at=row.created_at, updated_at=row.updated_at, messages=[StoredChatMessage(id=m.id, role=m.role, content=m.message, created_at=m.created_at, metadata=json.loads(m.sources_used_json) if m.sources_used_json else None) for m in row.messages[-500:]])


chat_storage_service = ChatStorageService()
