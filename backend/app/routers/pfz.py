"""Public PFZ availability contract; historical fixtures are never current advisories."""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from app.services.pfz.incois_pfz_service import incois_pfz_service

router = APIRouter(prefix="/api", tags=["PFZ"])


@router.get("/pfz", summary="Retrieve Potential Fishing Zones dataset")
def get_pfz_dataset(
    sector: Optional[str] = Query(None, description="Coastal sector code (e.g. maharashtra, gujarat)"),
    lat: Optional[float] = Query(None, description="User latitude coordinate for sector auto-detection"),
    lon: Optional[float] = Query(None, description="User longitude coordinate for sector auto-detection"),
    language: str = Query("en", description="Target language code"),
) -> Dict[str, Any]:
    """Return verified INCOIS PFZ advisory or explicit availability.

    Advisories include source, data_mode, timezone-aware issued_at/valid_until,
    sector metadata, issuing authority, and numeric latitude/longitude in pfz_zones.
    No repository fixture, request time, or screenshot date is a live feed.
    """
    return incois_pfz_service.get_advisory(
        sector=sector,
        lat=lat,
        lon=lon,
        language=language,
    )


@router.get("/pfz/sectors", summary="List official coastal sectors and advisory status")
def get_pfz_sectors() -> List[Dict[str, Any]]:
    """Returns official INCOIS coastal sectors with geographical bounds and landing centres."""
    return incois_pfz_service.get_sectors()
