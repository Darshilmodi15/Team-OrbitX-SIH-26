"""Potential Fishing Zone (PFZ) agent responsible for retrieving and structuring PFZ evidence."""
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
        return parts if parts else [raw_species.strip()]
    return ["Mixed Pelagic Species"]


def get_pfz_zones_evidence(
    provider: PFZProvider,
    lat: float,
    lon: float,
) -> List[PFZEvidence]:
    """
    Fetches Potential Fishing Zones from the underlying provider and formats them into PFZEvidence contracts.
    """
    raw_zones: List[Dict[str, Any]] = provider.get_pfz_zones(lat=lat, lon=lon)
    evidence_list: List[PFZEvidence] = []

    for z in raw_zones:
        name = str(z.get("name", "Potential Fishing Zone"))
        is_mock = not ("INCOIS" in name or "incois" in str(z.get("zone_id", "")).lower())
        source = "incois_derived_pfz_dataset" if not is_mock else "mock_pfz_generator"

        evidence_list.append(
            PFZEvidence(
                name=name,
                latitude=float(z.get("lat", lat)),
                longitude=float(z.get("lon", lon)),
                distance_km=float(z.get("distance_km", 0.0)),
                depth_m=float(z["depth_m"]) if z.get("depth_m") is not None else None,
                species=_parse_species(z.get("dominant_species", [])),
                source=source,
                is_mock=is_mock,
            )
        )

    return evidence_list
