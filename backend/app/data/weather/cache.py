"""
Geospatial low-bandwidth marine cache for INCOIS wave, wind, and meteorological forecasts.

Architecture:
- Shared regional grid resolution (default 0.05° ≈ 5.5 km) so nearby vessels reuse shared telemetry.
- Multi-tier cache backend: Redis / Key-Value store when REDIS_URL is configured, with seamless in-memory fallback.
- Explicit data freshness engine: 'fresh' (GOOD), 'stale' (ACCEPTABLE_STALE), and 'expired' with TTL tracking.
- Resilient fallback mechanism: returns stale cached data with clear warnings if external providers are unavailable.
"""
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import json
import logging
import math
import os
import time
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Optional Redis import
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


@dataclass
class CachedMarineRecord:
    """Represents a cached marine weather record with spatial, temporal, and provenance metadata."""
    grid_key: str
    region_cell: str
    lat: float
    lon: float
    data: Dict[str, Any]
    retrieval_timestamp: float  # Epoch seconds
    forecast_timestamp: Optional[str]  # ISO string or source time
    source: str
    access_count: int = 0


class MarineWeatherCache:
    """
    Geospatial cache for marine weather forecasts with configurable TTL, staleness policies,
    and optional Redis-compatible persistence.
    """

    def __init__(
        self,
        grid_resolution_deg: float = 0.05,
        fresh_ttl_seconds: float = 3 * 3600,     # 3 hours fresh TTL
        max_stale_seconds: float = 24 * 3600,   # 24 hours max stale retention
        redis_url: Optional[str] = None,
    ):
        self.grid_resolution = grid_resolution_deg
        self.fresh_ttl = fresh_ttl_seconds
        self.max_stale = max_stale_seconds
        self._memory_cache: Dict[str, CachedMarineRecord] = {}
        
        # Telemetry metrics
        self.hits_count = 0
        self.misses_count = 0
        self.stale_hits_count = 0

        # Initialize Redis if configured
        self._redis_client: Optional[Any] = None
        target_redis_url = redis_url or os.getenv("REDIS_URL") or os.getenv("KEY_VALUE_URL")
        if REDIS_AVAILABLE and target_redis_url:
            try:
                self._redis_client = redis.Redis.from_url(
                    target_redis_url,
                    decode_responses=True,
                    socket_timeout=2.0,
                    socket_connect_timeout=2.0,
                )
                self._redis_client.ping()
                logger.info("Connected to Redis shared marine cache.")
            except Exception as e:
                logger.warning(f"Could not connect to Redis at {target_redis_url}: {e}. Falling back to in-memory cache.")
                self._redis_client = None

    def get_grid_key(self, lat: float, lon: float) -> str:
        """
        Normalizes coordinates to the nearest grid point to promote cache reuse for nearby locations.
        """
        grid_lat = round(lat / self.grid_resolution) * self.grid_resolution
        grid_lon = round(lon / self.grid_resolution) * self.grid_resolution
        return f"{grid_lat:.3f}_{grid_lon:.3f}"

    def get_region_cell(self, lat: float, lon: float) -> str:
        """
        Derives regional identifier cell from coordinates (e.g. MH-MUM-0189 or lat_lon).
        """
        grid_lat = round(lat / self.grid_resolution) * self.grid_resolution
        grid_lon = round(lon / self.grid_resolution) * self.grid_resolution
        
        # Rough coastal sector prefix
        if 18.0 <= lat <= 20.0 and 72.0 <= lon <= 73.5:
            prefix = "MH-MUM"
        elif 20.0 < lat <= 23.0 and 68.5 <= lon <= 71.0:
            prefix = "GJ-VER"
        elif 9.0 <= lat <= 11.0 and 75.5 <= lon <= 77.0:
            prefix = "KL-KOC"
        elif 12.5 <= lat <= 14.0 and 79.5 <= lon <= 81.0:
            prefix = "TN-CHE"
        else:
            prefix = "IND-COAST"
            
        cell_idx = int(abs(grid_lat * 100) + abs(grid_lon * 10)) % 10000
        return f"{prefix}-{cell_idx:04d} ({grid_lat:.3f}_{grid_lon:.3f})"

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
        record = self._get_record(key)
        if not record:
            self.misses_count += 1
            return None, "miss"

        now = time.time()
        age = now - record.retrieval_timestamp
        record.access_count += 1

        if age <= self.fresh_ttl:
            self.hits_count += 1
            result = dict(record.data)
            result["cache_status"] = "cached"
            result["freshness"] = "GOOD"
            result["data_age_sec"] = int(age)
            result["is_stale"] = False
            result["region_cell"] = record.region_cell
            return result, "fresh"
        elif allow_stale and age <= self.max_stale:
            self.stale_hits_count += 1
            result = dict(record.data)
            result["cache_status"] = "stale"
            result["freshness"] = "ACCEPTABLE_STALE"
            result["data_age_sec"] = int(age)
            result["is_stale"] = True
            result["region_cell"] = record.region_cell
            result["warning"] = f"Showing cached forecast from {int(age // 60)} minutes ago. Live provider may be unreachable."
            return result, "stale"
        else:
            self.misses_count += 1
            # Expired beyond max stale allowance
            return None, "miss"

    def set(
        self,
        lat: float,
        lon: float,
        data: Dict[str, Any],
        forecast_time: Optional[str] = None,
        source: str = "INCOIS_OSF_WW3",
    ) -> Dict[str, Any]:
        """Stores or updates marine data for the given coordinates."""
        key = self.get_grid_key(lat, lon)
        region_cell = self.get_region_cell(lat, lon)
        grid_lat = round(lat / self.grid_resolution) * self.grid_resolution
        grid_lon = round(lon / self.grid_resolution) * self.grid_resolution
        now_ts = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()

        stored_data = dict(data)
        if "grid_lat" not in stored_data or stored_data["grid_lat"] is None:
            stored_data["grid_lat"] = round(grid_lat, 4)
        if "grid_lon" not in stored_data or stored_data["grid_lon"] is None:
            stored_data["grid_lon"] = round(grid_lon, 4)
        stored_data["region_cell"] = region_cell
        stored_data["source"] = source
        stored_data["retrieval_time"] = now_iso
        stored_data["forecast_time"] = forecast_time or stored_data.get("forecast_time") or now_iso
        stored_data["freshness"] = "GOOD"
        stored_data["data_age_sec"] = 0

        record = CachedMarineRecord(
            grid_key=key,
            region_cell=region_cell,
            lat=round(grid_lat, 4),
            lon=round(grid_lon, 4),
            data=stored_data,
            retrieval_timestamp=now_ts,
            forecast_timestamp=forecast_time or now_iso,
            source=source,
        )
        self._store_record(key, record)
        return stored_data

    def _get_record(self, key: str) -> Optional[CachedMarineRecord]:
        """Fetches record from Redis or In-Memory."""
        if self._redis_client:
            try:
                raw = self._redis_client.get(f"orca:marine:{key}")
                if raw:
                    payload = json.loads(raw)
                    return CachedMarineRecord(
                        grid_key=payload["grid_key"],
                        region_cell=payload.get("region_cell", key),
                        lat=payload["lat"],
                        lon=payload["lon"],
                        data=payload["data"],
                        retrieval_timestamp=payload["retrieval_timestamp"],
                        forecast_timestamp=payload.get("forecast_timestamp"),
                        source=payload.get("source", "INCOIS_OSF_WW3"),
                        access_count=payload.get("access_count", 0),
                    )
            except Exception as e:
                logger.debug(f"Redis get error: {e}")

        return self._memory_cache.get(key)

    def _store_record(self, key: str, record: CachedMarineRecord) -> None:
        """Stores record in memory and in Redis if available."""
        self._memory_cache[key] = record
        if self._redis_client:
            try:
                payload = {
                    "grid_key": record.grid_key,
                    "region_cell": record.region_cell,
                    "lat": record.lat,
                    "lon": record.lon,
                    "data": record.data,
                    "retrieval_timestamp": record.retrieval_timestamp,
                    "forecast_timestamp": record.forecast_timestamp,
                    "source": record.source,
                    "access_count": record.access_count,
                }
                # Store with max_stale TTL in Redis
                self._redis_client.setex(
                    f"orca:marine:{key}",
                    int(self.max_stale),
                    json.dumps(payload),
                )
            except Exception as e:
                logger.debug(f"Redis set error: {e}")

    def clear(self) -> None:
        """Clears all cached records."""
        self._memory_cache.clear()
        if self._redis_client:
            try:
                keys = self._redis_client.keys("orca:marine:*")
                if keys:
                    self._redis_client.delete(*keys)
            except Exception as e:
                logger.debug(f"Redis clear error: {e}")

    def size(self) -> int:
        """Returns the number of active cached grid locations."""
        if self._redis_client:
            try:
                keys = self._redis_client.keys("orca:marine:*")
                return len(keys)
            except Exception:
                pass
        return len(self._memory_cache)

    def get_hit_rate_pct(self) -> float:
        """Returns percentage of cache requests satisfied by cache."""
        total = self.hits_count + self.stale_hits_count + self.misses_count
        if total == 0:
            return 100.0
        return round(((self.hits_count + self.stale_hits_count) / total) * 100, 1)
