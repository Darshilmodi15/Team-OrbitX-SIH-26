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

    param_name = "marine_scenario"
    base_val: Any = None
    sim_val: Any = None

    if target_wave_m is not None:
        param_name = "wave_height_m"
        base_val = f"{baseline_weather.wave_height_m:.2f} m"
        new_wave_h = max(0.1, target_wave_m)
        sim_val = f"{new_wave_h:.2f} m"
    elif delta_wave_m is not None:
        param_name = "wave_height_m (+delta)"
        base_val = f"{baseline_weather.wave_height_m:.2f} m"
        new_wave_h = max(0.1, baseline_weather.wave_height_m + delta_wave_m)
        sim_val = f"{new_wave_h:.2f} m (+{delta_wave_m:.2f} m)"

    if target_wind_kmh is not None:
        param_name = "wind_speed_kmh"
        base_val = f"{baseline_weather.wind_speed_kmh:.1f} km/h"
        new_wind_spd = max(0.0, target_wind_kmh)
        sim_val = f"{new_wind_spd:.1f} km/h"
    elif delta_wind_kmh is not None:
        param_name = "wind_speed_kmh (+delta)"
        base_val = f"{baseline_weather.wind_speed_kmh:.1f} km/h"
        new_wind_spd = max(0.0, baseline_weather.wind_speed_kmh + delta_wind_kmh)
        sim_val = f"{new_wind_spd:.1f} km/h (+{delta_wind_kmh:.1f} km/h)"

    if target_forecast is not None:
        new_forecast = target_forecast

    sim_weather_dict = baseline_weather.model_dump()
    sim_weather_dict["wave_height_m"] = new_wave_h
    sim_weather_dict["wind_speed_kmh"] = new_wind_spd
    sim_weather_dict["forecast"] = new_forecast
    sim_weather_dict["source"] = f"{baseline_weather.source} [SIMULATION]"
    sim_weather_dict["is_mock"] = True

    sim_weather = WeatherEvidence(**sim_weather_dict)
    sim_risk = assess_risk(sim_weather)

    base_level = baseline_risk.level.upper()
    sim_level = sim_risk.level.upper()

    if base_level == sim_level:
        impact = f"Risk classification remains {sim_level} under simulated {param_name} ({sim_val})."
    else:
        impact = f"Risk classification escalated from {base_level} to {sim_level} due to simulated {param_name} ({sim_val}). {sim_risk.reason}"

    return SimulationEvidence(
        is_simulation=True,
        parameter_modified=param_name,
        baseline_value=base_val if base_val is not None else f"{baseline_weather.wave_height_m:.2f}m / {baseline_weather.wind_speed_kmh:.1f}km/h",
        simulated_value=sim_val if sim_val is not None else f"{new_wave_h:.2f}m / {new_wind_spd:.1f}km/h",
        baseline_risk=base_level,
        simulated_risk=sim_level,
        impact_summary=impact,
        triggered_factors=sim_risk.factors,
        source="what_if_simulation_agent",
    )
