"""Live Marine Weather Provider using Open-Meteo Marine & Atmosphere APIs."""
import logging
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.data.weather.base import WeatherProvider

logger = logging.getLogger(__name__)

MARINE_FIELDS = {
    "wave_height": "wave_height_m",
    "wave_period": "wave_period_s",
    "wave_direction": "wave_direction_deg",
    "wind_wave_height": "wind_wave_height_m",
    "wind_wave_period": "wind_wave_period_s",
    "wind_wave_direction": "wind_wave_direction_deg",
    "swell_wave_height": "swell_wave_height_m",
    "swell_wave_period": "swell_wave_period_s",
    "swell_wave_direction": "swell_wave_direction_deg",
    "ocean_current_velocity": "ocean_current_speed_kmh",
    "ocean_current_direction": "ocean_current_direction_deg",
    "sea_surface_temperature": "sea_surface_temperature_c",
}

# WMO Weather interpretation codes (WW)
WMO_FORECAST_MAP = {
    0: "clear",
    1: "mostly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "foggy",
    48: "depositing rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "slight rain",
    63: "moderate rain",
    65: "heavy rain",
    80: "rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    95: "stormy",
    96: "thunderstorm with slight hail",
    99: "thunderstorm with heavy hail",
}


def _wmo_code_to_forecast(code: Optional[int]) -> str:
    """Maps WMO code to standardized forecast label."""
    if code is None:
        return "unavailable"
    if code in WMO_FORECAST_MAP:
        return WMO_FORECAST_MAP[code]
    return "unavailable"


def _deg_to_cardinal(deg: Optional[float]) -> Optional[str]:
    """Converts azimuth degrees (0-360) into 16-point cardinal compass direction."""
    if deg is None:
        return None
    val = int((deg / 22.5) + 0.5)
    points = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
    ]
    return points[val % 16]


def _get_cloud_category(pct: Optional[float]) -> Optional[str]:
    """Derives standard meteorological cloud category from percentage."""
    if pct is None:
        return None
    if pct <= 20:
        return "Clear"
    if pct <= 50:
        return "Partly Cloudy"
    if pct <= 80:
        return "Cloudy"
    return "Overcast"


def _get_visibility_category(vis_km: Optional[float]) -> Optional[str]:
    """Derives standard marine visibility category."""
    if vis_km is None:
        return None
    if vis_km >= 10.0:
        return "Good"
    if vis_km >= 5.0:
        return "Reduced"
    return "Poor"


from app.services.temporal import TemporalResolution, resolve_query_time, verify_forecast_timestamp


# Open-Meteo Marine variables and ORCA field names; current velocity is km/h.
MARINE_FIELDS = {
    "wave_height": "wave_height_m", "wave_direction": "wave_direction_deg", "wave_period": "wave_period_s",
    "wind_wave_height": "wind_wave_height_m", "wind_wave_direction": "wind_wave_direction_deg", "wind_wave_period": "wind_wave_period_s",
    "swell_wave_height": "swell_wave_height_m", "swell_wave_direction": "swell_wave_direction_deg", "swell_wave_period": "swell_wave_period_s",
    "sea_surface_temperature": "sea_surface_temperature_c",
    "ocean_current_velocity": "ocean_current_speed_kmh", "ocean_current_direction": "ocean_current_direction_deg",
}


def utc_stamp(stamp):
    if not isinstance(stamp, str):
        return None
    try:
        dt = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
        # Requests explicitly use UTC; the API omits the suffix in ISO responses.
        return dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z") if dt.tzinfo is None else dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except ValueError:
        return None


