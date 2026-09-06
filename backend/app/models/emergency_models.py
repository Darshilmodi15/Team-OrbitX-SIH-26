"""
Emergency Services, SOS Distress, and Maritime SAR Models for ORCA Marine AI.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class EmergencyNature(str, Enum):
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
    vessel_name: Optional[str] = Field(default="Fishing Craft / Motor Vessel", max_length=255, description="Vessel name")
    registration_no: Optional[str] = Field(default="IND-MH-01-F-1234", max_length=100, description="Fisheries/MFD registration code")
    lat: float = Field(..., ge=-90, le=90, description="Current vessel latitude")
    lon: float = Field(..., ge=-180, le=180, description="Current vessel longitude")
    crew_count: int = Field(default=4, ge=1, description="Persons on board (POB)")
    emergency_nature: EmergencyNature = Field(default=EmergencyNature.ENGINE_FAILURE, description="Type of crisis")
    notes: Optional[str] = Field(default="", max_length=2000, description="Additional immediate situation notes")
    contact_phone: Optional[str] = Field(default="+91-9876543210", max_length=50, description="Skipper or contact mobile number")


class SOSBroadcastResponse(BaseModel):
    sos_id: str = Field(..., description="Unique SOS tracking UUID")
    status: str = Field(default="DISPATCHED", description="Broadcast dispatch status")
    broadcast_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    assigned_mrcc: str = Field(..., description="Assigned Maritime Rescue Coordination Centre")
    mayday_message: str = Field(..., description="Standard GMDSS/IMO MAYDAY radio transcript")
    emergency_hotlines: List[Dict[str, str]] = Field(default_factory=list)
    recorded_telemetry: Dict[str, Any] = Field(default_factory=dict)


class SOSStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str = Field(..., pattern="^(RECEIVED|RESPONDING|RESOLVED)$")
