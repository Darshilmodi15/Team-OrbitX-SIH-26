"""One owner, location and time -> one immutable, persisted marine snapshot.

An active request key is unique in SQL across workers. Snapshots expire after five minutes. A uniqueness conflict
returns the winning payload verbatim. Cache status/age describe assembly time;
expiry is explicit so reads never mutate identity or claim an old snapshot live.
"""
import hashlib
import json
import logging
import math
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.db.models import MarineSnapshotRecord, UserLocation
from app.models.marine_snapshot import MarineSnapshot, SnapshotWeather
from app.models.agent_models import WeatherEvidence, EvidenceBundle, RiskEvidence, PFZEvidence
from app.agents.weather_agent import get_marine_weather
from app.agents.risk_agent import assess_risk
from app.agents.hazard_agent import detect_proactive_hazards
from app.services.temporal import TemporalResolution, IST
from app.services.pfz.incois_pfz_service import incois_pfz_service
from app.services.marine_boundaries import marine_boundaries_service, _point_in_geometry, _distance_to_geometry_boundary
from app.data.pfz.mock import haversine_km
from app.services.provenance import describe_field

UTC = timezone.utc
logger = logging.getLogger("orca.snapshot")
FIELDS = {key: key for key in SnapshotWeather.model_fields if key != "current_speed_unit"}
FIELDS.update(swell_height_m="swell_wave_height_m", swell_direction_deg="swell_wave_direction_deg",
              swell_period_s="swell_wave_period_s", current_speed="ocean_current_speed_kmh",
              current_direction="ocean_current_direction_deg", air_temperature_c="temperature_c")


def stamp(value):
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed.astimezone(UTC) if parsed.tzinfo else None
    except (ValueError, TypeError):
        return None


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def saved_location(db, user_id):
    # GPS used by SOS is not a marine selection. Only explicit location updates
    # (MANUAL/GPS) are recorded in this table by the location service.
    row = db.query(UserLocation).filter(UserLocation.user_id == user_id, UserLocation.is_coastal.is_(True)).order_by(UserLocation.created_at.desc(), UserLocation.id.desc()).first()
    if row is None:
        raise HTTPException(status_code=409, detail="SAVED_LOCATION_REQUIRED")
    return {"name": f"{row.latitude}, {row.longitude}", "lat": row.latitude, "lon": row.longitude}


def request_time(value=None):
    now = datetime.now(UTC)
    if value is None:
        return now.replace(minute=0, second=0, microsecond=0)
    target = stamp(value)
    if target is None:
        raise HTTPException(status_code=422, detail="REQUESTED_TIME_REQUIRES_TIMEZONE")
    if not now - timedelta(days=1) <= target <= now + timedelta(days=7):
        raise HTTPException(status_code=422, detail="REQUESTED_TIME_OUTSIDE_SUPPORTED_WINDOW")
    return target


def temporal(target):
    start, end = target - timedelta(minutes=90), target + timedelta(minutes=90)
    return TemporalResolution(target.astimezone(IST).date().isoformat(), "instant", None,
        start.astimezone(IST), end.astimezone(IST), start, end, target,
        target > datetime.now(UTC), True, target.isoformat())


def _optional(name, fn, default):
    try:
        return fn()
    except Exception as exc:
        logger.warning("snapshot_provider=%s reason=%s", name, type(exc).__name__)
        return default


def _boundary(lat, lon):
    geo = marine_boundaries_service.fetch_eez_by_mrgid()
    meta = geo.get("metadata", {})
    features = geo.get("features", [])
    if meta.get("retrieval_status") not in {"live_wfs", "cached_fallback", "cached_wfs"} or not features:
        return {"availability": "unavailable", "eez": None, "nearest_boundary_distance": None, "distance_unit": "km", "warnings": [], "geometry": None, "provenance": meta}
    geoms = [f["geometry"] for f in features if f.get("geometry", {}).get("type") in {"Polygon", "MultiPolygon"}]
    if not geoms:
        raise ValueError("INVALID_EEZ_GEOMETRY")
    distance = round(min(_distance_to_geometry_boundary(lat, lon, g) for g in geoms), 2)
    inside = any(_point_in_geometry(lat, lon, g) for g in geoms)
    return {"availability": "available", "eez": {"name": "Indian EEZ", "inside": inside},
        "nearest_boundary_distance": distance, "distance_unit": "km",
        "distance_method": "Approximate distance to EEZ polygon edge, which may include coastline; not distance to an international border",
        "warnings": ["EEZ dataset is a reference layer, not a navigation clearance. Display geometry is retrieved separately; calculations use the original."],
        "geometry": None, "geometry_ref": "/api/marine-boundaries/eez/display", "provenance": meta}


