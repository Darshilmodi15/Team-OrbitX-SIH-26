"""
Normalized Potential Fishing Zone (PFZ) feed adapter.

Retrieves and validates operational PFZ advisories from INCOIS (ESSO-INCOIS, Ministry
of Earth Sciences, Govt. of India) across 14 named advisory sectors.
Enforces timestamp integrity, coordinate bounds, issuing authority attribution,
conservative cache expiry, and explicit coverage gap reporting.
"""
from datetime import datetime, timedelta, timezone
import copy
import logging
import math
import os
import threading
from typing import Any, Dict, Optional

import httpx
from app.services.provider_health import record

logger = logging.getLogger(__name__)

# Sector names follow INCOIS. Bounds below are approximate ORCA selection hints,
# not official sector polygons, jurisdiction boundaries or navigation limits.
COASTAL_SECTORS: Dict[str, Dict[str, Any]] = {
    "gujarat": {
        "id": "gujarat",
        "name": "Gujarat Coastal Sector",
        "state": "Gujarat",
        "bounds": {"lat_min": 20.0, "lat_max": 24.5, "lon_min": 68.0, "lon_max": 73.0},
        "languages": ["gu", "hi", "en"],
        "landing_centres": ["Veraval", "Porbandar", "Mangrol", "Okha", "Jakhau", "Mandvi"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
    },
    "maharashtra": {
        "id": "maharashtra",
        "name": "Maharashtra Coastal Sector",
        "state": "Maharashtra",
        "bounds": {"lat_min": 15.8, "lat_max": 20.2, "lon_min": 72.0, "lon_max": 73.5},
        "languages": ["mr", "hi", "en"],
        "landing_centres": ["Sassoon Dock", "Versova", "New Ferry Wharf", "Dahanu", "Ratnagiri", "Malvan"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
    },
    "goa": {
        "id": "goa",
        "name": "Goa Coastal Sector",
        "state": "Goa",
        "bounds": {"lat_min": 14.9, "lat_max": 15.8, "lon_min": 73.6, "lon_max": 74.3},
        "languages": ["mr", "hi", "en"],
        "landing_centres": ["Panaji", "Malim", "Mormugao", "Cutbona", "Chapora"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
    },
    "karnataka": {
        "id": "karnataka",
        "name": "Karnataka Coastal Sector",
        "state": "Karnataka",
        "bounds": {"lat_min": 11.5, "lat_max": 15.0, "lon_min": 74.0, "lon_max": 75.0},
        "languages": ["kn", "hi", "en"],
        "landing_centres": ["Mangaluru Old Port", "Malpe", "Karwar", "Tadadi", "Honnavar"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
    },
    "kerala": {
        "id": "kerala",
        "name": "Kerala Coastal Sector",
        "state": "Kerala",
        "bounds": {"lat_min": 8.2, "lat_max": 12.8, "lon_min": 75.0, "lon_max": 77.5},
        "languages": ["ml", "hi", "en"],
        "landing_centres": ["Kochi Marine Terminal", "Neendakara", "Munambam", "Vizhinjam", "Beypore"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
    },
    "north_tamil_nadu": {
        "id": "north_tamil_nadu", "name": "North Tamil Nadu", "state": "Tamil Nadu",
        "bounds": {"lat_min": 10.5, "lat_max": 13.5, "lon_min": 79.0, "lon_max": 81.0},
        "languages": ["ta", "hi", "en"], "landing_centres": ["Chennai", "Cuddalore", "Nagapattinam"],
    },
    "south_tamil_nadu": {
        "id": "south_tamil_nadu", "name": "South Tamil Nadu", "state": "Tamil Nadu",
        "bounds": {"lat_min": 7.5, "lat_max": 10.5, "lon_min": 77.0, "lon_max": 80.5},
        "languages": ["ta", "hi", "en"], "landing_centres": ["Rameswaram", "Thoothukudi", "Kanyakumari"],
    },
    "north_andhra_pradesh": {
        "id": "north_andhra_pradesh", "name": "North Andhra Pradesh", "state": "Andhra Pradesh",
        "bounds": {"lat_min": 16.0, "lat_max": 19.2, "lon_min": 81.5, "lon_max": 85.0},
        "languages": ["te", "hi", "en"], "landing_centres": ["Visakhapatnam", "Kakinada", "Bhavanapadu"],
    },
    "south_andhra_pradesh": {
        "id": "south_andhra_pradesh", "name": "South Andhra Pradesh", "state": "Andhra Pradesh",
        "bounds": {"lat_min": 13.5, "lat_max": 16.0, "lon_min": 79.5, "lon_max": 82.0},
        "languages": ["te", "hi", "en"], "landing_centres": ["Machilipatnam", "Nizampatnam"],
    },
    "odisha": {
        "id": "odisha",
        "name": "Odisha Coastal Sector",
        "state": "Odisha",
        "bounds": {"lat_min": 19.0, "lat_max": 22.0, "lon_min": 84.5, "lon_max": 87.5},
        "languages": ["or", "hi", "en"],
        "landing_centres": ["Paradip Marine Belt", "Dhamra", "Gopalpur", "Chandipur", "Astaranga"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
    },
    "west_bengal": {
        "id": "west_bengal",
        "name": "West Bengal Coastal Sector",
        "state": "West Bengal",
        "bounds": {"lat_min": 21.5, "lat_max": 22.5, "lon_min": 87.5, "lon_max": 89.2},
        "languages": ["bn", "hi", "en"],
        "landing_centres": ["Digha", "Kakdwip", "Fraserganj", "Diamond Harbour", "Namkhana"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
    },
    "lakshadweep": {
        "id": "lakshadweep",
        "name": "Lakshadweep Island Sector",
        "state": "Lakshadweep",
        "bounds": {"lat_min": 8.0, "lat_max": 12.5, "lon_min": 71.5, "lon_max": 74.0},
        "languages": ["ml", "en"],
        "landing_centres": ["Kavaratti", "Agatti", "Andrott", "Minicoy"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
    },
    "andaman": {
        "id": "andaman", "name": "Andaman Islands", "state": "Andaman and Nicobar Islands",
        "bounds": {"lat_min": 10.5, "lat_max": 14.0, "lon_min": 91.5, "lon_max": 94.5},
        "languages": ["hi", "bn", "ta", "en"], "landing_centres": ["Sri Vijaya Puram (Port Blair)", "Mayabunder"],
    },
    "nicobar": {
        "id": "nicobar", "name": "Nicobar Islands", "state": "Andaman and Nicobar Islands",
        "bounds": {"lat_min": 6.5, "lat_max": 10.5, "lon_min": 91.5, "lon_max": 94.5},
        "languages": ["hi", "ta", "en"], "landing_centres": ["Campbell Bay", "Car Nicobar"],
    },
}

LANGUAGES = {"en", "hi", "gu", "mr", "ta", "te", "ml", "bn", "kn", "or", "pa"}


def detect_sector_from_coords(lat: float, lon: float) -> Optional[str]:
    """Return an unambiguous approximate sector hint; never silently choose overlap."""
    if isinstance(lat, bool) or isinstance(lon, bool) or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)) or not math.isfinite(lat) or not math.isfinite(lon):
        return None
    matches = [sid for sid, info in COASTAL_SECTORS.items()
               if info["bounds"]["lat_min"] <= lat <= info["bounds"]["lat_max"]
               and info["bounds"]["lon_min"] <= lon <= info["bounds"]["lon_max"]]
    return matches[0] if len(matches) == 1 else None


def _date(value):
    if not isinstance(value, str) or "T" not in value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo is not None and parsed.utcoffset() is not None else None
    except ValueError:
        return None


def _number(value, minimum=0, maximum=float("inf")):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        return None
    return value if minimum <= value <= maximum else None


class IncoisPFZService:
    """Validated normalized-feed adapter. A URL alone is not proof of official access.

    Public INCOIS WFS uses a different geometry schema and does not expose expiry
    in the inspected features. Do not point this adapter at WFS or infer expiry.
    """
    def __init__(self, api_url=None, timeout_sec=5.0, verify_ssl=True):
        self.api_url = (os.getenv("INCOIS_PFZ_API_URL", "") if api_url is None else api_url).strip()
        self.timeout_sec = float(os.getenv("INCOIS_PFZ_TIMEOUT_SEC", timeout_sec))
        self.verify_ssl = verify_ssl
        self._cache = {}
        self._lock = threading.RLock()
        self._key_locks = {}

    def get_sectors(self):
        return [{**copy.deepcopy(info), "bounds_kind": "approximate_selection_hint", "metadata_source": "ORCA sector catalogue; names from INCOIS", "issuing_authority": None} for info in COASTAL_SECTORS.values()]

    def _unavailable(self, sector, language, code, reason, **extra):
        info = COASTAL_SECTORS.get(sector, {})
        return {"source": "unavailable", "data_mode": "unavailable", "status": "unavailable",
                "issued_at": None, "valid_until": None, "retrieved_at": None, "pfz_zones": [],
                "sector": sector or None, "sector_name": info.get("name"), "language": language,
                "issuing_authority": None, "coverage_status": "unconfigured" if code == "NOT_CONFIGURED" else "coverage_gap",
                "landing_centres": info.get("landing_centres", []), "reason_code": code, "reason": reason, **extra}

    def get_advisory(self, sector=None, lat=None, lon=None, language="en"):
        sector = (sector or "").strip().lower()
        if sector and sector not in COASTAL_SECTORS:
            return self._unavailable(sector, language, "INVALID_SECTOR", "Unknown advisory sector")
        if language not in LANGUAGES:
            return self._unavailable(sector, language, "INVALID_LANGUAGE", "Unsupported language")
        if (lat is None) != (lon is None):
            return self._unavailable(sector, language, "INVALID_COORDINATES", "Latitude and longitude are required together")
        if lat is not None:
            if _number(lat, -90, 90) is None or _number(lon, -180, 180) is None:
                return self._unavailable(sector, language, "INVALID_COORDINATES", "Invalid coordinate pair")
            if not sector:
                sector = detect_sector_from_coords(lat, lon)
                if not sector:
                    return self._unavailable("", language, "SECTOR_SELECTION_REQUIRED", "Choose an advisory sector; coordinates do not resolve unambiguously")
        sector = sector or ""
        if not self.api_url:
            return self._unavailable(sector, language, "NOT_CONFIGURED", "No timestamped current PFZ advisory feed is configured")
        # Keys are bounded by the sector/language catalogue. Coordinates are not cache keys.
        key = (sector, language)
        with self._lock:
            guard = self._key_locks.setdefault(key, threading.Lock())
        with guard:
            now = datetime.now(timezone.utc)
            cached = self._cache.get(key)
            if cached and cached["refresh_at"] > now:
                result = copy.deepcopy(cached["data"])
                if result["status"] == "current": result["data_mode"] = "cached"
                return result
            try:
                with httpx.Client(timeout=self.timeout_sec, verify=self.verify_ssl) as client:
                    resp = client.get(self.api_url, params={"sector": sector, "language": language})
                    if resp.status_code != 200:
                        result = self._unavailable(sector, language, f"HTTP_{resp.status_code}", f"PFZ provider returned HTTP {resp.status_code}")
                    else:
                        result = self._validate_and_format_provider_response(resp.json(), sector, COASTAL_SECTORS.get(sector, {}).get("name"), [], datetime.now(timezone.utc), language)
            except httpx.TimeoutException:
                result = self._unavailable(sector, language, "UPSTREAM_TIMEOUT", "PFZ provider timed out")
            except (ValueError, TypeError):
                result = self._unavailable(sector, language, "INVALID_PAYLOAD", "PFZ provider returned an invalid payload")
            except httpx.HTTPError:
                result = self._unavailable(sector, language, "UPSTREAM_UNREACHABLE", "PFZ provider could not be reached")
            now = datetime.now(timezone.utc)
            result["retrieved_at"] = now.isoformat()
            refresh_at = now + timedelta(seconds=300 if result["status"] == "current" else 30)
            if result["status"] == "current": refresh_at = min(refresh_at, _date(result["valid_until"]))
            self._cache[key] = {"data": result, "refresh_at": refresh_at}
            record("incois_pfz", success=result["status"] in {"current", "expired"}, reason=result.get("reason_code"),
                   data_timestamp=result.get("issued_at"), mode=result["data_mode"])
            return copy.deepcopy(result)

    def _validate_and_format_provider_response(self, raw, sector, sector_name, landing_centres, now_utc, language="en"):
        def reject(code, reason): return self._unavailable(sector, language, code, reason)
        if not isinstance(raw, dict): return reject("INVALID_PAYLOAD", "PFZ provider payload must be an object")
        source = raw.get("source")
        if raw.get("is_demonstration") is True or raw.get("is_mock") is True or raw.get("data_mode") not in ("live", "fresh", "cached"):
            return reject("UNVERIFIED_SOURCE", "PFZ provider marked this advisory as unverified")
        if not isinstance(source, str) or not source.strip() or source.strip().lower() in {"unavailable", "mock", "demo", "synthetic"}:
            return reject("UNVERIFIED_SOURCE", "PFZ advisory source is missing or unverified")
        if sector and raw.get("sector") != sector:
            return reject("SECTOR_MISMATCH", "PFZ provider did not confirm the requested sector")
        if raw.get("language", language) != language:
            return reject("LANGUAGE_MISMATCH", "PFZ provider returned a different language")
        issued, valid = _date(raw.get("issued_at")), _date(raw.get("valid_until"))
        if not issued or not valid: return reject("INVALID_TIMESTAMPS", "Issue and expiry must contain an explicit timezone")
        if issued > now_utc: return reject("FUTURE_ISSUE", "Advisory issue timestamp is in the future")
        if valid <= issued: return reject("INVALID_VALIDITY", "Advisory expiry must follow its issue timestamp")
        expired = valid <= now_utc
        zones = raw.get("pfz_zones")
        if not isinstance(zones, list): return reject("INVALID_POINTS", "PFZ points must be an array")
        points = []
        for i, z in enumerate(zones):
            if not isinstance(z, dict) or z.get("is_demonstration") is True or z.get("is_mock") is True: continue
            lat, lon = _number(z.get("latitude"), -90, 90), _number(z.get("longitude"), -180, 180)
            if lat is None or lon is None: continue
            points.append({"id": str(z.get("id", f"pfz-{i}")), "latitude": lat, "longitude": lon,
                           "landing_centre": z.get("landing_centre") if isinstance(z.get("landing_centre"), str) else "PFZ",
                           "distance_km": _number(z.get("distance_km")), "bearing_deg": _number(z.get("bearing_deg"), 0, 360),
                           "depth_m": _number(z.get("depth_m")),
                           "species": [s for s in z.get("species", []) if isinstance(s, str) and s.strip()] if isinstance(z.get("species"), list) else []})
        # Empty/invalid data does not prove the authority issued no advisory.
        no_advisory = not zones and raw.get("coverage_status") == "no_advisory_issued"
        if not points and not no_advisory and not expired: return reject("NO_VALID_POINTS", "No verified advisory points were supplied")
        return {"source": source.strip(), "data_mode": "stale" if expired else "cached" if raw.get("data_mode") == "cached" else "live", "status": "expired" if expired else "current",
                "issued_at": issued.isoformat(), "valid_until": valid.isoformat(), "sector": sector or raw.get("sector"),
                "sector_name": sector_name, "language": language,
                "issuing_authority": raw.get("issuing_authority") if isinstance(raw.get("issuing_authority"), str) else None,
                "coverage_status": "expired" if expired else "no_advisory_issued" if no_advisory else "active",
                "landing_centres": COASTAL_SECTORS.get(sector, {}).get("landing_centres", []),
                "pfz_zones": [] if expired else points, "reason_code": "EXPIRED" if expired else None,
                "reason": "Advisory expired" if expired else None}


incois_pfz_service = IncoisPFZService()
