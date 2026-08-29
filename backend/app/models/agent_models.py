"""Pydantic contracts for multi-agent evidence exchange and orchestration."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WeatherEvidence(BaseModel):
    """Structured marine meteorological evidence returned by the Weather Agent."""
    forecast: str = Field(..., description="Forecast condition string ('clear', 'rainy', 'stormy', etc.)")
    wave_height_m: float = Field(..., description="Significant wave height in meters")
    wind_speed_kmh: float = Field(..., description="Sustained wind speed in km/h")
    wind_speed_ms: Optional[float] = Field(default=None, description="Wind speed in meters per second")
    wave_period_s: Optional[float] = Field(default=None, description="Peak or mean wave period in seconds")
    wind_gust_kmh: Optional[float] = Field(default=None, description="Peak wind gust speed in km/h")
    wind_direction_deg: Optional[float] = Field(default=None, description="Wind direction in degrees (0-360)")
    wind_direction_cardinal: Optional[str] = Field(default=None, description="Wind direction cardinal compass (e.g. 'WSW')")
    temperature_c: Optional[float] = Field(default=None, description="Sea surface or ambient temperature in Celsius")
    sea_surface_temperature_c: Optional[float] = Field(default=None, description="Sea surface temperature in Celsius")
    visibility_km: Optional[float] = Field(default=None, description="Visibility in kilometers")
    forecast_time: Optional[str] = Field(default=None, description="Source forecast / observation timestamp")
    retrieval_time: Optional[str] = Field(default=None, description="Data retrieval timestamp")
    cache_status: Optional[str] = Field(default=None, description="Cache status ('live', 'cached', 'stale', 'unavailable')")
    grid_lat: Optional[float] = Field(default=None, description="Resolved marine grid latitude")
    grid_lon: Optional[float] = Field(default=None, description="Resolved marine grid longitude")
    resolution_method: Optional[str] = Field(default=None, description="Grid resolution method ('exact', 'nearest_marine_cell')")
    data_age_sec: Optional[int] = Field(default=None, description="Age of cached data in seconds")
    forecast_horizon: Optional[List[Dict[str, Any]]] = Field(default=None, description="Multi-hour forward outlook steps")
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
    bearing_deg: Optional[float] = Field(default=None, description="Compass bearing in degrees (0-360) from reference port/location")
    landing_centre: Optional[str] = Field(default=None, description="INCOIS referenced base landing centre")
    suitability_score: Optional[float] = Field(default=None, description="Operational suitability index (0-100)")
    suitability_reason: Optional[str] = Field(default=None, description="Explanation of zone suitability based on marine conditions")
    sst_c: Optional[float] = Field(default=None, description="Sea Surface Temperature in Celsius if recorded")
    chlorophyll_mg_m3: Optional[float] = Field(default=None, description="Chlorophyll-a density in mg/m3 if recorded")
    source: str = Field(..., description="Data provenance (e.g. 'incois_derived_pfz_dataset', 'mock_pfz_generator')")
    is_mock: bool = Field(default=False, description="Flag indicating if the evidence is synthetic/mock")


class RiskComponentItem(BaseModel):
    """Sub-component risk evaluation."""
    level: str = Field(default="LOW", description="Risk tier ('LOW', 'MODERATE', 'HIGH')")
    score: float = Field(default=0.0, description="Component risk index 0.0 to 1.0")
    description: str = Field(default="Normal operating limits", description="Component rationale")


class MarineRiskProfile(BaseModel):
    """Comprehensive multi-factor marine safety risk profile."""
    overall: str = Field(default="LOW", description="Overall risk tier ('LOW', 'MODERATE', 'HIGH')")
    status_label: str = Field(default="SAFE", description="Human-readable safety status ('SAFE', 'CAUTION', 'UNSAFE')")
    wave_risk: RiskComponentItem = Field(default_factory=RiskComponentItem)
    wind_risk: RiskComponentItem = Field(default_factory=RiskComponentItem)
    storm_risk: RiskComponentItem = Field(default_factory=RiskComponentItem)
    gust_risk: RiskComponentItem = Field(default_factory=RiskComponentItem)
    forecast_trend: str = Field(default="stable", description="Trend over forward horizon ('stable', 'improving', 'deteriorating')")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recommendations")
    warnings: List[str] = Field(default_factory=list, description="Specific safety warnings")


class RiskEvidence(BaseModel):
    """Structured safety risk evaluation produced by the Risk Agent."""
    level: str = Field(..., description="Assessed risk level ('safe', 'caution', 'unsafe')")
    reason: str = Field(..., description="Actionable rationale explaining the risk classification")
    factors: List[str] = Field(default_factory=list, description="Specific triggers or parameter thresholds evaluated")
    safety_label: Optional[str] = Field(default=None, description="Human-readable summary label ('SAFE TO VENTURE', 'CAUTION ADVISED', 'UNSAFE')")
    confidence: Optional[str] = Field(default="HIGH", description="Confidence categorization based on authoritative coverage ('HIGH', 'MODERATE', 'LOW')")
    risk_score: Optional[float] = Field(default=None, description="Normalized risk index from 0.0 (safest) to 1.0 (extreme)")
    freshness_status: Optional[str] = Field(default=None, description="Freshness status of evaluated data ('LIVE', 'CACHED', 'STALE')")
    wave_status: Optional[str] = Field(default=None, description="Evaluated wave condition status")
    wind_status: Optional[str] = Field(default=None, description="Evaluated wind condition status")
    profile: Optional[MarineRiskProfile] = Field(default=None, description="Decomposed multi-factor risk profile")
    disclaimer: str = Field(
        default="ORCA Risk Assessment is decision support intelligence. Always consult official Coast Guard and IMD broadcasts.",
        description="Mandatory advisory disclaimer",
    )
    source: str = Field(default="risk_assessment_agent", description="Agent responsible for the risk evaluation")


class RouteWaypoint(BaseModel):
    """Individual navigational waypoint along a recommended marine route."""
    lat: float = Field(..., description="Waypoint latitude")
    lon: float = Field(..., description="Waypoint longitude")
    name: Optional[str] = Field(default=None, description="Waypoint descriptive label")
    segment_distance_km: float = Field(default=0.0, description="Distance from preceding waypoint in km")
    wave_height_m: Optional[float] = Field(default=None, description="Estimated significant wave height at waypoint")
    risk_level: Optional[str] = Field(default="safe", description="Estimated risk classification at waypoint")


class RouteEvidence(BaseModel):
    """Structured safe navigational route advisory produced by the Route Agent."""
    origin_name: str = Field(default="Vessel Location", description="Departure point name")
    origin_lat: float = Field(..., description="Departure latitude")
    origin_lon: float = Field(..., description="Departure longitude")
    destination_name: str = Field(..., description="Target fishing zone / port name")
    destination_lat: float = Field(..., description="Destination latitude")
    destination_lon: float = Field(..., description="Destination longitude")
    distance_km: float = Field(..., description="Total route distance in kilometers")
    distance_nm: float = Field(..., description="Total route distance in Nautical Miles")
    estimated_duration_hours: float = Field(..., description="Estimated travel time at nominal 8-knot cruising speed")
    waypoints: List[RouteWaypoint] = Field(default_factory=list, description="Ordered waypoint coordinates along route")
    risk_assessment: str = Field(default="SAFE", description="Overall route safety risk level")
    avoided_zones: List[str] = Field(default_factory=list, description="Hazards or restricted geofences skirted by route")
    advisory_notes: List[str] = Field(default_factory=list, description="Actionable navigational advisories")
    source: str = Field(default="route_optimizer_agent", description="Agent responsible for route computation")
    is_advisory_only: bool = Field(default=True, description="Explicit disclaimer flag: decision support advisory, not certified navigation")


class GeofenceZoneModel(BaseModel):
    """Structured geofence boundary and proximity status produced by Geospatial/Geofence Agent."""
    id: str = Field(..., description="Unique boundary identifier")
    name: str = Field(..., description="Official or demonstration zone name")
    category: str = Field(..., description="Boundary category ('IMBL', 'MPA', 'SECURITY', 'HAZARD')")
    risk_level: str = Field(..., description="Risk tier ('CRITICAL_DANGER', 'RESTRICTED_MPA', 'BUFFER_ALERT')")
    description: str = Field(..., description="Explanation of restriction / boundary significance")
    distance_to_vessel_km: Optional[float] = Field(default=None, description="Shortest distance from vessel to boundary in km")
    is_inside: bool = Field(default=False, description="True if vessel position is currently inside boundary polygon")
    is_proximity_warning: bool = Field(default=False, description="True if vessel is within proximity buffer (<15 km)")
    coordinates: List[List[float]] = Field(default_factory=list, description="Boundary polygon or polyline vertices [[lat, lon], ...]")
    source: str = Field(default="geospatial_agent", description="Boundary provenance")
    is_demonstration: bool = Field(default=False, description="Flag indicating if boundary is for demonstration")


class HazardAlertEvidence(BaseModel):
    """Structured active hazard alert produced by Hazard Alert Agent."""
    id: str = Field(..., description="Unique alert identifier")
    severity: str = Field(..., description="Severity tier ('advisory', 'warning', 'critical')")
    title: str = Field(..., description="Alert headline")
    message: str = Field(..., description="Detailed actionable advisory")
    location_desc: str = Field(..., description="Geographic area or station affected")
    timestamp: str = Field(..., description="Alert generation timestamp")
    source: str = Field(default="incois_hazard_detection_agent", description="Alert data provenance")
    freshness: str = Field(default="LIVE", description="Data freshness indicator")


class SimulationEvidence(BaseModel):
    """Structured what-if simulation comparison produced by Simulation Agent."""
    is_simulation: bool = Field(default=True, description="Simulation marker flag")
    parameter_modified: str = Field(..., description="Name of modified physical variable (e.g. 'wave_height_m', 'wind_speed_kmh')")
    baseline_value: Any = Field(..., description="Observed baseline value")
    simulated_value: Any = Field(..., description="Hypothetical simulated value")
    baseline_risk: str = Field(..., description="Baseline risk classification ('safe', 'caution', 'unsafe')")
    simulated_risk: str = Field(..., description="Simulated risk classification ('safe', 'caution', 'unsafe')")
    impact_summary: str = Field(..., description="Detailed explanation of how safety classification changed")
    triggered_factors: List[str] = Field(default_factory=list, description="New threshold triggers activated in simulation")
    source: str = Field(default="what_if_simulation_agent", description="Simulation agent identifier")


class AgentResult(BaseModel):
    """Result envelope for an individual agent operation."""
    agent: str = Field(..., description="Name of the agent executing the task")
    action: str = Field(..., description="Action performed by the agent")
    success: bool = Field(..., description="Whether the agent execution completed successfully")
    evidence: Optional[Dict[str, Any]] = Field(default=None, description="Structured evidence payload if successful")
    error: Optional[str] = Field(default=None, description="Error message if the operation failed")


class BoundaryEvidence(BaseModel):
    """Structured marine boundary evaluation produced by the Boundary Agent."""
    inside_eez: bool = Field(..., description="Whether vessel is inside the EEZ boundary")
    distance_to_boundary_km: Optional[float] = Field(default=None, description="Distance to nearest boundary edge in km")
    geofence_status: str = Field(..., description="Geofence classification status")
    country: Optional[str] = Field(default=None, description="Country owning the EEZ")
    zone_name: Optional[str] = Field(default=None, description="Name of the maritime zone")
    mrgid: Optional[int] = Field(default=None, description="Marine Regions Geographic Identifier")
    status_message: str = Field(..., description="Human-readable boundary status message")
    source: str = Field(default="Marine Regions / Flanders Marine Institute (VLIZ)", description="Boundary data provenance")
    dataset_version: str = Field(default="World EEZ v12", description="Dataset version identifier")


class TideInfo(BaseModel):
    """Structured tidal forecast information."""
    high_tide_time: Optional[str] = Field(default=None, description="Time of primary high tide (e.g. '04:45 AM')")
    high_tide_height_m: Optional[float] = Field(default=None, description="High tide height in meters")
    low_tide_time: Optional[str] = Field(default=None, description="Time of primary low tide (e.g. '11:15 AM')")
    low_tide_height_m: Optional[float] = Field(default=None, description="Low tide height in meters")
    secondary_high_tide_time: Optional[str] = Field(default=None, description="Time of secondary high tide (e.g. '17:30 PM')")
    secondary_high_tide_height_m: Optional[float] = Field(default=None, description="Secondary high tide height in meters")
    tidal_phase: str = Field(default="Spring Tide", description="Tidal phase ('Spring Tide', 'Neap Tide', 'Transitional')")
    tidal_range_m: Optional[float] = Field(default=None, description="Difference between high and low tide in meters")
    source: str = Field(default="ORCA regional tidal harmonic estimate; official tide feed integration pending", description="Tidal data provenance")


class OceanAnalyticsEvidence(BaseModel):
    """Structured satellite ocean color and thermal front analytics."""
    region_name: str = Field(..., description="Coastal region analyzed")
    mean_chlorophyll_mg_m3: float = Field(..., description="Mean Chlorophyll-a density in mg/m3")
    mean_sst_c: float = Field(..., description="Sea Surface Temperature in Celsius")
    optimal_sst_range: str = Field(default="26.5°C - 28.8°C", description="Optimal SST range for pelagic aggregation")
    upwelling_index: str = Field(default="MODERATE", description="Coastal upwelling intensity index")
    thermal_front_detected: bool = Field(default=True, description="Whether an active thermal front gradient is detected")
    thermal_front_description: str = Field(..., description="Detailed description of thermal front and chlorophyll bloom")
    favorable_sectors: List[Dict[str, Any]] = Field(default_factory=list, description="Specific sectors showing high chlorophyll & favorable SST")
    satellite_source: str = Field(default="ISRO Oceansat-3 OCM & INSAT-3D Thermal Imager", description="Satellite data provenance")
    summary: str = Field(..., description="Executive ocean analytics summary")


class EcologyEvidence(BaseModel):
    """Structured marine ecological analysis explaining fish productivity trends."""
    region_name: str = Field(..., description="Coastal sector evaluated")
    decline_severity: str = Field(default="MODERATE_TO_HIGH", description="Productivity decline severity tier")
    sst_anomaly: str = Field(..., description="Sea Surface Temperature anomaly compared to historical baseline")
    chlorophyll_trend: str = Field(..., description="Phytoplankton / chlorophyll-a trend")
    overfishing_pressure: str = Field(..., description="Fishing intensity and juvenile exploitation status")
    primary_causes: List[str] = Field(default_factory=list, description="Key environmental and anthropogenic drivers of decline")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recovery and sustainable management recommendations")
    analysis_summary: str = Field(..., description="Detailed explanatory text")
    source: str = Field(default="ORCA Marine Ecological Reasoning Engine & CMFRI/INCOIS Oceanographic Synthesis", description="Data provenance")


class ZoneAvoidanceItem(BaseModel):
    """Specific zone or sector flagged for avoidance."""
    zone_name: str = Field(..., description="Name of the fishing zone, sector, or restricted area")
    category: str = Field(..., description="Hazard or restriction category ('WEATHER_HAZARD', 'IMBL', 'MPA', 'SECURITY', 'PFZ_RESTRICTION')")
    avoidance_level: str = Field(default="WARNING", description="Avoidance urgency ('CRITICAL', 'WARNING', 'CAUTION')")
    reason: str = Field(..., description="Specific physical or regulatory reason for avoidance")
    recommended_action: str = Field(..., description="Recommended navigational or operational action")


class ZoneAvoidanceEvidence(BaseModel):
    """Structured evaluation of zones to avoid due to hazards or geofencing."""
    overall_avoidance_status: str = Field(default="ALL_ZONES_CLEAR", description="Status ('CRITICAL_AVOIDANCE', 'CAUTION_REQUIRED', 'ALL_ZONES_CLEAR')")
    avoided_zones: List[ZoneAvoidanceItem] = Field(default_factory=list, description="List of specific zones to avoid")
    safe_alternative_zones: List[Dict[str, Any]] = Field(default_factory=list, description="Recommended safe alternative fishing zones")
    summary: str = Field(..., description="Summary advisory for avoidance")
    source: str = Field(default="ORCA Multi-Agent Hazard & Geofencing Avoidance Engine", description="Provenance")


class OperationalRecommendation(BaseModel):
    """Structured, reliable operational recommendation backed by supporting evidence and deductive reasoning."""
    id: str = Field(..., description="Unique recommendation identifier (e.g. 'REC-SAF-01', 'REC-PFZ-01')")
    category: str = Field(..., description="Operational domain ('SAFETY', 'FISHING', 'NAVIGATION', 'GEOFENCE', 'ECOLOGY', 'HAZARD', 'TIDAL', 'SIMULATION')")
    title: str = Field(..., description="Clear, concise recommendation headline")
    directive: str = Field(..., description="Imperative actionable instruction for mariner / operator")
    priority: str = Field(default="MEDIUM", description="Urgency priority tier ('CRITICAL', 'HIGH', 'MEDIUM', 'INFO')")
    confidence_score: float = Field(default=0.95, description="Confidence / reliability score from 0.0 to 1.0")
    reliability_tier: str = Field(default="AUTHORITATIVE_VERIFIED", description="Reliability grade ('AUTHORITATIVE_VERIFIED', 'MODEL_DERIVED', 'CACHED_ESTIMATE', 'ADVISORY')")
    supporting_evidence: List[str] = Field(default_factory=list, description="Specific quantitative observations, thresholds, and data points supporting this recommendation")
    reasoning: str = Field(..., description="Deductive step-by-step physical, regulatory, or ecological reasoning used to derive this recommendation")
    source: str = Field(default="orca_recommendation_reasoning_engine", description="Generating agent or engine provenance")


class EvidenceBundle(BaseModel):
    """Unified collection of all structured evidence collected during query execution."""
    weather: Optional[WeatherEvidence] = Field(default=None, description="Weather evidence if collected")
    pfz_zones: List[PFZEvidence] = Field(default_factory=list, description="List of PFZ evidence items if collected")
    risk: Optional[RiskEvidence] = Field(default=None, description="Risk assessment evidence if evaluated")
    route: Optional[RouteEvidence] = Field(default=None, description="Safe navigational route advisory if planned")
    geofences: List[GeofenceZoneModel] = Field(default_factory=list, description="Relevant geofence boundaries evaluated")
    alerts: List[HazardAlertEvidence] = Field(default_factory=list, description="Active proactive hazard alerts")
    boundary: Optional[BoundaryEvidence] = Field(default=None, description="Marine boundary and EEZ evaluation")
    simulation: Optional[SimulationEvidence] = Field(default=None, description="What-if simulation results if requested")
    ocean_analytics: Optional[OceanAnalyticsEvidence] = Field(default=None, description="Ocean color and SST thermal front analytics")
    ecology: Optional[EcologyEvidence] = Field(default=None, description="Fish productivity decline ecological diagnostics")
    zone_avoidance: Optional[ZoneAvoidanceEvidence] = Field(default=None, description="Hazard and geofence zone avoidance evaluation")
    tide: Optional[TideInfo] = Field(default=None, description="Tidal height and timing predictions")
    recommendations: List[OperationalRecommendation] = Field(default_factory=list, description="Reliable operational recommendations with supporting evidence and reasoning")
    location_lat: float = Field(..., description="Inquiry latitude coordinate")
    location_lon: float = Field(..., description="Inquiry longitude coordinate")
    date: str = Field(..., description="Inquiry forecast date string")
    connectivity_mode: str = Field(default="LIVE", description="Network resilience state ('LIVE', 'CACHED', 'DEGRADED', 'OFFLINE')")


class LanguageIdentificationResult(BaseModel):
    """Structured result produced by the Language Identification Service (Sarvam / Fallback)."""
    language_code: str = Field(..., description="Full language code (e.g. 'gu-IN', 'hi-IN', 'mr-IN', 'en-IN')")
    script_code: Optional[str] = Field(default=None, description="Script code (e.g. 'Gujr', 'Deva', 'Latn', 'Taml', etc.)")
    request_id: Optional[str] = Field(default=None, description="Provider request identifier from API if available")
    provider: str = Field(default="sarvam", description="Identification source ('sarvam', 'bhashini', 'deterministic_fallback', 'session_cache')")
    detection_status: str = Field(default="SARVAM_DETECTED", description="Status tier ('SARVAM_DETECTED', 'FALLBACK_DETECTED')")
    short_code: str = Field(default="en", description="2-letter ISO 639-1 code (e.g. 'gu', 'hi', 'mr', 'en')")
    language_name: str = Field(default="English", description="Human-readable language name")


class GeofenceItem(BaseModel):
    """Individual geofence zone proximity evaluation."""
    name: str = Field(..., description="Zone or boundary name")
    type: str = Field(..., description="Boundary type ('IMBL', 'MPA', 'SECURITY', 'HAZARD', 'RESTRICTED')")
    distance_km: float = Field(..., description="Distance from vessel to boundary in km")
    distance_nm: float = Field(..., description="Distance from vessel to boundary in nautical miles")
    is_inside: bool = Field(default=False, description="Whether vessel is inside this zone")
    threshold_nm: float = Field(default=12.0, description="Alert threshold distance in nautical miles")
    alert_active: bool = Field(default=False, description="Whether proximity alert is active")
    severity: str = Field(default="NORMAL", description="Alert severity ('NORMAL', 'ADVISORY', 'WARNING', 'CRITICAL')")
    description: Optional[str] = Field(default=None, description="Zone description")
    coordinates: List[List[float]] = Field(default_factory=list, description="Boundary polygon/polyline vertices")


class GeofenceEvidence(BaseModel):
    """Structured geofence evaluation bundle produced by the Geofence Spatial Engine."""
    vessel_lat: float = Field(..., description="Vessel latitude evaluated")
    vessel_lon: float = Field(..., description="Vessel longitude evaluated")
    active_alerts: List[GeofenceItem] = Field(default_factory=list, description="Zones with active proximity alerts")
    nearest_boundary: Optional[GeofenceItem] = Field(default=None, description="Closest boundary zone")
    has_critical_violation: bool = Field(default=False, description="Whether any critical boundary violation exists")
    source: str = Field(default="geofence_spatial_engine", description="Evaluation engine provenance")
    is_mock: bool = Field(default=False, description="Whether evaluation used mock data")
