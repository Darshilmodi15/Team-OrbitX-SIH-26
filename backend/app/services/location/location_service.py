"""
Unified Location Service for ORCA Marine AI.

Coordinates GPS validation, India territorial compliance, coastal proximity,
and rejects unsupported inland or international locations with actionable guidance.
"""
from collections import OrderedDict
import logging
import math
import threading
from typing import Any, Dict, Optional

from fastapi import HTTPException
from app.models.user_models import LocationValidationResponse
from app.services.location.coastal_distance import coastal_distance_service

logger = logging.getLogger(__name__)


class LocationService:
    """Core Location & Boundary Validation Service."""

    def __init__(self, max_cached_users: int = 2000):
        self._current_locations: OrderedDict = OrderedDict()
        self._max_cached_users = max_cached_users
        self._lock = threading.Lock()

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
        if (
            not isinstance(lat, (int, float))
            or isinstance(lat, bool)
            or not isinstance(lon, (int, float))
            or isinstance(lon, bool)
            or not math.isfinite(lat)
            or not math.isfinite(lon)
            or not (-90.0 <= lat <= 90.0)
            or not (-180.0 <= lon <= 180.0)
        ):
            raise HTTPException(status_code=422, detail="INVALID_COORDINATES")
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
                f"Select this location to request available marine information."
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

        if user_id and is_supported:
            try:
                from app.db.session import get_db_context
                from app.repositories import UserRepository
                with get_db_context() as db:
                    UserRepository.record_location(
                        db=db,
                        user_id=user_id if user_id != "anonymous_session" else None,
                        latitude=lat,
                        longitude=lon,
                        accuracy_m=accuracy_m,
                        coastal_distance_km=distance_km,
                        is_coastal=is_supported,
                        coastal_region=region,
                        location_source="GPS" if accuracy_m is not None else "MANUAL",
                    )
            except Exception as exc:
                logger.warning("Location persistence failed: %s", type(exc).__name__)
                raise HTTPException(status_code=503, detail="LOCATION_SAVE_FAILED") from exc
            with self._lock:
                self._current_locations[user_id] = result.model_dump()
                self._current_locations.move_to_end(user_id)
                while len(self._current_locations) > self._max_cached_users:
                    self._current_locations.popitem(last=False)

        return result

    def get_user_location(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._current_locations.get(user_id)


location_service = LocationService()