class OpenMeteoWeatherProvider(WeatherProvider):
    """
    Production-grade Marine Weather Data Provider.
    
    Ingests live significant wave height, swell period, wave direction, sustained
    wind, peak gusts, cloud cover, visibility, and forecast horizons from
    Open-Meteo's Marine and Atmosphere APIs.
    
    Selects timesteps matching requested future operational windows and verifies forecast timestamps.
    Missing fields and provider failures remain explicitly unavailable.
    """

    def __init__(self, timeout_seconds: float = 4.0):
        self.timeout_seconds = timeout_seconds

    def get_weather(
        self,
        lat: float,
        lon: float,
        date: str,
        time_hint: Optional[str] = None,
        temporal_res: Optional[TemporalResolution] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        if temporal_res is None:
            temporal_res = resolve_query_time(text=time_hint or "", request_date=date)

        target_date = temporal_res.target_date

        # Fetch independently: a failed atmosphere request must not discard waves.
        endpoints = {
            "marine": ("https://marine-api.open-meteo.com/v1/marine",
                       ",".join(MARINE_FIELDS), ",".join(MARINE_FIELDS)),
            "weather": ("https://api.open-meteo.com/v1/forecast",
                        "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,visibility,precipitation",
                        "wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,visibility,cloud_cover,precipitation,temperature_2m"),
        }
        payloads = {}
        with httpx.Client(timeout=self.timeout_seconds) as client:
            for name, (url, current, hourly) in endpoints.items():
                try:
                    response = client.get(url, params={"latitude": lat, "longitude": lon,
                        "current": current, "hourly": hourly, "timezone": "UTC",
                        **({"cell_selection": "sea"} if name == "marine" else {"wind_speed_unit": "kmh"})})
                    response.raise_for_status()
                    payload = response.json()
                    payloads[name] = payload if isinstance(payload, dict) else {}
                except (httpx.HTTPError, ValueError) as err:
                    logger.warning("Open-Meteo %s unavailable (%s)", name, type(err).__name__)
                    payloads[name] = {}

        def value(data, key, scale=1, nonnegative=True, digits=2):
            raw = data.get(key)
            if raw is None or isinstance(raw, bool):
                return None
            try:
                number = float(raw) * scale
                return round(number, digits) if math.isfinite(number) and (not nonnegative or number >= 0) else None
            except (TypeError, ValueError):
                return None

        mh = payloads.get("marine", {}).get("hourly") or {}
        wh = payloads.get("weather", {}).get("hourly") or {}
        def rows(hourly):
            return {utc_stamp(stamp): {key: values[i] if i < len(values) else None
                    for key, values in hourly.items() if key != "time" and isinstance(values, list)}
                    for i, stamp in enumerate(hourly.get("time", [])) if utc_stamp(stamp)}
        mr, wr = rows(mh), rows(wh)
        all_stamps = sorted(set(mr) | set(wr))

        marine_curr = payloads.get("marine", {}).get("current") or {}
        weather_curr = payloads.get("weather", {}).get("current") or {}

        selected_stamp = None
        issued_at = None  # Forecast valid time is not model-run issuance.

        if temporal_res.is_explicit_future and all_stamps:
            # Find hourly timesteps on the requested target date
            candidates = []
            from datetime import timedelta
            for stamp in all_stamps:
                try:
                    s_dt = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
                    if s_dt.tzinfo is None:
                        s_dt = s_dt.replace(tzinfo=timezone.utc)
                    candidates.append((stamp, s_dt))
                except Exception:
                    continue

            in_window = [c for c in candidates if temporal_res.start_utc <= c[1] <= temporal_res.end_utc]
            if in_window:
                in_window.sort(key=lambda c: abs((c[1] - temporal_res.target_utc).total_seconds()))
                selected_stamp = in_window[0][0]
            else:
                on_date = [c for c in candidates if c[1].astimezone(timezone(timedelta(hours=5, minutes=30))).date().isoformat() == target_date]
                if on_date:
                    on_date.sort(key=lambda c: abs((c[1] - temporal_res.target_utc).total_seconds()))
                    selected_stamp = on_date[0][0]
                elif candidates:
                    candidates.sort(key=lambda c: abs((c[1] - temporal_res.target_utc).total_seconds()))
                    selected_stamp = candidates[0][0]

            # Verify match
            if selected_stamp:
                is_valid, _ = verify_forecast_timestamp(selected_stamp, temporal_res)
                if not is_valid:
                    selected_stamp = None

        if selected_stamp:
            # Target future hour data from hourly records
            m_data = mr.get(selected_stamp, {})
            w_data = wr.get(selected_stamp, {})
            current_time = selected_stamp
            wave = value(m_data, "wave_height")
            wave_period = value(m_data, "wave_period")
            wave_direction = value(m_data, "wave_direction")
            wind = value(w_data, "wind_speed_10m")
            direction = value(w_data, "wind_direction_10m")
            visibility = value(w_data, "visibility", .001)
            cloud = value(w_data, "cloud_cover")
            code = value(w_data, "weather_code")
            gust = value(w_data, "wind_gusts_10m")
            precip = value(w_data, "precipitation")
            temp = value(w_data, "temperature_2m", nonnegative=False)
        else:
            # Current conditions
            current_time = utc_stamp(marine_curr.get("time")) or utc_stamp(weather_curr.get("time"))
            wave = value(marine_curr, "wave_height")
            wave_period = value(marine_curr, "wave_period")
            wave_direction = value(marine_curr, "wave_direction")
            wind = value(weather_curr, "wind_speed_10m")
            direction = value(weather_curr, "wind_direction_10m")
            visibility = value(weather_curr, "visibility", .001)
            cloud = value(weather_curr, "cloud_cover")
            code = value(weather_curr, "weather_code")
            gust = value(weather_curr, "wind_gusts_10m")
            precip = value(weather_curr, "precipitation")
            temp = value(weather_curr, "temperature_2m", nonnegative=False)

        selected_marine = mr.get(selected_stamp, {}) if selected_stamp else marine_curr
        selected_weather = wr.get(selected_stamp, {}) if selected_stamp else weather_curr
        marine_time = selected_stamp if selected_stamp and selected_marine else utc_stamp(marine_curr.get("time")) if not selected_stamp else None
        weather_time = selected_stamp if selected_stamp and selected_weather else utc_stamp(weather_curr.get("time")) if not selected_stamp else None
        marine_values = {}
        for variable, field in MARINE_FIELDS.items():
            reading = value(selected_marine, variable, nonnegative=variable != "sea_surface_temperature")
            if variable.endswith("direction") and reading is not None and reading > 360:
                reading = None
            marine_values[field] = reading if marine_time else None
        # A failed future selection must never return today's measurements with a future date.
        if temporal_res.is_explicit_future and not selected_stamp:
            marine_values = dict.fromkeys(MARINE_FIELDS.values())
            wave = wave_period = wave_direction = wind = direction = visibility = cloud = code = gust = precip = temp = None
            marine_time = weather_time = current_time = None

        if code not in WMO_FORECAST_MAP:
            code = None

        now_iso = datetime.now(timezone.utc).isoformat()
        result = {
            "location": {"lat": lat, "lon": lon}, "date": target_date,
            "wave_height_m": wave, "wave_period_s": wave_period,
            "wave_direction_deg": wave_direction,
            "wind_speed_kmh": wind, "wind_speed_ms": round(wind / 3.6, 2) if wind is not None else None,
            "wind_gust_kmh": gust,
            "wind_direction_deg": direction, "wind_direction_cardinal": _deg_to_cardinal(direction),
            "forecast": _wmo_code_to_forecast(code), "weather_code": code,
            "cloud_cover_pct": cloud, "cloud_category": _get_cloud_category(cloud),
            "visibility_km": visibility, "visibility_category": _get_visibility_category(visibility),
            "precipitation_mm": precip,
            "temperature_c": temp,
            **marine_values,
            "marine_forecast_valid_at": marine_time,
            "weather_forecast_valid_at": weather_time,
            "measurement_kind": "model_forecast",
            "grid_lat": value(payloads.get("marine", {}), "latitude", nonnegative=False, digits=6),
            "grid_lon": value(payloads.get("marine", {}), "longitude", nonnegative=False, digits=6),
            "resolution_method": "provider_selected_sea_cell",
            "issued_at": issued_at,
            "forecast_valid_at": current_time,
            "retrieved_at": now_iso,
            "forecast_time": current_time,
            "retrieval_time": now_iso,
            "target_period": temporal_res.description,
            "source": "open_meteo_marine_api", "is_mock": False,
            "cache_status": "fresh", "forecast_horizon": [],
        }

        if current_time:
            for stamp in all_stamps:
                if stamp <= current_time:
                    continue
                result["forecast_horizon"].append({"time": stamp,
                    "wave_height_m": value(mr.get(stamp, {}), "wave_height"),
                    "wind_speed_kmh": value(wr.get(stamp, {}), "wind_speed_10m"),
                    "wind_gust_kmh": value(wr.get(stamp, {}), "wind_gusts_10m"),
                    "forecast": _wmo_code_to_forecast(value(wr.get(stamp, {}), "weather_code"))})
                if len(result["forecast_horizon"]) == 6:
                    break

        if (
            all(result.get(k) is None for k in (*MARINE_FIELDS.values(), "wind_speed_kmh", "temperature_c", "visibility_km", "weather_code"))
            or (temporal_res.is_explicit_future and not selected_stamp)
        ):
            result.update(cache_status="unavailable", forecast="data_unavailable", forecast_valid_at=None, forecast_time=None)
        return result
