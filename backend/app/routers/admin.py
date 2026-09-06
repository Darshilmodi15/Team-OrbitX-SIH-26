"""
Super Admin Diagnostics, User Fleet Management, and Historical Marine REST Router for ORCA.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from app.models.admin_models import HistoricalMarineComparison, SystemHealthStatus
from app.models.user_models import UserProfile, UserRole
from app.services.admin import admin_service
from app.services.auth import auth_service
from app.routers.auth import require_roles
from app.services.rate_limit import rate_limiter

router = APIRouter(tags=["Super Admin & Historical Comparisons"])


class UpdateRoleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: UserRole


@router.get("/api/admin/system-health", response_model=SystemHealthStatus)
def get_system_health(_user: UserProfile = Depends(require_roles(UserRole.SUPER_ADMIN))):
    """
    Returns real-time service health, upstream latencies, memory footprint, and active SOS beacons.
    """
    rate_limiter.check("admin-health", _user.id, limit=60)
    return admin_service.get_system_health()


@router.get("/api/admin/users", response_model=List[UserProfile])
def get_all_registered_users(_user: UserProfile = Depends(require_roles(UserRole.SUPER_ADMIN))):
    """
    Returns list of all registered vessel owners, fishermen, and officers.
    """
    return auth_service.list_all_users()


@router.patch("/api/admin/users/{user_id}/role", response_model=UserProfile)
def update_user_role(user_id: str, request: UpdateRoleRequest, _user: UserProfile = Depends(require_roles(UserRole.SUPER_ADMIN))):
    """
    Elevates or changes a user account role (USER -> GOVERNMENT -> SUPER_ADMIN).
    """
    try:
        updated = auth_service.update_role_safely(user_id, request.role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated


@router.get("/api/marine/historical-comparison", response_model=HistoricalMarineComparison)
def get_historical_marine_comparison(
    lat: float = Query(18.9220, description="Latitude"),
    lon: float = Query(72.8347, description="Longitude"),
    period_hours: int = Query(24, description="Comparison window in hours (24 or 168)"),
):
    """
    Returns Before-vs-After oceanographic comparison metrics and trend diagnosis.
    """
    return admin_service.get_historical_comparison(lat=lat, lon=lon, period_hours=period_hours)
