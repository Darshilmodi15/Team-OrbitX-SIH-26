"""
Comprehensive Normalized SQLAlchemy Models for ORCA Marine AI (SIH 2026).
Defines 16 relational tables covering identity, location, preferences, government alerts,
documents, emergency SAR, marine telemetry observations, PFZ, geofences, notifications,
chat history, SOS distress logs, audit trails, and system settings.
"""
from datetime import datetime, timezone
import json
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


def generate_uuid() -> str:
    """Generates standard UUID4 string."""
    return str(uuid.uuid4())


# =========================================================================
# 1. Identity & Profile Tables
# =========================================================================

class User(Base):
    """Primary User account supporting Fishermen, Coastal Officers, and Admins."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=True, index=True)
    mobile_number = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    password_salt = Column(String(64), nullable=False)
    preferred_language = Column(String(10), default="en", nullable=False, index=True)
    role = Column(String(30), default="USER", nullable=False, index=True)  # USER, GOVERNMENT, SUPER_ADMIN
    is_active = Column(Boolean, default=True, nullable=False)
    location_permission_status = Column(String(20), default="prompt", nullable=False)
    location_sharing_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    locations = relationship("UserLocation", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    government_profile = relationship("GovernmentUser", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    sos_requests = relationship("SOSRequest", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class UserLocation(Base):
    """Historical and active spatial coordinates recorded for a user / vessel."""
    __tablename__ = "user_locations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    accuracy_m = Column(Float, nullable=True)
    coastal_distance_km = Column(Float, nullable=True)
    location_source = Column(String(50), default="GPS", nullable=False)  # GPS, Manual, Cell
    is_coastal = Column(Boolean, default=True, nullable=False)
    coastal_region = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="locations")


class UserPreference(Base):
    """User operational preferences and accessibility parameters."""
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    preferred_language = Column(String(10), default="en", nullable=False)
    voice_enabled = Column(Boolean, default=True, nullable=False)
    notifications_enabled = Column(Boolean, default=True, nullable=False)
    location_tracking_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="preferences")


class GovernmentUser(Base):
    """Extended official credentials and authority profile for Government and Inspector roles."""
    __tablename__ = "government_users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    department = Column(String(255), nullable=False)
    designation = Column(String(255), nullable=False)
    jurisdiction_region = Column(String(255), default="National", nullable=False, index=True)
    badge_number = Column(String(100), nullable=True)
    is_verified = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="government_profile")


# =========================================================================
# 2. Government Portals, Circulars & Documents
# =========================================================================

class GovernmentAlert(Base):
    """Official government circulars, monsoon fishing bans, and emergency advisories."""
    __tablename__ = "government_alerts"

    id = Column(String(64), primary_key=True)  # e.g., GOV-ANN-2026-01
    title = Column(String(255), nullable=False)
    issuing_authority = Column(String(255), nullable=False)
    state_or_national = Column(String(255), default="National", nullable=False, index=True)
    publish_date = Column(String(20), nullable=False, index=True)
    effective_dates = Column(String(255), default="Immediate Effect", nullable=False)
    summary = Column(Text, nullable=False)
    full_text = Column(Text, nullable=False)
    category = Column(String(100), default="General Fisheries Advisory", nullable=False, index=True)
    reference_number = Column(String(100), nullable=False)
    document_url = Column(String(500), nullable=True)
    severity = Column(String(50), default="INFO", nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius_km = Column(Float, nullable=True)
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    published_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_urgent = Column(Boolean, default=False, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class GovernmentDocument(Base):
    """Metadata repository for official PDF guidelines, PMMSY scheme forms, and SOP handbooks."""
    __tablename__ = "government_documents"

    id = Column(String(64), primary_key=True)  # e.g., DOC-01
    title = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    file_size_kb = Column(Integer, default=450, nullable=False)
    publish_date = Column(String(20), default="2026-01-15", nullable=False)
    description = Column(Text, nullable=False)
    download_url = Column(String(500), default="#", nullable=False)
    document_hash = Column(String(128), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


# =========================================================================
# 3. Emergency Directory & Maritime SAR
# =========================================================================

class EmergencyContact(Base):
    """Maritime SAR helplines, Coast Guard coordination centers, and coastal police dispatch."""
    __tablename__ = "emergency_contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    agency_name = Column(String(255), nullable=False, index=True)
    organization = Column(String(255), nullable=True)
    helpline = Column(String(50), nullable=False)
    phone_number = Column(String(50), nullable=True)
    alternate_phone = Column(String(50), nullable=True)
    radio_channel = Column(String(100), default="VHF Channel 16", nullable=False)
    state = Column(String(100), nullable=True, index=True)
    district = Column(String(100), nullable=True)
    region = Column(String(255), nullable=False, index=True)
    category = Column(String(100), default="Maritime SAR", nullable=False, index=True)
    description = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


class SOSRequest(Base):
    """Emergency SOS distress broadcasts, GMDSS MAYDAY messages, and rescue tracking."""
    __tablename__ = "sos_requests"

    id = Column(String(64), primary_key=True)  # e.g., SOS-A1B2C3D4
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    vessel_name = Column(String(255), default="Fishing Craft / Motor Vessel", nullable=False)
    registration_no = Column(String(100), default="IND-VESSEL", nullable=False)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    crew_count = Column(Integer, default=4, nullable=False)
    emergency_nature = Column(String(100), default="Engine Failure / Adrift at Sea", nullable=False, index=True)
    notes = Column(Text, nullable=True)
    contact_phone = Column(String(50), nullable=True)
    status = Column(String(50), default="ACTIVE_BEACON_DISPATCHED", nullable=False, index=True)
    assigned_mrcc = Column(String(255), nullable=False)
    mayday_message = Column(Text, nullable=False)
    emergency_hotlines_json = Column(Text, nullable=True)
    recorded_telemetry_json = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)

    user = relationship("User", back_populates="sos_requests")


# =========================================================================
# 4. Ocean Intelligence: Telemetry, PFZ & Geofences
# =========================================================================

class MarineObservation(Base):
    """Selected historical oceanographic observations for trend analysis and before-vs-after comparison."""
    __tablename__ = "marine_observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    region_cell = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    wave_height_m = Column(Float, nullable=False)
    wave_period_s = Column(Float, nullable=True)
    wave_direction_deg = Column(Float, nullable=True)
    wind_speed_kmh = Column(Float, nullable=False)
    wind_direction_deg = Column(Float, nullable=True)
    wind_gust_kmh = Column(Float, nullable=True)
    cloud_cover_percent = Column(Float, nullable=True)
    visibility_km = Column(Float, nullable=True)
    precipitation_mm = Column(Float, nullable=True)
    sst_c = Column(Float, nullable=True)
    risk_level = Column(String(20), default="SAFE", nullable=False, index=True)
    source = Column(String(100), default="INCOIS_OSF_WW3", nullable=False, index=True)
    resolution_method = Column(String(100), default="exact", nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_marine_obs_cell_timestamp", "region_cell", "timestamp"),
    )


class PFZZone(Base):
    """INCOIS Potential Fishing Zones (PFZ) oceanographic fronts."""
    __tablename__ = "pfz_zones"

    id = Column(String(64), primary_key=True)  # e.g., PFZ-VERAVAL-01
    zone_name = Column(String(255), nullable=False, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    depth_m = Column(Float, nullable=True)
    species_json = Column(Text, nullable=False)  # JSON array: ["Yellowfin Tuna", "Mackerel"]
    valid_date = Column(String(20), nullable=False, index=True)
    distance_km = Column(Float, nullable=True)
    bearing_deg = Column(Float, nullable=True)
    source = Column(String(100), default="INCOIS_PFZ_MISSION", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


class Geofence(Base):
    """Maritime boundaries, International Maritime Boundary Lines (IMBL), and Marine Protected Areas (MPA)."""
    __tablename__ = "geofences"

    id = Column(String(64), primary_key=True)  # e.g., GEOFENCE-IMBL-PAK-01
    name = Column(String(255), nullable=False, index=True)
    boundary_geojson = Column(Text, nullable=True)
    fence_type = Column(String(50), nullable=False, index=True)  # IMBL, MPA, SECURITY, PORT, CORRIDOR
    severity = Column(String(50), default="CRITICAL", nullable=False, index=True)
    threshold_nm = Column(Float, default=5.0, nullable=False)
    description = Column(Text, nullable=False)
    coordinates_json = Column(Text, nullable=False)  # JSON points / polygon
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


# =========================================================================
# 5. Notifications & Preferences
# =========================================================================

class Notification(Base):
    """Targeted and broadcast coastal safety notifications."""
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    alert_id = Column(String(64), ForeignKey("government_alerts.id", ondelete="SET NULL"), nullable=True, index=True)
    category = Column(String(50), default="WEATHER", nullable=False, index=True)
    severity = Column(String(50), default="INFO", nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    source = Column(String(100), default="ORCA Safety Engine", nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    language = Column(String(10), default="en", nullable=False, index=True)
    translated_title = Column(String(255), nullable=True)
    translated_message = Column(Text, nullable=True)
    action_link = Column(String(500), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)

    user = relationship("User", back_populates="notifications")


class NotificationPreference(Base):
    """User channel routing settings (SMS, WebPush, WhatsApp, alert threshold)."""
    __tablename__ = "notification_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    sms_enabled = Column(Boolean, default=True, nullable=False)
    push_enabled = Column(Boolean, default=True, nullable=False)
    whatsapp_enabled = Column(Boolean, default=False, nullable=False)
    alert_level_threshold = Column(String(20), default="MODERATE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="notification_preferences")


# =========================================================================
# 6. Chat History, Audit Logs & System Settings
# =========================================================================

class Conversation(Base):
    """User-owned chat thread. Ownership is always derived from the authenticated user."""
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="New conversation", nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False, index=True)

    user = relationship("User", back_populates="conversations")
    messages = relationship("ChatHistory", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatHistory.created_at")


class ChatHistory(Base):
    """Multi-turn multilingual AI conversation logs."""
    __tablename__ = "chat_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True, index=True)
    session_id = Column(String(128), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    message = Column(Text, nullable=False)
    translated_message = Column(Text, nullable=True)
    intent = Column(String(50), nullable=True, index=True)
    language = Column(String(10), default="en", nullable=False, index=True)
    sources_used_json = Column(Text, nullable=True)
    risk_level = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)

    user = relationship("User", back_populates="chat_messages")
    conversation = relationship("Conversation", back_populates="messages")


class AuditLog(Base):
    """Governance audit trail for actions, logins, SOS triggers, and administrative overrides."""
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False, index=True)
    resource_id = Column(String(100), nullable=True)
    details_json = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)

    user = relationship("User", back_populates="audit_logs")


class SystemSetting(Base):
    """Global system parameters, operational thresholds, and configuration settings."""
    __tablename__ = "system_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    is_encrypted = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
