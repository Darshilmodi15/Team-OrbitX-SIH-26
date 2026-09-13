"""Satellite Telemetry Service package."""
from app.services.satellite.mosdac_service import (
    MosdacSatelliteService,
    mosdac_service,
)

__all__ = [
    "MosdacSatelliteService",
    "mosdac_service",
]
