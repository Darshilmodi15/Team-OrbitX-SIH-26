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
import logging
from typing import Any, Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET

import httpx
from app.services.provider_health import record

from app.data.weather.base import WeatherProvider
from app.data.weather.cache import MarineWeatherCache
from app.services.temporal import TemporalResolution, resolve_query_time, verify_forecast_timestamp

logger = logging.getLogger(__name__)


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
        return "elevated wave/wind measurements"
    elif wave_height_m > 1.8 or wind_speed_kmh > 35.0:
        return "choppy / moderate"
    elif wave_height_m > 1.2 or wind_speed_kmh > 25.0:
        return "moderate"
    else:
        return "low wave/wind measurements"


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
        verify_ssl: bool = True,
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
        temporal_res: Optional[TemporalResolution] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Executes a single-point NCSS query against INCOIS THREDDS server.
        Requests HS (Significant Wave Height), UWND (Zonal wind), VWND (Meridional wind).
        Parses all timesteps, selects the timestep matching temporal_res, and verifies match.
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
            valid_rows: List[Dict[str, Any]] = []

            for line in lines[1:]:
                data_cols = line.split(',')
                if len(data_cols) < len(header):
                    continue
                row = dict(zip(header, data_cols))
                hs_raw = row.get("HS") or row.get("swh")
                uwnd_raw = row.get("UWND") or row.get("u")
                vwnd_raw = row.get("VWND") or row.get("v")

                if (
                    hs_raw is None or hs_raw == "NaN" or hs_raw == "" or
                    uwnd_raw is None or uwnd_raw == "NaN" or uwnd_raw == "" or
                    vwnd_raw is None or vwnd_raw == "NaN" or vwnd_raw == ""
                ):
                    continue

                try:
                    hs_val = float(hs_raw)
                    u_val = float(uwnd_raw)
                    v_val = float(vwnd_raw)
                except (ValueError, TypeError):
                    continue

                if not all(math.isfinite(x) for x in (hs_val, u_val, v_val)) or hs_val < 0:
                    continue

                time_val = row.get("time")
                if not time_val:
                    continue

                res_lat = float(row.get("latitude", lat))
                res_lon = float(row.get("longitude", lon))

                valid_rows.append({
                    "time": time_val.strip(),
                    "grid_lat": round(res_lat, 4),
                    "grid_lon": round(res_lon, 4),
                    "hs": hs_val,
                    "u": u_val,
                    "v": v_val,
                })

            if not valid_rows:
                return None

            # Issued at: extracted from dataset path or earliest timestep in the model run
            issued_at = valid_rows[0]["time"]
            m = re.search(r"(\d{8})", dataset_path)
            if m:
                d_str = m.group(1)
                try:
                    issued_at = f"{d_str[:4]}-{d_str[4:6]}-{d_str[6:8]}T00:00:00Z"
                except Exception:
                    pass

            selected_row = None
            if temporal_res and temporal_res.is_explicit_future:
                candidates: List[Tuple[Dict[str, Any], datetime]] = []
                for r in valid_rows:
                    try:
                        r_dt = datetime.fromisoformat(r["time"].replace("Z", "+00:00"))
                        if r_dt.tzinfo is None:
                            r_dt = r_dt.replace(tzinfo=timezone.utc)
                        candidates.append((r, r_dt))
                    except Exception:
                        continue

                # 1. Look for rows inside [start_utc, end_utc]
                in_window = [c for c in candidates if temporal_res.start_utc <= c[1] <= temporal_res.end_utc]
                if in_window:
                    in_window.sort(key=lambda c: abs((c[1] - temporal_res.target_utc).total_seconds()))
                    selected_row = in_window[0][0]
                else:
                    # 2. Look for rows on target_date in IST
                    from datetime import timedelta
                    on_date = [c for c in candidates if c[1].astimezone(timezone(timedelta(hours=5, minutes=30))).date().isoformat() == temporal_res.target_date]
                    if on_date:
                        on_date.sort(key=lambda c: abs((c[1] - temporal_res.target_utc).total_seconds()))
                        selected_row = on_date[0][0]
                    elif candidates:
                        candidates.sort(key=lambda c: abs((c[1] - temporal_res.target_utc).total_seconds()))
                        selected_row = candidates[0][0]

                # VERIFY whether selected row matches requested period
                if selected_row:
                    is_valid, reason = verify_forecast_timestamp(selected_row["time"], temporal_res)
                    if not is_valid:
                        return {
                            "verified": False,
                            "error": reason,
                            "issued_at": issued_at,
                            "available_timesteps": [r["time"] for r in valid_rows],
                            "grid_lat": valid_rows[0]["grid_lat"],
                            "grid_lon": valid_rows[0]["grid_lon"],
                        }
            else:
                # Current / today query: select closest to current UTC time or first row
                now_utc = datetime.now(timezone.utc)
                candidates = []
                for r in valid_rows:
                    try:
                        r_dt = datetime.fromisoformat(r["time"].replace("Z", "+00:00"))
                        if r_dt.tzinfo is None:
                            r_dt = r_dt.replace(tzinfo=timezone.utc)
                        candidates.append((r, r_dt))
                    except Exception:
                        continue
                if candidates:
                    candidates.sort(key=lambda c: abs((c[1] - now_utc).total_seconds()))
                    selected_row = candidates[0][0]
                else:
                    selected_row = valid_rows[0]

            if not selected_row:
                return None

            return {
                "verified": True,
                "issued_at": issued_at,
                "forecast_valid_at": selected_row["time"],
                "forecast_time": selected_row["time"],
                "grid_lat": selected_row["grid_lat"],
                "grid_lon": selected_row["grid_lon"],
                "hs": selected_row["hs"],
                "u": selected_row["u"],
                "v": selected_row["v"],
                "available_timesteps": [r["time"] for r in valid_rows],
            }

    def _fetch_from_incois_with_neighbor_search(
        self,
        lat: float,
        lon: float,
        temporal_res: Optional[TemporalResolution] = None,
    ) -> Tuple[Optional[Dict[str, Any]], str]:
        """
        Queries INCOIS for exact coordinates. If on land / NaN, searches immediate
        offshore radial neighboring grid points.
        """
        dataset_path = self.discover_latest_dataset()
        
        # 1. Try exact requested coordinates
        point_data = self._query_ncss_point(dataset_path, lat, lon, temporal_res=temporal_res)
        if point_data:
            if not point_data.get("verified", True):
                return point_data, "unverified_temporal_mismatch"
            return point_data, "exact"

        # 2. Search radial offsets concurrently for closest ocean cell
        offsets = [
            (-0.15, -0.15), (-0.05, -0.05), (0.0, -0.05), (-0.05, 0.0), (0.0, -0.10),
            (-0.10, -0.10), (-0.05, 0.05), (0.05, -0.05), (0.0, 0.10), (0.10, 0.0),
            (-0.10, 0.0), (-0.15, 0.15), (0.15, -0.15), (0.0, -0.20), (0.0, 0.20), (-0.20, 0.0)
        ]

        def _check_offset(off: Tuple[float, float]) -> Tuple[Optional[Dict[str, Any]], str]:
            dlat, dlon = off
            try:
                candidate = self._query_ncss_point(dataset_path, lat + dlat, lon + dlon, temporal_res=temporal_res)
                if candidate:
                    if not candidate.get("verified", True):
                        return candidate, "unverified_temporal_mismatch"
                    return candidate, f"nearest_marine_cell(offset dlat={dlat:+.2f}, dlon={dlon:+.2f})"
            except Exception:
                pass
            return None, "none"

        from concurrent.futures import ThreadPoolExecutor, as_completed
        with ThreadPoolExecutor(max_workers=6) as executor:
            future_to_offset = {executor.submit(_check_offset, off): off for off in offsets}
            for fut in as_completed(future_to_offset):
                cand, meth = fut.result()
                if cand:
                    executor.shutdown(wait=False, cancel_futures=True)
                    return cand, meth

        # If coastal dataset missed, try combined Indian Ocean dataset
        combined_path = dataset_path.replace("rsmc_coast_ww3", "rsmc_combined_ww3")
        if combined_path != dataset_path:
            try:
                candidate = self._query_ncss_point(combined_path, lat, lon, temporal_res=temporal_res)
                if candidate:
                    if not candidate.get("verified", True):
                        return candidate, "unverified_temporal_mismatch"
                    return candidate, "combined_ww3_exact"
            except Exception:
                pass

        return None, "none"

    def get_weather(
        self,
        lat: float,
        lon: float,
        date: str,
        time_hint: Optional[str] = None,
        temporal_res: Optional[TemporalResolution] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Retrieves authoritative marine weather data (Wave + Wind) for given coordinates and timeframe.
        Checks cache first, performs live INCOIS fetch if needed, and applies fallback policies.
        """
        if temporal_res is None:
            temporal_res = resolve_query_time(text=time_hint or "", request_date=date)

        target_date = temporal_res.target_date

        # Step 1: Check cache
        cached_data, cache_state = self.cache.get(lat, lon, allow_stale=True, target_date=target_date)
        if not cached_data and not temporal_res.is_explicit_future:
            cached_data, cache_state = self.cache.get(lat, lon, allow_stale=True)
        if cached_data and cache_state == "fresh":
            f_val = cached_data.get("forecast_valid_at") or cached_data.get("forecast_time")
            if f_val and verify_forecast_timestamp(f_val, temporal_res)[0]:
                return cached_data

        # Step 2: Attempt live fetch from INCOIS
        live_raw: Optional[Dict[str, Any]] = None
        method: str = "none"
        fetch_error: Optional[Exception] = None

        try:
            live_raw, method = self._fetch_from_incois_with_neighbor_search(lat, lon, temporal_res=temporal_res)
        except Exception as exc:
            fetch_error = exc

        # Step 3: Handle successful live fetch
        if live_raw is not None and live_raw.get("verified", True):
            hs = live_raw["hs"]
            u = live_raw["u"]
            v = live_raw["v"]
            wind_speed_ms, wind_dir_deg, wind_dir_cardinal = uv_to_speed_and_direction(u, v)
            wind_speed_kmh = round(wind_speed_ms * 3.6, 1)
            forecast = derive_forecast_condition(hs, wind_speed_kmh)

            issued_at = live_raw.get("issued_at")
            forecast_valid_at = live_raw.get("forecast_valid_at") or live_raw["forecast_time"]
            now_iso = datetime.now(timezone.utc).isoformat()

            result: Dict[str, Any] = {
                "location": {"lat": lat, "lon": lon},
                "grid_lat": live_raw["grid_lat"],
                "grid_lon": live_raw["grid_lon"],
                "date": target_date,
                "wave_height_m": round(hs, 2),
                "wind_speed_ms": wind_speed_ms,
                "wind_speed_kmh": wind_speed_kmh,
                "wind_direction_deg": wind_dir_deg,
                "wind_direction_cardinal": wind_dir_cardinal,
                "forecast": forecast,
                "temperature_c": None,  # Not fabricated
                "visibility_km": None,   # Not fabricated
                "source": "INCOIS_OSF_WW3",
                "issued_at": issued_at,
                "forecast_valid_at": forecast_valid_at,
                "retrieved_at": now_iso,
                "forecast_time": forecast_valid_at,
                "retrieval_time": now_iso,
                "target_period": temporal_res.description,
                "cache_status": "live",
                "resolution_method": method,
                "is_mock": False,
            }

            # Store in cache
            cached_res = self.cache.set(
                lat=lat,
                lon=lon,
                data=result,
                forecast_time=forecast_valid_at,
                source="INCOIS_OSF_WW3",
                target_date=target_date,
                issued_at=issued_at,
                forecast_valid_at=forecast_valid_at,
                retrieved_at=now_iso,
            )

            # Persist observation in database if available
            try:
                from app.db.session import get_db_context
                from app.repositories import MarineObservationRepository
                with get_db_context() as db:
                    MarineObservationRepository.record_observation(
                        db=db,
                        latitude=lat,
                        longitude=lon,
                        region_cell=cached_res.get("region_cell", f"{lat:.3f}_{lon:.3f}"),
                        timestamp=datetime.fromisoformat(str(forecast_valid_at).replace("Z", "+00:00")),
                        wave_height_m=round(hs, 2),
                        wind_speed_kmh=wind_speed_kmh,
                        wind_direction_deg=wind_dir_deg,
                        risk_level="UNKNOWN",
                        source="INCOIS_OSF_WW3",
                        resolution_method=method,
                    )
            except Exception as db_err:
                logger.debug(f"Observation persistence skipped: {db_err}")

            record("incois", success=True, http_status=200, data_timestamp=forecast_valid_at)
            return cached_res

        record("incois", success=False, http_status=getattr(getattr(fetch_error, "response", None), "status_code", None), reason=type(fetch_error).__name__ if fetch_error else ("TEMPORAL_MISMATCH" if (live_raw and not live_raw.get("verified")) else "NO_VALID_MARINE_DATA"))

        # Step 4: Live fetch failed or unverified; check stale cache
        if cached_data is None and not temporal_res.is_explicit_future:
            cached_data, _ = self.cache.get(lat, lon, allow_stale=True)

        if cached_data is not None and (cached_data.get("date") == target_date or not temporal_res.is_explicit_future):
            stale_copy = dict(cached_data)
            stale_copy["cache_status"] = "stale"
            stale_copy["is_stale"] = True
            stale_copy["freshness"] = "ACCEPTABLE_STALE"
            if "warning" not in stale_copy:
                stale_copy["warning"] = "Live INCOIS service unreachable. Showing cached forecast."
            record("incois", success=True, mode="stale", data_timestamp=stale_copy.get("forecast_valid_at") or stale_copy.get("forecast_time"))
            return stale_copy

        # Step 5: Secondary provider fallback (Open-Meteo) before declaring unavailable
        try:
            from app.data.weather.open_meteo import OpenMeteoWeatherProvider
            open_meteo = OpenMeteoWeatherProvider(timeout_seconds=self.timeout_sec)
            om_data = open_meteo.get_weather(lat=lat, lon=lon, date=target_date, time_hint=time_hint, temporal_res=temporal_res)
            if om_data and not om_data.get("is_mock", False) and om_data.get("cache_status") != "unavailable" and om_data.get("forecast_valid_at"):
                om_data["cache_status"] = "live"
                om_res = self.cache.set(
                    lat=lat,
                    lon=lon,
                    data=om_data,
                    forecast_time=om_data.get("forecast_valid_at") or om_data.get("forecast_time"),
                    source="open_meteo_marine_api",
                    target_date=target_date,
                    issued_at=om_data.get("issued_at"),
                    forecast_valid_at=om_data.get("forecast_valid_at"),
                    retrieved_at=om_data.get("retrieved_at"),
                )
                try:
                    from app.db.session import get_db_context
                    from app.repositories import MarineObservationRepository
                    with get_db_context() as db:
                        MarineObservationRepository.record_observation(
                            db=db,
                            latitude=lat,
                            longitude=lon,
                            region_cell=om_res.get("region_cell", f"{lat:.3f}_{lon:.3f}"),
                            timestamp=datetime.fromisoformat(str(om_data.get("forecast_valid_at") or om_data.get("forecast_time")).replace("Z", "+00:00")),
                            wave_height_m=om_data.get("wave_height_m"),
                            wind_speed_kmh=om_data.get("wind_speed_kmh"),
                            wind_direction_deg=om_data.get("wind_direction_deg"),
                            risk_level="UNKNOWN",
                            source="Open-Meteo",
                            resolution_method="open_meteo_marine_api",
                        )
                except Exception as db_err:
                    logger.debug(f"Observation persistence skipped for Open-Meteo fallback: {db_err}")
                record("open_meteo", success=True, http_status=200, data_timestamp=om_data.get("forecast_valid_at"), mode="fallback")
                return om_res
        except Exception as om_err:
            record("open_meteo", success=False, reason=type(om_err).__name__)

        # Step 6: No data available — Return explicit data-unavailable record (NEVER fake values)
        error_reason = "Location out of ocean model domain or service unreachable"
        if live_raw and not live_raw.get("verified"):
            error_reason = live_raw.get("error") or "Requested forecast period not available in INCOIS model run"
        elif fetch_error:
            error_reason = str(fetch_error)

        return {
            "location": {"lat": lat, "lon": lon},
            "grid_lat": None,
            "grid_lon": None,
            "date": target_date,
            "wave_height_m": None,
            "wind_speed_ms": None,
            "wind_speed_kmh": None,
            "wind_direction_deg": None,
            "wind_direction_cardinal": "Unavailable",
            "forecast": "data_unavailable",
            "temperature_c": None,
            "visibility_km": None,
            "source": "INCOIS_OSF_WW3",
            "issued_at": live_raw.get("issued_at") if live_raw else None,
            "forecast_valid_at": None,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "forecast_time": None,
            "retrieval_time": datetime.now(timezone.utc).isoformat(),
            "target_period": temporal_res.description,
            "cache_status": "unavailable",
            "freshness": "EXPIRED",
            "resolution_method": "failed",
            "error_detail": error_reason,
            "is_mock": False,
        }
