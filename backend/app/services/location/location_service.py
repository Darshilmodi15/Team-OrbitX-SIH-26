"""
Unified Location Service for ORCA Marine AI.

Coordinates GPS validation, India territorial compliance, coastal proximity,
and rejects unsupported inland or international locations with actionable guidance.
"""
import logging
from typing import Any, Dict, Optional

from app.models.user_models import LocationValidationResponse
from app.services.location.coastal_distance import coastal_distance_service

logger = logging.getLogger(__name__)


class LocationService:
    """Core Location & Boundary Validation Service."""

    def __init__(self):
        self._current_locations: Dict[str, Dict[str, Any]] = {}

    def validate_location(
        self,
        lat: float,
        lon: float,
        accuracy_m: Optional[float] = None,
        user_id: Optional[str] = None,
    ) -> LocationValidationResponse:
        """
        Validates user coordinates against India sovereign limits and coastal intelligence belt.
        """
        inside_india = coastal_distance_service.is_inside_india_envelope(lat, lon)
        coastal_info = coastal_distance_service.calculate_coastal_distance(lat, lon)
        distance_km = coastal_info["distance_to_coast_km"]
        is_coastal_supported = coastal_info["is_coastal_supported"]
        region = coastal_info["coastal_region"]
        nearest_pt = coastal_info["nearest_coastal_point"]
        radius_km = coastal_info["intelligence_radius_km"]

        if not inside_india:
            message = (
                f"Coordinates ({lat:.4f}°N, {lon:.4f}°E) are outside the sovereign territory and "
                f"Exclusive Economic Zone (EEZ) of India. ORCA currently operates for Indian coastal safety only."
            )
            is_supported = False
        elif not is_coastal_supported:
            message = (
                f"Location is {distance_km:.1f} km inland from the nearest coast ({nearest_pt['name']}, {region}), "
                f"which exceeds ORCA's marine intelligence radius of {radius_km:.0f} km. "
                f"ORCA provides live marine weather, wave analytics, and fishing zones for coastal communities."
            )
            is_supported = False
        else:
            message = (
                f"Verified: Location is within the {region} coastal zone ({distance_km:.1f} km from {nearest_pt['name']}). "
                f"Live INCOIS ocean state telemetry, wave risk matrix, and fishing zones active."
            )
            is_supported = True

        result = LocationValidationResponse(
            lat=lat,
            lon=lon,
            inside_india=inside_india,
            is_coastal_supported=is_supported,
            distance_to_coast_km=distance_km,
            nearest_coastal_point=nearest_pt,
            coastal_region=region,
            message=message,
            intelligence_radius_km=radius_km,
        )

        if user_id:
            self._current_locations[user_id] = result.model_dump()

        return result

    def get_user_location(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self._current_locations.get(user_id)


location_service = LocationService()
