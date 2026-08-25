"""Maritime boundary and geofence evaluation agent."""
from app.data.geofence.base import GeofenceProvider
from app.models.agent_models import GeofenceEvidence


def evaluate_geofences(
    provider: GeofenceProvider,
    lat: float,
    lon: float,
) -> GeofenceEvidence:
    """
    Evaluates vessel proximity to international maritime boundaries (IMBL)
    and protected marine sanctuaries (MPA).
    """
    return provider.evaluate_boundaries(lat=lat, lon=lon)
