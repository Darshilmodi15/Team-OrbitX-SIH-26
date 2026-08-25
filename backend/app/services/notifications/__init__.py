"""Notifications and safety alerts package for ORCA."""
from app.services.notifications.notification_service import (
    NotificationService,
    notification_service,
)

__all__ = ["NotificationService", "notification_service"]
