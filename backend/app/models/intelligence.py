"""Evidence classes do not equate occurrence, habitat models and advisories."""
from typing import Literal
from pydantic import BaseModel, Field


class SpeciesEvidence(BaseModel):
    species_name: str
    scientific_name: str
    evidence_type: Literal["OFFICIAL_ADVISORY", "HABITAT_SUITABILITY_MODEL", "HISTORICAL_OCCURRENCE"]
    suitability_score: float | None = Field(default=None, ge=0, le=1)
    occurrence_count: int | None = None
    advisory_id: str | None = None
    location: dict
    data_period: dict
    source: str
    source_url: str
    datasets: list[str] = Field(default_factory=list)
    confidence: str
    disclaimer: str


class DataProvenance(BaseModel):
    parameter: str
    value: float | int | None
    unit: str | None
    provider: str
    product: str | None = None
    evidence_type: str
    platform: str | None = None
    sensor: str | None = None
    satellite: str | None = None
    band_or_frequency: str | None = None
    spatial_resolution: str | None = None
    temporal_resolution: str | None = None
    sampled_lat: float | None = None
    sampled_lon: float | None = None
    observation_time: str | None = None
    forecast_valid_time: str | None = None
    retrieved_at: str | None = None
    source_url: str | None = None
    cache_status: str
