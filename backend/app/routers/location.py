"""
Location and Coastal Area Verification Router for ORCA Marine AI.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.models.user_models import (
    LocationValidationRequest,
    LocationValidationResponse,
)
from app.models.user_models import UserProfile
from app.routers.auth import get_current_user_from_header
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
    user: UserProfile = Depends(get_current_user_from_header),
):
    """
    Updates active location telemetry for authenticated user session.
    """
    return location_service.validate_location(
        lat=request.lat,
        lon=request.lon,
        accuracy_m=request.accuracy_m,
        user_id=user.id,
    )


@router.get("/current")
def get_current_location(
    lat: float = Query(18.9220, description="Fallback latitude"),
    lon: float = Query(72.8347, description="Fallback longitude"),
    user: UserProfile = Depends(get_current_user_from_header),
):
    """
    Retrieves current validated location and coastal advisory status.
    """
    cached = location_service.get_user_location(user.id)
    if cached:
        return cached

    return location_service.validate_location(lat=lat, lon=lon, user_id=user.id).model_dump()
