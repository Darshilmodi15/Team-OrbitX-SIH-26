"""
Emergency Services, Regional MRCC Routing, and SOS Distress Broadcast Service for ORCA.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.models.emergency_models import (
    EmergencyContact,
    EmergencyNature,
    SOSBroadcastRequest,
    SOSBroadcastResponse,
)

logger = logging.getLogger(__name__)

# National and Maritime Emergency Hotlines
NATIONAL_EMERGENCY_CONTACTS: List[EmergencyContact] = [
    EmergencyContact(
        agency_name="Indian Coast Guard (Maritime SAR)",
        helpline="1554",
        alternate_phone="+91-11-23384934",
        radio_channel="VHF Channel 16 (156.8 MHz) / 2182 kHz MF",
        region="All Indian Coastal & EEZ Waters",
        description="24x7 National Maritime Search and Rescue Coordination, Offshore Air & Naval Rescue",
    ),
    EmergencyContact(
        agency_name="Coastal Security Police (CSP)",
        helpline="1093",
        alternate_phone="112",
        radio_channel="VHF Marine Band Channel 16",
        region="All 10 Coastal States & Island UTs",
        description="Nearshore Patrol, Inshore Distress, Harbor Security & Fishermen Assistance",
    ),
    EmergencyContact(
        agency_name="National Emergency Support System",
        helpline="112",
        alternate_phone="100 / 108",
        radio_channel="Emergency Cellular Dispatch",
        region="National",
        description="All-in-one emergency dispatch (Police, Fire, Ambulance, Marine Police)",
    ),
    EmergencyContact(
        agency_name="National Disaster Response Force (NDRF)",
        helpline="1078",
        alternate_phone="+91-11-24363260",
        radio_channel="Disaster UHF/VHF",
        region="National Coastal Belt",
        description="Cyclone relief, storm surge evacuations, and specialized flood/marine disaster response",
    ),
    EmergencyContact(
        agency_name="Indian Ocean Tsunami Early Warning Centre (INCOIS)",
        helpline="040-23895011",
        alternate_phone="040-23895000",
        radio_channel="Satellite Broadcast / NAVTEX",
        region="Indian Ocean Basin",
        description="Real-time ocean storm surge, high swell alert, and tsunami early warning bulletin",
    ),
]

# State-by-State Coastal Emergency Directory
STATE_COASTAL_CONTACTS: List[EmergencyContact] = [
    EmergencyContact(
        agency_name="Gujarat Coastal Security & Okha Coast Guard",
        helpline="1093",
        alternate_phone="+91-286-2244101",
        radio_channel="VHF Channel 16",
        region="Gujarat",
        description="Covering Kutch, Okha, Porbandar, Veraval, and Gulf of Khambhat",
    ),
    EmergencyContact(
        agency_name="Maharashtra Coastal Police & MRCC Mumbai",
        helpline="1093",
        alternate_phone="+91-22-24388065",
        radio_channel="VHF Channel 16 / DSC 70",
        region="Maharashtra",
        description="Covering Mumbai Harbor, Sassoon Dock, Raigad, Ratnagiri, and Sindhudurg",
    ),
    EmergencyContact(
        agency_name="Goa Coastal Police Station (Panaji & Betul)",
        helpline="1093",
        alternate_phone="+91-832-2428581",
        radio_channel="VHF Channel 16",
        region="Goa",
        description="Covering North & South Goa coastal waters and Zuari/Mandovi estuaries",
    ),
    EmergencyContact(
        agency_name="Karnataka Coastal Security Police (Mangalore)",
        helpline="1093",
        alternate_phone="+91-824-2220801",
        radio_channel="VHF Channel 16",
        region="Karnataka",
        description="Covering Mangalore, Malpe, Udupi, Karwar, and Honnavar fisheries harbors",
    ),
    EmergencyContact(
        agency_name="Kerala Coastal Police & MRCC Kochi",
        helpline="1093",
        alternate_phone="+91-484-2215400",
        radio_channel="VHF Channel 16",
        region="Kerala",
        description="Covering Kochi, Vizhinjam, Kollam, Beypore, and Munambam coastal waters",
    ),
    EmergencyContact(
        agency_name="Tamil Nadu Coastal Security Group & MRCC Chennai",
        helpline="1093",
        alternate_phone="+91-44-23460405",
        radio_channel="VHF Channel 16 / 2182 kHz",
        region="Tamil Nadu",
        description="Covering Chennai, Palk Strait, Rameswaram, Tuticorin, and Kanyakumari",
    ),
    EmergencyContact(
        agency_name="Andhra Pradesh Coastal Police (Visakhapatnam)",
        helpline="1093",
        alternate_phone="+91-891-2565001",
        radio_channel="VHF Channel 16",
        region="Andhra Pradesh",
        description="Covering Visakhapatnam, Kakinada, Machilipatnam, and Krishnapatnam sectors",
    ),
    EmergencyContact(
        agency_name="Odisha Coastal Police & Coast Guard Paradip",
        helpline="1093",
        alternate_phone="+91-6722-222100",
        radio_channel="VHF Channel 16",
        region="Odisha",
        description="Covering Paradip, Dhamra, Puri, and Gahirmatha marine sanctuary waters",
    ),
    EmergencyContact(
        agency_name="West Bengal Coastal Police (Frazerganj & Haldia)",
        helpline="1093",
        alternate_phone="+91-3224-252100",
        radio_channel="VHF Channel 16",
        region="West Bengal",
        description="Covering Sunderbans Delta, Kakdwip, Digha, and Hooghly Estuary",
    ),
    EmergencyContact(
        agency_name="Andaman & Nicobar MRCC Port Blair",
        helpline="1554",
        alternate_phone="+91-3192-245530",
        radio_channel="VHF Channel 16 / HF 8291 kHz",
        region="Andaman & Nicobar",
        description="Covering Andaman Sea, Great Nicobar, Malacca Strait approach and EEZ waters",
    ),
]


class EmergencyService:
    """Core Emergency Services and Distress Broadcast Management."""

    def __init__(self):
        self._active_sos_records: Dict[str, SOSBroadcastResponse] = {}

    def get_all_emergency_contacts(self, region: Optional[str] = None) -> List[EmergencyContact]:
        """Returns national and regional emergency helpline directory."""
        if not region:
            return NATIONAL_EMERGENCY_CONTACTS + STATE_COASTAL_CONTACTS

        reg_clean = region.strip().lower()
        filtered = [
            c for c in STATE_COASTAL_CONTACTS
            if reg_clean in c.region.lower() or c.region.lower() in reg_clean
        ]
        return NATIONAL_EMERGENCY_CONTACTS + (filtered if filtered else STATE_COASTAL_CONTACTS)

    def route_to_mrcc(self, lat: float, lon: float) -> str:
        """
        Geographically routes coordinates to appropriate Maritime Rescue Coordination Centre.
        """
        if lon >= 90.0:
            return "MRCC Port Blair (Andaman & Nicobar) — Tel: 1554 / 03192-245530"
        elif lon >= 79.5:
            return "MRCC Chennai (East Coast Headquarters) — Tel: 1554 / 044-23460405"
        else:
            return "MRCC Mumbai (West Coast Headquarters) — Tel: 1554 / 022-24388065"

    def generate_mayday_transcript(
        self,
        vessel_name: str,
        reg_no: str,
        lat: float,
        lon: float,
        emergency_nature: EmergencyNature,
        crew_count: int,
        notes: str = "",
    ) -> str:
        """
        Generates standard IMO / GMDSS compliant MAYDAY voice transcript for VHF Ch 16 radio distress call.
        """
        lat_dir = "N" if lat >= 0 else "S"
        lon_dir = "E" if lon >= 0 else "W"
        pos_str = f"{abs(lat):.4f}° {lat_dir}, {abs(lon):.4f}° {lon_dir}"

        extra_notes = f" ADDITIONAL DETAILS: {notes}." if notes else ""

        return (
            f"MAYDAY, MAYDAY, MAYDAY.\n"
            f"THIS IS {vessel_name.upper()}, REGISTRATION {reg_no.upper()}.\n"
            f"MAYDAY {vessel_name.upper()}.\n"
            f"POSITION: {pos_str}.\n"
            f"NATURE OF DISTRESS: {emergency_nature.value.upper()}.\n"
            f"PERSONS ON BOARD: {crew_count}.\n"
            f"{extra_notes}\n"
            f"REQUIRE IMMEDIATE RESCUE ASSISTANCE. OVER."
        )

    def broadcast_sos(self, req: SOSBroadcastRequest) -> SOSBroadcastResponse:
        """
        Processes instantaneous SOS distress beacon, logs record, and formats hotlines.
        """
        sos_id = f"SOS-{uuid.uuid4().hex[:8].upper()}"
        assigned_mrcc = self.route_to_mrcc(req.lat, req.lon)
        mayday = self.generate_mayday_transcript(
            vessel_name=req.vessel_name or "Fishing Vessel",
            reg_no=req.registration_no or "IND-VESSEL",
            lat=req.lat,
            lon=req.lon,
            emergency_nature=req.emergency_nature,
            crew_count=req.crew_count,
            notes=req.notes or "",
        )

        hotlines = [
            {"agency": "Indian Coast Guard SAR", "number": "1554", "type": "Toll Free (Sea SAR)"},
            {"agency": "Coastal Police Helpline", "number": "1093", "type": "State Coastal Police"},
            {"agency": "National Emergency Dispatch", "number": "112", "type": "Police / Medical / Fire"},
            {"agency": "NDRF Disaster Relief", "number": "1078", "type": "Disaster Helpline"},
        ]

        response = SOSBroadcastResponse(
            sos_id=sos_id,
            status="ACTIVE_BEACON_DISPATCHED",
            broadcast_timestamp=datetime.now(timezone.utc).isoformat(),
            assigned_mrcc=assigned_mrcc,
            mayday_message=mayday,
            emergency_hotlines=hotlines,
            recorded_telemetry={
                "lat": req.lat,
                "lon": req.lon,
                "crew_count": req.crew_count,
                "emergency_nature": req.emergency_nature.value,
                "contact_phone": req.contact_phone,
                "vessel_name": req.vessel_name,
                "registration_no": req.registration_no,
            },
        )

        self._active_sos_records[sos_id] = response
        logger.warning(f"🚨 EMERGENCY SOS BROADCAST REGISTERED: {sos_id} at ({req.lat}, {req.lon}) - {req.emergency_nature}")
        return response

    def get_active_sos(self) -> List[SOSBroadcastResponse]:
        """Returns active distress broadcasts."""
        return list(self._active_sos_records.values())


emergency_service = EmergencyService()
