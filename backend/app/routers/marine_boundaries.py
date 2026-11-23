"""
FastAPI Router for Marine Boundaries and Exclusive Economic Zone (EEZ) endpoints.
Source: Marine Regions / Flanders Marine Institute (VLIZ)
"""

import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.services.marine_boundaries import (
    DEFAULT_MRGID,
    MarineBoundariesService,
    marine_boundaries_service,
)
from app.services.rate_limit import rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/marine-boundaries", tags=["Marine Boundaries"])


@router.get("/eez/display")
def get_display_geometry():
    from app.services.display_geometry import reference_geometry
    return reference_geometry(marine_boundaries_service.fetch_eez_by_mrgid())


class LocationCheckRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, allow_inf_nan=False, description="Vessel latitude coordinate")
    lon: float = Field(..., ge=-180.0, le=180.0, allow_inf_nan=False, description="Vessel longitude coordinate")
    mrgid: Optional[int] = Field(default=DEFAULT_MRGID, ge=1, le=99999999, description="Marine Regions Geographic Identifier (MRGID)")


@router.get("/info", summary="Retrieve Marine Regions data source and WFS metadata")
def get_boundaries_info() -> Dict[str, Any]:
    """
    Returns official provenance metadata for the Marine Regions / VLIZ World EEZ dataset.
    """
    return marine_boundaries_service.get_metadata()


@router.get("/eez", summary="Retrieve EEZ boundary GeoJSON for coastal region")
def get_eez_geojson(
    request: Request,
    mrgid: int = Query(
        default=DEFAULT_MRGID,
        ge=1,
        le=99999999,
        description="Marine Regions Geographic Identifier (MRGID). Default 8480 is Indian EEZ.",
    ),
    force_refresh: bool = Query(
        default=False,
        description="Force live retrieval from Marine Regions WFS server, bypassing local cache.",
    ),
) -> Dict[str, Any]:
    """
    Fetches real Exclusive Economic Zone (EEZ) GeoJSON from Marine Regions WFS (or cached dataset).
    """
    if force_refresh:
        client_ip = request.client.host if request.client else "unknown"
        rate_limiter.check("marine_boundaries_refresh", client_ip, limit=6, window_seconds=60)
    try:
        data = marine_boundaries_service.fetch_eez_by_mrgid(mrgid=mrgid, force_refresh=force_refresh)
        return data
    except Exception:
        logger.exception("Error retrieving EEZ marine boundary data (mrgid=%s)", mrgid)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving marine boundary data.",
        )


@router.get("/international", summary="Retrieve international maritime boundaries GeoJSON")
def get_international_boundaries_geojson(
    request: Request,
    force_refresh: bool = Query(
        default=False,
        description="Force live retrieval from Marine Regions WFS server, bypassing local cache.",
    ),
) -> Dict[str, Any]:
    """
    Fetches official International Maritime Boundaries GeoJSON (Treaties, Court rulings, Median lines)
    for India and adjacent sovereign nations from Marine Regions WFS (or cached dataset).
    """
    if force_refresh:
        client_ip = request.client.host if request.client else "unknown"
        rate_limiter.check("marine_boundaries_refresh", client_ip, limit=6, window_seconds=60)
    try:
        data = marine_boundaries_service.fetch_boundaries_geojson(force_refresh=force_refresh)
        return data
    except Exception:
        logger.exception("Error retrieving international maritime boundaries")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving international maritime boundaries.",
        )



@router.get("/check", summary="Evaluate vessel location against EEZ boundary")
def check_boundary_get(
    lat: float = Query(..., ge=-90.0, le=90.0, allow_inf_nan=False, description="Latitude coordinate"),
    lon: float = Query(..., ge=-180.0, le=180.0, allow_inf_nan=False, description="Longitude coordinate"),
    mrgid: int = Query(default=DEFAULT_MRGID, ge=1, le=99999999, description="Target MRGID (default 8480: India)"),
) -> Dict[str, Any]:
    """
    Evaluates whether the specified coordinates are inside the EEZ, computes distance
    to outer maritime boundary line (in km), and assigns geofence alert level ('safe', 'warning', 'critical').
    """
    return marine_boundaries_service.check_marine_boundary(lat=lat, lon=lon, mrgid=mrgid)


@router.post("/check", summary="Evaluate vessel location against EEZ boundary (POST)")
def check_boundary_post(request: LocationCheckRequest) -> Dict[str, Any]:
    """
    Evaluates whether the specified coordinates are inside the EEZ via POST payload.
    """
    return marine_boundaries_service.check_marine_boundary(
        lat=request.lat, lon=request.lon, mrgid=request.mrgid or DEFAULT_MRGID
    )
