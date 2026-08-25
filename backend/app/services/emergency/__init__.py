"""Emergency services package for ORCA Marine AI."""
from app.services.emergency.emergency_service import (
    EmergencyService,
    emergency_service,
    NATIONAL_EMERGENCY_CONTACTS,
    STATE_COASTAL_CONTACTS,
)

__all__ = [
    "EmergencyService",
    "emergency_service",
    "NATIONAL_EMERGENCY_CONTACTS",
    "STATE_COASTAL_CONTACTS",
]
