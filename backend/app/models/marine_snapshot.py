"""Canonical contract. Null means unavailable, never a synthetic measurement."""
from typing import Any
from pydantic import BaseModel, Field, ConfigDict


class SnapshotLocation(BaseModel):
    name: str | None = None
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class SnapshotRequest(BaseModel):
    requested_date: str
    requested_time: str


class SnapshotWeather(BaseModel):
    wave_height_m: float | None = None
    wave_direction_deg: float | None = None
    wave_period_s: float | None = None
    wind_speed_kmh: float | None = None
    wind_direction_deg: float | None = None
    swell_height_m: float | None = None
    swell_direction_deg: float | None = None
    swell_period_s: float | None = None
    current_speed: float | None = None
    current_direction: float | None = None
    current_speed_unit: str = "km/h"
    visibility_km: float | None = None
    wind_gust_kmh: float | None = None
    wind_wave_height_m: float | None = None
    wind_wave_direction_deg: float | None = None
    wind_wave_period_s: float | None = None
    air_temperature_c: float | None = None
    weather_code: int | None = None


class MarineSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    snapshot_id: str
    location: SnapshotLocation
    request: SnapshotRequest
    weather: SnapshotWeather
    ocean: dict[str, Any]
    pfz: dict[str, Any]
    tide: dict[str, Any]
    boundary: dict[str, Any]
    hazards: list[dict[str, Any]]
    risk: dict[str, Any]
    provenance: dict[str, Any]
    missing_fields: list[str]
    expires_at: str
    backend_sha: str
