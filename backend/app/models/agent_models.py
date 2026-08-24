"""Pydantic contracts for multi-agent evidence exchange, risk intelligence, and spatial geofences."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WeatherEvidence(BaseModel):
    """Structured marine meteorological evidence returned by the Weather Agent."""
    forecast: str = Field(..., description="Forecast condition string ('clear', 'rainy', 'stormy', etc.)")
    wave_height_m: float = Field(..., description="Significant wave height in meters")
    wave_period_s: Optional[float] = Field(default=None, description="Peak wave period in seconds")
    wave_direction_deg: Optional[float] = Field(default=None, description="Wave propagation direction in degrees (0-360)")
    wave_direction_cardinal: Optional[str] = Field(default=None, description="Wave direction cardinal (e.g. 'SW')")
    
    wind_speed_kmh: float = Field(..., description="Sustained wind speed in km/h")
    wind_speed_ms: Optional[float] = Field(default=None, description="Wind speed in meters per second")
    wind_gust_kmh: Optional[float] = Field(default=None, description="Peak wind gust in km/h")
    wind_direction_deg: Optional[float] = Field(default=None, description="Wind direction in degrees (0-360)")
    wind_direction_cardinal: Optional[str] = Field(default=None, description="Wind direction cardinal compass (e.g. 'WSW')")
    
    cloud_cover_pct: Optional[float] = Field(default=None, description="Cloud cover percentage (0-100%)")
    cloud_category: Optional[str] = Field(default=None, description="'Clear', 'Partly Cloudy', 'Cloudy', 'Overcast'")
    
    visibility_km: Optional[float] = Field(default=None, description="Visibility in kilometers")
    visibility_category: Optional[str] = Field(default=None, description="'Good', 'Reduced', 'Poor'")
    precipitation_mm: Optional[float] = Field(default=None, description="Precipitation rate in mm")
    
    temperature_c: Optional[float] = Field(default=None, description="Ambient air temperature in Celsius")
    sea_surface_temperature_c: Optional[float] = Field(default=None, description="Sea Surface Temperature (SST) in Celsius")
    
    forecast_time: Optional[str] = Field(default=None, description="Source forecast / observation timestamp")
    retrieval_time: Optional[str] = Field(default=None, description="Data retrieval timestamp")
    cache_status: Optional[str] = Field(default=None, description="Cache status ('live', 'cached', 'stale', 'unavailable')")
    grid_lat: Optional[float] = Field(default=None, description="Resolved marine grid latitude")
    grid_lon: Optional[float] = Field(default=None, description="Resolved marine grid longitude")
    resolution_method: Optional[str] = Field(default=None, description="Grid resolution method ('exact', 'nearest_marine_cell')")
    data_age_sec: Optional[int] = Field(default=None, description="Age of cached data in seconds")
    
    forecast_horizon: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Hourly forecast horizon for trend evaluation (+1h to +6h)"
    )
    
    source: str = Field(..., description="Data provenance (e.g. 'INCOIS_OSF_WW3', 'open_meteo_marine_api')")
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


class ComponentRisk(BaseModel):
    """Granular risk assessment for an individual environmental vector."""
    level: str = Field(..., description="'LOW', 'MODERATE', or 'HIGH'")
    value: Optional[float] = Field(default=None, description="Numerical value evaluated")
    unit: Optional[str] = Field(default=None, description="Unit of measurement")
    threshold_applied: Optional[str] = Field(default=None, description="Threshold rule applied")
    notes: Optional[str] = Field(default=None, description="Explanation or maritime implication")


class MarineRiskProfile(BaseModel):
    """Complete decomposed risk matrix across marine environmental vectors."""
    overall: str = Field(..., description="Overall risk classification ('LOW', 'MODERATE', 'HIGH')")
    status_label: str = Field(..., description="Operational status ('SAFE', 'CAUTION', 'UNSAFE')")
    wave_risk: ComponentRisk
    wind_risk: ComponentRisk
    gust_risk: ComponentRisk
    visibility_risk: ComponentRisk
    storm_risk: ComponentRisk
    forecast_trend: str = Field(default="stable", description="'improving', 'stable', or 'deteriorating'")
    warnings: List[str] = Field(default_factory=list, description="List of specific hazard warnings")
    recommendations: List[str] = Field(default_factory=list, description="Actionable navigational recommendations")


class RiskEvidence(BaseModel):
    """Structured safety risk evaluation produced by the Risk Agent."""
    level: str = Field(..., description="Assessed risk level ('safe', 'caution', 'unsafe')")
    reason: str = Field(..., description="Actionable rationale explaining the risk classification")
    factors: List[str] = Field(default_factory=list, description="Specific triggers or parameter thresholds evaluated")
    profile: Optional[MarineRiskProfile] = Field(default=None, description="Detailed component-level risk profile")
    disclaimer: str = Field(
        default="ORCA model-based risk assessment under current forecast parameters. Always verify official maritime safety notices before sailing.",
        description="Mandatory advisory disclaimer"
    )
    source: str = Field(default="risk_assessment_agent", description="Agent responsible for the risk evaluation")


class BoundaryEvidence(BaseModel):
    """Structured Marine Boundary & EEZ evidence returned by Boundary Agent."""
    inside_eez: bool = Field(..., description="Whether coordinates are within the sovereign EEZ")
    distance_to_boundary_km: float = Field(..., description="Distance in kilometers to outer maritime boundary")
    geofence_status: str = Field(..., description="Geofence alert level ('safe', 'warning', 'critical')")
    country: str = Field(..., description="Sovereign territory / coastal country name")
    zone_name: str = Field(..., description="Jurisdictional zone name (e.g. 'Indian Exclusive Economic Zone')")
    mrgid: int = Field(default=8480, description="Marine Regions Geographic Identifier")
    status_message: str = Field(..., description="Actionable boundary explanation")
    source: str = Field(default="Marine Regions / Flanders Marine Institute (VLIZ)", description="Data provenance")
    dataset_version: str = Field(default="World EEZ v12", description="Dataset release version")


class GeofenceItem(BaseModel):
    """Individual maritime boundary or protected sanctuary evaluation."""
    name: str = Field(..., description="Name of the maritime boundary or sanctuary")
    type: str = Field(..., description="Type ('IMBL', 'MPA', 'SECURITY_BUFFER', 'RESTRICTED')")
    distance_km: float = Field(..., description="Shortest distance to boundary in kilometers")
    distance_nm: float = Field(..., description="Shortest distance to boundary in nautical miles")
    is_inside: bool = Field(default=False, description="Whether the coordinate is inside the polygon/zone")
    threshold_nm: float = Field(default=12.0, description="Trigger threshold in nautical miles")
    alert_active: bool = Field(default=False, description="True if within the alert threshold distance")
    severity: str = Field(default="NORMAL", description="'NORMAL', 'ADVISORY', 'WARNING', 'CRITICAL'")
    description: Optional[str] = Field(default=None, description="Context regarding the boundary or restriction")
    coordinates: Optional[List[List[float]]] = Field(default=None, description="Line/polygon coordinates [[lon, lat], ...]")


class GeofenceEvidence(BaseModel):
    """Structured maritime boundary and protected zone intelligence."""
    vessel_lat: float
    vessel_lon: float
    active_alerts: List[GeofenceItem] = Field(default_factory=list)
    nearest_boundary: Optional[GeofenceItem] = None
    has_critical_violation: bool = Field(default=False)
    source: str = Field(default="geofence_spatial_engine", description="Provenance of boundary data")
    is_mock: bool = Field(default=False)


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
    boundary: Optional[BoundaryEvidence] = Field(default=None, description="Marine boundary & EEZ geofence evidence if evaluated")
    geofence: Optional[GeofenceEvidence] = Field(default=None, description="Maritime geofence intelligence if evaluated")
    location_lat: float = Field(..., description="Inquiry latitude coordinate")
    location_lon: float = Field(..., description="Inquiry longitude coordinate")
    date: str = Field(..., description="Inquiry forecast date string")
