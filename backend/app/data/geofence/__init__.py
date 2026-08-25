"""Geofence data provider module."""
from app.data.geofence.base import GeofenceProvider
from app.data.geofence.spatial_provider import SpatialGeofenceProvider

__all__ = ["GeofenceProvider", "SpatialGeofenceProvider"]
