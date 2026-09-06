"""
Emergency Services and Maritime SOS Distress REST Router for ORCA Marine AI.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.emergency_models import (
    EmergencyContact,
    SOSBroadcastRequest,
    SOSBroadcastResponse,
    SOSStatusUpdate,
)
from app.services.emergency import emergency_service
from app.models.user_models import UserProfile, UserRole
from app.routers.auth import get_current_user_from_header, require_roles

router = APIRouter(prefix="/api/emergency", tags=["Maritime Emergency Services & SOS"])


@router.get("/contacts", response_model=List[EmergencyContact])
def get_emergency_contacts(
    region: Optional[str] = Query(None, description="Optional coastal state filter (e.g. 'Gujarat', 'Maharashtra', 'Kerala')")
):
    """
    Returns official 24x7 maritime distress helplines (Indian Coast Guard 1554, Coastal Police 1093, NDRF 1078)
    and regional coastal police stations.
    """
    return emergency_service.get_all_emergency_contacts(region)


@router.post("/sos", response_model=SOSBroadcastResponse, status_code=status.HTTP_201_CREATED)
def trigger_sos_broadcast(request: SOSBroadcastRequest, user: UserProfile = Depends(get_current_user_from_header)):
    """
    Triggers an instant SOS distress broadcast. Routes coordinates to MRCC Mumbai, Chennai, or Port Blair,
    logs beacon telemetry, and returns IMO-standard MAYDAY VHF Channel 16 transcript and hotlines.
    """
    return emergency_service.broadcast_sos(request, user.id)


@router.get("/sos/active", response_model=List[SOSBroadcastResponse])
def get_active_sos_distress_beacons(_user: UserProfile = Depends(require_roles(UserRole.GOVERNMENT, UserRole.SUPER_ADMIN))):
    """
    Returns active SOS distress broadcasts for maritime and fisheries monitoring desks.
    """
    return emergency_service.get_active_sos()


@router.patch("/sos/{sos_id}/status", response_model=SOSBroadcastResponse)
def update_sos_status(sos_id: str, request: SOSStatusUpdate, _user: UserProfile = Depends(require_roles(UserRole.GOVERNMENT, UserRole.SUPER_ADMIN))):
    result = emergency_service.update_status(sos_id, request.status)
    if not result:
        raise HTTPException(status_code=404, detail="SOS request not found")
    return result
