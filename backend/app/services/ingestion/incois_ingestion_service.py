"""
Continuous background INCOIS Marine Ingestion Service.

Periodically fetches operational ocean state and meteorological forecasts from INCOIS
for major coastal fishing hubs, keeps the low-bandwidth geospatial cache warm,
and persists verified observations into the PostgreSQL marine_observations table.
"""
import asyncio
from datetime import date as dt_date, datetime, timezone
import logging
import os
from typing import Any, Dict, List, Optional

from app.data.weather.base import WeatherProvider

logger = logging.getLogger("orca_ingestion")

COASTAL_INGESTION_HUBS: List[Dict[str, Any]] = [
    {"name": "Mumbai Port & Sassoon Dock", "lat": 18.9220, "lon": 72.8347, "state": "Maharashtra"},
    {"name": "Dahanu / Palghar Coastal Sector", "lat": 19.9700, "lon": 72.7300, "state": "Maharashtra"},
    {"name": "Ratnagiri Fisheries Harbor", "lat": 16.9902, "lon": 73.3120, "state": "Maharashtra"},
    {"name": "Veraval Ocean Front", "lat": 20.9000, "lon": 70.3667, "state": "Gujarat"},
    {"name": "Porbandar Coastal Sector", "lat": 21.6417, "lon": 69.6093, "state": "Gujarat"},
    {"name": "Kochi Marine Terminal", "lat": 9.9312, "lon": 76.2673, "state": "Kerala"},
    {"name": "Mangaluru Old Port", "lat": 12.8596, "lon": 74.8364, "state": "Karnataka"},
    {"name": "Chennai Coromandel Sector", "lat": 13.0827, "lon": 80.2707, "state": "Tamil Nadu"},
    {"name": "Rameswaram & Palk Strait", "lat": 9.2876, "lon": 79.3129, "state": "Tamil Nadu"},
    {"name": "Visakhapatnam Harbor", "lat": 17.6868, "lon": 83.2185, "state": "Andhra Pradesh"},
    {"name": "Paradip Marine Belt", "lat": 20.2644, "lon": 86.6710, "state": "Odisha"},
]


async def run_single_ingestion_cycle(provider: WeatherProvider) -> Dict[str, Any]:
    """
    Executes a single pass of INCOIS data retrieval across all coastal hubs.
    Updates cache and persists observations.
    """
    today_str = dt_date.today().isoformat()
    successful = 0
    failed = 0
    results: List[Dict[str, Any]] = []

    logger.info(f"Starting INCOIS background ingestion cycle for {len(COASTAL_INGESTION_HUBS)} coastal hubs...")

    for hub in COASTAL_INGESTION_HUBS:
        try:
            # Run blocking I/O in worker thread so event loop remains responsive
            data = await asyncio.to_thread(
                provider.get_weather,
                lat=hub["lat"],
                lon=hub["lon"],
                date=today_str,
            )
            successful += 1
            results.append({
                "hub": hub["name"],
                "lat": hub["lat"],
                "lon": hub["lon"],
                "wave_height_m": data.get("wave_height_m"),
                "wind_speed_kmh": data.get("wind_speed_kmh"),
                "source": data.get("source"),
                "cache_status": data.get("cache_status"),
            })
        except Exception as e:
            failed += 1
            logger.warning(f"Background ingestion failed for {hub['name']} ({hub['lat']}, {hub['lon']}): {e}")

    logger.info(f"Completed INCOIS ingestion cycle: {successful} updated, {failed} failed.")
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_hubs": len(COASTAL_INGESTION_HUBS),
        "successful": successful,
        "failed": failed,
        "results": results,
    }


async def continuous_incois_ingestion_loop(
    provider: WeatherProvider,
    interval_seconds: Optional[int] = None,
):
    """
    Long-running background task that polls INCOIS at configured intervals.
    Default interval is 1 hour (3600 seconds), configurable via INCOIS_INGESTION_INTERVAL_SEC.
    """
    poll_interval = interval_seconds or int(os.getenv("INCOIS_INGESTION_INTERVAL_SEC", "3600"))
    logger.info(f"INCOIS Continuous Ingestion Service started (Interval: {poll_interval}s).")

    # Initial delay of 3 seconds to let FastAPI finish binding and schema seeding
    await asyncio.sleep(3.0)

    while True:
        try:
            await run_single_ingestion_cycle(provider)
        except asyncio.CancelledError:
            logger.info("INCOIS Continuous Ingestion Service cancelled.")
            break
        except Exception as exc:
            logger.error(f"Unexpected error in INCOIS continuous ingestion loop: {exc}")

        try:
            await asyncio.sleep(poll_interval)
        except asyncio.CancelledError:
            logger.info("INCOIS Continuous Ingestion Service cancelled during sleep.")
            break
