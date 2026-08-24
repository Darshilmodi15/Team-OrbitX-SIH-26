"""Pydantic contracts for multi-agent evidence exchange and orchestration."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WeatherEvidence(BaseModel):
    """Structured marine meteorological evidence returned by the Weather Agent."""
    forecast: str = Field(..., description="Forecast condition string ('clear', 'rainy', 'stormy', etc.)")
    wave_height_m: float = Field(..., description="Significant wave height in meters")
    wind_speed_kmh: float = Field(..., description="Sustained wind speed in km/h")
    wind_speed_ms: Optional[float] = Field(default=None, description="Wind speed in meters per second")
    wind_direction_deg: Optional[float] = Field(default=None, description="Wind direction in degrees (0-360)")
    wind_direction_cardinal: Optional[str] = Field(default=None, description="Wind direction cardinal compass (e.g. 'WSW')")
    temperature_c: Optional[float] = Field(default=None, description="Sea surface or ambient temperature in Celsius")
    visibility_km: Optional[float] = Field(default=None, description="Visibility in kilometers")
    forecast_time: Optional[str] = Field(default=None, description="Source forecast / observation timestamp")
    retrieval_time: Optional[str] = Field(default=None, description="Data retrieval timestamp")
    cache_status: Optional[str] = Field(default=None, description="Cache status ('live', 'cached', 'stale', 'unavailable')")
    grid_lat: Optional[float] = Field(default=None, description="Resolved marine grid latitude")
    grid_lon: Optional[float] = Field(default=None, description="Resolved marine grid longitude")
    resolution_method: Optional[str] = Field(default=None, description="Grid resolution method ('exact', 'nearest_marine_cell')")
    data_age_sec: Optional[int] = Field(default=None, description="Age of cached data in seconds")
    source: str = Field(..., description="Data provenance (e.g. 'INCOIS_OSF_WW3', 'mock_marine_weather')")
    is_mock: bool = Field(default=True, description="Flag indicating if the evidence is synthetic/mock")


class PFZEvidence(BaseModel):
    """Structured Potential Fishing Zone advisory returned by the PFZ Agent."""
    name: str = Field(..., description="Name or identifier of the fishing zone")
    latitude: float = Field(..., description="Latitude of zone center")
    longitude: float = Field(..., description="Longitude of zone center")
    distance_km: float = Field(..., description="Distance in kilometers from query coordinates")
    depth_m: Optional[float] = Field(default=None, description="Estimated bathymetric depth in meters")
    species: List[str] = Field(default_factory=list, description="List of target fish species")
    source: str = Field(..., description="Data provenance (e.g. 'incois_derived_pfz_dataset', 'mock_pfz_generator')")
    is_mock: bool = Field(default=False, description="Flag indicating if the evidence is synthetic/mock")


class RiskEvidence(BaseModel):
    """Structured safety risk evaluation produced by the Risk Agent."""
    level: str = Field(..., description="Assessed risk level ('safe', 'caution', 'unsafe')")
    reason: str = Field(..., description="Actionable rationale explaining the risk classification")
    factors: List[str] = Field(default_factory=list, description="Specific triggers or parameter thresholds evaluated")
    source: str = Field(default="risk_assessment_agent", description="Agent responsible for the risk evaluation")


class AgentResult(BaseModel):
    """Result envelope for an individual agent operation."""
    agent: str = Field(..., description="Name of the agent executing the task")
    action: str = Field(..., description="Action performed by the agent")
    success: bool = Field(..., description="Whether the agent execution completed successfully")
    evidence: Optional[Dict[str, Any]] = Field(default=None, description="Structured evidence payload if successful")
    error: Optional[str] = Field(default=None, description="Error message if the operation failed")


class EvidenceBundle(BaseModel):
    """Unified collection of all structured evidence collected during query execution."""
    weather: Optional[WeatherEvidence] = Field(default=None, description="Weather evidence if collected")
    pfz_zones: List[PFZEvidence] = Field(default_factory=list, description="List of PFZ evidence items if collected")
    risk: Optional[RiskEvidence] = Field(default=None, description="Risk assessment evidence if evaluated")
    location_lat: float = Field(..., description="Inquiry latitude coordinate")
    location_lon: float = Field(..., description="Inquiry longitude coordinate")
    date: str = Field(..., description="Inquiry forecast date string")
