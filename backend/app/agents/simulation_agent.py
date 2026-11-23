from typing import Any, Dict, Optional
from app.agents.risk_agent import assess_risk
from app.models.agent_models import RiskEvidence, SimulationEvidence, WeatherEvidence


def run_what_if_simulation(
    baseline_weather: WeatherEvidence,
    baseline_risk: RiskEvidence,
    delta_wave_m: Optional[float] = None,
    target_wave_m: Optional[float] = None,
    delta_wind_kmh: Optional[float] = None,
    target_wind_kmh: Optional[float] = None,
    target_forecast: Optional[str] = None,
) -> SimulationEvidence:
    new_wave_h = baseline_weather.wave_height_m
    new_wind_spd = baseline_weather.wind_speed_kmh
    new_forecast = baseline_weather.forecast

    param_parts = []
    base_parts = []
    sim_parts = []
    new_code = baseline_weather.weather_code

    if target_wave_m is not None:
        param_parts.append("wave_height_m")
        base_parts.append(f"{baseline_weather.wave_height_m:.2f} m" if baseline_weather.wave_height_m is not None else "unavailable")
        new_wave_h = max(0.1, target_wave_m)
        sim_parts.append(f"{new_wave_h:.2f} m")
    elif delta_wave_m is not None:
        param_parts.append("wave_height_m (+delta)")
        if baseline_weather.wave_height_m is not None:
            base_parts.append(f"{baseline_weather.wave_height_m:.2f} m")
            new_wave_h = max(0.1, baseline_weather.wave_height_m + delta_wave_m)
            sim_parts.append(f"{new_wave_h:.2f} m ({delta_wave_m:+.2f} m)")
        else:
            base_parts.append("unavailable")
            sim_parts.append(f"unavailable ({delta_wave_m:+.2f} m)")

    if target_wind_kmh is not None:
        param_parts.append("wind_speed_kmh")
        base_parts.append(f"{baseline_weather.wind_speed_kmh:.1f} km/h" if baseline_weather.wind_speed_kmh is not None else "unavailable")
        new_wind_spd = max(0.0, target_wind_kmh)
        sim_parts.append(f"{new_wind_spd:.1f} km/h")
    elif delta_wind_kmh is not None:
        param_parts.append("wind_speed_kmh (+delta)")
        if baseline_weather.wind_speed_kmh is not None:
            base_parts.append(f"{baseline_weather.wind_speed_kmh:.1f} km/h")
            new_wind_spd = max(0.0, baseline_weather.wind_speed_kmh + delta_wind_kmh)
            sim_parts.append(f"{new_wind_spd:.1f} km/h ({delta_wind_kmh:+.1f} km/h)")
        else:
            base_parts.append("unavailable")
            sim_parts.append(f"unavailable ({delta_wind_kmh:+.1f} km/h)")

    if target_forecast is not None:
        new_forecast = target_forecast
        param_parts.append("forecast")
        base_parts.append(baseline_weather.forecast or "unavailable")
        sim_parts.append(target_forecast)
        lower_fc = target_forecast.lower()
        if any(k in lower_fc for k in ("cyclone", "storm", "thunder", "squall", "gale")):
            new_code = 95
        elif any(k in lower_fc for k in ("rain", "shower", "drizzle")):
            new_code = 65
        elif "clear" in lower_fc:
            new_code = 0

    param_name = " & ".join(param_parts) if param_parts else "marine_scenario"
    base_val: Any = " / ".join(base_parts) if base_parts else None
    sim_val: Any = " / ".join(sim_parts) if sim_parts else None

    sim_weather_dict = baseline_weather.model_dump()
    sim_weather_dict["wave_height_m"] = new_wave_h
    sim_weather_dict["wind_speed_kmh"] = new_wind_spd
    sim_weather_dict["forecast"] = new_forecast
    sim_weather_dict["weather_code"] = new_code
    sim_weather_dict["source"] = f"{baseline_weather.source} [SIMULATION]"
    sim_weather_dict["is_mock"] = True

    sim_weather = WeatherEvidence(**sim_weather_dict)
    sim_risk = assess_risk(sim_weather)

    base_level = baseline_risk.level.upper()
    sim_level = sim_risk.level.upper()
    rank = {"UNKNOWN": 0, "LOW": 1, "CAUTION": 2, "UNSAFE": 3}

    if base_level == sim_level:
        impact = f"Risk classification remains {sim_level} under simulated {param_name} ({sim_val})."
    else:
        b_rank = rank.get(base_level, 0)
        s_rank = rank.get(sim_level, 0)
        if s_rank == 0 or (b_rank == 0 and s_rank <= 1):
            verb = "changed"
        elif s_rank > b_rank:
            verb = "escalated"
        else:
            verb = "reduced"
        impact = f"Risk classification {verb} from {base_level} to {sim_level} due to simulated {param_name} ({sim_val}). {sim_risk.reason}"

    default_wave_str = f"{baseline_weather.wave_height_m:.2f}m" if baseline_weather.wave_height_m is not None else "unavailable"
    default_wind_str = f"{baseline_weather.wind_speed_kmh:.1f}km/h" if baseline_weather.wind_speed_kmh is not None else "unavailable"
    sim_wave_str = f"{new_wave_h:.2f}m" if new_wave_h is not None else "unavailable"
    sim_wind_str = f"{new_wind_spd:.1f}km/h" if new_wind_spd is not None else "unavailable"

    return SimulationEvidence(
        is_simulation=True,
        parameter_modified=param_name,
        baseline_value=base_val if base_val is not None else f"{default_wave_str} / {default_wind_str}",
        simulated_value=sim_val if sim_val is not None else f"{sim_wave_str} / {sim_wind_str}",
        baseline_risk=base_level,
        simulated_risk=sim_level,
        impact_summary=impact,
        triggered_factors=sim_risk.factors,
        source="what_if_simulation_agent",
    )
