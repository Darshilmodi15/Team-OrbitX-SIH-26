"""
Geospatial low-bandwidth marine cache for INCOIS wave and wind observations/forecasts.

Designed for low-bandwidth coastal connectivity:
- Normalizes geographic coordinates to a regional grid resolution (default 0.05° ~ 5.5 km)
  so nearby fishermen/vessels reuse identical operational forecasts.
- Maintains retrieval timestamps, forecast timestamps, and freshness state (fresh, cached, stale).
- Provides instant fallback on external INCOIS timeout or intermittent network outages.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
import time
from typing import Any, Dict, Optional, Tuple


@dataclass
class CachedMarineRecord:
    """Represents a cached marine weather record with spatial & temporal metadata."""
    grid_key: str
    lat: float
    lon: float
    data: Dict[str, Any]
    retrieval_timestamp: float  # Epoch seconds
    forecast_timestamp: Optional[str]  # ISO string or source time
    source: str
    access_count: int = 0


class MarineWeatherCache:
    """
    In-memory geographic cache for marine weather forecasts with configurable TTL and staleness policies.
    """

    def __init__(
        self,
        grid_resolution_deg: float = 0.05,
        fresh_ttl_seconds: float = 3 * 3600,  # 3 hours fresh TTL
        max_stale_seconds: float = 24 * 3600,  # 24 hours max stale retention
    ):
        self.grid_resolution = grid_resolution_deg
        self.fresh_ttl = fresh_ttl_seconds
        self.max_stale = max_stale_seconds
        self._cache: Dict[str, CachedMarineRecord] = {}

    def get_grid_key(self, lat: float, lon: float) -> str:
        """
        Normalizes coordinates to the nearest grid point to promote cache reuse for nearby locations.
        """
        grid_lat = round(lat / self.grid_resolution) * self.grid_resolution
        grid_lon = round(lon / self.grid_resolution) * self.grid_resolution
        return f"{grid_lat:.3f}_{grid_lon:.3f}"

    def get(
        self,
        lat: float,
        lon: float,
        allow_stale: bool = True,
    ) -> Tuple[Optional[Dict[str, Any]], str]:
        """
        Retrieves cached marine data for coordinates if available.

        Returns:
            Tuple of (data_dict or None, status_string)
            status_string can be 'fresh', 'stale', or 'miss'
        """
        key = self.get_grid_key(lat, lon)
        record = self._cache.get(key)
        if not record:
            return None, "miss"

        now = time.time()
        age = now - record.retrieval_timestamp

        record.access_count += 1

        if age <= self.fresh_ttl:
            result = dict(record.data)
            result["cache_status"] = "cached"
            result["data_age_sec"] = int(age)
            result["is_stale"] = False
            return result, "fresh"
        elif allow_stale and age <= self.max_stale:
            result = dict(record.data)
            result["cache_status"] = "stale"
            result["data_age_sec"] = int(age)
            result["is_stale"] = True
            return result, "stale"
        else:
            # Expired beyond max stale allowance
            return None, "miss"

    def set(
        self,
        lat: float,
        lon: float,
        data: Dict[str, Any],
        forecast_time: Optional[str] = None,
        source: str = "INCOIS_OSF_WW3",
    ) -> None:
        """Stores or updates marine data for the given coordinates."""
        key = self.get_grid_key(lat, lon)
        grid_lat = round(lat / self.grid_resolution) * self.grid_resolution
        grid_lon = round(lon / self.grid_resolution) * self.grid_resolution

        stored_data = dict(data)
        stored_data["grid_lat"] = round(grid_lat, 4)
        stored_data["grid_lon"] = round(grid_lon, 4)
        stored_data["source"] = source
        stored_data["retrieval_time"] = datetime.now(timezone.utc).isoformat()

        record = CachedMarineRecord(
            grid_key=key,
            lat=round(grid_lat, 4),
            lon=round(grid_lon, 4),
            data=stored_data,
            retrieval_timestamp=time.time(),
            forecast_timestamp=forecast_time,
            source=source,
        )
        self._cache[key] = record

    def clear(self) -> None:
        """Clears all cached records."""
        self._cache.clear()

    def size(self) -> int:
        """Returns the number of active cached grid locations."""
        return len(self._cache)
