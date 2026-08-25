"""
Notification and Coastal Safety Alert Models for ORCA Marine AI.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NotificationSeverity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class NotificationCategory(str, Enum):
    WEATHER = "WEATHER"
    GEOFENCE = "GEOFENCE"
    ANOMALY = "ANOMALY"
    GOVERNMENT = "GOVERNMENT"
    SYSTEM = "SYSTEM"


class SafetyNotification(BaseModel):
    """Safety alert / notification record."""
    id: str = Field(..., description="Unique notification UUID")
    user_id: Optional[str] = Field(default="global", description="Recipient user UUID or 'global'")
    title: str = Field(..., description="Alert headline")
    message: str = Field(..., description="Detailed safety advisory text")
    severity: NotificationSeverity = Field(default=NotificationSeverity.INFO, description="Alert severity level")
    category: NotificationCategory = Field(default=NotificationCategory.WEATHER, description="Alert category")
    source: str = Field(default="ORCA Safety Engine", description="Data provenance (e.g. INCOIS, Indian Coast Guard)")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="ISO timestamp")
    is_read: bool = Field(default=False, description="Read state")
    language: Optional[str] = Field(default="en", description="Language ISO code ('en', 'gu', 'hi', 'ta', etc.)")
    translated_title: Optional[str] = Field(default=None, description="Localized headline in recipient language")
    translated_message: Optional[str] = Field(default=None, description="Localized advisory text in recipient language")
    action_link: Optional[str] = Field(default=None, description="Optional deep link or action URI")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional contextual telemetry")


class NotificationsResponse(BaseModel):
    unread_count: int = Field(..., description="Total unread notifications")
    notifications: List[SafetyNotification] = Field(default_factory=list, description="Notification list")


class LocationAlertCheckRequest(BaseModel):
    lat: float = Field(..., description="Current vessel latitude")
    lon: float = Field(..., description="Current vessel longitude")
    previous_lat: Optional[float] = Field(default=None, description="Previous vessel latitude for anomaly tracking")
    previous_lon: Optional[float] = Field(default=None, description="Previous vessel longitude for anomaly tracking")
    user_id: Optional[str] = Field(default="anonymous_session", description="User identifier")
