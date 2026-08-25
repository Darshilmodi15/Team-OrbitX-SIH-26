"""
FastAPI Router for Marine Boundaries and Exclusive Economic Zone (EEZ) endpoints.
Source: Marine Regions / Flanders Marine Institute (VLIZ)
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.marine_boundaries import (
    DEFAULT_MRGID,
    MarineBoundariesService,
    marine_boundaries_service,
)

router = APIRouter(prefix="/api/marine-boundaries", tags=["Marine Boundaries"])


class LocationCheckRequest(BaseModel):
    lat: float = Field(..., description="Vessel latitude coordinate")
    lon: float = Field(..., description="Vessel longitude coordinate")
    mrgid: Optional[int] = Field(default=DEFAULT_MRGID, description="Marine Regions Geographic Identifier (MRGID)")


@router.get("/info", summary="Retrieve Marine Regions data source and WFS metadata")
def get_boundaries_info() -> Dict[str, Any]:
    """
    Returns official provenance metadata for the Marine Regions / VLIZ World EEZ dataset.
    """
    return marine_boundaries_service.get_metadata()


@router.get("/eez", summary="Retrieve EEZ boundary GeoJSON for coastal region")
def get_eez_geojson(
    mrgid: int = Query(
        default=DEFAULT_MRGID,
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
    try:
        data = marine_boundaries_service.fetch_eez_by_mrgid(mrgid=mrgid, force_refresh=force_refresh)
        return data
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving marine boundary data: {str(exc)}",
        )


@router.get("/check", summary="Evaluate vessel location against EEZ boundary")
def check_boundary_get(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    mrgid: int = Query(default=DEFAULT_MRGID, description="Target MRGID (default 8480: India)"),
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
