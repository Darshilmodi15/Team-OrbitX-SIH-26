"""
Data Repositories for ORCA Marine AI PostgreSQL/SQLite persistence.
"""
from datetime import datetime, timezone, timedelta
import json
import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.db.models import (
    AuditLog,
    ChatHistory,
    EmergencyContact,
    Geofence,
    GovernmentAlert,
    GovernmentDocument,
    GovernmentUser,
    MarineObservation,
    Notification,
    NotificationPreference,
    PFZZone,
    SOSRequest,
    SystemSetting,
    User,
    UserLocation,
    UserPreference,
)

logger = logging.getLogger(__name__)


# =========================================================================
# 1. User & Identity Repository
# =========================================================================

class UserRepository:
    @staticmethod
    def get_by_id(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        if not email:
            return None
        return db.query(User).filter(func.lower(User.email) == email.lower().strip()).first()

    @staticmethod
    def get_by_phone(db: Session, phone: str) -> Optional[User]:
        if not phone:
            return None
        return db.query(User).filter(User.mobile_number == phone.strip()).first()

    @staticmethod
    def get_by_identifier(db: Session, identifier: str) -> Optional[User]:
        """Looks up user by email, mobile number, or UUID."""
        ident = identifier.strip()
        user = db.query(User).filter(
            or_(
                func.lower(User.email) == ident.lower(),
                User.mobile_number == ident,
                User.id == ident,
            )
        ).first()
        return user

    @staticmethod
    def create_user(
        db: Session,
        name: str,
        password_hash: str,
        password_salt: str,
        email: Optional[str] = None,
        mobile_number: Optional[str] = None,
        preferred_language: str = "en",
        role: str = "USER",
        location_permission_status: str = "prompt",
        location_sharing_enabled: bool = True,
    ) -> User:
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        user = User(
            id=user_id,
            name=name,
            email=email.lower().strip() if email else None,
            mobile_number=mobile_number.strip() if mobile_number else None,
            password_hash=password_hash,
            password_salt=password_salt,
            preferred_language=preferred_language,
            role=role,
            location_permission_status=location_permission_status,
            location_sharing_enabled=location_sharing_enabled,
            created_at=now,
            updated_at=now,
            last_login=now,
        )
        db.add(user)

        # Create default preference
        pref = UserPreference(
            id=str(uuid.uuid4()),
            user_id=user_id,
            preferred_language=preferred_language,
            voice_enabled=True,
            notifications_enabled=True,
            location_tracking_enabled=True,
            created_at=now,
            updated_at=now,
        )
        db.add(pref)

        # Create default notification preference
        notif_pref = NotificationPreference(
            id=str(uuid.uuid4()),
            user_id=user_id,
            sms_enabled=True,
            push_enabled=True,
            whatsapp_enabled=False,
            alert_level_threshold="MODERATE",
            created_at=now,
            updated_at=now,
        )
        db.add(notif_pref)

        db.flush()
        return user

    @staticmethod
    def list_all(db: Session, limit: int = 100) -> List[User]:
        return db.query(User).order_by(desc(User.created_at)).limit(limit).all()

    @staticmethod
    def record_location(
        db: Session,
        latitude: float,
        longitude: float,
        user_id: Optional[str] = None,
        accuracy_m: Optional[float] = None,
        coastal_distance_km: Optional[float] = None,
        is_coastal: bool = True,
        coastal_region: Optional[str] = None,
        location_source: str = "GPS",
    ) -> UserLocation:
        loc = UserLocation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            latitude=latitude,
            longitude=longitude,
            accuracy_m=accuracy_m,
            coastal_distance_km=coastal_distance_km,
            is_coastal=is_coastal,
            coastal_region=coastal_region,
            location_source=location_source,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(loc)
        db.flush()
        return loc


# =========================================================================
# 2. Government Alerts & Documents Repository
# =========================================================================

class GovernmentAlertRepository:
    @staticmethod
    def list_alerts(
        db: Session,
        state: Optional[str] = None,
        category: Optional[str] = None,
        urgent_only: bool = False,
        active_only: bool = True,
    ) -> List[GovernmentAlert]:
        query = db.query(GovernmentAlert)
        if active_only:
            query = query.filter(GovernmentAlert.is_active.is_(True))
        if urgent_only:
            query = query.filter(GovernmentAlert.is_urgent.is_(True))
        if category:
            query = query.filter(GovernmentAlert.category.ilike(f"%{category}%"))
        if state and state.lower() != "national":
            query = query.filter(
                or_(
                    GovernmentAlert.state_or_national.ilike("National"),
                    GovernmentAlert.state_or_national.ilike(f"%{state}%"),
                )
            )
        return query.order_by(desc(GovernmentAlert.is_urgent), desc(GovernmentAlert.publish_date)).all()

    @staticmethod
    def get_by_id(db: Session, alert_id: str) -> Optional[GovernmentAlert]:
        return db.query(GovernmentAlert).filter(GovernmentAlert.id == alert_id).first()

    @staticmethod
    def create_alert(db: Session, alert: GovernmentAlert) -> GovernmentAlert:
        db.add(alert)
        db.flush()
        return alert


class GovernmentDocumentRepository:
    @staticmethod
    def list_documents(db: Session) -> List[GovernmentDocument]:
        return db.query(GovernmentDocument).filter(GovernmentDocument.is_active.is_(True)).order_by(desc(GovernmentDocument.created_at)).all()

    @staticmethod
    def create_document(db: Session, doc: GovernmentDocument) -> GovernmentDocument:
        db.add(doc)
        db.flush()
        return doc


# =========================================================================
# 3. Emergency & SAR Repository
# =========================================================================

class EmergencyRepository:
    @staticmethod
    def list_contacts(db: Session, region: Optional[str] = None) -> List[EmergencyContact]:
        query = db.query(EmergencyContact).filter(EmergencyContact.is_active.is_(True))
        if region:
            reg_clean = region.strip()
            query = query.filter(
                or_(
                    EmergencyContact.region.ilike("All Indian Coastal%"),
                    EmergencyContact.region.ilike("National%"),
                    EmergencyContact.region.ilike(f"%{reg_clean}%"),
                    EmergencyContact.state.ilike(f"%{reg_clean}%"),
                )
            )
        return query.order_by(EmergencyContact.agency_name).all()

    @staticmethod
    def create_contact(db: Session, contact: EmergencyContact) -> EmergencyContact:
        db.add(contact)
        db.flush()
        return contact

    @staticmethod
    def create_sos(db: Session, sos: SOSRequest) -> SOSRequest:
        db.add(sos)
        db.flush()
        return sos

    @staticmethod
    def list_active_sos(db: Session) -> List[SOSRequest]:
        return db.query(SOSRequest).filter(SOSRequest.status != "RESOLVED").order_by(desc(SOSRequest.created_at)).all()


# =========================================================================
# 4. Marine Telemetry & Observations Repository
# =========================================================================

class MarineObservationRepository:
    @staticmethod
    def record_observation(
        db: Session,
        latitude: float,
        longitude: float,
        region_cell: str,
        wave_height_m: float,
        wind_speed_kmh: float,
        timestamp: Optional[datetime] = None,
        wave_period_s: Optional[float] = None,
        wave_direction_deg: Optional[float] = None,
        wind_direction_deg: Optional[float] = None,
        wind_gust_kmh: Optional[float] = None,
        cloud_cover_percent: Optional[float] = None,
        visibility_km: Optional[float] = None,
        precipitation_mm: Optional[float] = None,
        sst_c: Optional[float] = None,
        risk_level: str = "SAFE",
        source: str = "INCOIS_OSF_WW3",
        resolution_method: str = "exact",
        deduplicate_window_sec: int = 600,
    ) -> MarineObservation:
        obs_time = timestamp or datetime.now(timezone.utc)
        if deduplicate_window_sec > 0:
            window = timedelta(seconds=deduplicate_window_sec)
            recent = db.query(MarineObservation).filter(
                MarineObservation.region_cell == region_cell,
                MarineObservation.timestamp.between(obs_time - window, obs_time + window)
            ).first()
            if recent:
                recent.wave_height_m = wave_height_m
                recent.wind_speed_kmh = wind_speed_kmh
                if wave_period_s is not None:
                    recent.wave_period_s = wave_period_s
                if wave_direction_deg is not None:
                    recent.wave_direction_deg = wave_direction_deg
                if wind_direction_deg is not None:
                    recent.wind_direction_deg = wind_direction_deg
                if wind_gust_kmh is not None:
                    recent.wind_gust_kmh = wind_gust_kmh
                if cloud_cover_percent is not None:
                    recent.cloud_cover_percent = cloud_cover_percent
                if visibility_km is not None:
                    recent.visibility_km = visibility_km
                if precipitation_mm is not None:
                    recent.precipitation_mm = precipitation_mm
                if sst_c is not None:
                    recent.sst_c = sst_c
                recent.risk_level = risk_level
                recent.source = source
                recent.resolution_method = resolution_method
                db.flush()
                return recent

        obs = MarineObservation(
            id=str(uuid.uuid4()),
            latitude=latitude,
            longitude=longitude,
            region_cell=region_cell,
            timestamp=obs_time,
            wave_height_m=wave_height_m,
            wave_period_s=wave_period_s,
            wave_direction_deg=wave_direction_deg,
            wind_speed_kmh=wind_speed_kmh,
            wind_direction_deg=wind_direction_deg,
            wind_gust_kmh=wind_gust_kmh,
            cloud_cover_percent=cloud_cover_percent,
            visibility_km=visibility_km,
            precipitation_mm=precipitation_mm,
            sst_c=sst_c,
            risk_level=risk_level,
            source=source,
            resolution_method=resolution_method,
            created_at=datetime.now(timezone.utc),
        )
        db.add(obs)
        db.flush()
        return obs

    @staticmethod
    def get_latest_observation(
        db: Session,
        lat: float,
        lon: float,
        max_dist_deg: float = 0.1,
    ) -> Optional[MarineObservation]:
        return db.query(MarineObservation).filter(
            MarineObservation.latitude.between(lat - max_dist_deg, lat + max_dist_deg),
            MarineObservation.longitude.between(lon - max_dist_deg, lon + max_dist_deg),
        ).order_by(desc(MarineObservation.timestamp)).first()

    @staticmethod
    def get_historical_window(
        db: Session,
        lat: float,
        lon: float,
        hours_ago: int = 24,
        tolerance_hours: int = 6,
        max_dist_deg: float = 0.15,
    ) -> Optional[MarineObservation]:
        """Finds closest observation around (now - hours_ago)."""
        target_time = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
        min_time = target_time - timedelta(hours=tolerance_hours)
        max_time = target_time + timedelta(hours=tolerance_hours)

        return db.query(MarineObservation).filter(
            MarineObservation.latitude.between(lat - max_dist_deg, lat + max_dist_deg),
            MarineObservation.longitude.between(lon - max_dist_deg, lon + max_dist_deg),
            MarineObservation.timestamp.between(min_time, max_time),
        ).order_by(func.abs(func.julianday(MarineObservation.timestamp) - func.julianday(target_time)) if db.bind.dialect.name == "sqlite" else func.abs(func.extract('epoch', MarineObservation.timestamp) - target_time.timestamp())).first()


# =========================================================================
# 5. Notifications Repository
# =========================================================================

class NotificationRepository:
    @staticmethod
    def list_for_user(db: Session, user_id: Optional[str] = None, limit: int = 50) -> List[Notification]:
        query = db.query(Notification)
        if user_id:
            query = query.filter(
                or_(
                    Notification.user_id == user_id,
                    Notification.user_id.is_(None),
                    Notification.user_id == "global",
                )
            )
        return query.order_by(desc(Notification.created_at)).limit(limit).all()

    @staticmethod
    def create_notification(db: Session, notif: Notification) -> Notification:
        db.add(notif)
        db.flush()
        return notif

    @staticmethod
    def mark_read(db: Session, notif_id: str) -> Optional[Notification]:
        notif = db.query(Notification).filter(Notification.id == notif_id).first()
        if notif:
            notif.is_read = True
            db.flush()
        return notif

    @staticmethod
    def mark_all_read(db: Session, user_id: Optional[str] = None) -> int:
        query = db.query(Notification).filter(Notification.is_read.is_(False))
        if user_id:
            query = query.filter(
                or_(
                    Notification.user_id == user_id,
                    Notification.user_id.is_(None),
                    Notification.user_id == "global",
                )
            )
        count = query.update({Notification.is_read: True}, synchronize_session=False)
        db.flush()
        return count


# =========================================================================
# 6. Audit Logs, Geofences, PFZ, System Settings Repositories
# =========================================================================

class AuditLogRepository:
    @staticmethod
    def log(
        db: Session,
        action: str,
        resource_type: str,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        entry = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details_json=json.dumps(details) if details else None,
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        db.flush()
        return entry


class GeofenceRepository:
    @staticmethod
    def list_all(db: Session) -> List[Geofence]:
        return db.query(Geofence).filter(Geofence.is_active.is_(True)).all()

    @staticmethod
    def create_geofence(db: Session, geofence: Geofence) -> Geofence:
        db.add(geofence)
        db.flush()
        return geofence


class PFZRepository:
    @staticmethod
    def list_active(db: Session, date_str: Optional[str] = None) -> List[PFZZone]:
        query = db.query(PFZZone).filter(PFZZone.is_active.is_(True))
        if date_str:
            query = query.filter(PFZZone.valid_date == date_str)
        return query.all()

    @staticmethod
    def create_pfz(db: Session, pfz: PFZZone) -> PFZZone:
        db.add(pfz)
        db.flush()
        return pfz


class SystemSettingsRepository:
    @staticmethod
    def get_setting(db: Session, key: str, default: Optional[str] = None) -> Optional[str]:
        s = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        return s.value if s else default

    @staticmethod
    def set_setting(db: Session, key: str, value: str, description: Optional[str] = None) -> SystemSetting:
        s = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if s:
            s.value = value
            s.updated_at = datetime.now(timezone.utc)
        else:
            s = SystemSetting(
                id=str(uuid.uuid4()),
                key=key,
                value=value,
                description=description,
                updated_at=datetime.now(timezone.utc),
            )
            db.add(s)
        db.flush()
        return s
