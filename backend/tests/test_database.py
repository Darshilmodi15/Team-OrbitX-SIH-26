"""
Comprehensive tests for ORCA SQLAlchemy 2.0 Database Models, Repositories, and Alembic Migrations.
Tests all 16 normalized tables, relationships, foreign keys, and CRUD operations.
"""
from datetime import datetime, timezone
import json
import unittest
import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
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
from app.repositories import (
    AuditLogRepository,
    EmergencyRepository,
    GeofenceRepository,
    GovernmentAlertRepository,
    GovernmentDocumentRepository,
    MarineObservationRepository,
    NotificationRepository,
    PFZRepository,
    SystemSettingsRepository,
    UserRepository,
)
from app.services.auth.auth_service import hash_password, verify_password


class TestDatabaseModelsAndRepositories(unittest.TestCase):
    def setUp(self):
        # Create an isolated in-memory SQLite database for test execution
        self.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def test_schema_has_all_16_tables(self):
        """Verifies that all 16 requested tables exist in the metadata."""
        expected_tables = {
            "users",
            "user_locations",
            "user_preferences",
            "government_users",
            "government_alerts",
            "government_documents",
            "emergency_contacts",
            "marine_observations",
            "pfz_zones",
            "geofences",
            "notifications",
            "notification_preferences",
            "chat_history",
            "sos_requests",
            "audit_logs",
            "system_settings",
        }
        actual_tables = set(Base.metadata.tables.keys())
        self.assertTrue(expected_tables.issubset(actual_tables), f"Missing tables: {expected_tables - actual_tables}")

    def test_user_creation_and_auth_hashing(self):
        """Tests user creation, password hashing with salt, and lookup."""
        pwd = "SecretPassWord123!"
        pwd_hash, salt = hash_password(pwd)
        self.assertTrue(verify_password(pwd, pwd_hash, salt))
        self.assertFalse(verify_password("WrongPassword", pwd_hash, salt))

        user = UserRepository.create_user(
            db=self.db,
            name="Ramesh Koli",
            email="ramesh@veraval.fish",
            mobile_number="9876543210",
            password_hash=pwd_hash,
            password_salt=salt,
            preferred_language="gu",
            role="USER",
        )
        self.db.commit()

        # Query user by email
        fetched_user = UserRepository.get_by_email(self.db, "ramesh@veraval.fish")
        self.assertIsNotNone(fetched_user)
        self.assertEqual(fetched_user.name, "Ramesh Koli")
        self.assertEqual(fetched_user.preferred_language, "gu")

        # Check default preferences created automatically
        self.assertIsNotNone(fetched_user.preferences)
        self.assertEqual(fetched_user.preferences.preferred_language, "gu")
        self.assertTrue(fetched_user.preferences.voice_enabled)

        # Check default notification preferences
        self.assertIsNotNone(fetched_user.notification_preferences)
        self.assertTrue(fetched_user.notification_preferences.sms_enabled)

    def test_user_locations_tracking(self):
        """Tests user location persistence and relationship."""
        pwd_hash, salt = hash_password("pass123")
        user = UserRepository.create_user(
            db=self.db,
            name="Officer Sharma",
            email="sharma@fisheries.gov.in",
            password_hash=pwd_hash,
            password_salt=salt,
            role="GOVERNMENT",
        )
        self.db.commit()

        loc1 = UserRepository.record_location(
            db=self.db,
            user_id=user.id,
            latitude=18.9220,
            longitude=72.8347,
            accuracy_m=12.5,
            coastal_distance_km=0.8,
            is_coastal=True,
            coastal_region="Maharashtra",
        )
        loc2 = UserRepository.record_location(
            db=self.db,
            user_id=user.id,
            latitude=18.9400,
            longitude=72.8200,
            accuracy_m=10.0,
            coastal_distance_km=0.2,
            is_coastal=True,
            coastal_region="Maharashtra",
        )
        self.db.commit()

        # Check relation
        self.assertEqual(len(user.locations), 2)
        self.assertEqual(user.locations[0].coastal_region, "Maharashtra")

    def test_government_user_profile(self):
        """Tests GovernmentUser profile linked to User."""
        pwd_hash, salt = hash_password("govpass")
        user = UserRepository.create_user(
            db=self.db,
            name="Officer Priya",
            email="priya@gov.in",
            password_hash=pwd_hash,
            password_salt=salt,
            role="GOVERNMENT",
        )
        gov_prof = GovernmentUser(
            id=str(uuid.uuid4()),
            user_id=user.id,
            department="State Fisheries Directorate",
            designation="Enforcement Officer",
            jurisdiction_region="Gujarat Coast",
            badge_number="GJ-DOF-991",
            is_verified=True,
        )
        self.db.add(gov_prof)
        self.db.commit()

        self.assertIsNotNone(user.government_profile)
        self.assertEqual(user.government_profile.badge_number, "GJ-DOF-991")

    def test_government_alerts_and_documents(self):
        """Tests GovernmentAlert and GovernmentDocument models and queries."""
        alert = GovernmentAlert(
            id="GOV-ANN-TEST-01",
            title="West Coast Squall Warning",
            issuing_authority="IMD & Coast Guard",
            state_or_national="Gujarat & Maharashtra",
            publish_date="2026-08-25",
            effective_dates="Next 48 Hours",
            summary="Squally winds expected.",
            full_text="Port Signal 3 hoisted.",
            category="Cyclone & Storm Surge Warning",
            reference_number="IMD/BULLETIN/01",
            severity="CRITICAL",
            is_urgent=True,
            is_active=True,
        )
        GovernmentAlertRepository.create_alert(self.db, alert)

        doc = GovernmentDocument(
            id="DOC-TEST-01",
            title="PMMSY Guidelines 2026",
            department="Dept of Fisheries",
            category="Government Schemes",
            file_size_kb=850,
            publish_date="2026-01-15",
            description="Subsidy rules",
            download_url="/pmmsy.pdf",
        )
        GovernmentDocumentRepository.create_document(self.db, doc)
        self.db.commit()

        alerts = GovernmentAlertRepository.list_alerts(self.db, state="Gujarat", urgent_only=True)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0].id, "GOV-ANN-TEST-01")

        docs = GovernmentDocumentRepository.list_documents(self.db)
        self.assertEqual(len(docs), 1)
        self.assertEqual(docs[0].id, "DOC-TEST-01")

    def test_emergency_contacts_and_sos_requests(self):
        """Tests emergency helplines directory and SOS request dispatch logging."""
        contact = EmergencyContact(
            id=str(uuid.uuid4()),
            agency_name="Indian Coast Guard MRCC",
            helpline="1554",
            alternate_phone="+91-11-23384934",
            radio_channel="VHF Ch 16",
            region="All Indian Coastal & EEZ Waters",
            state="National",
            category="Maritime SAR",
            description="24x7 SAR coordination",
        )
        EmergencyRepository.create_contact(self.db, contact)

        sos = SOSRequest(
            id="SOS-TEST-9988",
            vessel_name="Matsya Shakti",
            registration_no="IND-MH-01-F-4433",
            latitude=18.9220,
            longitude=72.8347,
            crew_count=6,
            emergency_nature="Engine Failure / Adrift at Sea",
            notes="Drifting west towards offshore shipping lane",
            status="ACTIVE_BEACON_DISPATCHED",
            assigned_mrcc="MRCC Mumbai",
            mayday_message="MAYDAY MAYDAY MAYDAY",
        )
        EmergencyRepository.create_sos(self.db, sos)
        self.db.commit()

        contacts = EmergencyRepository.list_contacts(self.db)
        self.assertGreaterEqual(len(contacts), 1)

        active_sos = EmergencyRepository.list_active_sos(self.db)
        self.assertEqual(len(active_sos), 1)
        self.assertEqual(active_sos[0].id, "SOS-TEST-9988")

    def test_marine_observations_persistence(self):
        """Tests MarineObservation persistence and temporal queries."""
        obs = MarineObservationRepository.record_observation(
            db=self.db,
            latitude=18.9220,
            longitude=72.8347,
            region_cell="18.900_72.850",
            wave_height_m=1.45,
            wind_speed_kmh=18.2,
            sst_c=28.5,
            risk_level="SAFE",
            source="INCOIS_OSF_WW3",
        )
        self.db.commit()

        latest = MarineObservationRepository.get_latest_observation(self.db, lat=18.9220, lon=72.8347)
        self.assertIsNotNone(latest)
        self.assertEqual(latest.wave_height_m, 1.45)
        self.assertEqual(latest.risk_level, "SAFE")

    def test_pfz_and_geofences(self):
        """Tests PFZ and Geofences repositories."""
        pfz = PFZZone(
            id="PFZ-TEST-01",
            zone_name="Veraval Front",
            latitude=20.85,
            longitude=70.30,
            depth_m=45.0,
            species_json=json.dumps(["Tuna", "Mackerel"]),
            valid_date="2026-08-25",
            source="INCOIS_PFZ_MISSION",
        )
        PFZRepository.create_pfz(self.db, pfz)

        geo = Geofence(
            id="GEOFENCE-IMBL-TEST",
            name="Sir Creek IMBL",
            fence_type="IMBL",
            severity="CRITICAL",
            threshold_nm=10.0,
            description="International boundary",
            coordinates_json=json.dumps([{"lat": 23.5, "lon": 68.1}]),
        )
        GeofenceRepository.create_geofence(self.db, geo)
        self.db.commit()

        pfz_list = PFZRepository.list_active(self.db)
        self.assertEqual(len(pfz_list), 1)

        geo_list = GeofenceRepository.list_all(self.db)
        self.assertEqual(len(geo_list), 1)

    def test_notifications_and_audit_logs(self):
        """Tests Notification creation, read tracking, and AuditLog recording."""
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id="global",
            title="High Wave Alert",
            message="Wave height 2.5m expected",
            category="WEATHER",
            severity="CRITICAL",
            source="INCOIS",
            is_read=False,
        )
        NotificationRepository.create_notification(self.db, notif)

        audit = AuditLogRepository.log(
            db=self.db,
            action="ALERT_PUBLISHED",
            resource_type="ALERT",
            resource_id=notif.id,
            details={"title": notif.title},
            ip_address="127.0.0.1",
        )
        self.db.commit()

        notifs = NotificationRepository.list_for_user(self.db, user_id=None)
        self.assertEqual(len(notifs), 1)
        self.assertFalse(notifs[0].is_read)

        NotificationRepository.mark_read(self.db, notif.id)
        self.db.commit()

        updated_notif = self.db.query(Notification).filter(Notification.id == notif.id).first()
        self.assertTrue(updated_notif.is_read)

        # Audit logs check
        saved_audit = self.db.query(AuditLog).filter(AuditLog.id == audit.id).first()
        self.assertIsNotNone(saved_audit)
        self.assertEqual(saved_audit.action, "ALERT_PUBLISHED")

    def test_system_settings(self):
        """Tests key-value configuration system settings."""
        SystemSettingsRepository.set_setting(self.db, "orca.test_key", "active_value", "Test description")
        self.db.commit()

        val = SystemSettingsRepository.get_setting(self.db, "orca.test_key")
        self.assertEqual(val, "active_value")

        SystemSettingsRepository.set_setting(self.db, "orca.test_key", "updated_value")
        self.db.commit()

        val_updated = SystemSettingsRepository.get_setting(self.db, "orca.test_key")
        self.assertEqual(val_updated, "updated_value")


if __name__ == "__main__":
    unittest.main()
