from datetime import datetime, timezone
from typing import List, Optional
from app.data.geofence import evaluate_vessel_geofences
from app.models.agent_models import HazardAlertEvidence, WeatherEvidence


def detect_proactive_hazards(
    lat: float,
    lon: float,
    weather: Optional[WeatherEvidence] = None,
    location_name: str = 'Operating Sector',
) -> List[HazardAlertEvidence]:
    alerts: List[HazardAlertEvidence] = []
    now_iso = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')

    if weather and not weather.is_mock and weather.cache_status in {"fresh", "live", "cached", "stale"}:
        wave_h = weather.wave_height_m
        wind_spd = weather.wind_speed_kmh
        fc = weather.forecast.lower()

        if wave_h is not None and wave_h > 2.8:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-wave-crit-{round(lat, 2)}-{round(lon, 2)}',
                    severity='critical',
                    title='CRITICAL: Severe Rough Sea & High Wave Warning',
                    message=f'Significant wave height is {wave_h:.2f}m (>2.8m threshold). Immediate harbor return advised for all small and medium crafts.',
                    location_desc=f'{location_name} ({lat:.2f}N, {lon:.2f}E)',
                    timestamp=weather.forecast_time,
                    source="ORCA heuristic",
                    freshness={"fresh": "FRESH", "live": "FRESH", "cached": "CACHED", "stale": "STALE"}.get(weather.cache_status, "UNAVAILABLE"),
                )
            )
        elif wave_h is not None and wave_h > 1.8:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-wave-warn-{round(lat, 2)}-{round(lon, 2)}',
                    severity='warning',
                    title='WARNING: Moderate Rough Sea Advisory',
                    message=f'Significant wave height is {wave_h:.2f}m (>1.8m). Caution advised for artisanal fishing vessels and small skiffs.',
                    location_desc=f'{location_name} ({lat:.2f}N, {lon:.2f}E)',
                    timestamp=weather.forecast_time,
                    source="ORCA heuristic",
                    freshness={"fresh": "FRESH", "live": "FRESH", "cached": "CACHED", "stale": "STALE"}.get(weather.cache_status, "UNAVAILABLE"),
                )
            )

        if wind_spd is not None and wind_spd > 50.0:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-wind-crit-{round(lat, 2)}-{round(lon, 2)}',
                    severity='critical',
                    title='CRITICAL: Strong Gale Wind Hazard',
                    message=f'Sustained wind speed is {wind_spd:.1f} km/h (>50 km/h). Structural and capsizing hazard in open waters.',
                    location_desc=f'{location_name} ({lat:.2f}N, {lon:.2f}E)',
                    timestamp=weather.forecast_time,
                    source="ORCA heuristic",
                    freshness={"fresh": "FRESH", "live": "FRESH", "cached": "CACHED", "stale": "STALE"}.get(weather.cache_status, "UNAVAILABLE"),
                )
            )
        elif wind_spd is not None and wind_spd > 38.0:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-wind-adv-{round(lat, 2)}-{round(lon, 2)}',
                    severity='advisory',
                    title='ADVISORY: Elevated Offshore Wind',
                    message=f'Wind speed measured at {wind_spd:.1f} km/h. Sea spray and choppy chop expected.',
                    location_desc=f'{location_name} ({lat:.2f}N, {lon:.2f}E)',
                    timestamp=weather.forecast_time,
                    source="ORCA heuristic",
                    freshness={"fresh": "FRESH", "live": "FRESH", "cached": "CACHED", "stale": "STALE"}.get(weather.cache_status, "UNAVAILABLE"),
                )
            )

        if weather.weather_code in {95, 96, 99}:
            alerts.append(HazardAlertEvidence(
                id=f'alert-storm-{round(lat, 2)}-{round(lon, 2)}', severity='warning',
                title='ORCA: Provider thunderstorm forecast',
                message=f'Provider weather code {weather.weather_code} indicates thunderstorm forecast conditions. This is not a retrieved official cyclone or lightning observation.',
                location_desc=location_name, timestamp=weather.forecast_time,
                source='ORCA heuristic', freshness=weather.cache_status.upper(),
            ))

        if weather.wave_period_s and weather.wave_period_s >= 13.0 and wave_h is not None and wave_h >= 1.5:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-swell-surge-{round(lat, 2)}-{round(lon, 2)}',
                    severity='warning',
                    title='WARNING: Long-Period Swell Surge (Kallakkadal) Alert',
                    message=f'Long-period ocean swell ({weather.wave_period_s:.1f}s) may cause sudden high wave surges and coastal inundation along low-lying coastlines.',
                    location_desc=f'{location_name} ({lat:.2f}N, {lon:.2f}E)',
                    timestamp=weather.forecast_time,
                    source='ORCA heuristic',
                    freshness={"fresh": "FRESH", "live": "FRESH", "cached": "CACHED", "stale": "STALE"}.get(weather.cache_status, "UNAVAILABLE"),
                )
            )

    geofences = evaluate_vessel_geofences(lat, lon)
    for g in geofences:
        if g.is_inside:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-geo-in-{g.id}',
                    severity='critical',
                    title=f'BOUNDARY BREACH: Inside {g.name}',
                    message=f'Vessel has entered {g.name}. {g.description}',
                    location_desc=g.name,
                    timestamp=now_iso,
                    source='geospatial_agent',
                    freshness='REFERENCE',
                )
            )
        elif g.is_proximity_warning and g.distance_to_vessel_km is not None and g.distance_to_vessel_km <= 20.0:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-geo-prox-{g.id}',
                    severity='warning' if g.risk_level == 'CRITICAL_DANGER' else 'advisory',
                    title=f'GEOFENCE PROXIMITY: {g.distance_to_vessel_km} km to {g.name}',
                    message=f'Vessel is {g.distance_to_vessel_km} km from {g.name} ({g.category}). Maintain safe heading.',
                    location_desc=f'Proximity buffer to {g.name}',
                    timestamp=now_iso,
                    source='geospatial_agent',
                    freshness='REFERENCE',
                )
            )

    return alerts
