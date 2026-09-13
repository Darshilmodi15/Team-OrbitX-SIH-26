"""
Official INCOIS Potential Fishing Zone (PFZ) machine-readable feed service.

Retrieves and validates operational PFZ advisories from INCOIS (ESSO-INCOIS, Ministry
of Earth Sciences, Govt. of India) across 11 official coastal sectors.
Enforces timestamp integrity, coordinate bounds, issuing authority attribution,
conservative cache expiry, and explicit coverage gap reporting.
"""
from datetime import datetime, timezone
import logging
import math
import os
import threading
from typing import Any, Dict, List, Optional, Tuple

import httpx
from app.services.provider_health import record

logger = logging.getLogger(__name__)

# 11 Official Indian Coastal Sectors recognized by INCOIS Marine Fisheries Advisory Services
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
    "tamil_nadu": {
        "id": "tamil_nadu",
        "name": "Tamil Nadu & Puducherry Coastal Sector",
        "state": "Tamil Nadu",
        "bounds": {"lat_min": 8.0, "lat_max": 13.5, "lon_min": 77.5, "lon_max": 80.5},
        "languages": ["ta", "hi", "en"],
        "landing_centres": ["Kasimedu (Chennai)", "Rameswaram", "Cuddalore", "Nagapattinam", "Thoothukudi"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
    },
    "andhra_pradesh": {
        "id": "andhra_pradesh",
        "name": "Andhra Pradesh Coastal Sector",
        "state": "Andhra Pradesh",
        "bounds": {"lat_min": 13.5, "lat_max": 19.2, "lon_min": 80.0, "lon_max": 85.0},
        "languages": ["te", "hi", "en"],
        "landing_centres": ["Visakhapatnam Harbor", "Kakinada", "Machilipatnam", "Nizampatnam", "Bhavanapadu"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
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
    "andaman_nicobar": {
        "id": "andaman_nicobar",
        "name": "Andaman & Nicobar Island Sector",
        "state": "Andaman & Nicobar",
        "bounds": {"lat_min": 6.5, "lat_max": 14.0, "lon_min": 92.0, "lon_max": 94.0},
        "languages": ["hi", "bn", "ta", "en"],
        "landing_centres": ["Port Blair", "Junglighat", "Mayabunder", "Campbell Bay"],
        "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
    },
}


def detect_sector_from_coords(lat: float, lon: float) -> Optional[str]:
    """Matches coordinates to the most likely coastal sector based on bounding boxes."""
    if not (Number := (float, int)) or not isinstance(lat, Number) or not isinstance(lon, Number):
        return None
    for sec_id, info in COASTAL_SECTORS.items():
        b = info["bounds"]
        if b["lat_min"] <= lat <= b["lat_max"] and b["lon_min"] <= lon <= b["lon_max"]:
            return sec_id
    return None


class IncoisPFZService:
    """
    Authoritative service managing machine-readable INCOIS Potential Fishing Zone advisories.
    Enforces conservative cache expiry, rejects synthetic/expired inputs, and records provider health.
    """

    def __init__(
        self,
        api_url: Optional[str] = None,
        timeout_sec: float = 5.0,
        verify_ssl: bool = True,
    ):
        self.api_url = (api_url or os.getenv("INCOIS_PFZ_API_URL", "")).strip().rstrip("/")
        self.timeout_sec = float(os.getenv("INCOIS_PFZ_TIMEOUT_SEC", timeout_sec))
        self.verify_ssl = verify_ssl
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.RLock()

    def get_sectors(self) -> List[Dict[str, Any]]:
        """Returns all 11 coastal sectors with metadata and current status."""
        sectors = []
        for sec_id, info in COASTAL_SECTORS.items():
            sectors.append({
                "id": sec_id,
                "name": info["name"],
                "state": info["state"],
                "languages": info["languages"],
                "bounds": info["bounds"],
                "landing_centres": info["landing_centres"],
                "issuing_authority": info["issuing_authority"],
            })
        return sectors

    def get_advisory(
        self,
        sector: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Retrieves PFZ advisory for the requested sector or coordinate.
        Validates timestamps and returns explicit availability without fabricating zones.
        """
        target_sector = (sector or "").strip().lower()
        if not target_sector and lat is not None and lon is not None:
            target_sector = detect_sector_from_coords(lat, lon) or ""

        sec_info = COASTAL_SECTORS.get(target_sector)
        sec_name = sec_info["name"] if sec_info else ("All Coastal Sectors" if not target_sector else target_sector.title())
        landing_centres = sec_info["landing_centres"] if sec_info else []

        now_utc = datetime.now(timezone.utc)

        # 1. Check in-memory cache
        with self._lock:
            cached = self._cache.get(target_sector)
            if cached:
                valid_until_dt = cached.get("_valid_until_dt")
                if valid_until_dt and valid_until_dt > now_utc:
                    # Fresh cached advisory
                    return cached["data"]

        # 2. If live machine-readable API URL is configured, attempt fetch
        if self.api_url:
            try:
                endpoint = f"{self.api_url}?sector={target_sector}" if target_sector else self.api_url
                with httpx.Client(timeout=self.timeout_sec, verify=self.verify_ssl) as client:
                    resp = client.get(endpoint)
                    if resp.status_code == 200:
                        raw = resp.json()
                        validated = self._validate_and_format_provider_response(
                            raw=raw,
                            sector=target_sector,
                            sector_name=sec_name,
                            landing_centres=landing_centres,
                            now_utc=now_utc,
                        )
                        if validated["status"] == "current":
                            valid_until_dt = datetime.fromisoformat(validated["valid_until"].replace("Z", "+00:00"))
                            with self._lock:
                                self._cache[target_sector] = {
                                    "data": validated,
                                    "_valid_until_dt": valid_until_dt,
                                }
                            record("incois_pfz", success=True, http_status=200, data_timestamp=validated["valid_until"], mode="live")
                            return validated
                        elif validated["status"] == "expired":
                            record("incois_pfz", success=True, http_status=200, data_timestamp=validated.get("valid_until"), mode="stale")
                            return validated
                        else:
                            record("incois_pfz", success=False, reason="INVALID_ADVISORY_PAYLOAD")
                            return validated
                    else:
                        logger.warning("INCOIS PFZ feed returned status %d", resp.status_code)
                        record("incois_pfz", success=False, http_status=resp.status_code, reason=f"HTTP_{resp.status_code}")
            except Exception as exc:
                logger.warning("INCOIS PFZ feed request failed: %s", type(exc).__name__)
                record("incois_pfz", success=False, reason=type(exc).__name__)
        else:
            record("incois_pfz", success=False, reason="NOT_CONFIGURED")

        # 3. Truthful unconfigured/unavailable response (no live feed or upstream unreachable)
        res = {
            "source": "unavailable",
            "data_mode": "unavailable",
            "issued_at": None,
            "valid_until": None,
            "pfz_zones": [],
            "reason": "No timestamped current PFZ advisory feed is configured",
        }
        if target_sector:
            res.update({
                "status": "unavailable",
                "sector": target_sector,
                "sector_name": sec_name,
                "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
                "coverage_status": "coverage_gap",
                "landing_centres": landing_centres,
            })
        return res

    def _validate_and_format_provider_response(
        self,
        raw: Dict[str, Any],
        sector: str,
        sector_name: str,
        landing_centres: List[str],
        now_utc: datetime,
    ) -> Dict[str, Any]:
        """
        Rigorously validates upstream INCOIS feed payload:
        - Must contain timezone-aware issued_at and valid_until
        - Rejects future issued_at and expired valid_until
        - Rejects demonstration flags or NaN coordinates
        """
        issued_at_str = raw.get("issued_at")
        valid_until_str = raw.get("valid_until")

        if not issued_at_str or not valid_until_str:
            return {
                "source": "unavailable",
                "data_mode": "unavailable",
                "status": "unavailable",
                "issued_at": None,
                "valid_until": None,
                "sector": sector or None,
                "sector_name": sector_name,
                "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
                "coverage_status": "coverage_gap",
                "landing_centres": landing_centres,
                "pfz_zones": [],
                "reason": "Upstream advisory missing mandatory issue/expiry timestamps",
            }

        try:
            issued_dt = datetime.fromisoformat(str(issued_at_str).replace("Z", "+00:00"))
            valid_dt = datetime.fromisoformat(str(valid_until_str).replace("Z", "+00:00"))
            if issued_dt.tzinfo is None:
                issued_dt = issued_dt.replace(tzinfo=timezone.utc)
            if valid_dt.tzinfo is None:
                valid_dt = valid_dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            return {
                "source": "unavailable",
                "data_mode": "unavailable",
                "status": "unavailable",
                "issued_at": None,
                "valid_until": None,
                "sector": sector or None,
                "sector_name": sector_name,
                "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
                "coverage_status": "coverage_gap",
                "landing_centres": landing_centres,
                "pfz_zones": [],
                "reason": "Upstream advisory contains invalid date formats",
            }

        # Issue date cannot be in the future
        if issued_dt > now_utc:
            return {
                "source": "unavailable",
                "data_mode": "unavailable",
                "status": "unavailable",
                "issued_at": None,
                "valid_until": None,
                "sector": sector or None,
                "sector_name": sector_name,
                "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
                "coverage_status": "coverage_gap",
                "landing_centres": landing_centres,
                "pfz_zones": [],
                "reason": "Advisory issue timestamp is in the future",
            }

        # Expiry must be after issue date
        if valid_dt <= issued_dt:
            return {
                "source": "unavailable",
                "data_mode": "unavailable",
                "status": "unavailable",
                "issued_at": None,
                "valid_until": None,
                "sector": sector or None,
                "sector_name": sector_name,
                "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
                "coverage_status": "coverage_gap",
                "landing_centres": landing_centres,
                "pfz_zones": [],
                "reason": "Advisory valid_until timestamp precedes or equals issued_at",
            }

        # Check if already expired
        is_expired = valid_dt <= now_utc

        # Filter valid numeric coordinates
        valid_points: List[Dict[str, Any]] = []
        raw_zones = raw.get("pfz_zones") or raw.get("points") or []
        if isinstance(raw_zones, list):
            for idx, z in enumerate(raw_zones):
                if not isinstance(z, dict) or z.get("is_demonstration") is True:
                    continue
                lat = z.get("latitude") if z.get("latitude") is not None else z.get("lat")
                lon = z.get("longitude") if z.get("longitude") is not None else z.get("lon")
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                except (ValueError, TypeError):
                    continue
                if not math.isfinite(lat_f) or not math.isfinite(lon_f) or abs(lat_f) > 90 or abs(lon_f) > 180:
                    continue

                valid_points.append({
                    "id": str(z.get("id", f"pfz-{idx}")),
                    "latitude": round(lat_f, 4),
                    "longitude": round(lon_f, 4),
                    "landing_centre": str(z.get("landing_centre", "Offshore")),
                    "distance_km": float(z["distance_km"]) if z.get("distance_km") is not None else None,
                    "bearing_deg": float(z["bearing_deg"]) if z.get("bearing_deg") is not None else None,
                    "depth_m": float(z["depth_m"]) if z.get("depth_m") is not None else None,
                    "species": z.get("species") or ["Pelagic Species"],
                })

        source_name = str(raw.get("source") or "INCOIS PFZ Advisory")
        status = "expired" if is_expired else "current"
        data_mode = "stale" if is_expired else "live"

        return {
            "source": source_name,
            "data_mode": data_mode,
            "status": status,
            "issued_at": issued_dt.isoformat(),
            "valid_until": valid_dt.isoformat(),
            "sector": sector or None,
            "sector_name": sector_name,
            "issuing_authority": "ESSO-INCOIS, Ministry of Earth Sciences, Govt. of India",
            "coverage_status": "expired" if is_expired else "active" if valid_points else "no_advisory_issued",
            "landing_centres": landing_centres,
            "pfz_zones": valid_points,
            "reason": "Advisory expired" if is_expired else None,
        }


incois_pfz_service = IncoisPFZService()
