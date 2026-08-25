"""
Location and Coastal Area Verification Router for ORCA Marine AI.
"""
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.models.user_models import (
    LocationValidationRequest,
    LocationValidationResponse,
)
from app.services.auth import decode_token
from app.services.location import location_service

router = APIRouter(prefix="/api/location", tags=["Location & Coastal Verification"])


@router.post("/validate", response_model=LocationValidationResponse)
def validate_coordinates(request: LocationValidationRequest):
    """
    Validates user GPS or selected coordinates against India boundary and coastal intelligence belt.
    
    Returns whether location is within India and within supported coastal range (<= 100 km).
    """
    return location_service.validate_location(
        lat=request.lat,
        lon=request.lon,
        accuracy_m=request.accuracy_m,
    )


@router.post("/update", response_model=LocationValidationResponse)
def update_user_location(
    request: LocationValidationRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Updates active location telemetry for authenticated user session.
    """
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        payload = decode_token(authorization.split("Bearer ")[1].strip())
        if payload:
            user_id = payload.get("sub")

    return location_service.validate_location(
        lat=request.lat,
        lon=request.lon,
        accuracy_m=request.accuracy_m,
        user_id=user_id or "anonymous_session",
    )


@router.get("/current")
def get_current_location(
    lat: float = Query(18.9220, description="Fallback latitude"),
    lon: float = Query(72.8347, description="Fallback longitude"),
    authorization: Optional[str] = Header(None),
):
    """
    Retrieves current validated location and coastal advisory status.
    """
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        payload = decode_token(authorization.split("Bearer ")[1].strip())
        if payload:
            user_id = payload.get("sub")

    cached = location_service.get_user_location(user_id or "anonymous_session")
    if cached:
        return cached

    return location_service.validate_location(lat=lat, lon=lon, user_id=user_id).model_dump()
