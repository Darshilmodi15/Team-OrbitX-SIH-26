"""Marine safety risk assessment agent with decomposed environmental risk matrix."""
from typing import Any, Dict, List, Union
from app.models.agent_models import (
    ComponentRisk,
    MarineRiskProfile,
    RiskEvidence,
    WeatherEvidence,
)


def assess_risk(weather_input: Union[WeatherEvidence, Dict[str, Any]]) -> RiskEvidence:
    """
    Assesses maritime safety risk using decomposed environmental risk vectors:
    - Wave Risk (height, period, steepness)
    - Sustained Wind Risk
    - Wind Gust Risk
    - Visibility Risk
    - Storm / Convective Hazard Risk
    - Forecast Horizon Trend Analysis (+1h to +6h)
    
    Produces a full MarineRiskProfile and defensible RiskEvidence advisory.
    """
    if isinstance(weather_input, WeatherEvidence):
        wave_height = weather_input.wave_height_m
        wave_period = weather_input.wave_period_s
        wind_speed = weather_input.wind_speed_kmh
        wind_gust = weather_input.wind_gust_kmh
        visibility_km = weather_input.visibility_km
        forecast = weather_input.forecast.strip().lower()
        horizon = weather_input.forecast_horizon or []
    else:
        wave_height = float(weather_input.get("wave_height_m", 0.0))
        wave_period = float(weather_input["wave_period_s"]) if weather_input.get("wave_period_s") is not None else None
        wind_speed = float(weather_input.get("wind_speed_kmh", 0.0))
        wind_gust = float(weather_input["wind_gust_kmh"]) if weather_input.get("wind_gust_kmh") is not None else None
        visibility_km = float(weather_input["visibility_km"]) if weather_input.get("visibility_km") is not None else None
        forecast = str(weather_input.get("forecast", "")).strip().lower()
        horizon = weather_input.get("forecast_horizon", [])

    warnings: List[str] = []
    recommendations: List[str] = []
    triggers: List[str] = []

    # 1. Evaluate Wave Risk (Thresholds: <1.5m LOW, 1.5-2.5m MODERATE, >2.5m HIGH)
    wave_notes = f"Current significant wave height: {wave_height:.2f}m."
    if wave_period is not None:
        wave_notes += f" Wave period: {wave_period:.1f}s."

    if wave_height > 2.5:
        wave_level = "HIGH"
        triggers.append(f"Significant wave height ({wave_height:.2f}m) exceeds severe threshold (>2.5m)")
        warnings.append(f"Heavy seas detected ({wave_height:.2f}m). Severe capsize and swamping risk.")
    elif wave_height > 1.5:
        wave_level = "MODERATE"
        triggers.append(f"Significant wave height ({wave_height:.2f}m) exceeds caution threshold (>1.5m)")
        warnings.append(f"Moderate seas: wave height of {wave_height:.2f}m exceeds caution threshold (>1.5m).")
    else:
        # Steep sea check: Short period (<5.5s) with moderate wave (>1.2m) creates dangerous steep chop
        if wave_period is not None and wave_period < 5.5 and wave_height > 1.2:
            wave_level = "MODERATE"
            triggers.append(f"Short wave period ({wave_period:.1f}s) creating steep chop at {wave_height:.2f}m")
            warnings.append(f"Steep, short-period chop ({wave_period:.1f}s) may destabilize small crafts.")
        else:
            wave_level = "LOW"

    wave_risk = ComponentRisk(
        level=wave_level,
        value=wave_height,
        unit="m",
        threshold_applied="<1.5m LOW, 1.5-2.5m MODERATE, >2.5m HIGH",
        notes=wave_notes,
    )

    # 2. Evaluate Sustained Wind Risk (Thresholds: <30 km/h LOW, 30-50 km/h MODERATE, >50 km/h HIGH)
    if wind_speed > 50.0:
        wind_level = "HIGH"
        triggers.append(f"Sustained wind speed ({wind_speed:.1f} km/h) exceeds gale threshold (>50 km/h)")
        warnings.append(f"Near-gale to gale force winds ({wind_speed:.1f} km/h). Difficult steering.")
    elif wind_speed > 30.0:
        wind_level = "MODERATE"
        triggers.append(f"Sustained wind speed ({wind_speed:.1f} km/h) exceeds moderate threshold (>30 km/h)")
        warnings.append(f"Moderate breeze to strong breeze ({wind_speed:.1f} km/h).")
    else:
        wind_level = "LOW"

    wind_risk = ComponentRisk(
        level=wind_level,
        value=wind_speed,
        unit="km/h",
        threshold_applied="<30 km/h LOW, 30-50 km/h MODERATE, >50 km/h HIGH",
        notes=f"Sustained wind speed: {wind_speed:.1f} km/h.",
    )

    # 3. Evaluate Wind Gust Risk (Thresholds: <40 km/h LOW, 40-60 km/h MODERATE, >60 km/h HIGH)
    actual_gust = wind_gust if wind_gust is not None else round(wind_speed * 1.3, 1)
    if actual_gust > 60.0:
        gust_level = "HIGH"
        triggers.append(f"Peak wind gusts ({actual_gust:.1f} km/h) exceed severe threshold (>60 km/h)")
        warnings.append(f"Violent wind gusts up to {actual_gust:.1f} km/h. High capsize hazard.")
    elif actual_gust > 40.0:
        gust_level = "MODERATE"
        triggers.append(f"Peak wind gusts ({actual_gust:.1f} km/h) exceed caution threshold (>40 km/h)")
        warnings.append(f"Sudden gusts up to {actual_gust:.1f} km/h expected.")
    else:
        gust_level = "LOW"

    gust_risk = ComponentRisk(
        level=gust_level,
        value=actual_gust,
        unit="km/h",
        threshold_applied="<40 km/h LOW, 40-60 km/h MODERATE, >60 km/h HIGH",
        notes=f"Peak wind gust: {actual_gust:.1f} km/h.",
    )

    # 4. Evaluate Visibility Risk (Thresholds: >10 km GOOD/LOW, 5-10 km REDUCED/MODERATE, <5 km POOR/HIGH)
    vis_val = visibility_km if visibility_km is not None else 15.0
    if vis_val < 5.0:
        vis_level = "HIGH"
        triggers.append(f"Low visibility ({vis_val:.1f} km) below safety limit (<5 km)")
        warnings.append(f"Poor visibility ({vis_val:.1f} km). Fog/mist collision risk.")
    elif vis_val < 10.0:
        vis_level = "MODERATE"
        triggers.append(f"Reduced visibility ({vis_val:.1f} km) below optimal standard (<10 km)")
        warnings.append(f"Moderate haze or drizzle reducing visibility to {vis_val:.1f} km.")
    else:
        vis_level = "LOW"

    visibility_risk = ComponentRisk(
        level=vis_level,
        value=vis_val,
        unit="km",
        threshold_applied=">10km LOW, 5-10km MODERATE, <5km HIGH",
        notes=f"Visibility: {vis_val:.1f} km ({'Good' if vis_level == 'LOW' else 'Reduced' if vis_level == 'MODERATE' else 'Poor'}).",
    )

    # 5. Evaluate Storm / Convective Risk
    if any(k in forecast for k in ["storm", "thunder", "squall", "violent"]):
        storm_level = "HIGH"
        triggers.append(f"Severe atmospheric convective hazard indicated in forecast ('{forecast}')")
        warnings.append("Thunderstorms and severe squall line activity modeled in region.")
    elif any(k in forecast for k in ["rain", "drizzle", "shower"]):
        storm_level = "MODERATE"
        triggers.append(f"Precipitation and localized rain squalls indicated in forecast ('{forecast}')")
    else:
        storm_level = "LOW"

    storm_risk = ComponentRisk(
        level=storm_level,
        value=None,
        unit=None,
        threshold_applied="Convective WMO forecast classification",
        notes=f"Forecast condition: '{forecast}'.",
    )

    # 6. Evaluate Forecast Horizon Trend (+1h to +6h)
    forecast_trend = "stable"
    if horizon and len(horizon) > 0:
        max_future_wave = max(float(h.get("wave_height_m", 0.0)) for h in horizon)
        max_future_wind = max(float(h.get("wind_speed_kmh", 0.0)) for h in horizon)

        if (max_future_wave - wave_height) >= 0.5 or (max_future_wind - wind_speed) >= 15.0:
            forecast_trend = "deteriorating"
            warnings.append(
                f"Deteriorating forecast trend: wave height rising to {max_future_wave:.2f}m "
                f"or winds reaching {max_future_wind:.1f} km/h over the next 4-6 hours."
            )
        elif (wave_height - max_future_wave) >= 0.5 and (wind_speed - max_future_wind) >= 10.0:
            forecast_trend = "improving"

    # Determine Overall Operational Risk & Status
    levels = [wave_risk.level, wind_risk.level, gust_risk.level, visibility_risk.level, storm_risk.level]
    if "HIGH" in levels:
        overall = "HIGH"
        status_label = "UNSAFE"
        level_str = "unsafe"
        recommendations.append("Strict avoidance of sea departure. Vessels at sea should seek sheltered waters immediately.")
        recommendations.append("Secure deck gear, maintain continuous VHF Channel 16 watch.")
    elif "MODERATE" in levels or forecast_trend == "deteriorating":
        overall = "MODERATE"
        status_label = "CAUTION"
        level_str = "caution"
        recommendations.append("Small crafts and artisanal vessels should remain within 5 nautical miles of coast or delay sailing.")
        recommendations.append("Carry mandatory lifejackets, GPS beacon, and verify hourly weather bulletins.")
    else:
        overall = "LOW"
        status_label = "SAFE"
        level_str = "safe"
        recommendations.append("Normal maritime navigation and fishing operations may proceed with standard safety equipment.")
        recommendations.append("Maintain situational awareness and monitor routine coast radio broadcasts.")

    profile = MarineRiskProfile(
        overall=overall,
        status_label=status_label,
        wave_risk=wave_risk,
        wind_risk=wind_risk,
        gust_risk=gust_risk,
        visibility_risk=visibility_risk,
        storm_risk=storm_risk,
        forecast_trend=forecast_trend,
        warnings=warnings,
        recommendations=recommendations,
    )

    if overall == "HIGH":
        reason = (
            f"HIGH RISK (UNSAFE FOR SAILING): {'; '.join(triggers)}. "
            "Sea venturing is strictly discouraged under current modeled parameters."
        )
    elif overall == "MODERATE":
        reason = (
            f"MODERATE RISK (CAUTION ADVISED): {'; '.join(triggers) if triggers else 'Moderate ocean conditions'}. "
            "Small crafts should exercise heightened vigilance and restrict offshore distance."
        )
    else:
        reason = (
            f"LOW RISK (SAFE TO SAIL): Calm seas (wave: {wave_height:.2f}m <= 1.5m), "
            f"manageable winds ({wind_speed:.1f} km/h <= 30 km/h), and good visibility ({vis_val:.1f} km)."
        )

    return RiskEvidence(
        level=level_str,
        reason=reason,
        factors=triggers if triggers else [f"wave={wave_height:.2f}m", f"wind={wind_speed:.1f}km/h", f"vis={vis_val:.1f}km"],
        profile=profile,
        disclaimer=(
            "ORCA Risk Assessment: Model-based decision under current forecast parameters. "
            "Always verify official INCOIS/IMD bulletins and local port warnings before departure."
        ),
        source="risk_assessment_agent",
    )
