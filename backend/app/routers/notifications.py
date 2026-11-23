"""
Notifications and Safety Alerts REST Router for ORCA Marine AI.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field

from app.models.notification_models import (
    LocationAlertCheckRequest,
    NotificationsResponse,
    SafetyNotification,
)
from app.models.user_models import UserProfile
from app.routers.auth import get_current_user_from_header, get_optional_current_user
from app.services.notifications import notification_service
from app.services.notifications.push_service import (
    delete_push_subscription,
    get_push_config_status,
    save_push_subscription,
)
from app.services.rate_limit import rate_limiter

router = APIRouter(prefix="/api/notifications", tags=["Safety Notifications & Alerts"])


class PushSubscriptionKeys(BaseModel):
    model_config = ConfigDict(extra="forbid")
    p256dh: str = Field(..., min_length=16, max_length=255)
    auth: str = Field(..., min_length=8, max_length=255)


class PushSubscribeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    endpoint: str = Field(..., min_length=10, max_length=1024)
    keys: PushSubscriptionKeys


class PushUnsubscribeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    endpoint: str = Field(..., min_length=10, max_length=1024)


@router.get("/push/config")
def get_push_configuration():
    """Returns Web Push VAPID public availability (never exposes private key)."""
    return get_push_config_status()


@router.post("/push/subscribe")
def subscribe_web_push(
    request: PushSubscribeRequest,
    req: Request,
    user: UserProfile = Depends(get_current_user_from_header),
):
    """Stores a browser Web Push subscription for the authenticated user."""
    try:
        return save_push_subscription(
            user_id=user.id,
            endpoint=request.endpoint,
            p256dh=request.keys.p256dh,
            auth=request.keys.auth,
            user_agent=req.headers.get("user-agent", "")[:512],
        )
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.delete("/push/subscribe")
def unsubscribe_web_push(
    request: PushUnsubscribeRequest,
    user: UserProfile = Depends(get_current_user_from_header),
):
    """Removes a stored Web Push subscription for the authenticated user."""
    removed = delete_push_subscription(user.id, request.endpoint)
    return {"status": "removed" if removed else "not_found"}


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
def mark_notification_read(
    notification_id: str,
    user: UserProfile = Depends(get_current_user_from_header),
):
    """
    Marks a specific notification as read for the authenticated user.
    """
    notif = notification_service.mark_as_read(notification_id, user_id=user.id)
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
    req: Request,
    authorization: Optional[str] = Header(None),
):
    """
    Evaluates current GPS coordinates against IMBL, MPAs, wave risk thresholds,
    and trajectory anomalies. Returns updated list of notifications.
    """
    user = get_optional_current_user(authorization)
    resolved_uid = user.id if user else None
    rate_key = f"user:{resolved_uid}" if resolved_uid else f"ip:{req.client.host if req.client else 'unknown'}"
    rate_limiter.check("notifications_check", rate_key, limit=60, window_seconds=60)

    if resolved_uid:
        notification_service.evaluate_location_alerts(
            lat=request.lat,
            lon=request.lon,
            previous_lat=request.previous_lat,
            previous_lon=request.previous_lon,
            user_id=resolved_uid,
            persist=True,
        )
        return notification_service.get_notifications_for_user(resolved_uid)

    ephemeral = notification_service.evaluate_location_alerts(
        lat=request.lat,
        lon=request.lon,
        previous_lat=request.previous_lat,
        previous_lon=request.previous_lon,
        user_id=None,
        persist=False,
    )
    existing = notification_service.get_notifications_for_user(None)
    combined = ephemeral + existing.notifications
    combined.sort(key=lambda x: x.timestamp, reverse=True)
    return NotificationsResponse(
        unread_count=sum(1 for n in combined if not n.is_read),
        notifications=combined,
    )
