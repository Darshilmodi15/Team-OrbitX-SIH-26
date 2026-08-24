"""Benchmark and performance measurement for INCOIS Marine Wave + Wind provider and cache."""
import time
from app.data.weather.cache import MarineWeatherCache
from app.data.weather.incois import IncoisWeatherProvider

cache = MarineWeatherCache()
provider = IncoisWeatherProvider(cache=cache, timeout_sec=6.0)

# Coordinates for Mumbai coastal waters
lat, lon = 18.9220, 72.8347
date = "2026-08-24"

print("--- 1. Testing Live External INCOIS Retrieval ---")
t0 = time.perf_counter()
live_data = provider.get_weather(lat=lat, lon=lon, date=date)
t_live = (time.perf_counter() - t0) * 1000

print(f"Live Retrieval Latency: {t_live:.2f} ms")
print("Live Data Result:", live_data)

print("\n--- 2. Testing Geospatial Cached Retrieval ---")
t1 = time.perf_counter()
cached_data = provider.get_weather(lat=lat, lon=lon, date=date)
t_cache = (time.perf_counter() - t1) * 1000

print(f"Cached Retrieval Latency: {t_cache:.3f} ms")
print(f"Speedup: {t_live / max(0.001, t_cache):.1f}x faster")
print("Cached Data Result:", cached_data)

print("\n--- 3. Testing Coordinate Normalization Grid Hit ---")
# Nearby coordinate (within 0.05 deg)
lat_near, lon_near = 18.9180, 72.8310
t2 = time.perf_counter()
grid_cached_data = provider.get_weather(lat=lat_near, lon=lon_near, date=date)
t_grid = (time.perf_counter() - t2) * 1000

print(f"Nearby Grid Cached Latency: {t_grid:.3f} ms")
print(f"Cache status for nearby query: {grid_cached_data['cache_status']}")
