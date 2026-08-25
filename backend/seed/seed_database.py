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
        logger.info("Seeding demo user accounts...")
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
        logger.info("Seeding official government circulars...")
        alerts_data = [
            (
                "GOV-ANN-2026-01",
                "Uniform Monsoon Fishing Ban (61 Days) along West Coast EEZ",
                "Department of Fisheries, MoFAH&D",
                "National (West Coast: Gujarat, Maharashtra, Goa, Karnataka, Kerala)",
                "2026-06-01 to 2026-07-31",
                "Annual 61-day fishing ban for all mechanized and motorized fishing vessels in EEZ beyond 12 NM.",
                "In exercise of powers conferred under the Marine Fishing Regulation Act, the Central Government hereby imposes a uniform fishing ban for a period of 61 days on the West Coast of India. Traditional non-motorized crafts are exempted.",
                "Monsoon & Safety Fishing Ban",
                "F.No. 31011/04/2026-Fy(M)",
                "/documents/monsoon_fishing_ban_2026.pdf",
                "CRITICAL",
                True,
            ),
            (
                "GOV-ANN-2026-02",
                "Mandatory Two-Way Communication & AIS Transponders for Mechanized Craft",
                "Directorate General of Shipping & Indian Coast Guard",
                "National",
                "Immediate Effect",
                "All mechanized fishing craft exceeding 12 meters must carry ISRO DAT-SG or AIS Class-B transponders.",
                "Following maritime security directives, all fishing vessels operating in Indian coastal waters must carry functional vessel tracking devices. Subsidies available under PMMSY.",
                "Maritime Regulation & AIS Mandate",
                "DGS/MSN/2026/08",
                "/documents/ais_mandate_fishing_craft.pdf",
                "HIGH",
                False,
            ),
            (
                "GOV-ANN-2026-03",
                "PMMSY Financial Subsidies for Marine Safety Equipment & VHF Sets",
                "National Fisheries Development Board (NFDB)",
                "National",
                "Financial Year 2026-27",
                "40% to 60% capital subsidy on life jackets, VHF marine radios, GPS chartplotters, and insulated holds.",
                "Eligible traditional and small-scale marine fishers can apply through their nearest Matsya Seva Kendra or ORCA portal.",
                "Government Schemes & PMMSY Subsidy",
                "NFDB/PMMSY/SCHEME/2026/12",
                "/documents/pmmsy_marine_safety_guidelines.pdf",
                "INFO",
                False,
            ),
            (
                "GOV-ANN-2026-04",
                "Precautionary Squall Advisory — Coastal Port Signal No. 3",
                "India Meteorological Department & Gujarat Maritime Board",
                "Gujarat & Maharashtra",
                "Next 48 Hours",
                "Squally winds reaching 45-55 km/h gusting to 65 km/h along north Maharashtra and south Gujarat coast.",
                "Local Cautionary Signal No. 3 hoisted at Okha, Porbandar, Veraval, and Mumbai ports. Sea conditions rough to very rough with wave crests exceeding 2.5m.",
                "Cyclone & Storm Surge Warning",
                "IMD/RSMC/BULLETIN-04",
                "/documents/imd_marine_bulletin.pdf",
                "CRITICAL",
                True,
            ),
        ]

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        for ann_id, title, auth, juris, eff, sum_text, full_txt, cat, ref, doc_url, sev, is_urg in alerts_data:
            existing = db.query(GovernmentAlert).filter(GovernmentAlert.id == ann_id).first()
            if not existing:
                db.add(GovernmentAlert(
                    id=ann_id,
                    title=title,
                    issuing_authority=auth,
                    state_or_national=juris,
                    publish_date=today_str,
                    effective_dates=eff,
                    summary=sum_text,
                    full_text=full_txt,
                    category=cat,
                    reference_number=ref,
                    document_url=doc_url,
                    severity=sev,
                    is_urgent=is_urg,
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                ))

        # -------------------------------------------------------------
        # 5. Government Documents
        # -------------------------------------------------------------
        logger.info("Seeding government policy documents...")
        docs_data = [
            ("DOC-01", "Pradhan Mantri Matsya Sampada Yojana (PMMSY) Operational Guidelines", "Department of Fisheries, GoI", "Government Schemes", 820, "2026-01-10", "Comprehensive handbook of beneficiary criteria, subsidy rates, and application workflows.", "/downloads/pmmsy_guidelines.pdf"),
            ("DOC-02", "Standard Operating Procedure (SOP) for Marine Search & Rescue", "Indian Coast Guard (ICG)", "Maritime Safety", 490, "2026-02-01", "Distress beacon verification, VHF emergency channel protocols, and coastal police coordination.", "/downloads/icg_sar_sop.pdf"),
            ("DOC-03", "Marine Fisheries Regulation Act (MFRA) State Compendium", "Directorate of Fisheries", "Regulations & Laws", 650, "2025-11-20", "State-wise demarcation of territorial fishing zones (0-12 NM), mesh size rules, and MPA boundaries.", "/downloads/mfra_compendium.pdf"),
            ("DOC-04", "INCOIS Ocean State Forecast & PFZ User Manual for Fishers", "INCOIS / MoES", "Oceanographic Data", 340, "2026-01-25", "Guide to interpreting sea surface temperature (SST) gradients and chlorophyll fronts.", "/downloads/incois_pfz_manual.pdf"),
        ]

        for doc_id, title, dept, cat, size_kb, p_date, desc, d_url in docs_data:
            existing = db.query(GovernmentDocument).filter(GovernmentDocument.id == doc_id).first()
            if not existing:
                db.add(GovernmentDocument(
                    id=doc_id,
                    title=title,
                    department=dept,
                    category=cat,
                    file_size_kb=size_kb,
                    publish_date=p_date,
                    description=desc,
                    download_url=d_url,
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                ))

        # -------------------------------------------------------------
        # 6. Potential Fishing Zones (PFZ)
        # -------------------------------------------------------------
        logger.info("Seeding Potential Fishing Zones...")
        pfz_data = [
            ("PFZ-VERAVAL-01", "Veraval Offshore Front", 20.85, 70.30, 42.0, ["Yellowfin Tuna", "Ribbonfish", "Squid"], today_str, 18.5, 240.0),
            ("PFZ-PORBANDAR-01", "Porbandar Pelagic Eddy", 21.60, 69.45, 55.0, ["Indian Mackerel", "Pomfret", "Threadfin Bream"], today_str, 22.0, 260.0),
            ("PFZ-MUMBAI-01", "Mumbai High Shelf Edge", 18.90, 72.40, 65.0, ["Kingfish", "Bombay Duck", "Seerfish"], today_str, 24.5, 270.0),
            ("PFZ-RATNAGIRI-01", "Ratnagiri Deep Trench Front", 16.95, 73.10, 80.0, ["Tuna", "Sardines", "Horse Mackerel"], today_str, 16.0, 255.0),
            ("PFZ-KOCHI-01", "Kochi Upwelling Plume", 9.90, 76.05, 38.0, ["Oil Sardine", "Indian Mackerel", "Anchovy"], today_str, 14.2, 250.0),
            ("PFZ-MANGALORE-01", "Mangalore Coastline Convergence", 12.85, 74.65, 45.0, ["Silver Pomfret", "Squid", "Cuttlefish"], today_str, 15.8, 265.0),
            ("PFZ-CHENNAI-01", "Chennai Coromandel Front", 13.08, 80.45, 50.0, ["Skipjack Tuna", "Barracuda", "Trevally"], today_str, 20.1, 95.0),
            ("PFZ-PARADIP-01", "Paradip Northern Bay Plume", 20.25, 86.80, 48.0, ["Hilsa", "Croaker", "Penaeid Prawn"], today_str, 19.4, 110.0),
        ]

        for p_id, name, lat, lon, depth, spec, v_date, dist, bearing in pfz_data:
            existing = db.query(PFZZone).filter(PFZZone.id == p_id).first()
            if not existing:
                db.add(PFZZone(
                    id=p_id,
                    zone_name=name,
                    latitude=lat,
                    longitude=lon,
                    depth_m=depth,
                    species_json=json.dumps(spec),
                    valid_date=v_date,
                    distance_km=dist,
                    bearing_deg=bearing,
                    source="INCOIS_PFZ_MISSION",
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                ))

        # -------------------------------------------------------------
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
        logger.info("Seeding baseline marine observations...")
        historical_obs = [
            (18.9220, 72.8347, "18.900_72.850", 1.25, 17.5, 28.3, "SAFE"),
            (20.9000, 70.3600, "20.900_70.350", 1.65, 22.0, 27.8, "CAUTION"),
            (9.9312, 76.2673, "9.950_76.250", 0.95, 14.0, 29.1, "SAFE"),
        ]
        for lat, lon, cell, wave, wind, sst, risk in historical_obs:
            existing_obs = db.query(MarineObservation).filter(
                MarineObservation.region_cell == cell,
                MarineObservation.latitude == lat,
                MarineObservation.longitude == lon,
            ).first()
            if not existing_obs:
                db.add(MarineObservation(
                    id=str(uuid.uuid4()),
                    latitude=lat,
                    longitude=lon,
                    region_cell=cell,
                    timestamp=datetime.now(timezone.utc),
                    wave_height_m=wave,
                    wave_period_s=7.5,
                    wave_direction_deg=240.0,
                    wind_speed_kmh=wind,
                    wind_direction_deg=260.0,
                    wind_gust_kmh=wind + 8.0,
                    cloud_cover_percent=45.0,
                    visibility_km=10.0,
                    precipitation_mm=0.0,
                    sst_c=sst,
                    risk_level=risk,
                    source="INCOIS_OSF_WW3",
                    resolution_method="exact",
                    created_at=datetime.now(timezone.utc),
                ))

        logger.info("Database seeding complete!")


if __name__ == "__main__":
    seed_database()