class MarineSnapshotService:
    def get_by_id(self, db, user_id, snapshot_id, require_current=False):
        row = db.query(MarineSnapshotRecord).filter_by(id=snapshot_id, user_id=user_id).first()
        if row is None:
            raise HTTPException(status_code=404, detail="SNAPSHOT_NOT_FOUND")
        result = MarineSnapshot.model_validate_json(row.payload_json)
        if require_current:
            loc = saved_location(db, user_id)
            if (loc["lat"], loc["lon"]) != (result.location.lat, result.location.lon):
                raise HTTPException(status_code=409, detail="SNAPSHOT_LOCATION_CHANGED")
            if stamp(result.expires_at) <= datetime.now(UTC):
                raise HTTPException(status_code=409, detail="SNAPSHOT_EXPIRED")
        self.log(user_id, result)
        return result

    def resolve(self, db, user_id, provider, requested_time=None, lat=None, lon=None, demo_scenario=None):
        from app.services.demo_scenarios import validate_demo, LiveProvider, DemoScenarioProvider
        validate_demo(demo_scenario)
        location = saved_location(db, user_id)
        if (lat is not None or lon is not None) and (lat, lon) != (location["lat"], location["lon"]):
            raise HTTPException(status_code=409, detail="SAVED_LOCATION_MISMATCH")
        target = request_time(requested_time)
        now = datetime.now(UTC)
        sha = os.getenv("RENDER_GIT_COMMIT") or os.getenv("BACKEND_SHA") or "local-unversioned"
        key = digest(["snapshot-v5", user_id, location, target.isoformat(), sha, demo_scenario])
        row = db.query(MarineSnapshotRecord).filter_by(request_key=key, user_id=user_id).first()
        previous_id = row.id if row else None
        if row:
            result = MarineSnapshot.model_validate_json(row.payload_json)
            if stamp(result.expires_at) > now:
                self.log(user_id, result)
                return result
        # Release the read transaction before slow upstream calls.
        db.commit()
        selected = LiveProvider(lambda: self.build(location, target, now, sha, provider))
        if demo_scenario:
            selected = DemoScenarioProvider(selected, demo_scenario, now)
        result = selected.snapshot()
        payload = result.model_dump(mode="json")
        payload["snapshot_id"] = digest([user_id, key, payload])
        result = MarineSnapshot.model_validate(payload)
        # Re-read selection after upstream calls so a late response cannot restore
        # an older location selected on another device.
        if saved_location(db, user_id) != location:
            raise HTTPException(status_code=409, detail="SNAPSHOT_LOCATION_CHANGED")
        row = MarineSnapshotRecord(id=result.snapshot_id, user_id=user_id, request_key=key,
            payload_json=result.model_dump_json(), expires_at=stamp(result.expires_at), created_at=now)
        try:
            if previous_id:
                # Retire only the version read above; a concurrent refresh wins.
                db.query(MarineSnapshotRecord).filter_by(id=previous_id, request_key=key).update(
                    {"request_key": digest([key, previous_id, "retired"])})
            db.add(row)
            db.commit()
        except IntegrityError:
            db.rollback()
            winner = db.query(MarineSnapshotRecord).filter_by(request_key=key, user_id=user_id).first()
            if winner is None:
                raise
            result = MarineSnapshot.model_validate_json(winner.payload_json)
        self.log(user_id, result)
        return result

    def log(self, user_id, result):
        logger.info("snapshot_id=%s user_id=%s lat=%s lon=%s requested_time=%s provider=%s backend_sha=%s",
            result.snapshot_id, user_id, result.location.lat, result.location.lon,
            result.request.requested_time, result.provenance["provider"], result.backend_sha)

    def build(self, location, target, now, sha, provider):
        lat, lon = location["lat"], location["lon"]
        empty_weather = WeatherEvidence(forecast="unavailable", source="unavailable", is_mock=False, cache_status="unavailable")
        empty_boundary = {"availability": "unavailable", "eez": None, "nearest_boundary_distance": None, "distance_unit": "km", "warnings": [], "geometry": None, "provenance": {}}
        with ThreadPoolExecutor(max_workers=3) as executor:
            weather_job = executor.submit(_optional, "weather", lambda: get_marine_weather(provider, lat, lon, target.date().isoformat(), temporal_res=temporal(target)), empty_weather)
            pfz_job = executor.submit(_optional, "pfz", lambda: incois_pfz_service.get_advisory(lat=lat, lon=lon), {})
            boundary_job = executor.submit(_optional, "boundary", lambda: _boundary(lat, lon), empty_boundary)
            raw, advisory, boundary = weather_job.result().model_dump(), pfz_job.result(), boundary_job.result()
        now = datetime.now(UTC)  # Assembly time follows all upstream retrievals.
        field_sources = {}
        values = {}
        mapping = {**FIELDS, "sst_c": "sea_surface_temperature_c"}
        for field, original in mapping.items():
            source = dict((raw.get("supplemental_fields") or {}).get(original) or {})
            is_atmosphere = original in {"wind_speed_kmh", "wind_direction_deg", "wind_gust_kmh", "visibility_km", "temperature_c", "weather_code"}
            source.setdefault("source", raw.get("source"))
            source.setdefault("forecast_valid_at", raw.get("weather_forecast_valid_at" if is_atmosphere else "marine_forecast_valid_at") or raw.get("forecast_valid_at"))
            for name in ("issued_at", "retrieved_at", "grid_lat", "grid_lon", "cache_status"):
                source.setdefault(name, raw.get(name))
            source["measurement_kind"] = "model_forecast"
            valid, retrieved = stamp(source["forecast_valid_at"]), stamp(source["retrieved_at"])
            value = raw.get(original)
            usable = (not raw.get("is_mock", True) and source["cache_status"] in {"fresh", "live", "cached", "stale"}
                and valid is not None and abs((valid-target).total_seconds()) <= 5400
                and retrieved is not None and -120 <= (now-retrieved).total_seconds() <= 86400)
            if not usable or isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                value = None
            if value is not None and (field.endswith("direction_deg") or field == "current_direction") and not 0 <= value <= 360:
                value = None
            if value is not None and field not in {"sst_c", "air_temperature_c"} and value < 0:
                value = None
            values[field] = value
            if value is not None:
                parameter = ("ocean." if field == "sst_c" else "weather.") + field
                field_sources[parameter] = {**source, **describe_field(parameter, value, source)}
        valid_sources = list(field_sources.values())
        upstream_stale = any(s["cache_status"] == "stale" or (stamp(s["retrieved_at"]) and (now-stamp(s["retrieved_at"])).total_seconds() > 10800) for s in valid_sources)
        mode = "stale" if upstream_stale else "cached" if valid_sources else "unavailable"
        weather = SnapshotWeather(**{k:v for k,v in values.items() if k != "sst_c"})
        evidence_raw = {original: values[field] for field, original in mapping.items()}
        risk = assess_risk({**evidence_raw, "cache_status": mode, "is_mock": False})
        evidence_weather = WeatherEvidence(**evidence_raw, forecast=raw.get("forecast") or "unavailable", source=raw.get("source") or "unavailable", cache_status=mode, is_mock=False)
        hazards = [h.model_dump() for h in detect_proactive_hazards(lat=lat, lon=lon, weather=evidence_weather, include_geofences=False)]
        issued, valid_until = stamp(advisory.get("issued_at")), stamp(advisory.get("valid_until"))
        pfz_current = advisory.get("status") == "current" and issued and valid_until and issued <= target < valid_until
        zones = []
        if pfz_current:
            for zone in advisory.get("pfz_zones", []):
                zones.append({**zone, "distance_km": round(haversine_km(lat, lon, zone["latitude"], zone["longitude"]), 3)})
            zones.sort(key=lambda z: z["distance_km"])
        pfz = {"availability": "available" if pfz_current and zones else "unavailable",
            "advisory_id": advisory.get("advisory_id"), "issued_at": advisory.get("issued_at"),
            "valid_until": advisory.get("valid_until"), "zones": zones,
            "source": advisory.get("source"), "retrieved_at": advisory.get("retrieved_at"),
            "reason": advisory.get("reason_code") or (None if zones else "NO_VERIFIED_ADVISORY_FOR_REQUESTED_TIME")}
        expiry = now + timedelta(minutes=5)
        if pfz_current:
            expiry = min(expiry, valid_until)
        sources = sorted({s["source"] for s in valid_sources if s.get("source")})
        missing = [path for path, value in [("ocean.sst_c" if k == "sst_c" else "weather."+k, v) for k,v in values.items()] if value is None]
        missing += ["ocean.chlorophyll", "tide.high_tide", "tide.low_tide"]
        if not zones: missing.append("pfz.zones")
        if boundary["availability"] == "unavailable": missing.append("boundary.eez")
        return MarineSnapshot(snapshot_id="pending", location=location,
            request={"requested_date": target.date().isoformat(), "requested_time": target.isoformat()}, weather=weather,
            ocean={"sst_c": values["sst_c"], "chlorophyll": None}, pfz=pfz,
            tide={"availability":"unavailable", "high_tide":None, "low_tide":None, "reason":"NO_CONFIGURED_AUTHORITATIVE_TIDE_SOURCE"},
            boundary=boundary, hazards=hazards, risk={**risk.model_dump(), "reasons": [risk.reason, *[f"{key}: {value}" for key, value in risk.available_evidence.items()], *risk.factors]},
            provenance={"provider": sources, "source": sources, "issued_at": raw.get("issued_at"),
                "forecast_valid_at": raw.get("forecast_valid_at") if valid_sources else None,
                "retrieved_at": now.isoformat(), "grid_lat": raw.get("grid_lat"), "grid_lon": raw.get("grid_lon"),
                "cache_status": mode, "data_age_seconds": max([max(0,int((now-stamp(s["retrieved_at"])).total_seconds())) for s in valid_sources] or [0]),
                "fallback_used": any("meteo" in s.lower() for s in sources), "fields": field_sources,
                "age_reference": "At snapshot assembly; calculate current age from field retrieved_at", "measurement_kind": "model_forecast"},
            missing_fields=missing, expires_at=expiry.isoformat(), backend_sha=sha)

    def evidence(self, result):
        raw = result.model_dump()
        weather = {original: raw["weather"].get(field) for field, original in FIELDS.items()}
        weather.update(sea_surface_temperature_c=raw["ocean"]["sst_c"], forecast="unavailable",
            source=", ".join(raw["provenance"]["source"]) or "unavailable", is_mock=bool(raw["provenance"].get("demo_scenario")),
            cache_status=raw["provenance"]["cache_status"], forecast_valid_at=raw["provenance"]["forecast_valid_at"],
            retrieved_at=raw["provenance"]["retrieved_at"], supplemental_fields=raw["provenance"]["fields"])
        zones = [PFZEvidence(name=z.get("landing_centre") or "PFZ", latitude=z["latitude"], longitude=z["longitude"], distance_km=z["distance_km"], species=z.get("species", []), source=raw["pfz"]["source"], is_mock=bool(raw["provenance"].get("demo_scenario"))) for z in raw["pfz"]["zones"]]
        return EvidenceBundle(weather=WeatherEvidence(**weather), risk=RiskEvidence(**raw["risk"]), pfz_zones=zones,
            date=raw["request"]["requested_date"], location_lat=result.location.lat, location_lon=result.location.lon,
            connectivity_mode=raw["provenance"]["cache_status"].upper(), marine_snapshot=raw)


marine_snapshot_service = MarineSnapshotService()
