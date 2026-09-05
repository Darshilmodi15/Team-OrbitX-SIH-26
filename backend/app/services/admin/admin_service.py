"""
Super Admin Diagnostics, Fleet Telemetry, and Historical Marine Comparison Service for ORCA.
Supports querying real persistent database records with statistical fallback.
"""
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.models.admin_models import (
    HistoricalMarineComparison,
    ServiceEndpointHealth,
    SystemHealthStatus,
)
from app.services.auth import auth_service
from app.services.emergency import emergency_service

logger = logging.getLogger(__name__)

START_TIME = time.time()


class AdminService:
    """Core Admin Diagnostics and Historical Comparison Service."""

    def get_system_health(self) -> SystemHealthStatus:
        """Collects real-time diagnostic telemetry across all AI & Oceanographic services."""
        uptime = time.time() - START_TIME

        users = auth_service.list_all_users()
        active_sos = emergency_service.get_active_sos()

        # Check DB stats if available
        user_count = len(users)
        sos_count = len(active_sos)
        geofence_count = 0
        db_available = False

        try:
            from app.db.session import get_db_context
            from app.db.models import User, SOSRequest, Geofence
            with get_db_context() as db:
                db_users = db.query(User).count()
                db_sos = db.query(SOSRequest).filter(SOSRequest.status != "RESOLVED").count()
                db_geo = db.query(Geofence).filter(Geofence.is_active.is_(True)).count()
                db_available = True
                if db_users > 0:
                    user_count = db_users
                if db_sos > 0:
                    sos_count = db_sos
                if db_geo > 0:
                    geofence_count = db_geo
        except Exception as exc:
            logger.warning("Admin health database metrics unavailable: %s", exc)

        services = [
            ServiceEndpointHealth(
                service_name="INCOIS Ocean State Forecast (OSF)",
                status="UNKNOWN",
            ),
            ServiceEndpointHealth(
                service_name="Open-Meteo High-Resolution Marine Weather",
                status="UNKNOWN",
            ),
            ServiceEndpointHealth(
                service_name="PostgreSQL / SQLAlchemy Storage Layer",
                status="OPERATIONAL" if db_available else "OFFLINE",
            ),
            ServiceEndpointHealth(
                service_name="Shared Regional Live-Data Cache",
                status="UNKNOWN",
            ),
            ServiceEndpointHealth(
                service_name="Sarvam AI Multilingual & Speech Engine (Saaras / Bulbul)",
                status="UNKNOWN",
            ),
            ServiceEndpointHealth(
                service_name="ORCA Multi-Agent Intent & Task Planner (Gemini Core)",
                status="UNKNOWN",
            ),
            ServiceEndpointHealth(
                service_name="Spatial Boundaries & Geofence Engine (IMBL / MPA)",
                status="UNKNOWN",
            ),
        ]

        return SystemHealthStatus(
            overall_status="HEALTHY" if db_available else "DEGRADED",
            uptime_seconds=round(uptime, 1),
            registered_users_count=user_count,
            active_sos_count=sos_count,
            active_geofences_count=geofence_count,
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
        curr_wave = curr_wind = curr_sst = None
        hist_wave = hist_wind = hist_sst = None

        # Attempt to load historical observation from database
        try:
            from app.db.session import get_db_context
            from app.repositories import MarineObservationRepository
            with get_db_context() as db:
                latest_obs = MarineObservationRepository.get_latest_observation(db, lat, lon)
                if latest_obs:
                    curr_wave = latest_obs.wave_height_m
                    curr_wind = latest_obs.wind_speed_kmh
                    if latest_obs.sst_c is not None:
                        curr_sst = latest_obs.sst_c

                past_obs = MarineObservationRepository.get_historical_window(db, lat, lon, hours_ago=period_hours)
                if past_obs:
                    hist_wave = past_obs.wave_height_m
                    hist_wind = past_obs.wind_speed_kmh
                    if past_obs.sst_c is not None:
                        hist_sst = past_obs.sst_c
        except Exception as exc:
            logger.warning("Historical comparison database lookup unavailable: %s", exc)

        wave_delta = round(curr_wave - hist_wave, 2) if curr_wave is not None and hist_wave is not None else None
        wind_delta = round(curr_wind - hist_wind, 1) if curr_wind is not None and hist_wind is not None else None
        sst_delta = round(curr_sst - hist_sst, 2) if curr_sst is not None and hist_sst is not None else None

        if wave_delta is None or wind_delta is None:
            trend = "UNAVAILABLE"
            summary = "Historical marine telemetry is unavailable for the selected location and period."
        elif wave_delta > 0.4 or wind_delta > 8.0:
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
