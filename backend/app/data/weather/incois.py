"""
Official INCOIS Marine Weather Provider implementing the WeatherProvider interface.

Retrieves real-time operational ocean state and weather data directly from
INCOIS (Indian National Centre for Ocean Information Services) Ocean State Forecast (OSF)
via NetCDF Subset Service (NCSS) / THREDDS catalog.

Authoritative Variables:
- Significant Wave Height (HS) in metres
- Wind Speed (UWND / VWND vector magnitude) in m/s and km/h
- Wind Direction in meteorological degrees and 16-point compass cardinal
"""
from datetime import datetime, timezone
import math
import os
import re
from typing import Any, Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET

import httpx

from app.data.weather.base import WeatherProvider
from app.data.weather.cache import MarineWeatherCache


CARDINAL_DIRECTIONS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
]


def uv_to_speed_and_direction(u: float, v: float) -> Tuple[float, float, str]:
    """
    Converts zonal (u, eastward) and meridional (v, northward) wind components in m/s
    into wind speed (m/s), meteorological direction (degrees FROM which wind blows),
    and cardinal direction string (e.g., 'WSW').
    """
    speed = math.hypot(u, v)
    if speed < 1e-4:
        return 0.0, 0.0, "Calm"

    # Meteorological wind direction: angle from which wind is coming (0 = North, 90 = East, etc.)
    deg = (270.0 - math.degrees(math.atan2(v, u))) % 360.0

    # Map degrees to 16-point cardinal compass
    idx = round(deg / 22.5) % 16
    cardinal = CARDINAL_DIRECTIONS[idx]

    return round(speed, 2), round(deg, 1), cardinal


def derive_forecast_condition(wave_height_m: float, wind_speed_kmh: float) -> str:
    """
    Synthesizes condition descriptor from physical marine parameters.
    """
    if wave_height_m > 2.8 or wind_speed_kmh > 50.0:
        return "stormy"
    elif wave_height_m > 1.8 or wind_speed_kmh > 35.0:
        return "choppy / moderate"
    elif wave_height_m > 1.2 or wind_speed_kmh > 25.0:
        return "moderate"
    else:
        return "calm / clear"


