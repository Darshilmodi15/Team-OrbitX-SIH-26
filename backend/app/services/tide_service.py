"""Authoritative external tide adapter + clearly labeled astronomical lunar-tide estimator.

Scientific integrity contract:
- get_authoritative_tide() ONLY returns data when WORLDTIDES_API_KEY or STORMGLASS_API_KEY
  is configured and returns valid extremes. Otherwise it returns None so /api/marine/tide
  raises 503 TIDE_FEED_UNAVAILABLE rather than synthesizing harbour clearance.
- compute_lunar_tide_estimate() lives separately and is explicitly marked non-authoritative
  (reliability_tier="ASTRONOMICAL_ESTIMATE") for spring/neap planning context only.
"""
from datetime import datetime, timedelta, timezone
import logging
import math
import os
from typing import Any, Dict, List, Optional
import httpx

from app.services.temporal import IST

logger = logging.getLogger(__name__)

# J2000 reference New Moon epoch: 2000-01-06 18:14 UTC
_NEW_MOON_EPOCH = datetime(2000, 1, 6, 18, 14, 0, tzinfo=timezone.utc)
_SYNODIC_MONTH_DAYS = 29.53058867
_M2_PERIOD_HOURS = 12.4206012


def get_authoritative_tide(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Fetch authoritative harmonic tide extremes from WorldTides or Stormglass if configured."""
    wt_key = os.getenv("WORLDTIDES_API_KEY", "").strip()
    if wt_key:
        try:
            with httpx.Client(timeout=8.0, verify=True) as client:
                resp = client.get(
                    "https://www.worldtides.info/api/v3",
                    params={"extremes": "", "lat": lat, "lon": lon, "days": 2, "key": wt_key},
                )
            if resp.status_code == 200:
                payload = resp.json()
                extremes = payload.get("extremes") or []
                highs = [e for e in extremes if str(e.get("type", "")).lower() == "high"]
                lows = [e for e in extremes if str(e.get("type", "")).lower() == "low"]
                if highs or lows:
                    h0 = highs[0] if highs else {}
                    h1 = highs[1] if len(highs) > 1 else {}
                    l0 = lows[0] if lows else {}
                    high_h = h0.get("height")
                    low_h = l0.get("height")
                    tidal_range = round(float(high_h) - float(low_h), 2) if (high_h is not None and low_h is not None) else None
                    return {
                        "status": "available",
                        "availability": "available",
                        "is_authoritative": True,
                        "source": "WorldTides Harmonic API",
                        "station": payload.get("station") or f"Grid ({lat:.2f}, {lon:.2f})",
                        "high_tide_time": h0.get("date"),
                        "high_tide_height_m": round(float(high_h), 2) if high_h is not None else None,
                        "secondary_high_tide_time": h1.get("date"),
                        "secondary_high_tide_height_m": round(float(h1["height"]), 2) if h1.get("height") is not None else None,
                        "low_tide_time": l0.get("date"),
                        "low_tide_height_m": round(float(low_h), 2) if low_h is not None else None,
                        "tidal_range_m": tidal_range,
                        "extremes": extremes[:8],
                    }
        except Exception as exc:
            logger.warning("WorldTides request failed: %s", type(exc).__name__)

    sg_key = os.getenv("STORMGLASS_API_KEY", "").strip()
    if sg_key:
        try:
            now = datetime.now(timezone.utc)
            with httpx.Client(timeout=8.0, verify=True) as client:
                resp = client.get(
                    "https://api.stormglass.io/v2/tide/extremes/point",
                    headers={"Authorization": sg_key},
                    params={
                        "lat": lat,
                        "lng": lon,
                        "start": now.isoformat(),
                        "end": (now + timedelta(hours=36)).isoformat(),
                    },
                )
            if resp.status_code == 200:
                payload = resp.json()
                extremes = payload.get("data") or []
                highs = [e for e in extremes if str(e.get("type", "")).lower() == "high"]
                lows = [e for e in extremes if str(e.get("type", "")).lower() == "low"]
                if highs or lows:
                    h0 = highs[0] if highs else {}
                    h1 = highs[1] if len(highs) > 1 else {}
                    l0 = lows[0] if lows else {}
                    high_h = h0.get("height")
                    low_h = l0.get("height")
                    tidal_range = round(float(high_h) - float(low_h), 2) if (high_h is not None and low_h is not None) else None
                    return {
                        "status": "available",
                        "availability": "available",
                        "is_authoritative": True,
                        "source": "Stormglass Tide API",
                        "station": (payload.get("meta") or {}).get("station", {}).get("name") or f"Grid ({lat:.2f}, {lon:.2f})",
                        "high_tide_time": h0.get("time"),
                        "high_tide_height_m": round(float(high_h), 2) if high_h is not None else None,
                        "secondary_high_tide_time": h1.get("time"),
                        "secondary_high_tide_height_m": round(float(h1["height"]), 2) if h1.get("height") is not None else None,
                        "low_tide_time": l0.get("time"),
                        "low_tide_height_m": round(float(low_h), 2) if low_h is not None else None,
                        "tidal_range_m": tidal_range,
                        "extremes": extremes[:8],
                    }
        except Exception as exc:
            logger.warning("Stormglass Tide request failed: %s", type(exc).__name__)

    return None


def _phase_name(age_days: float) -> str:
    ratio = age_days / _SYNODIC_MONTH_DAYS
    if ratio < 0.0625 or ratio >= 0.9375:
        return "New Moon"
    if ratio < 0.1875:
        return "Waxing Crescent"
    if ratio < 0.3125:
        return "First Quarter"
    if ratio < 0.4375:
        return "Waxing Gibbous"
    if ratio < 0.5625:
        return "Full Moon"
    if ratio < 0.6875:
        return "Waning Gibbous"
    if ratio < 0.8125:
        return "Last Quarter"
    return "Waning Crescent"


def compute_lunar_tide_estimate(lat: float, lon: float, target_date: Optional[str] = None) -> Dict[str, Any]:
    """Computes an astronomical lunar-phase and approximate M2 semidiurnal tide timing estimate.

    Clearly marked is_authoritative=False so it can never be mistaken for local gauge data.
    """
    now_ist = datetime.now(IST)
    if target_date:
        try:
            day = datetime.strptime(target_date.strip(), "%Y-%m-%d").replace(tzinfo=IST)
            ref_ist = day.replace(hour=12, minute=0, second=0, microsecond=0)
        except ValueError as exc:
            from fastapi import HTTPException
            raise HTTPException(status_code=422, detail="INVALID_DATE_FORMAT") from exc
    else:
        ref_ist = now_ist

    ref_utc = ref_ist.astimezone(timezone.utc)
    days_since_new = ((ref_utc - _NEW_MOON_EPOCH).total_seconds() / 86400.0) % _SYNODIC_MONTH_DAYS
    phase_angle = (days_since_new / _SYNODIC_MONTH_DAYS) * 2.0 * math.pi
    illumination_pct = round(50.0 * (1.0 - math.cos(phase_angle)), 1)
    phase_label = _phase_name(days_since_new)

    # Distance in days to nearest New or Full moon controls Spring/Neap range regime.
    dist_syzygy = min(days_since_new, abs(days_since_new - (_SYNODIC_MONTH_DAYS / 2.0)), _SYNODIC_MONTH_DAYS - days_since_new)
    if dist_syzygy <= 2.5:
        tidal_regime = "SPRING_TIDE"
        range_note = "Higher tidal range & stronger nearshore currents (~1-3 days around New/Full Moon)."
    elif dist_syzygy >= 5.0:
        tidal_regime = "NEAP_TIDE"
        range_note = "Moderate/reduced tidal range (~1-2 days around Quarter Moon)."
    else:
        tidal_regime = "TRANSITIONAL"
        range_note = "Transitional tidal range between Spring and Neap phases."

    # Approximate lunar upper transit in IST adjusted by coastal longitude relative to 82.5E (IST meridian).
    lunar_lag_hours = (days_since_new * 24.8412 / _SYNODIC_MONTH_DAYS) % 24.8412
    lon_offset_hours = (82.5 - lon) / 15.0
    lunitidal_interval_hours = 1.5  # Rough open-coast phase lag; actual harbours vary strongly
    day_start_ist = ref_ist.replace(hour=0, minute=0, second=0, microsecond=0)

    first_high_hours = (12.0 + lunar_lag_hours + lon_offset_hours + lunitidal_interval_hours) % _M2_PERIOD_HOURS
    high_windows: List[str] = []
    low_windows: List[str] = []
    t_h = first_high_hours
    while t_h < 24.0:
        high_dt = day_start_ist + timedelta(hours=t_h)
        high_windows.append(high_dt.strftime("%H:%M IST"))
        t_h += _M2_PERIOD_HOURS

    first_low_hours = (first_high_hours + _M2_PERIOD_HOURS / 2.0) % _M2_PERIOD_HOURS
    t_l = first_low_hours
    while t_l < 24.0:
        low_dt = day_start_ist + timedelta(hours=t_l)
        low_windows.append(low_dt.strftime("%H:%M IST"))
        t_l += _M2_PERIOD_HOURS

    return {
        "status": "estimated",
        "is_authoritative": False,
        "reliability_tier": "ASTRONOMICAL_ESTIMATE",
        "source": "ORCA Astronomical Lunar Model (M2/S2)",
        "date_ist": day_start_ist.date().isoformat(),
        "location": {"lat": round(lat, 4), "lon": round(lon, 4)},
        "lunar_age_days": round(days_since_new, 2),
        "illumination_pct": illumination_pct,
        "moon_phase": phase_label,
        "tidal_regime": tidal_regime,
        "regime_note": range_note,
        "estimated_high_tide_windows_ist": high_windows,
        "estimated_low_tide_windows_ist": low_windows,
        "disclaimer": (
            "Astronomical lunar-phase estimate only. Local harbour bathymetry, estuaries, "
            "and storm surge shift actual tide times and heights; do not use for keel clearance."
        ),
    }
