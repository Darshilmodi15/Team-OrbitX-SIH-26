"""
Database module for ORCA Marine AI.
Exports database engine, session helpers, Base, and models.
"""
from app.db.base import Base
from app.db.session import (
    DATABASE_URL,
    SessionLocal,
    engine,
    get_database_url,
    get_db,
    get_db_context,
    init_db,
)
from app.db.models import (
    AuditLog,
    ChatHistory,
    Conversation,
    EmergencyContact,
    Geofence,
    GovernmentAlert,
    GovernmentDocument,
    GovernmentUser,
    MarineObservation,
    Notification,
    NotificationPreference,
    PFZZone,
    SOSRequest,
    SystemSetting,
    User,
    UserLocation,
    UserPreference,
)

__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "DATABASE_URL",
    "get_database_url",
    "get_db",
    "get_db_context",
    "init_db",
    "User",
    "UserLocation",
    "UserPreference",
    "GovernmentUser",
    "GovernmentAlert",
    "GovernmentDocument",
    "EmergencyContact",
    "SOSRequest",
    "MarineObservation",
    "PFZZone",
    "Geofence",
    "Notification",
    "NotificationPreference",
    "ChatHistory",
    "Conversation",
    "AuditLog",
    "SystemSetting",
]
