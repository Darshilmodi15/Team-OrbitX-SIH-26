"""
Coastal Safety Notification and Anomaly Monitoring Service for ORCA.

Monitors live marine telemetry, international maritime boundary (IMBL) proximity,
marine protected area (MPA) reserves, and trajectory anomalies.
"""
from collections import OrderedDict
import copy
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set

from app.models.notification_models import (
    NotificationCategory,
    NotificationSeverity,
    NotificationsResponse,
    SafetyNotification,
)
from app.services.location.coastal_distance import haversine_distance_km

logger = logging.getLogger(__name__)


class NotificationService:
    """Core Notification & Safety Monitoring Service."""

    def __init__(self, max_in_memory: int = 2000):
        self._notifications: OrderedDict[str, SafetyNotification] = OrderedDict()
        self._global_read_by_user: Dict[str, Set[str]] = {}
        self._max_in_memory = max_in_memory

    def _present(self, notif: SafetyNotification, user_id: Optional[str]) -> SafetyNotification:
        if notif.user_id in ("global", None) and user_id:
            user_reads = self._global_read_by_user.get(user_id)
            if user_reads and notif.id in user_reads and not notif.is_read:
                return notif.model_copy(update={"is_read": True})
        return notif

    def get_notifications_for_user(self, user_id: Optional[str] = None) -> NotificationsResponse:
        """Retrieves all notifications for user or global broadcast."""
        items = list(self._notifications.values())
        # Filter for user or global: unauthenticated callers ONLY get global/broadcast alerts
        if user_id:
            items = [self._present(n, user_id) for n in items if n.user_id in (user_id, "global", None)]
        else:
            items = [n for n in items if n.user_id in ("global", None)]

        # Sort newest first
        items.sort(key=lambda x: x.timestamp, reverse=True)
        unread = sum(1 for n in items if not n.is_read)

        return NotificationsResponse(
            unread_count=unread,
            notifications=items,
        )

    def mark_as_read(self, notification_id: str, user_id: Optional[str] = None) -> Optional[SafetyNotification]:
        """Marks a notification as read."""
        notif = self._notifications.get(notification_id)
        if notif is None:
            return None
        if user_id is not None:
            if notif.user_id not in (user_id, "global", None):
                return None
            if notif.user_id in ("global", None):
                self._global_read_by_user.setdefault(user_id, set()).add(notification_id)
                return notif.model_copy(update={"is_read": True})

        notif.is_read = True
        try:
            from app.db.session import get_db_context
            from app.repositories import NotificationRepository
            with get_db_context() as db:
                NotificationRepository.mark_read(db, notification_id)
        except Exception:
            pass
        return notif

    def mark_all_as_read(self, user_id: Optional[str] = None) -> int:
        """Marks all notifications as read for the authenticated user."""
        if not user_id:
            return 0
        count = 0
        user_reads = self._global_read_by_user.setdefault(user_id, set())
        for n in self._notifications.values():
            if n.user_id == user_id:
                if not n.is_read:
                    n.is_read = True
                    count += 1
            elif n.user_id in ("global", None):
                if not n.is_read and n.id not in user_reads:
                    user_reads.add(n.id)
                    count += 1
        try:
            from app.db.session import get_db_context
            from app.repositories import NotificationRepository
            with get_db_context() as db:
                NotificationRepository.mark_all_read(db, user_id)
        except Exception:
            pass
        return count

    def add_notification(self, notif: SafetyNotification) -> SafetyNotification:
        self._notifications[notif.id] = notif
        self._notifications.move_to_end(notif.id)
        while len(self._notifications) > self._max_in_memory:
            self._notifications.popitem(last=False)
        try:
            from app.db.session import get_db_context
            from app.db.models import Notification as DBNotification
            from app.repositories import NotificationRepository
            import json
            with get_db_context() as db:
                db_notif = DBNotification(
                    id=notif.id,
                    user_id=notif.user_id if notif.user_id != "global" else None,
                    category=notif.category.value if hasattr(notif.category, "value") else str(notif.category),
                    severity=notif.severity.value if hasattr(notif.severity, "value") else str(notif.severity),
                    title=notif.title,
                    message=notif.message,
                    source=notif.source,
                    is_read=notif.is_read,
                    language=notif.language or "en",
                    translated_title=notif.translated_title,
                    translated_message=notif.translated_message,
                    action_link=notif.action_link,
                    metadata_json=json.dumps(notif.metadata) if notif.metadata else None,
                    created_at=datetime.now(timezone.utc),
                )
                NotificationRepository.create_notification(db, db_notif)
        except Exception as e:
            logger.debug(f"Notification DB persistence: {e}")
        return notif

    def _has_recent_alert(self, user_id: str, category: NotificationCategory, title: str, window_seconds: int = 600) -> bool:
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
        for existing in reversed(self._notifications.values()):
            if existing.user_id == user_id and existing.category == category and existing.title == title:
                try:
                    ts = datetime.fromisoformat(existing.timestamp.replace("Z", "+00:00"))
                    if ts.tzinfo is None:
                        ts = ts.replace(tzinfo=timezone.utc)
                    if ts >= cutoff:
                        return True
                except ValueError:
                    pass
        return False

    def evaluate_location_alerts(
        self,
        lat: float,
        lon: float,
        previous_lat: Optional[float] = None,
        previous_lon: Optional[float] = None,
        user_id: Optional[str] = None,
        wave_height_m: Optional[float] = None,
        wind_gusts_kmh: Optional[float] = None,
        persist: bool = True,
    ) -> List[SafetyNotification]:
        """
        Dynamically analyzes coordinates and generates safety notifications when conditions warrant.
        """
        generated_alerts: List[SafetyNotification] = []
        now_iso = datetime.now(timezone.utc).isoformat()
        target_uid = user_id or "global"

        def emit(alert: SafetyNotification) -> None:
            if persist:
                if user_id and self._has_recent_alert(user_id, alert.category, alert.title):
                    return
                self.add_notification(alert)
            generated_alerts.append(alert)

        # 1. IMBL India-Pakistan Proximity Check (Sir Creek sector ~23.5N, 68.1E)
        dist_imbl_pak = haversine_distance_km(lat, lon, 23.25, 68.00)
        if dist_imbl_pak < 35.0:  # < ~19 NM
            alert = SafetyNotification(
                id=str(uuid.uuid4()),
                user_id=target_uid,
                title="⚠️ CRITICAL: India-Pakistan IMBL Proximity Warning",
                message=f"Vessel is {dist_imbl_pak:.1f} km from the India-Pakistan International Maritime Boundary Line. Maintain safe heading to avoid border crossing.",
                severity=NotificationSeverity.CRITICAL,
                category=NotificationCategory.GEOFENCE,
                source="ORCA Spatial Geofence Engine",
                timestamp=now_iso,
                is_read=False,
            )
            emit(alert)

        # 2. IMBL India-Sri Lanka Check (Palk Strait ~9.3N, 79.3E)
        dist_imbl_sl = haversine_distance_km(lat, lon, 9.35, 79.25)
        if dist_imbl_sl < 25.0:  # < ~13 NM
            alert = SafetyNotification(
                id=str(uuid.uuid4()),
                user_id=target_uid,
                title="⚠️ WARNING: Palk Strait IMBL Proximity",
                message=f"Vessel is {dist_imbl_sl:.1f} km from Sri Lanka Maritime Border in Palk Strait. Strict naval surveillance active.",
                severity=NotificationSeverity.HIGH,
                category=NotificationCategory.GEOFENCE,
                source="ORCA Spatial Geofence Engine",
                timestamp=now_iso,
                is_read=False,
            )
            emit(alert)

        # 3. Marine Protected Area (Gulf of Mannar ~8.9N, 78.9E)
        dist_mpa = haversine_distance_km(lat, lon, 8.90, 78.90)
        if dist_mpa < 15.0:
            alert = SafetyNotification(
                id=str(uuid.uuid4()),
                user_id=target_uid,
                title="🛑 Marine Protected Area (Gulf of Mannar)",
                message=f"You are {dist_mpa:.1f} km from Gulf of Mannar Marine National Park. Mechanized commercial trawling strictly prohibited by law.",
                severity=NotificationSeverity.HIGH,
                category=NotificationCategory.GEOFENCE,
                source="Ministry of Environment & Forests",
                timestamp=now_iso,
                is_read=False,
            )
            emit(alert)

        # 4. Severe Wave & Gust Telemetry Alerts
        if (wave_height_m is not None and wave_height_m >= 2.5) or (wind_gusts_kmh is not None and wind_gusts_kmh >= 50.0):
            alert = SafetyNotification(
                id=str(uuid.uuid4()),
                user_id=target_uid,
                title="⚠️ Severe Sea Condition Alert",
                message=f"ORCA threshold alert. Wave height (m): {wave_height_m if wave_height_m is not None else 'unavailable'}; wind gusts (km/h): {wind_gusts_kmh if wind_gusts_kmh is not None else 'unavailable'}. Consult official advisories.",
                severity=NotificationSeverity.CRITICAL,
                category=NotificationCategory.WEATHER,
                source="ORCA heuristic from supplied measurements",
                timestamp=now_iso,
                is_read=False,
            )
            emit(alert)

        # 5. Anomaly Detection (Vessel heading rapidly towards restricted zone)
        if previous_lat is not None and previous_lon is not None:
            prev_dist = haversine_distance_km(previous_lat, previous_lon, 23.25, 68.00)
            curr_dist = dist_imbl_pak
            # If moved closer by > 5km towards IMBL
            if prev_dist - curr_dist > 5.0 and curr_dist < 45.0:
                alert = SafetyNotification(
                    id=str(uuid.uuid4()),
                    user_id=target_uid,
                    title="⚠️ ORCA Trajectory Anomaly Warning",
                    message=f"Vessel course vector is closing distance toward restricted boundary ({curr_dist:.1f} km remaining). Please verify navigation plan.",
                    severity=NotificationSeverity.HIGH,
                    category=NotificationCategory.ANOMALY,
                    source="ORCA Anomaly Engine",
                    timestamp=now_iso,
                    is_read=False,
                )
                emit(alert)

        return generated_alerts


notification_service = NotificationService()
