"""Explicit, opt-in illustrative datasets using the canonical snapshot contract."""
import os
from typing import Protocol
from datetime import timedelta
from fastapi import HTTPException
from app.data.pfz.mock import haversine_km
from app.agents.risk_agent import assess_risk
from app.models.marine_snapshot import MarineSnapshot, SnapshotWeather

# Names and coordinates already defined by the location service / ingestion hubs.
SCENARIOS = {
    "mumbai": {"name": "Mumbai Port & Sassoon Dock", "lat": 18.9220, "lon": 72.8347},
    "surat": {"name": "Surat / Hazira", "lat": 21.10, "lon": 72.70},
    "veraval": {"name": "Veraval Port", "lat": 20.90, "lon": 70.37},
}
SOURCE = "ORCA Illustrative Dataset [SIMULATION]"


class MarineDataProvider(Protocol):
    def snapshot(self) -> MarineSnapshot: ...


class LiveProvider:
    def __init__(self, build):
        self.build = build

    def snapshot(self):
        return self.build()


class DemoScenarioProvider:
    def __init__(self, live, scenario, now):
        self.live, self.scenario, self.now = live, scenario, now

    def snapshot(self):
        result = self.live.snapshot()
        # Prefer the complete real payload. Never mix invented fields into it.
        required = ("wave_height_m", "wind_speed_kmh", "wind_direction_deg",
                    "wave_period_s", "wave_direction_deg", "swell_height_m", "current_speed")
        if (result.provenance["cache_status"] in {"fresh", "live", "cached"}
                and all(getattr(result.weather, k) is not None for k in required)
                and result.ocean["sst_c"] is not None and result.pfz["zones"]):
            return result
        scenario = SCENARIOS[self.scenario]
        if haversine_km(result.location.lat, result.location.lon, scenario["lat"], scenario["lon"]) > 5:
            raise HTTPException(status_code=409, detail="DEMO_LOCATION_MISMATCH")
        wave, wind = {"mumbai": (1.0, 18.0), "surat": (1.8, 28.0), "veraval": (2.8, 48.0)}[self.scenario]
        weather = SnapshotWeather(wave_height_m=wave, wind_speed_kmh=wind, wind_direction_deg=235,
            wave_period_s=7.5, wave_direction_deg=240, swell_height_m=0.8, swell_period_s=9,
            swell_direction_deg=225, current_speed=1.1, current_direction=160,
            wind_gust_kmh=wind+8, visibility_km=12, weather_code=2, air_temperature_c=29,
            wind_wave_height_m=0.6, wind_wave_period_s=4.5, wind_wave_direction_deg=235)
        issued = self.now.replace(hour=0, minute=0, second=0, microsecond=0)
        valid = issued + timedelta(days=1)
        fields = {}
        for key, value in weather.model_dump().items():
            if isinstance(value, (int, float)):
                fields["weather."+key] = {"source": SOURCE, "provider": SOURCE, "value": value,
                    "forecast_valid_at": result.request.requested_time, "issued_at": issued.isoformat(),
                    "retrieved_at": self.now.isoformat(), "grid_lat": scenario["lat"], "grid_lon": scenario["lon"],
                    "cache_status": "simulated", "measurement_kind": "illustrative", "evidence_type": "illustrative"}
        fields["ocean.sst_c"] = {**fields["weather.wave_height_m"], "value": 28.2}
        lat, lon = scenario["lat"]-0.12, scenario["lon"]-0.22
        sector = {"type": "Polygon", "coordinates": [[[lon-.12,lat-.12],[lon+.12,lat-.12],
            [lon+.12,lat+.12],[lon-.12,lat+.12],[lon-.12,lat-.12]]]}
        zones = [{"id": self.scenario+"-demo-"+str(i), "landing_centre": scenario["name"],
            "latitude": lat+dy, "longitude": lon+dx,
            "distance_km": round(haversine_km(result.location.lat,result.location.lon,lat+dy,lon+dx),2),
            "geometry": sector if i == 0 else None,
            "geometry_meaning": "illustrative_search_region" if i == 0 else None}
            for i,(dy,dx) in enumerate([(0,0),(.06,-.05),(-.05,.07)])]
        risk = assess_risk({**weather.model_dump(), "swell_wave_height_m": weather.swell_height_m,
            "ocean_current_speed_kmh": weather.current_speed, "source": SOURCE,
            "cache_status": "cached", "is_mock": True})
        return result.model_copy(update={
            "location": result.location.model_copy(update={"name": scenario["name"]}),
            "weather": weather, "ocean": {"sst_c":28.2,"chlorophyll":None},
            "pfz": {"availability":"available","advisory_id":self.scenario+"-illustrative-v1",
                "issued_at":issued.isoformat(),"valid_until":valid.isoformat(),"source":SOURCE,"zones":zones},
            "hazards": [], "risk": {**risk.model_dump(), "reasons":["Demo Scenario — not live conditions.",risk.reason,*[f"{key}: {value}" for key, value in risk.available_evidence.items()],*risk.factors]},
            "provenance": {**result.provenance,"provider":[SOURCE],"source":[SOURCE],"cache_status":"simulated",
                "demo_scenario":self.scenario,"measurement_kind":"illustrative","fields":fields,
                "forecast_valid_at":result.request.requested_time,"issued_at":issued.isoformat(),
                "retrieved_at":self.now.isoformat(),"fallback_used":True,"data_age_seconds":0,
                "grid_lat":scenario["lat"],"grid_lon":scenario["lon"]},
            "missing_fields":["ocean.chlorophyll","tide.high_tide","tide.low_tide", *[field for field in result.missing_fields if field.startswith("boundary.")]],
            "expires_at":min(self.now+timedelta(minutes=5),valid).isoformat(),
        })


def validate_demo(scenario):
    if scenario is not None and (os.getenv("DEMO_MODE", "false").lower() != "true" or scenario not in SCENARIOS):
        raise HTTPException(status_code=403, detail="DEMO_MODE_DISABLED_OR_UNKNOWN")
