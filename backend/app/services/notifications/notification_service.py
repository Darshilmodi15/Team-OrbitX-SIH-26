"""
Coastal Safety Notification and Anomaly Monitoring Service for ORCA.

Monitors live marine telemetry, international maritime boundary (IMBL) proximity,
marine protected area (MPA) reserves, and trajectory anomalies.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

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

    def __init__(self):
        self._notifications: Dict[str, SafetyNotification] = {}
        self._seed_default_notifications()

    def _seed_default_notifications(self):
        """Seeds realistic advisory and government notifications."""
        now_iso = datetime.now(timezone.utc).isoformat()

        seed_items = [
            SafetyNotification(
                id=str(uuid.uuid4()),
                user_id="global",
                title="🌊 INCOIS High Wave & Swell Advisory",
                message="Indian Ocean State Forecast model active: Wave heights in coastal Maharashtra and Gujarat expected between 1.2m and 1.8m today.",
                severity=NotificationSeverity.INFO,
                category=NotificationCategory.WEATHER,
                source="INCOIS Ocean State Forecast",
                timestamp=now_iso,
                is_read=False,
            ),
            SafetyNotification(
                id=str(uuid.uuid4()),
                user_id="global",
                title="🛑 Maritime Boundary Notice (IMBL)",
                message="Vessels operating near Kutch / Sir Creek and Palk Strait are reminded to maintain at least 10 NM safe distance from the International Maritime Boundary Line.",
                severity=NotificationSeverity.MODERATE,
                category=NotificationCategory.GEOFENCE,
                source="Indian Coast Guard & Directorate of Fisheries",
                timestamp=now_iso,
                is_read=False,
            ),
            SafetyNotification(
                id=str(uuid.uuid4()),
                user_id="global",
                title="🐟 New Potential Fishing Zones (PFZ) Released",
                message="High-probability pelagic chlorophyll fronts mapped off Ratnagiri, Veraval, and Kochi coastlines. Check GIS layer on the tactical map.",
                severity=NotificationSeverity.LOW,
                category=NotificationCategory.WEATHER,
                source="INCOIS PFZ Mission",
                timestamp=now_iso,
                is_read=True,
            ),
        ]

        for item in seed_items:
            self._notifications[item.id] = item

    def get_notifications_for_user(self, user_id: Optional[str] = None) -> NotificationsResponse:
        """Retrieves all notifications for user or global broadcast."""
        items = list(self._notifications.values())
        # Filter for user or global
        if user_id:
            items = [n for n in items if n.user_id in (user_id, "global", None)]

        # Sort newest first
        items.sort(key=lambda x: x.timestamp, reverse=True)
        unread = sum(1 for n in items if not n.is_read)

        return NotificationsResponse(
            unread_count=unread,
            notifications=items,
        )

    def mark_as_read(self, notification_id: str) -> Optional[SafetyNotification]:
        """Marks a notification as read."""
        if notification_id in self._notifications:
            self._notifications[notification_id].is_read = True
            return self._notifications[notification_id]
        return None

    def mark_all_as_read(self, user_id: Optional[str] = None) -> int:
        """Marks all notifications as read."""
        count = 0
        for n in self._notifications.values():
            if not user_id or n.user_id in (user_id, "global", None):
                if not n.is_read:
                    n.is_read = True
                    count += 1
        return count

    def add_notification(self, notif: SafetyNotification) -> SafetyNotification:
        self._notifications[notif.id] = notif
        return notif

    def evaluate_location_alerts(
        self,
        lat: float,
        lon: float,
        previous_lat: Optional[float] = None,
        previous_lon: Optional[float] = None,
        user_id: Optional[str] = None,
        wave_height_m: float = 1.2,
        wind_gusts_kmh: float = 25.0,
    ) -> List[SafetyNotification]:
        """
        Dynamically analyzes coordinates and generates safety notifications when conditions warrant.
        """
        generated_alerts: List[SafetyNotification] = []
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. IMBL India-Pakistan Proximity Check (Sir Creek sector ~23.5N, 68.1E)
        dist_imbl_pak = haversine_distance_km(lat, lon, 23.25, 68.00)
        if dist_imbl_pak < 35.0:  # < ~19 NM
            alert = SafetyNotification(
                id=str(uuid.uuid4()),
                user_id=user_id or "global",
                title="⚠️ CRITICAL: India-Pakistan IMBL Proximity Warning",
                message=f"Vessel is {dist_imbl_pak:.1f} km from the India-Pakistan International Maritime Boundary Line. Maintain safe heading to avoid border crossing.",
                severity=NotificationSeverity.CRITICAL,
                category=NotificationCategory.GEOFENCE,
                source="ORCA Spatial Geofence Engine",
                timestamp=now_iso,
                is_read=False,
            )
            self.add_notification(alert)
            generated_alerts.append(alert)

        # 2. IMBL India-Sri Lanka Check (Palk Strait ~9.3N, 79.3E)
        dist_imbl_sl = haversine_distance_km(lat, lon, 9.35, 79.25)
        if dist_imbl_sl < 25.0:  # < ~13 NM
            alert = SafetyNotification(
                id=str(uuid.uuid4()),
                user_id=user_id or "global",
                title="⚠️ WARNING: Palk Strait IMBL Proximity",
                message=f"Vessel is {dist_imbl_sl:.1f} km from Sri Lanka Maritime Border in Palk Strait. Strict naval surveillance active.",
                severity=NotificationSeverity.HIGH,
                category=NotificationCategory.GEOFENCE,
                source="ORCA Spatial Geofence Engine",
                timestamp=now_iso,
                is_read=False,
            )
            self.add_notification(alert)
            generated_alerts.append(alert)

        # 3. Marine Protected Area (Gulf of Mannar ~8.9N, 78.9E)
        dist_mpa = haversine_distance_km(lat, lon, 8.90, 78.90)
        if dist_mpa < 15.0:
            alert = SafetyNotification(
                id=str(uuid.uuid4()),
                user_id=user_id or "global",
                title="🛑 Marine Protected Area (Gulf of Mannar)",
                message=f"You are {dist_mpa:.1f} km from Gulf of Mannar Marine National Park. Mechanized commercial trawling strictly prohibited by law.",
                severity=NotificationSeverity.HIGH,
                category=NotificationCategory.GEOFENCE,
                source="Ministry of Environment & Forests",
                timestamp=now_iso,
                is_read=False,
            )
            self.add_notification(alert)
            generated_alerts.append(alert)

        # 4. Severe Wave & Gust Telemetry Alerts
        if wave_height_m >= 2.5 or wind_gusts_kmh >= 50.0:
            alert = SafetyNotification(
                id=str(uuid.uuid4()),
                user_id=user_id or "global",
                title="⚠️ Severe Sea Condition Alert",
                message=f"Dangerous sea conditions detected: Wave height {wave_height_m:.1f}m with wind gusts {wind_gusts_kmh:.0f} km/h. Small craft return to harbor immediately.",
                severity=NotificationSeverity.CRITICAL,
                category=NotificationCategory.WEATHER,
                source="INCOIS OSF Telemetry",
                timestamp=now_iso,
                is_read=False,
            )
            self.add_notification(alert)
            generated_alerts.append(alert)

        # 5. Anomaly Detection (Vessel heading rapidly towards restricted zone)
        if previous_lat is not None and previous_lon is not None:
            prev_dist = haversine_distance_km(previous_lat, previous_lon, 23.25, 68.00)
            curr_dist = dist_imbl_pak
            # If moved closer by > 5km towards IMBL
            if prev_dist - curr_dist > 5.0 and curr_dist < 45.0:
                alert = SafetyNotification(
                    id=str(uuid.uuid4()),
                    user_id=user_id or "global",
                    title="⚠️ ORCA Trajectory Anomaly Warning",
                    message=f"Vessel course vector is closing distance toward restricted boundary ({curr_dist:.1f} km remaining). Please verify navigation plan.",
                    severity=NotificationSeverity.HIGH,
                    category=NotificationCategory.ANOMALY,
                    source="ORCA Anomaly Engine",
                    timestamp=now_iso,
                    is_read=False,
                )
                self.add_notification(alert)
                generated_alerts.append(alert)

        return generated_alerts


notification_service = NotificationService()
