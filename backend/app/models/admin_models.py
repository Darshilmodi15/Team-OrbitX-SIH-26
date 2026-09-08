"""
Super Admin Diagnostics and Historical Marine Comparison Models for ORCA.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ServiceEndpointHealth(BaseModel):
    service_name: str
    service_id: Optional[str] = None
    status: str = Field(default="UNKNOWN")
    latency_ms: Optional[float] = None
    last_checked: Optional[str] = None
    last_failure: Optional[str] = None
    last_failure_reason: Optional[str] = None
    http_status: Optional[int] = None
    real_data_arriving: bool = False
    data_mode: str = "unavailable"
    data_age_seconds: Optional[float] = None
    last_successful_response: Optional[str] = None
    last_error_summary: Optional[str] = None
    fallback_in_use: bool = False
    provider: Optional[str] = None
    data_timestamp: Optional[str] = None


class SystemHealthStatus(BaseModel):
    overall_status: str = Field(default="HEALTHY")  # HEALTHY, DEGRADED, CRITICAL
    uptime_seconds: float = Field(default=86400.0)
    registered_users_count: Optional[int] = None
    active_sos_count: Optional[int] = None
    active_geofences_count: Optional[int] = None
    cache_hit_rate_pct: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    services: List[ServiceEndpointHealth] = Field(default_factory=list)


class HistoricalMarineComparison(BaseModel):
    lat: float
    lon: float
    current_date: str
    comparison_period_hours: int = Field(default=24)
    current_wave_height_m: float
    historical_wave_height_m: float
    wave_delta_m: float
    current_wind_speed_kmh: float
    historical_wind_speed_kmh: float
    wind_delta_kmh: float
    current_sst_c: float
    historical_sst_c: float
    sst_delta_c: float
    safety_trend: str = Field(default="STABLE")  # IMPROVING, STABLE, DETERIORATING
    summary_advisory: str
