from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class StoredChatMessage(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[StoredChatMessage] = Field(default_factory=list)


class CreateConversationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(default="New conversation", max_length=255)


class UpdateConversationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(..., min_length=1, max_length=255)
