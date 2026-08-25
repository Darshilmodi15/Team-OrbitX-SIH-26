"""
Boundary Agent for evaluating vessel location against Marine Regions EEZ boundaries.
Source: Marine Regions / Flanders Marine Institute (VLIZ)
"""

from app.models.agent_models import BoundaryEvidence
from app.services.marine_boundaries import MarineBoundariesService, marine_boundaries_service


def check_marine_boundary_evidence(
    lat: float,
    lon: float,
    mrgid: int = 8480,
    service: MarineBoundariesService = marine_boundaries_service,
) -> BoundaryEvidence:
    """
    Evaluates spatial boundary status against official Marine Regions EEZ dataset
    and returns a validated BoundaryEvidence instance.
    """
    res = service.check_marine_boundary(lat=lat, lon=lon, mrgid=mrgid)
    return BoundaryEvidence(
        inside_eez=res["inside_eez"],
        distance_to_boundary_km=res["distance_to_boundary_km"],
        geofence_status=res["geofence_status"],
        country=res["country"],
        zone_name=res["zone_name"],
        mrgid=res["mrgid"],
        status_message=res["status_message"],
        source=res.get("metadata", {}).get("provider", "Marine Regions / Flanders Marine Institute (VLIZ)"),
        dataset_version=res.get("metadata", {}).get("version", "World EEZ v12"),
    )
