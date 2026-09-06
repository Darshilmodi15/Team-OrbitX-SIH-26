"""
Database Seed Script for ORCA Marine AI.
Populates standard initial datasets:
- Supported languages & system settings
- National and state-by-state maritime emergency helplines & MRCC directories
- Official government circulars, gazettes, and policy documents
- Authoritative marine geofences (IMBL India-Pak Sir Creek, IMBL India-Sri Lanka Palk Strait, MPAs)
- Potential Fishing Zones (PFZ) oceanographic fronts
- Initial demo users (Fisherman, Government Official, Super Admin)
"""
from datetime import datetime, timezone
import json
import logging
import os
import sys
import uuid

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.base import Base
from app.db.session import engine, get_db_context, init_db
from app.db.models import (
    EmergencyContact,
    Geofence,
    GovernmentAlert,
    GovernmentDocument,
    GovernmentUser,
    MarineObservation,
    Notification,
    NotificationPreference,
    PFZZone,
    SystemSetting,
    User,
    UserPreference,
)
from app.services.auth.auth_service import hash_password

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("orca_seed")


def seed_database():
    """Executes database schema creation and data seeding."""
    logger.info("Ensuring database tables exist...")
    init_db()

    with get_db_context() as db:
        # -------------------------------------------------------------
        # 1. System Settings
        # -------------------------------------------------------------
        logger.info("Seeding system settings...")
        settings = [
            ("orca.version", "1.4.0", "Current production backend release version"),
            ("cache.ttl_seconds", "10800", "Fresh cache TTL in seconds (3 hours)"),
            ("cache.max_stale_seconds", "86400", "Maximum stale data retention (24 hours)"),
            ("geofence.imbl_alert_threshold_nm", "10.0", "Alert threshold distance for International Maritime Boundary Lines"),
            ("geofence.mpa_alert_threshold_nm", "5.0", "Alert threshold distance for Marine Protected Areas"),
            ("sarvam.default_language", "hi", "Default fallback Indian language"),
            ("weather.primary_source", "INCOIS_OSF_WW3", "Authoritative primary marine model"),
            ("weather.fallback_source", "Open-Meteo", "Secondary meteorological fallback model"),
        ]
        for key, val, desc in settings:
            existing = db.query(SystemSetting).filter(SystemSetting.key == key).first()
            if not existing:
                db.add(SystemSetting(
                    id=str(uuid.uuid4()),
                    key=key,
                    value=val,
                    description=desc,
                    updated_at=datetime.now(timezone.utc),
                ))

        # -------------------------------------------------------------
        # 2. Demo User Accounts
        # -------------------------------------------------------------
        app_env = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT", "development")).lower()
        logger.info("Seeding demo user accounts for %s environment...", app_env)
        demo_accounts = [
            {
                "id": "USR-DEMO-01",
                "name": "Captain Ramesh Koli",
                "email": "fisherman@orca.marine",
                "phone": "9876543210",
                "password": "password123",
                "role": "USER",
                "preferred_language": "gu",
            },
            {
                "id": "USR-DEMO-02",
                "name": "Officer Priya Sharma",
                "email": "officer@fisheries.gov.in",
                "phone": "9123456780",
                "password": "govpassword123",
                "role": "GOVERNMENT",
                "preferred_language": "hi",
                "dept": "Directorate of Fisheries, Ministry of Fisheries",
                "designation": "Assistant Director (Marine Enforcement)",
                "region": "Gujarat & Maharashtra",
            },
            {
                "id": "USR-DEMO-03",
                "name": "Super Admin OrbitX",
                "email": "admin@orca.marine",
                "phone": "9999999999",
                "password": "adminpassword123",
                "role": "SUPER_ADMIN",
                "preferred_language": "en",
            },
        ]
        if app_env in {"production", "prod"}:
            demo_accounts = []
            logger.info("Skipped predictable demo database accounts in production.")

        for acc in demo_accounts:
            existing = db.query(User).filter(User.email == acc["email"]).first()
            if not existing:
                pwd_hash, salt = hash_password(acc["password"])
                now = datetime.now(timezone.utc)
                user = User(
                    id=acc["id"],
                    name=acc["name"],
                    email=acc["email"],
                    mobile_number=acc["phone"],
                    password_hash=pwd_hash,
                    password_salt=salt,
                    preferred_language=acc["preferred_language"],
                    role=acc["role"],
                    location_permission_status="granted",
                    location_sharing_enabled=True,
                    created_at=now,
                    updated_at=now,
                    last_login=now,
                )
                db.add(user)

                pref = UserPreference(
                    id=str(uuid.uuid4()),
                    user_id=acc["id"],
                    preferred_language=acc["preferred_language"],
                    voice_enabled=True,
                    notifications_enabled=True,
                    location_tracking_enabled=True,
                    created_at=now,
                    updated_at=now,
                )
                db.add(pref)

                notif_pref = NotificationPreference(
                    id=str(uuid.uuid4()),
                    user_id=acc["id"],
                    sms_enabled=True,
                    push_enabled=True,
                    whatsapp_enabled=False,
                    alert_level_threshold="MODERATE",
                    created_at=now,
                    updated_at=now,
                )
                db.add(notif_pref)

                if acc["role"] == "GOVERNMENT":
                    gov_user = GovernmentUser(
                        id=str(uuid.uuid4()),
                        user_id=acc["id"],
                        department=acc["dept"],
                        designation=acc["designation"],
                        jurisdiction_region=acc["region"],
                        badge_number="IND-DOF-8821",
                        is_verified=True,
                        created_at=now,
                        updated_at=now,
                    )
                    db.add(gov_user)

        # -------------------------------------------------------------
        # 3. Emergency Contacts
        # -------------------------------------------------------------
        logger.info("Seeding national and state emergency directory...")
        contacts_data = [
            ("Indian Coast Guard (Maritime SAR)", "1554", "+91-11-23384934", "VHF Channel 16 / 2182 kHz", "All Indian Coastal & EEZ Waters", "National", "24x7 National Maritime Search and Rescue Coordination, Offshore Air & Naval Rescue"),
            ("Coastal Security Police (CSP)", "1093", "112", "VHF Marine Band Channel 16", "All 10 Coastal States & Island UTs", "National", "Nearshore Patrol, Inshore Distress, Harbor Security & Fishermen Assistance"),
            ("National Emergency Support System", "112", "100 / 108", "Emergency Cellular Dispatch", "National", "National", "All-in-one emergency dispatch (Police, Fire, Ambulance, Marine Police)"),
            ("National Disaster Response Force (NDRF)", "1078", "+91-11-24363260", "Disaster UHF/VHF", "National Coastal Belt", "National", "Cyclone relief, storm surge evacuations, and specialized flood/marine disaster response"),
            ("Indian Ocean Tsunami Early Warning Centre (INCOIS)", "040-23895011", "040-23895000", "Satellite Broadcast / NAVTEX", "Indian Ocean Basin", "National", "Real-time ocean storm surge, high swell alert, and tsunami early warning bulletin"),
            ("Gujarat Coastal Security & Okha Coast Guard", "1093", "+91-286-2244101", "VHF Channel 16", "Gujarat", "Gujarat", "Covering Kutch, Okha, Porbandar, Veraval, and Gulf of Khambhat"),
            ("Maharashtra Coastal Police & MRCC Mumbai", "1093", "+91-22-24388065", "VHF Channel 16 / DSC 70", "Maharashtra", "Maharashtra", "Covering Mumbai Harbor, Sassoon Dock, Raigad, Ratnagiri, and Sindhudurg"),
            ("Goa Coastal Police Station (Panaji & Betul)", "1093", "+91-832-2428581", "VHF Channel 16", "Goa", "Goa", "Covering North & South Goa coastal waters and Zuari/Mandovi estuaries"),
            ("Karnataka Coastal Security Police (Mangalore)", "1093", "+91-824-2220801", "VHF Channel 16", "Karnataka", "Karnataka", "Covering Mangalore, Malpe, Udupi, Karwar, and Honnavar fisheries harbors"),
            ("Kerala Coastal Police & MRCC Kochi", "1093", "+91-484-2215400", "VHF Channel 16", "Kerala", "Kerala", "Covering Kochi, Vizhinjam, Kollam, Beypore, and Munambam coastal waters"),
            ("Tamil Nadu Coastal Security Group & MRCC Chennai", "1093", "+91-44-23460405", "VHF Channel 16 / 2182 kHz", "Tamil Nadu", "Tamil Nadu", "Covering Chennai, Palk Strait, Rameswaram, Tuticorin, and Kanyakumari"),
            ("Andhra Pradesh Coastal Police (Visakhapatnam)", "1093", "+91-891-2565001", "VHF Channel 16", "Andhra Pradesh", "Andhra Pradesh", "Covering Visakhapatnam, Kakinada, Machilipatnam, and Krishnapatnam sectors"),
            ("Odisha Coastal Police & Coast Guard Paradip", "1093", "+91-6722-222100", "VHF Channel 16", "Odisha", "Odisha", "Covering Paradip, Dhamra, Puri, and Gahirmatha marine sanctuary waters"),
            ("West Bengal Coastal Police (Frazerganj & Haldia)", "1093", "+91-3224-252100", "VHF Channel 16", "West Bengal", "West Bengal", "Covering Sunderbans Delta, Kakdwip, Digha, and Hooghly Estuary"),
            ("Andaman & Nicobar MRCC Port Blair", "1554", "+91-3192-245530", "VHF Channel 16 / HF 8291 kHz", "Andaman & Nicobar", "Andaman & Nicobar", "Covering Andaman Sea, Great Nicobar, Malacca Strait approach and EEZ waters"),
        ]

        for name, help_no, alt_no, radio, reg, state, desc in contacts_data:
            existing = db.query(EmergencyContact).filter(EmergencyContact.agency_name == name).first()
            if not existing:
                db.add(EmergencyContact(
                    id=str(uuid.uuid4()),
                    agency_name=name,
                    helpline=help_no,
                    alternate_phone=alt_no,
                    radio_channel=radio,
                    region=reg,
                    state=state,
                    category="Maritime SAR",
                    description=desc,
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                ))

        # -------------------------------------------------------------
        # 4. Government Alerts & Circulars
        # -------------------------------------------------------------
        # Bulletins, documents and PFZ records require verified sources or authorized publication.

        # 7. Marine Geofences (IMBL, MPAs, Security Zones)
        # -------------------------------------------------------------
        logger.info("Seeding Indian maritime geofences...")
        geofences_data = [
            (
                "GEOFENCE-IMBL-PAK",
                "India-Pakistan International Maritime Boundary Line (Sir Creek Sector)",
                "IMBL",
                "CRITICAL",
                10.0,
                "Sovereign international boundary between India and Pakistan in Arabian Sea / Sir Creek. Crossings strictly prohibited.",
                [{"lat": 23.65, "lon": 68.05}, {"lat": 23.35, "lon": 68.00}, {"lat": 23.00, "lon": 67.90}],
            ),
            (
                "GEOFENCE-IMBL-SL",
                "India-Sri Lanka Maritime Boundary Line (Palk Strait & Gulf of Mannar)",
                "IMBL",
                "CRITICAL",
                5.0,
                "Bilateral maritime boundary agreement in Palk Bay and Palk Strait. Strict surveillance by Indian Coast Guard and Sri Lankan Navy.",
                [{"lat": 9.80, "lon": 79.55}, {"lat": 9.35, "lon": 79.25}, {"lat": 9.00, "lon": 79.05}],
            ),
            (
                "GEOFENCE-MPA-MANNAR",
                "Gulf of Mannar Marine National Park",
                "MPA",
                "HIGH",
                3.0,
                "Protected marine biosphere reserve with coral reefs, dugongs, and endangered sea turtles. Mechanized fishing prohibited.",
                [{"lat": 8.85, "lon": 78.85}, {"lat": 9.15, "lon": 79.15}, {"lat": 9.25, "lon": 79.35}],
            ),
            (
                "GEOFENCE-MPA-KUTCH",
                "Marine National Park (Gulf of Kutch)",
                "MPA",
                "HIGH",
                3.0,
                "Ecologically sensitive marine park covering 42 islands, mangrove ecosystems, and coral beds. Fishing strictly regulated.",
                [{"lat": 22.45, "lon": 69.50}, {"lat": 22.65, "lon": 69.90}, {"lat": 22.80, "lon": 70.20}],
            ),
            (
                "GEOFENCE-MPA-GAHIRMATHA",
                "Gahirmatha Marine Sanctuary (Odisha)",
                "MPA",
                "CRITICAL",
                5.0,
                "World's largest nesting ground for Olive Ridley sea turtles. Seasonal fishing ban within 20 km offshore boundary from Nov to May.",
                [{"lat": 20.65, "lon": 87.00}, {"lat": 20.80, "lon": 87.15}, {"lat": 20.50, "lon": 87.25}],
            ),
            (
                "GEOFENCE-MPA-SUNDARBANS",
                "Sundarbans Biosphere & Tiger Reserve Marine Sector",
                "MPA",
                "HIGH",
                4.0,
                "UNESCO World Heritage mangrove delta and estuarine crocodile sanctuary. Entry permits strictly required.",
                [{"lat": 21.60, "lon": 88.70}, {"lat": 21.80, "lon": 89.10}, {"lat": 21.50, "lon": 89.20}],
            ),
        ]

        for g_id, name, f_type, sev, thresh, desc, coords in geofences_data:
            existing = db.query(Geofence).filter(Geofence.id == g_id).first()
            if not existing:
                db.add(Geofence(
                    id=g_id,
                    name=name,
                    fence_type=f_type,
                    severity=sev,
                    threshold_nm=thresh,
                    description=desc,
                    coordinates_json=json.dumps(coords),
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                ))

        # -------------------------------------------------------------
        # 8. Initial Historical Marine Observation Baseline
        # -------------------------------------------------------------
        # Observations are created only by actual provider responses.

        logger.info("Database seeding complete!")

    # Stamp Alembic version table if alembic is available
    try:
        from alembic.config import Config
        from alembic import command
        alembic_ini_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini")
        if os.path.exists(alembic_ini_path):
            alembic_cfg = Config(alembic_ini_path)
            command.stamp(alembic_cfg, "head")
            logger.info("Stamped alembic revision to head.")
    except Exception as e:
        logger.warning(f"Alembic stamp notice (non-fatal): {e}")


if __name__ == "__main__":
    seed_database()
