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
from app.services.auth import decode_token
from app.services.notifications import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Safety Notifications & Alerts"])


@router.get("", response_model=NotificationsResponse)
def get_notifications(
    user_id: Optional[str] = Query(None, description="Optional user identifier"),
    authorization: Optional[str] = Header(None),
):
    """
    Retrieves active coastal safety notifications, unread count, and regional advisories.
    """
    resolved_uid = user_id
    if not resolved_uid and authorization and authorization.startswith("Bearer "):
        payload = decode_token(authorization.split("Bearer ")[1].strip())
        if payload:
            resolved_uid = payload.get("sub")

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
    Marks all notifications as read for current user.
    """
    resolved_uid = user_id
    if not resolved_uid and authorization and authorization.startswith("Bearer "):
        payload = decode_token(authorization.split("Bearer ")[1].strip())
        if payload:
            resolved_uid = payload.get("sub")

    count = notification_service.mark_all_as_read(resolved_uid)
    return {"status": "ok", "marked_read_count": count}


@router.post("/check", response_model=NotificationsResponse)
def check_location_alerts(request: LocationAlertCheckRequest):
    """
    Evaluates current GPS coordinates against IMBL, MPAs, wave risk thresholds,
    and trajectory anomalies. Returns updated list of notifications.
    """
    notification_service.evaluate_location_alerts(
        lat=request.lat,
        lon=request.lon,
        previous_lat=request.previous_lat,
        previous_lon=request.previous_lon,
        user_id=request.user_id,
    )
    return notification_service.get_notifications_for_user(request.user_id)
