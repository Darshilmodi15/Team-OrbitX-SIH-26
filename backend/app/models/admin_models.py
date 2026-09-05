"""
Super Admin Diagnostics and Historical Marine Comparison Models for ORCA.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ServiceEndpointHealth(BaseModel):
    service_name: str
    status: str = Field(default="UNKNOWN")  # OPERATIONAL, DEGRADED, OFFLINE, UNKNOWN
    latency_ms: Optional[float] = None
    last_checked: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SystemHealthStatus(BaseModel):
    overall_status: str = Field(default="HEALTHY")  # HEALTHY, DEGRADED, CRITICAL
    uptime_seconds: float = Field(default=86400.0)
    registered_users_count: int = Field(default=3)
    active_sos_count: int = Field(default=0)
    active_geofences_count: int = Field(default=8)
    cache_hit_rate_pct: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    services: List[ServiceEndpointHealth] = Field(default_factory=list)


class HistoricalMarineComparison(BaseModel):
    lat: float
    lon: float
    current_date: str
    comparison_period_hours: int = Field(default=24)
    current_wave_height_m: Optional[float] = None
    historical_wave_height_m: Optional[float] = None
    wave_delta_m: Optional[float] = None
    current_wind_speed_kmh: Optional[float] = None
    historical_wind_speed_kmh: Optional[float] = None
    wind_delta_kmh: Optional[float] = None
    current_sst_c: Optional[float] = None
    historical_sst_c: Optional[float] = None
    sst_delta_c: Optional[float] = None
    safety_trend: str = Field(default="STABLE")  # IMPROVING, STABLE, DETERIORATING, UNAVAILABLE
    summary_advisory: Optional[str] = None
