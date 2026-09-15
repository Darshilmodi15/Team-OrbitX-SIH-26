"""Public PFZ availability contract; historical fixtures are never current advisories."""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query, HTTPException
from app.services.pfz.incois_pfz_service import incois_pfz_service, COASTAL_SECTORS, LANGUAGES

router = APIRouter(prefix="/api", tags=["PFZ"])


@router.get("/pfz", summary="Retrieve Potential Fishing Zones dataset")
def get_pfz_dataset(
    sector: Optional[str] = Query(None, max_length=40, description="Coastal advisory sector code"),
    lat: Optional[float] = Query(None, ge=-90, le=90, allow_inf_nan=False),
    lon: Optional[float] = Query(None, ge=-180, le=180, allow_inf_nan=False),
    language: str = Query("en", max_length=2, description="Target language code"),
) -> Dict[str, Any]:
    """Return verified INCOIS PFZ advisory or explicit availability.

    Advisories include source, data_mode, timezone-aware issued_at/valid_until,
    sector metadata, issuing authority, and numeric latitude/longitude in pfz_zones.
    No repository fixture, request time, or screenshot date is a live feed.
    """
    if sector is not None and sector not in COASTAL_SECTORS:
        raise HTTPException(422, "Unknown PFZ sector")
    if language not in LANGUAGES or (lat is None) != (lon is None):
        raise HTTPException(422, "Provide a supported language and a complete coordinate pair")
    return incois_pfz_service.get_advisory(
        sector=sector,
        lat=lat,
        lon=lon,
        language=language,
    )


@router.get("/pfz/sectors", summary="List advisory sector names and approximate selection hints")
def get_pfz_sectors() -> List[Dict[str, Any]]:
    """Bounds are ORCA selection hints, not official polygons or marine boundaries."""
    return incois_pfz_service.get_sectors()


@router.get("/pfz/publication", summary="Public INCOIS overview publication dates; not sector points")
def get_pfz_publication():
    from app.services.pfz.publication import get_publication
    return get_publication()
