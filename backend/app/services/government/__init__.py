"""Government announcements and policy service package for ORCA."""
from app.services.government.government_service import (
    GovernmentService,
    government_service,
)

__all__ = ["GovernmentService", "government_service"]
