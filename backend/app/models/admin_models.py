"""
Super Admin Diagnostics and Historical Marine Comparison Models for ORCA.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ServiceEndpointHealth(BaseModel):
    service_name: str
    status: str = Field(default="OPERATIONAL")  # OPERATIONAL, DEGRADED, OFFLINE
    latency_ms: float = Field(default=45.0)
    last_checked: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SystemHealthStatus(BaseModel):
    overall_status: str = Field(default="HEALTHY")  # HEALTHY, DEGRADED, CRITICAL
    uptime_seconds: float = Field(default=86400.0)
    registered_users_count: int = Field(default=3)
    active_sos_count: int = Field(default=0)
    active_geofences_count: int = Field(default=8)
    cache_hit_rate_pct: float = Field(default=94.2)
    memory_usage_mb: float = Field(default=128.5)
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