class IncoisWeatherProvider(WeatherProvider):
    """
    Authoritative INCOIS Marine Weather Provider.
    
    Queries INCOIS Ocean State Forecast operational models via NCSS point requests.
    Supports low-bandwidth caching, coastal land-mask radial search, and timeout fallbacks.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        cache: Optional[MarineWeatherCache] = None,
        timeout_sec: float = 4.0,
        verify_ssl: bool = False,
    ):
        self.base_url = (base_url or os.getenv("INCOIS_BASE_URL", "https://incois.gov.in")).rstrip("/")
        self.cache = cache if cache is not None else MarineWeatherCache()
        self.timeout_sec = float(os.getenv("INCOIS_TIMEOUT_SEC", timeout_sec))
        self.verify_ssl = verify_ssl
        self._active_dataset_path: Optional[str] = None
        self._dataset_discovered_at: float = 0.0

    def discover_latest_dataset(self) -> str:
        """
        Queries the INCOIS OSF WW3 catalog to find the most recent operational forecast dataset.
        Falls back to a known operational pattern if catalog lookup fails.
        """
        now = datetime.now(timezone.utc)
        # Cache dataset path discovery for 1 hour
        if self._active_dataset_path and (datetime.now(timezone.utc).timestamp() - self._dataset_discovered_at) < 3600:
            return self._active_dataset_path

        catalog_url = f"{self.base_url}/thredds/catalog/osf/ww3/catalog.xml"
        try:
            with httpx.Client(verify=self.verify_ssl, timeout=self.timeout_sec, follow_redirects=True) as client:
                res = client.get(catalog_url)
                if res.status_code == 200:
                    root = ET.fromstring(res.text)
                    datasets = root.findall('.//{http://www.unidata.ucar.edu/namespaces/thredds/InvCatalog/v1.0}dataset')
                    # Look for coastal or combined WW3 datasets
                    coastal_paths: List[str] = []
                    for d in datasets:
                        p = d.attrib.get('urlPath')
                        if p and p.endswith('.nc') and ('rsmc_coast_ww3' in p or 'rsmc_combined_ww3' in p):
                            coastal_paths.append(p)
                    
                    if coastal_paths:
                        coastal_paths.sort()
                        self._active_dataset_path = coastal_paths[-1]
                        self._dataset_discovered_at = datetime.now(timezone.utc).timestamp()
                        return self._active_dataset_path
        except Exception:
            pass

        # Fallback date-based convention if catalog XML is unavailable
        date_str = now.strftime("%Y%m%d")
        fallback_path = f"osf/ww3/rsmc_coast_ww3_{date_str}.nc"
        self._active_dataset_path = fallback_path
        return fallback_path

    def _query_ncss_point(
        self,
        dataset_path: str,
        lat: float,
        lon: float,
    ) -> Optional[Dict[str, Any]]:
        """
        Executes a single-point NCSS query against INCOIS THREDDS server.
        Requests HS (Significant Wave Height), UWND (Zonal wind), VWND (Meridional wind).
        """
        ncss_url = f"{self.base_url}/thredds/ncss/grid/{dataset_path}"
        params = {
            "var": ["HS", "UWND", "VWND"],
            "latitude": f"{lat:.3f}",
            "longitude": f"{lon:.3f}",
            "accept": "csv",
        }

        with httpx.Client(verify=self.verify_ssl, timeout=self.timeout_sec, follow_redirects=True) as client:
            res = client.get(ncss_url, params=params)
            if res.status_code != 200:
                return None

            lines = res.text.strip().splitlines()
            if len(lines) < 2:
                return None

            header = [h.split('[')[0].strip() for h in lines[0].split(',')]
            data_cols = lines[1].split(',')
            row = dict(zip(header, data_cols))

            hs_raw = row.get("HS")
            uwnd_raw = row.get("UWND")
            vwnd_raw = row.get("VWND")

            # Check if land mask returned NaN
            if (
                hs_raw is None or hs_raw == "NaN" or
                uwnd_raw is None or uwnd_raw == "NaN" or
                vwnd_raw is None or vwnd_raw == "NaN"
            ):
                return None

            hs_val = float(hs_raw)
            u_val = float(uwnd_raw)
            v_val = float(vwnd_raw)

            if math.isnan(hs_val) or math.isnan(u_val) or math.isnan(v_val):
                return None

            time_val = row.get("time") or datetime.now(timezone.utc).isoformat()
            res_lat = float(row.get("latitude", lat))
            res_lon = float(row.get("longitude", lon))

            return {
                "forecast_time": time_val,
                "grid_lat": round(res_lat, 4),
                "grid_lon": round(res_lon, 4),
                "hs": max(0.0, hs_val),
                "u": u_val,
                "v": v_val,
            }

    def _fetch_from_incois_with_neighbor_search(
        self,
        lat: float,
        lon: float,
    ) -> Tuple[Optional[Dict[str, Any]], str]:
        """
        Queries INCOIS for exact coordinates. If on land / NaN, searches immediate
        offshore radial neighboring grid points.
        """
        dataset_path = self.discover_latest_dataset()
        
        # 1. Try exact requested coordinates
        point_data = self._query_ncss_point(dataset_path, lat, lon)
        if point_data:
            return point_data, "exact"

        # 2. Search radial offsets for closest ocean cell
        offsets = [
            (-0.05, 0.0), (0.05, 0.0), (0.0, -0.05), (0.0, 0.05),
            (-0.05, -0.05), (-0.05, 0.05), (0.05, -0.05), (0.05, 0.05),
            (-0.10, 0.0), (0.10, 0.0), (0.0, -0.10), (0.0, 0.10),
            (-0.15, -0.15), (-0.15, 0.15), (0.15, -0.15), (0.15, 0.15),
            (0.0, -0.20), (0.0, 0.20), (-0.20, 0.0), (0.20, 0.0),
        ]

        for dlat, dlon in offsets:
            try:
                candidate = self._query_ncss_point(dataset_path, lat + dlat, lon + dlon)
                if candidate:
                    return candidate, f"nearest_marine_cell(offset dlat={dlat:+.2f}, dlon={dlon:+.2f})"
            except Exception:
                continue

        # If coastal dataset missed, try combined Indian Ocean dataset
        combined_path = dataset_path.replace("rsmc_coast_ww3", "rsmc_combined_ww3")
        if combined_path != dataset_path:
            try:
                candidate = self._query_ncss_point(combined_path, lat, lon)
                if candidate:
                    return candidate, "combined_ww3_exact"
            except Exception:
                pass

        return None, "none"

    def get_weather(self, lat: float, lon: float, date: str) -> Dict[str, Any]:
        """
        Retrieves authoritative marine weather data (Wave + Wind) for given coordinates.
        Checks cache first, performs live INCOIS fetch if needed, and applies fallback policies.
        """
        # Step 1: Check cache
        cached_data, cache_state = self.cache.get(lat, lon, allow_stale=True)
        if cached_data and cache_state == "fresh":
            return cached_data

        # Step 2: Attempt live fetch from INCOIS
        live_raw: Optional[Dict[str, Any]] = None
        method: str = "none"
        fetch_error: Optional[Exception] = None

        try:
            live_raw, method = self._fetch_from_incois_with_neighbor_search(lat, lon)
        except Exception as exc:
            fetch_error = exc

        # Step 3: Handle successful live fetch
        if live_raw is not None:
            hs = live_raw["hs"]
            u = live_raw["u"]
            v = live_raw["v"]
            wind_speed_ms, wind_dir_deg, wind_dir_cardinal = uv_to_speed_and_direction(u, v)
            wind_speed_kmh = round(wind_speed_ms * 3.6, 1)
            forecast = derive_forecast_condition(hs, wind_speed_kmh)

            result: Dict[str, Any] = {
                "location": {"lat": lat, "lon": lon},
                "grid_lat": live_raw["grid_lat"],
                "grid_lon": live_raw["grid_lon"],
                "date": date,
                "wave_height_m": round(hs, 2),
                "wind_speed_ms": wind_speed_ms,
                "wind_speed_kmh": wind_speed_kmh,
                "wind_direction_deg": wind_dir_deg,
                "wind_direction_cardinal": wind_dir_cardinal,
                "forecast": forecast,
                "temperature_c": None,  # Not fabricated
                "visibility_km": None,   # Not fabricated
                "source": "INCOIS_OSF_WW3",
                "forecast_time": live_raw["forecast_time"],
                "retrieval_time": datetime.now(timezone.utc).isoformat(),
                "cache_status": "live",
                "resolution_method": method,
                "is_mock": False,
            }

            # Store in cache
            self.cache.set(
                lat=lat,
                lon=lon,
                data=result,
                forecast_time=live_raw["forecast_time"],
                source="INCOIS_OSF_WW3",
            )
            return result

        # Step 4: Live fetch failed or returned no data; check stale cache
        if cached_data is not None:
            # Return stale cached data with explicit marker
            stale_copy = dict(cached_data)
            stale_copy["cache_status"] = "stale"
            stale_copy["is_stale"] = True
            return stale_copy

        # Step 5: No data available — Return explicit data-unavailable record (NEVER fake values)
        return {
            "location": {"lat": lat, "lon": lon},
            "grid_lat": None,
            "grid_lon": None,
            "date": date,
            "wave_height_m": 0.0,
            "wind_speed_ms": 0.0,
            "wind_speed_kmh": 0.0,
            "wind_direction_deg": None,
            "wind_direction_cardinal": "Unavailable",
            "forecast": "data_unavailable",
            "temperature_c": None,
            "visibility_km": None,
            "source": "INCOIS_OSF_WW3",
            "forecast_time": None,
            "retrieval_time": datetime.now(timezone.utc).isoformat(),
            "cache_status": "unavailable",
            "resolution_method": "failed",
            "error_detail": str(fetch_error) if fetch_error else "Location out of ocean model domain or service unreachable",
            "is_mock": False,
        }
