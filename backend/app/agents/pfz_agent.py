"""Potential Fishing Zone (PFZ) agent responsible for retrieving and structuring PFZ evidence."""
import math
from typing import Any, Dict, List
from app.data.pfz.base import PFZProvider
from app.models.agent_models import PFZEvidence


def _parse_species(raw_species: Any) -> List[str]:
    """Normalizes raw species descriptions into clean lists."""
    if isinstance(raw_species, list):
        return [str(s).strip() for s in raw_species if str(s).strip()]
    if isinstance(raw_species, str):
        cleaned = raw_species.replace("(INCOIS Advisory)", "").strip()
        parts = [p.strip() for p in cleaned.replace("&", ",").split(",") if p.strip()]
        return parts
    return []


def get_pfz_zones_evidence(
    provider: PFZProvider,
    lat: float,
    lon: float,
    wave_height_m: float = None,
) -> List[PFZEvidence]:
    """
    Fetches Potential Fishing Zones from the underlying provider and formats them into PFZEvidence contracts.
    Annotates bearing, landing centre, and operational marine suitability.
    """
    raw_zones: List[Dict[str, Any]] = provider.get_pfz_zones(lat=lat, lon=lon)
    evidence_list: List[PFZEvidence] = []

    for z in raw_zones:
        name = str(z.get("name", "Potential Fishing Zone"))
        source = z.get("source")
        is_mock = z.get("is_mock") is not False or not isinstance(source, str) or not source.strip()
        if is_mock:
            continue
        dist = z.get("distance_km")
        if not isinstance(dist, (int, float)) or isinstance(dist, bool) or not math.isfinite(dist) or dist < 0:
            continue

        evidence_list.append(
            PFZEvidence(
                name=name,
                latitude=float(z.get("lat", lat)),
                longitude=float(z.get("lon", lon)),
                distance_km=dist,
                depth_m=float(z["depth_m"]) if z.get("depth_m") is not None else None,
                species=_parse_species(z.get("dominant_species", [])),
                bearing_deg=float(z["bearing_deg"]) if z.get("bearing_deg") is not None else None,
                landing_centre=str(z.get("landing_centre", "Offshore")),
                suitability_score=None,
                suitability_reason="PFZ presence alone does not establish catch probability or transit safety.",
                source=source,
                is_mock=is_mock,
            )
        )

    return evidence_list

