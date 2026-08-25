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

    if weather:
        wave_h = weather.wave_height_m
        wind_spd = weather.wind_speed_kmh
        fc = weather.forecast.lower()

        if wave_h > 2.8:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-wave-crit-{round(lat, 2)}-{round(lon, 2)}',
                    severity='critical',
                    title='CRITICAL: Severe Rough Sea & High Wave Warning',
                    message=f'Significant wave height is {wave_h:.2f}m (>2.8m threshold). Immediate harbor return advised for all small and medium crafts.',
                    location_desc=f'{location_name} ({lat:.2f}N, {lon:.2f}E)',
                    timestamp=now_iso,
                    source=weather.source,
                    freshness='LIVE' if weather.cache_status == 'live' else 'CACHED',
                )
            )
        elif wave_h > 1.8:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-wave-warn-{round(lat, 2)}-{round(lon, 2)}',
                    severity='warning',
                    title='WARNING: Moderate Rough Sea Advisory',
                    message=f'Significant wave height is {wave_h:.2f}m (>1.8m). Caution advised for artisanal fishing vessels and small skiffs.',
                    location_desc=f'{location_name} ({lat:.2f}N, {lon:.2f}E)',
                    timestamp=now_iso,
                    source=weather.source,
                    freshness='LIVE' if weather.cache_status == 'live' else 'CACHED',
                )
            )

        if wind_spd > 50.0:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-wind-crit-{round(lat, 2)}-{round(lon, 2)}',
                    severity='critical',
                    title='CRITICAL: Strong Gale Wind Hazard',
                    message=f'Sustained wind speed is {wind_spd:.1f} km/h (>50 km/h). Structural and capsizing hazard in open waters.',
                    location_desc=f'{location_name} ({lat:.2f}N, {lon:.2f}E)',
                    timestamp=now_iso,
                    source=weather.source,
                    freshness='LIVE' if weather.cache_status == 'live' else 'CACHED',
                )
            )
        elif wind_spd > 38.0:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-wind-adv-{round(lat, 2)}-{round(lon, 2)}',
                    severity='advisory',
                    title='ADVISORY: Elevated Offshore Wind',
                    message=f'Wind speed measured at {wind_spd:.1f} km/h. Sea spray and choppy chop expected.',
                    location_desc=f'{location_name} ({lat:.2f}N, {lon:.2f}E)',
                    timestamp=now_iso,
                    source=weather.source,
                    freshness='LIVE' if weather.cache_status == 'live' else 'CACHED',
                )
            )

        if 'storm' in fc:
            alerts.append(
                HazardAlertEvidence(
                    id=f'alert-storm-{round(lat, 2)}-{round(lon, 2)}',
                    severity='critical',
                    title='CRITICAL: Severe Squall / Storm Cell Detected',
                    message='Authoritative forecasts indicate active cyclonic/storm disturbance in operational quadrant.',
                    location_desc=f'{location_name} ({lat:.2f}N, {lon:.2f}E)',
                    timestamp=now_iso,
                    source=weather.source,
                    freshness='LIVE' if weather.cache_status == 'live' else 'CACHED',
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
                    freshness='LIVE',
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
                    freshness='LIVE',
                )
            )

    return alerts
