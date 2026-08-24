"""Location and coastal boundary services for ORCA Marine AI."""
from app.services.location.coastal_distance import CoastalDistanceService, coastal_distance_service
from app.services.location.india_boundary import (
    INDIA_BOUNDS,
    INDIA_COASTLINE_POINTS,
    INDIA_MAINLAND_POLYGON,
    point_in_polygon,
)
from app.services.location.location_service import LocationService, location_service

__all__ = [
    "LocationService",
    "location_service",
    "CoastalDistanceService",
    "coastal_distance_service",
    "INDIA_BOUNDS",
    "INDIA_COASTLINE_POINTS",
    "INDIA_MAINLAND_POLYGON",
    "point_in_polygon",
]
