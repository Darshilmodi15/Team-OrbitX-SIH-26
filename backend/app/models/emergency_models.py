"""
Emergency Services, SOS Distress, and Maritime SAR Models for ORCA Marine AI.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class EmergencyNature(str, Enum):
    GENERAL = "General Emergency"
    CAPSIZING_WATER = "Vessel Capsizing / Taking Water"
    ENGINE_FAILURE = "Engine Failure / Adrift at Sea"
    MEDICAL = "Critical Medical Emergency on Board"
    CYCLONE_STORM = "Severe Squall / Cyclone Trapped"
    COLLISION = "Collision / Grounding on Reef"
    IMBL_DISTRESS = "International Border / Security Distress"
    OTHER = "General Maritime Distress"


class EmergencyContact(BaseModel):
    agency_name: str = Field(..., description="Agency or authority name")
    helpline: str = Field(..., description="Toll-free or emergency phone number")
    alternate_phone: Optional[str] = Field(default=None, description="Landline or direct desk")
    radio_channel: Optional[str] = Field(default="VHF Channel 16 (156.8 MHz)", description="Maritime radio channel")
    region: str = Field(..., description="Coastal state or national jurisdiction")
    description: str = Field(..., description="Role and capabilities")


class SOSBroadcastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    vessel_name: Optional[str] = Field(default=None, max_length=255, description="Vessel name")
    registration_no: Optional[str] = Field(default=None, max_length=100, description="Fisheries/MFD registration code")
    lat: float = Field(..., ge=-90, le=90, description="Current vessel latitude")
    lon: float = Field(..., ge=-180, le=180, description="Current vessel longitude")
    crew_count: int = Field(default=0, ge=0, le=10000, description="People affected; 0 means not yet provided")
    emergency_nature: EmergencyNature = Field(default=EmergencyNature.GENERAL, description="Type of crisis")
    notes: Optional[str] = Field(default="", max_length=2000, description="Additional immediate situation notes")
    contact_phone: Optional[str] = Field(default=None, max_length=50, description="Skipper or contact mobile number")
    location_name: Optional[str] = Field(default=None, max_length=255, description="User-confirmed incident location label, not a reverse-geocoded address")
    location_source: Literal["selected", "gps", "manual", "unspecified"] = "unspecified"

    @field_validator("emergency_nature", mode="before")
    @classmethod
    def normalize_emergency_nature(cls, v: Any) -> EmergencyNature:
        if isinstance(v, EmergencyNature):
            return v
        val = str(v or "").lower()
        if "engine" in val or "adrift" in val:
            return EmergencyNature.ENGINE_FAILURE
        if "capsize" in val or "taking water" in val or "sink" in val:
            return EmergencyNature.CAPSIZING_WATER
        if "med" in val or "health" in val or "injur" in val:
            return EmergencyNature.MEDICAL
        if "cyclone" in val or "squall" in val or "storm" in val or "weather" in val:
            return EmergencyNature.CYCLONE_STORM
        if "collis" in val or "ground" in val or "reef" in val:
            return EmergencyNature.COLLISION
        if "border" in val or "imbl" in val or "secur" in val:
            return EmergencyNature.IMBL_DISTRESS
        for member in EmergencyNature:
            if member.value.lower() == val or member.name.lower() == val:
                return member
        return EmergencyNature.OTHER


class SOSBroadcastResponse(BaseModel):
    sos_id: str = Field(..., description="Unique SOS tracking UUID")
    status: str = Field(default="RECEIVED", description="Broadcast dispatch status")
    broadcast_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    assigned_mrcc: str = Field(..., description="Assigned Maritime Rescue Coordination Centre")
    mayday_message: str = Field(..., description="Standard GMDSS/IMO MAYDAY radio transcript")
    emergency_hotlines: List[Dict[str, str]] = Field(default_factory=list)
    recorded_telemetry: Dict[str, Any] = Field(default_factory=dict)


class SOSStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str = Field(..., pattern="^(RECEIVED|RESPONDING|RESOLVED)$")


class SOSDetailsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    notes: str = Field(..., min_length=1, max_length=2000)
    contact_phone: Optional[str] = Field(default=None, max_length=50)
