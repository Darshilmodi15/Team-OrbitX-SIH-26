"""
Government Announcements, Circulars, and Maritime Schemes Models for ORCA.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AnnouncementCategory(str, Enum):
    SAFETY_BAN = "Monsoon & Safety Fishing Ban"
    CYCLONE_ALERT = "Cyclone & Storm Surge Warning"
    SUBSIDY_SCHEME = "Government Schemes & PMMSY Subsidy"
    REGULATION = "Maritime Regulation & AIS Mandate"
    GENERAL_NOTICE = "General Fisheries Advisory"


class GovernmentAnnouncement(BaseModel):
    id: str = Field(..., description="Unique announcement UUID")
    title: str = Field(..., description="Official circular headline")
    issuing_authority: str = Field(..., description="Department or Ministry (e.g. Department of Fisheries, MoFAH&D)")
    state_or_national: str = Field(default="National", description="Target jurisdiction (e.g. 'National', 'Gujarat', 'Maharashtra')")
    publish_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    effective_dates: Optional[str] = Field(default="Immediate Effect", description="Applicable operational period")
    summary: str = Field(..., description="Executive summary for coastal users")
    full_text: str = Field(..., description="Full gazette or notification text")
    category: AnnouncementCategory = Field(default=AnnouncementCategory.SAFETY_BAN)
    reference_number: str = Field(..., description="Official gazette or file number")
    document_url: Optional[str] = Field(default=None, description="Downloadable PDF or gazette link")
    is_urgent: bool = Field(default=False, description="Whether alert requires flashing top priority banner")
    is_active: bool = Field(default=True)


class GovernmentDocument(BaseModel):
    id: str = Field(..., description="Document identifier")
    title: str = Field(..., description="Document title")
    department: str = Field(..., description="Issuing agency")
    category: str = Field(..., description="Subject category")
    file_size_kb: int = Field(default=450, description="Size in KB")
    publish_date: str = Field(default="2026-01-15")
    description: str = Field(..., description="Brief document summary")
    download_url: str = Field(default="#", description="Download URL")


class CreateAnnouncementRequest(BaseModel):
    title: str = Field(..., min_length=5)
    issuing_authority: str = Field(default="State Directorate of Fisheries")
    state_or_national: str = Field(default="National")
    effective_dates: Optional[str] = Field(default="Immediate Effect")
    summary: str = Field(..., min_length=10)
    full_text: str = Field(..., min_length=20)
    category: AnnouncementCategory = Field(default=AnnouncementCategory.GENERAL_NOTICE)
    reference_number: str = Field(default="DOF/ORCA/2026/01")
    is_urgent: bool = Field(default=False)
