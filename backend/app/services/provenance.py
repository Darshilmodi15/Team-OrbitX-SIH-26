from app.models.intelligence import DataProvenance

UNITS = {"sst_c": "°C", "air_temperature_c": "°C", "current_speed": "km/h", "current_direction": "degrees", "weather_code": "WMO code"}


def describe_field(parameter, value, source):
    key = parameter.split(".")[-1]
    unit = UNITS.get(key) or next((unit for suffix, unit in [("_kmh", "km/h"), ("_deg", "degrees"), ("_m", "m"), ("_s", "s"), ("_km", "km")] if key.endswith(suffix)), None)
    provider = source.get("source") or "Unavailable"
    if "incois" in provider.lower():
        product, url = "INCOIS Ocean State Forecast / WW3", "https://incois.gov.in/portal/osf/osf.jsp"
    elif "meteo" in provider.lower():
        atmosphere = key in {"wind_speed_kmh", "wind_direction_deg", "wind_gust_kmh", "visibility_km", "air_temperature_c", "weather_code"}
        product = "Open-Meteo atmospheric model output" if atmosphere else "Open-Meteo marine model output"
        url = "https://open-meteo.com/en/docs" if atmosphere else "https://open-meteo.com/en/docs/marine-weather-api"
    else:
        product, url = None, None
    return DataProvenance(parameter=parameter, value=value, unit=unit, provider=provider, product=product,
        evidence_type="model_forecast", spatial_resolution=source.get("spatial_resolution"), temporal_resolution=source.get("temporal_resolution"),
        sampled_lat=source.get("grid_lat"), sampled_lon=source.get("grid_lon"), forecast_valid_time=source.get("forecast_valid_at"),
        retrieved_at=source.get("retrieved_at"), source_url=url, cache_status=source.get("cache_status") or "unavailable").model_dump()
