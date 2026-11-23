"""Geofence data provider module."""
from app.data.geofence.base import GeofenceProvider
from app.data.geofence.spatial_provider import SpatialGeofenceProvider
from app.data.geofence.legacy import GEOFENCE_REGISTRY, evaluate_vessel_geofences, haversine_km, point_in_polygon

__all__ = [
    "GEOFENCE_REGISTRY",
    "GeofenceProvider",
    "SpatialGeofenceProvider",
    "evaluate_vessel_geofences",
    "haversine_km",
    "point_in_polygon",
]
