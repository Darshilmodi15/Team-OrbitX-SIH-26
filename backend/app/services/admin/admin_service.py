"""
Super Admin Diagnostics, Fleet Telemetry, and Historical Marine Comparison Service for ORCA.
Supports querying real persistent database records with statistical fallback.
"""
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.models.admin_models import (
    HistoricalMarineComparison,
    ServiceEndpointHealth,
    SystemHealthStatus,
)
from app.services.provider_health import snapshot
from app.services.auth import auth_service
from app.services.emergency import emergency_service

logger = logging.getLogger(__name__)

START_TIME = time.time()


class AdminService:
    """Core Admin Diagnostics and Historical Comparison Service."""

    def get_system_health(self) -> SystemHealthStatus:
        """Collects non-secret, low-cost health signals without inventing provider success."""
        uptime = time.time() - START_TIME
        user_count = sos_count = geofence_count = None
        db_status, db_latency, db_error = "DOWN", None, "Database check failed"
        try:
            from app.db.session import get_db_context
            from app.db.models import User, SOSRequest, Geofence
            started = time.perf_counter()
            with get_db_context() as db:
                db_users = db.query(User).count()
                db_sos = db.query(SOSRequest).filter(SOSRequest.status != "RESOLVED").count()
                db_geo = db.query(Geofence).filter(Geofence.is_active.is_(True)).count()
                user_count, sos_count, geofence_count = db_users, db_sos, db_geo
            db_latency = round((time.perf_counter() - started) * 1000, 1)
            db_status, db_error = "HEALTHY", None
        except Exception as exc:
            db_error = type(exc).__name__
        checked = datetime.now(timezone.utc).isoformat()
        services = [
            ServiceEndpointHealth(service_id=key, service_name=name, provider=provider, **snapshot(key))
            for key, name, provider in [
                ("incois", "INCOIS Ocean State Forecast", "INCOIS"),
                ("open_meteo", "Open-Meteo Marine Weather", "Open-Meteo"),
                ("sarvam_stt", "Sarvam speech-to-text", "Sarvam"),
                ("sarvam_tts", "Sarvam text-to-speech", "Sarvam"),
                ("sarvam_translation", "Sarvam translation", "Sarvam"),
                ("gemini", "Gemini assistant", "Gemini"),
            ]
        ]
        services.append(ServiceEndpointHealth(service_id="database", service_name="Database storage", status=db_status, latency_ms=db_latency, last_checked=checked, last_successful_response=checked if db_status == "HEALTHY" else None, last_error_summary=db_error, provider="SQL database", real_data_arriving=db_status == "HEALTHY", data_mode="live" if db_status == "HEALTHY" else "unavailable"))
        return SystemHealthStatus(
            overall_status="HEALTHY" if all(service.status == "HEALTHY" for service in services) else "DEGRADED",
            uptime_seconds=round(uptime, 1),
            registered_users_count=user_count,
            active_sos_count=sos_count,
            active_geofences_count=geofence_count,
            cache_hit_rate_pct=None,
            memory_usage_mb=None,
            services=services,
        )

    def get_historical_comparison(
        self,
        lat: float,
        lon: float,
        period_hours: int = 24,
    ) -> HistoricalMarineComparison:
        """
        Calculates 24-hour or 7-day before-vs-after oceanographic trends using database observations
        with graceful baseline fallback.
        """
        from fastapi import HTTPException
        from app.db.session import get_db_context
        from app.repositories import MarineObservationRepository
        try:
            with get_db_context() as db:
                latest_obs = MarineObservationRepository.get_latest_observation(db, lat, lon)
                past_obs = MarineObservationRepository.get_historical_window(db, lat, lon, hours_ago=period_hours)
                if not latest_obs or not past_obs:
                    raise HTTPException(status_code=503, detail="HISTORICAL_DATA_UNAVAILABLE")
                curr_wave, curr_wind, curr_sst = latest_obs.wave_height_m, latest_obs.wind_speed_kmh, latest_obs.sst_c
                hist_wave, hist_wind, hist_sst = past_obs.wave_height_m, past_obs.wind_speed_kmh, past_obs.sst_c
                if any(value is None for value in (curr_wave, curr_wind, curr_sst, hist_wave, hist_wind, hist_sst)):
                    raise HTTPException(status_code=503, detail="HISTORICAL_DATA_INCOMPLETE")
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Historical lookup failed: %s", type(exc).__name__)
            raise HTTPException(status_code=503, detail="HISTORICAL_DATA_UNAVAILABLE")

        wave_delta = round(curr_wave - hist_wave, 2)
        wind_delta = round(curr_wind - hist_wind, 1)
        sst_delta = round(curr_sst - hist_sst, 2)

        if wave_delta > 0.4 or wind_delta > 8.0:
            trend = "DETERIORATING"
            summary = f"Conditions have roughened over the past {period_hours} hours with wave heights rising by +{wave_delta}m and sustained winds increasing by +{wind_delta} km/h."
        elif wave_delta < -0.3 and wind_delta < -5.0:
            trend = "IMPROVING"
            summary = f"Sea conditions have settled significantly compared to {period_hours} hours ago (-{abs(wave_delta)}m wave drop)."
        else:
            trend = "STABLE"
            summary = f"Marine telemetry remains consistent with {period_hours}-hour baseline within normal seasonal variation (Wave Δ: {wave_delta:+}m, Wind Δ: {wind_delta:+} km/h)."

        return HistoricalMarineComparison(
            lat=lat,
            lon=lon,
            current_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            comparison_period_hours=period_hours,
            current_wave_height_m=curr_wave,
            historical_wave_height_m=hist_wave,
            wave_delta_m=wave_delta,
            current_wind_speed_kmh=curr_wind,
            historical_wind_speed_kmh=hist_wind,
            wind_delta_kmh=wind_delta,
            current_sst_c=curr_sst,
            historical_sst_c=hist_sst,
            sst_delta_c=sst_delta,
            safety_trend=trend,
            summary_advisory=summary,
        )


admin_service = AdminService()
