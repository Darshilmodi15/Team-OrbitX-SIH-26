"""
User, Authentication, and Location validation data models for ORCA Marine AI.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class UserRole(str, Enum):
    USER = "USER"
    GOVERNMENT = "GOVERNMENT"
    SUPER_ADMIN = "SUPER_ADMIN"


class UserProfile(BaseModel):
    """Public user profile data."""
    id: str = Field(..., description="Unique user identifier")
    name: str = Field(..., description="Full name")
    email: Optional[str] = Field(default=None, description="Email address")
    mobile_number: Optional[str] = Field(default=None, description="Mobile contact number")
    preferred_language: str = Field(default="en", description="Preferred Indic language code ('en', 'gu', 'hi', etc.)")
    role: UserRole = Field(default=UserRole.USER, description="Assigned authorization role")
    location_permission_status: str = Field(default="prompt", description="'granted', 'denied', or 'prompt'")
    location_sharing_enabled: bool = Field(default=True, description="Opt-in to emergency location sharing")
    created_at: str = Field(..., description="Profile creation ISO timestamp")
    last_login: Optional[str] = Field(default=None, description="Last login timestamp")


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, description="Full user name")
    email: Optional[str] = Field(default=None, description="Email address")
    mobile_number: Optional[str] = Field(default=None, description="Mobile number (10 digits)")
    password: str = Field(..., min_length=6, description="Account password")
    preferred_language: str = Field(default="en", description="Default language code")
    role: Optional[UserRole] = Field(default=UserRole.USER, description="Account role")


class LoginRequest(BaseModel):
    email_or_phone: str = Field(..., description="Email address or mobile phone number")
    password: str = Field(..., description="Account password")


class AuthResponse(BaseModel):
    access_token: str = Field(..., description="Bearer JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserProfile = Field(..., description="Authenticated user profile")


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    preferred_language: Optional[str] = None
    location_permission_status: Optional[str] = None
    location_sharing_enabled: Optional[bool] = None


class LocationValidationRequest(BaseModel):
    lat: float = Field(..., description="Latitude coordinate to validate")
    lon: float = Field(..., description="Longitude coordinate to validate")
    accuracy_m: Optional[float] = Field(default=None, description="GPS accuracy in meters")


class LocationValidationResponse(BaseModel):
    lat: float = Field(..., description="Validated latitude")
    lon: float = Field(..., description="Validated longitude")
    inside_india: bool = Field(..., description="Whether coordinates fall within Indian sovereign/EEZ territory")
    is_coastal_supported: bool = Field(..., description="Whether coordinates fall within the supported marine/coastal belt")
    distance_to_coast_km: float = Field(..., description="Shortest geodesic distance to India's coastline in km")
    nearest_coastal_point: Dict[str, Any] = Field(..., description="Coordinates of the nearest coastal boundary point")
    coastal_region: Optional[str] = Field(default=None, description="Identified coastal state or union territory")
    message: str = Field(..., description="Human-readable validation and advisory message")
    intelligence_radius_km: float = Field(default=100.0, description="Active operational intelligence radius in km")
