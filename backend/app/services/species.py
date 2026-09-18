"""Bounded OBIS historical records; never a live fish-presence detector."""
import math
from datetime import datetime, timezone
import httpx
from app.models.intelligence import SpeciesEvidence
from app.services.intelligence_cache import EvidenceCache

OBIS_URL = "https://api.obis.org/v3/occurrence"
DISCLAIMER = "Historical occurrence, not live fish detection or a catch forecast. Counts and latest dates describe only the returned sample."


def utcnow():
    return datetime.now(timezone.utc).isoformat()


class SpeciesService:
    def __init__(self):
        self.cache = EvidenceCache()

    def get(self, lat, lon):
        return self.cache.resolve((lat, lon), lambda: self._fetch(lat, lon))

    def _fetch(self, lat, lon):
        dy = 25 / 111.32
        dx = dy / max(0.1, math.cos(math.radians(lat)))
        west, east = max(-180, lon-dx), min(180, lon+dx)
        south, north = max(-90, lat-dy), min(90, lat+dy)
        geometry = f"POLYGON(({west} {south},{east} {south},{east} {north},{west} {north},{west} {south}))"
        base = {"status": "unavailable", "evidence": [], "points": [], "source": "OBIS", "source_url": "https://obis.org/manual/access/",
                "retrieved_at": utcnow(), "cache_status": "fresh", "sample_limit": 100,
                "query_bounds": [west, south, east, north], "disclaimer": DISCLAIMER}
        try:
            with httpx.Client(timeout=15, follow_redirects=False) as client:
                response = client.get(OBIS_URL, params={"geometry": geometry, "size": 100, "absence": "false"})
                response.raise_for_status()
                payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("Invalid OBIS response")
            rows = payload.get("results")
            if not isinstance(rows, list):
                raise ValueError("Invalid OBIS response")
            grouped, points = {}, []
            for row in rows[:100]:
                if not isinstance(row, dict):
                    continue
                if row.get("absence") or row.get("dropped") or row.get("marine") is False:
                    continue
                name = row.get("scientificName")
                if not isinstance(name, str) or not name.strip() or str(row.get("taxonRank", "")).lower() != "species":
                    continue
                x, y = row.get("decimalLongitude"), row.get("decimalLatitude")
                if isinstance(x, bool) or isinstance(y, bool) or not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
                    continue
                if not west <= x <= east or not south <= y <= north:
                    continue
                date = row.get("eventDate")
                # Keep the original date/interval. Undated records remain undated.
                date = date[:100] if isinstance(date, str) else None
                item = grouped.setdefault(name, {"dates": [], "datasets": set(), "count": 0})
                item["count"] += 1
                if date: item["dates"].append(date)
                dataset = row.get("dataset_id")
                dataset = dataset[:100] if isinstance(dataset, str) else None
                if isinstance(dataset, str): item["datasets"].add(dataset[:100])
                points.append({"lat": y, "lon": x, "scientific_name": name[:200], "event_date": date, "dataset_id": dataset})
            records = []
            for name, item in sorted(grouped.items(), key=lambda pair: (-pair[1]["count"], pair[0]))[:20]:
                dates = sorted(item["dates"])
                records.append(SpeciesEvidence(species_name=name[:200], scientific_name=name[:200], evidence_type="HISTORICAL_OCCURRENCE",
                    occurrence_count=item["count"], location={"query_bounds": base["query_bounds"]},
                    data_period={"earliest_in_sample": dates[0] if dates else None, "latest_in_sample": dates[-1] if dates else None},
                    source="OBIS", source_url="https://obis.org/", datasets=sorted(item["datasets"]),
                    confidence="Presence in historical records only; sampling is not exhaustive", disclaimer=DISCLAIMER).model_dump())
            return {**base, "status": "available" if records else "empty", "evidence": records, "points": points,
                    "total_matching_records": payload.get("total"), "returned_records": len(rows[:100])}
        except (httpx.HTTPError, ValueError, TypeError):
            return {**base, "reason": "OBIS_UNAVAILABLE"}


species_service = SpeciesService()
