"""Supplement missing marine fields, preserving primary source and freshness.

Supplement cache is bounded, process-local and has no stale fallback. It never
shares legacy primary Redis keys, so rollback requires no destructive migration.
"""
from collections import OrderedDict
from copy import deepcopy
from datetime import datetime, timezone
import math
from threading import Lock
from time import monotonic
from app.data.weather.base import WeatherProvider
from app.data.weather.open_meteo import OpenMeteoWeatherProvider, MARINE_FIELDS
from app.services.temporal import resolve_query_time, verify_forecast_timestamp


class CombinedWeatherProvider(WeatherProvider):
    def __init__(self, primary, supplement=None):
        self.primary = primary
        self.supplement = supplement or OpenMeteoWeatherProvider(timeout_seconds=4)
        self._cache = OrderedDict()
        self._guard = Lock()
        self._locks = [Lock() for _ in range(16)]

    def _supplement(self, lat, lon, date, time_hint, temporal_res):
        key = (lat, lon, temporal_res.target_date, temporal_res.period,
               temporal_res.target_utc.replace(minute=0, second=0, microsecond=0).isoformat())
        with self._locks[hash(key) % len(self._locks)]:
            with self._guard:
                cached = self._cache.get(key)
                if cached and monotonic() - cached[0] < 300:
                    result = deepcopy(cached[1])
                    if result.get("cache_status") in {"fresh", "live"}:
                        result["cache_status"] = "cached"
                    return result
            try:
                result = self.supplement.get_weather(lat=lat, lon=lon, date=date,
                    time_hint=time_hint, temporal_res=temporal_res)
            except Exception:
                return {}
            with self._guard:
                self._cache[key] = (monotonic(), deepcopy(result))
                self._cache.move_to_end(key)
                while len(self._cache) > 128:
                    self._cache.popitem(last=False)
            return result

    def get_weather(self, lat, lon, date, time_hint=None, temporal_res=None, **kwargs):
        temporal_res = temporal_res or resolve_query_time(text=time_hint or "", request_date=date)
        try:
            primary = self.primary.get_weather(lat=lat, lon=lon, date=date,
                time_hint=time_hint, temporal_res=temporal_res, **kwargs)
        except Exception:
            primary = {}
        if primary.get("cache_status") == "unavailable" or not primary:
            return self._supplement(lat, lon, date, time_hint, temporal_res)
        if (primary.get("source") != "INCOIS_OSF_WW3" or primary.get("is_mock", True)
                or primary.get("cache_status") not in {"live", "fresh", "cached", "hit", "stale"}):
            return primary
        missing = [field for field in MARINE_FIELDS.values() if primary.get(field) is None]
        if not missing:
            return primary
        extra = self._supplement(lat, lon, date, time_hint, temporal_res)
        valid_at = extra.get("marine_forecast_valid_at")
        if (extra.get("is_mock", True) or extra.get("cache_status") not in {"live", "fresh", "cached"}
                or not valid_at or not verify_forecast_timestamp(valid_at, temporal_res)[0]):
            return primary
        try:
            retrieved = datetime.fromisoformat(str(extra.get("retrieved_at")).replace("Z", "+00:00"))
            age = (datetime.now(timezone.utc) - retrieved).total_seconds()
            if not 0 <= age <= 3600:
                return primary
        except (TypeError, ValueError):
            return primary
        result = deepcopy(primary)
        provenance = {}
        for field in missing:
            value = extra.get(field)
            if (isinstance(value, bool) or not isinstance(value, (int, float))
                    or not math.isfinite(value) or (value < 0 and field != "sea_surface_temperature_c")
                    or (field.endswith("_deg") and value > 360)):
                continue
            result[field] = value
            provenance[field] = {
                "source": "Open-Meteo Marine", "forecast_valid_at": valid_at,
                "retrieved_at": extra.get("retrieved_at"), "issued_at": extra.get("issued_at"),
                "cache_status": extra.get("cache_status"),
                "grid_lat": extra.get("grid_lat"), "grid_lon": extra.get("grid_lon"),
                "measurement_kind": "model_forecast",
            }
        if provenance:
            result["supplemental_fields"] = provenance
        return result
