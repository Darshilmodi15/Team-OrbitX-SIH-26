"""
Notifications and Safety Alerts REST Router for ORCA Marine AI.
"""
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Query, status

from app.models.notification_models import (
    LocationAlertCheckRequest,
    NotificationsResponse,
    SafetyNotification,
)
from app.routers.auth import get_optional_current_user
from app.services.notifications import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Safety Notifications & Alerts"])


@router.get("", response_model=NotificationsResponse)
def get_notifications(
    user_id: Optional[str] = Query(None, description="Optional user identifier (ignored in favor of verified JWT identity)"),
    authorization: Optional[str] = Header(None),
):
    """
    Retrieves active coastal safety notifications, unread count, and regional advisories.
    Identity is derived strictly from the authenticated JWT. Unauthenticated callers receive only global broadcast alerts.
    """
    user = get_optional_current_user(authorization)
    resolved_uid = user.id if user else None

    return notification_service.get_notifications_for_user(resolved_uid)


@router.patch("/{notification_id}/read", response_model=SafetyNotification)
def mark_notification_read(notification_id: str):
    """
    Marks a specific notification as read.
    """
    notif = notification_service.mark_as_read(notification_id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notif


@router.post("/read-all")
def mark_all_notifications_read(
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    """
    Marks all notifications as read for current authenticated user.
    """
    user = get_optional_current_user(authorization)
    resolved_uid = user.id if user else None

    if not resolved_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to mark notifications as read.",
        )

    count = notification_service.mark_all_as_read(resolved_uid)
    return {"status": "ok", "marked_read_count": count}


@router.post("/check", response_model=NotificationsResponse)
def check_location_alerts(
    request: LocationAlertCheckRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Evaluates current GPS coordinates against IMBL, MPAs, wave risk thresholds,
    and trajectory anomalies. Returns updated list of notifications.
    """
    user = get_optional_current_user(authorization)
    resolved_uid = user.id if user else None

    notification_service.evaluate_location_alerts(
        lat=request.lat,
        lon=request.lon,
        previous_lat=request.previous_lat,
        previous_lon=request.previous_lon,
        user_id=resolved_uid,
    )
    return notification_service.get_notifications_for_user(resolved_uid)
