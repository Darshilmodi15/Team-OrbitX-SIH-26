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
from collections import OrderedDict
from threading import RLock
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
        capacity: int = 256,
    ):
        self.grid_resolution = grid_resolution_deg
        self.fresh_ttl = fresh_ttl_seconds
        self.max_stale = max_stale_seconds
        self._memory_cache = OrderedDict()
        self.capacity = max(1, capacity)
        self._lock = RLock()
        
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
                logger.warning("Redis shared cache unavailable (%s); using in-memory cache.", type(e).__name__)
                self._redis_client = None

    def get_grid_key(self, lat: float, lon: float, target_date: Optional[str] = None) -> str:
        """
        Normalizes coordinates to the nearest grid point to promote cache reuse for nearby locations.
        Includes target_date in key if specified.
        """
        grid_lat = round(lat / self.grid_resolution) * self.grid_resolution
        grid_lon = round(lon / self.grid_resolution) * self.grid_resolution
        base_key = f"{grid_lat:.3f}_{grid_lon:.3f}"
        return f"{base_key}_{target_date}" if target_date else base_key

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
        target_date: Optional[str] = None,
    ) -> Tuple[Optional[Dict[str, Any]], str]:
        """
        Retrieves cached marine data for coordinates and optional target date if available.

        Returns:
            Tuple of (data_dict or None, status_string)
            status_string can be 'fresh', 'stale', or 'miss'
        """
        key = self.get_grid_key(lat, lon, target_date=target_date)
        record = self._get_record(key)
        if not record and target_date:
            # Check if there is an un-dated record that explicitly matches this target date
            fallback_rec = self._get_record(self.get_grid_key(lat, lon))
            if fallback_rec and (
                fallback_rec.data.get("date") == target_date
                or str(fallback_rec.data.get("forecast_valid_at", ""))[:10] == target_date
            ):
                record = fallback_rec

        if not record:
            self.misses_count += 1
            return None, "miss"

        now = time.time()
        age = max(0, now - record.retrieval_timestamp)
        source_age = self._source_age(record.data.get("forecast_valid_at") or record.data.get("forecast_time"), now)
        age = max(age, source_age) if source_age is not None else self.max_stale + 1
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
        target_date: Optional[str] = None,
        issued_at: Optional[str] = None,
        forecast_valid_at: Optional[str] = None,
        retrieved_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Stores or updates marine data for the given coordinates."""
        eff_target_date = target_date or data.get("date")
        key = self.get_grid_key(lat, lon, target_date=eff_target_date)
        region_cell = self.get_region_cell(lat, lon)
        grid_lat = round(lat / self.grid_resolution) * self.grid_resolution
        grid_lon = round(lon / self.grid_resolution) * self.grid_resolution
        now_ts = time.time()
        now_iso = retrieved_at or datetime.now(timezone.utc).isoformat()

        stored_data = dict(data)
        if "grid_lat" not in stored_data or stored_data["grid_lat"] is None:
            stored_data["grid_lat"] = round(grid_lat, 4)
        if "grid_lon" not in stored_data or stored_data["grid_lon"] is None:
            stored_data["grid_lon"] = round(grid_lon, 4)
        stored_data["region_cell"] = region_cell
        stored_data["source"] = source
        stored_data["issued_at"] = issued_at or stored_data.get("issued_at")
        f_valid = forecast_valid_at or forecast_time or stored_data.get("forecast_valid_at") or stored_data.get("forecast_time")
        stored_data["forecast_valid_at"] = f_valid
        stored_data["forecast_time"] = f_valid
        stored_data["retrieved_at"] = now_iso
        stored_data["retrieval_time"] = now_iso

        source_age = self._source_age(f_valid, now_ts)
        status = "unavailable" if source_age is None or source_age > self.max_stale else "stale" if source_age > self.fresh_ttl else "fresh"
        if stored_data.get("is_mock") or stored_data.get("cache_status") == "unavailable":
            status = "unavailable"
        stored_data["cache_status"] = status
        stored_data["is_stale"] = status == "stale"
        stored_data["freshness"] = {"fresh": "GOOD", "stale": "ACCEPTABLE_STALE", "unavailable": "UNAVAILABLE"}[status]
        stored_data["data_age_sec"] = int(source_age) if source_age is not None else None

        record = CachedMarineRecord(
            grid_key=key,
            region_cell=region_cell,
            lat=round(grid_lat, 4),
            lon=round(grid_lon, 4),
            data=stored_data,
            retrieval_timestamp=now_ts,
            forecast_timestamp=f_valid,
            source=source,
        )
        if status != "unavailable":
            self._store_record(key, record)
            # Also store under base coordinate key for fallback
            base_key = self.get_grid_key(lat, lon)
            if base_key != key:
                self._store_record(base_key, record)
        return stored_data

    @staticmethod
    def _source_age(stamp: Optional[str], now: float) -> Optional[float]:
        try:
            parsed = datetime.fromisoformat(str(stamp).replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return max(0, now - parsed.timestamp())
        except (ValueError, TypeError):
            return None

    def _get_record(self, key: str) -> Optional[CachedMarineRecord]:
        """Fetches record from Redis or In-Memory."""
        if self._redis_client:
            try:
                raw = self._redis_client.get(f"orca:marine:v3:{key}")
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
                logger.debug("Redis get error: %s", type(e).__name__)

        with self._lock:
            record = self._memory_cache.get(key)
            if record and time.time() - record.retrieval_timestamp > self.max_stale:
                del self._memory_cache[key]
                return None
            if record:
                self._memory_cache.move_to_end(key)
            return record

    def _store_record(self, key: str, record: CachedMarineRecord) -> None:
        """Stores record in memory and in Redis if available."""
        with self._lock:
            self._memory_cache[key] = record
            self._memory_cache.move_to_end(key)
            while len(self._memory_cache) > self.capacity:
                self._memory_cache.popitem(last=False)
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
                    f"orca:marine:v3:{key}",
                    int(self.max_stale),
                    json.dumps(payload),
                )
            except Exception as e:
                logger.debug("Redis set error: %s", type(e).__name__)

    def clear(self) -> None:
        """Clears all cached records."""
        with self._lock:
            self._memory_cache.clear()
        if self._redis_client:
            try:
                keys = self._redis_client.keys("orca:marine:v3:*")
                if keys:
                    self._redis_client.delete(*keys)
            except Exception as e:
                logger.debug("Redis clear error: %s", type(e).__name__)

    def size(self) -> int:
        """Returns the number of active cached grid locations."""
        if self._redis_client:
            try:
                keys = self._redis_client.keys("orca:marine:v3:*")
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
