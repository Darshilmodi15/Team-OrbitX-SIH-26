"""
User, Authentication, and Location validation data models for Matsya (powered by ORCA).
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class UserRole(str, Enum):
    USER = "USER"
    GOVERNMENT = "GOVERNMENT"
    SUPER_ADMIN = "SUPER_ADMIN"


VALID_VESSEL_CLASSES = ("traditional_canoe", "motorized_gillnetter", "mechanized_trawler", "standard")


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
    vessel_class: Optional[str] = Field(default=None, description="Vessel operating profile for risk assessment")
    created_at: str = Field(..., description="Profile creation ISO timestamp")
    operational_region: Optional[str] = None
    last_login: Optional[str] = Field(default=None, description="Last login timestamp")


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full user name")
    email: Optional[str] = Field(default=None, max_length=255, description="Email address")
    mobile_number: Optional[str] = Field(default=None, max_length=20, description="Mobile number (10 digits)")
    password: str = Field(..., min_length=6, max_length=72, description="Account password")
    preferred_language: str = Field(default="en", max_length=10, description="Default language code")

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else v

    @field_validator("email", "mobile_number", mode="before")
    @classmethod
    def _normalize_optional_contact(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            cleaned = v.strip()
            return cleaned or None
        return v

    @field_validator("password")
    @classmethod
    def _check_password_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return v

    @model_validator(mode="after")
    def _require_contact_identifier(self) -> "RegisterRequest":
        if not self.email and not self.mobile_number:
            raise ValueError("Either email or mobile_number is required.")
        return self


class LoginRequest(BaseModel):
    email_or_phone: str = Field(..., min_length=1, max_length=255, description="Email address or mobile phone number")
    password: str = Field(..., min_length=1, max_length=72, description="Account password")


class AuthResponse(BaseModel):
    access_token: str = Field(..., description="Bearer JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserProfile = Field(..., description="Authenticated user profile")


class UpdateProfileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    preferred_language: Optional[str] = Field(default=None, min_length=2, max_length=10)
    location_permission_status: Optional[str] = Field(default=None, max_length=30)
    location_sharing_enabled: Optional[bool] = None
    vessel_class: Optional[str] = Field(default=None, max_length=40)

    @field_validator("name", mode="before")
    @classmethod
    def _strip_profile_name(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else v

    @field_validator("vessel_class", mode="before")
    @classmethod
    def _validate_vessel_class(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            cleaned = v.strip().lower()
            if not cleaned:
                return None
            if cleaned not in VALID_VESSEL_CLASSES:
                raise ValueError(f"vessel_class must be one of: {', '.join(VALID_VESSEL_CLASSES)}")
            return cleaned
        raise ValueError("Invalid vessel_class value")


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email_or_phone: str = Field(..., min_length=3, max_length=255)


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(..., min_length=6, max_length=255)
    new_password: str = Field(..., min_length=6, max_length=72)

    @field_validator("new_password")
    @classmethod
    def _check_reset_password_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return v


class LocationValidationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lat: float = Field(..., ge=-90, le=90, allow_inf_nan=False, description="Latitude coordinate to validate")
    lon: float = Field(..., ge=-180, le=180, allow_inf_nan=False, description="Longitude coordinate to validate")
    accuracy_m: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False, description="GPS accuracy in meters")


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
