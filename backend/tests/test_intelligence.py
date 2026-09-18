from datetime import datetime, timezone
from unittest.mock import MagicMock
import sys
import httpx
import pytest
from app.services.species import SpeciesService
from app.services.intelligence_cache import EvidenceCache
from app.services.pfz.geometry import validated_geometry
from app.services.provenance import describe_field
from app.services.earth_observation import EarthObservationService


def test_obis_filters_invalid_points_and_keeps_historical_counts(monkeypatch):
    calls = []
    def get(self, url, params):
        calls.append(params)
        return httpx.Response(200, request=httpx.Request("GET",url), json={"total":1000,"results":[
            None, "invalid row",
            {"scientificName":"Test fish", "taxonRank":"species", "decimalLatitude":18.9,"decimalLongitude":72.7,"eventDate":"1999-01-01", "dataset_id":"dataset-a"},
            {"scientificName":"Wrong location", "taxonRank":"species", "decimalLatitude":0,"decimalLongitude":0},
            {"scientificName":"Absent", "taxonRank":"species", "decimalLatitude":18.9,"decimalLongitude":72.7,"absence":True},
        ]})
    monkeypatch.setattr(httpx.Client,"get",get)
    service=SpeciesService()
    result=service.get(18.9,72.7)
    assert len(result["evidence"]) == 1
    row=result["evidence"][0]
    assert row["evidence_type"] == "HISTORICAL_OCCURRENCE"
    assert row["occurrence_count"] == 1 and row["data_period"]["latest_in_sample"] == "1999-01-01"
    assert calls[0]["size"] == 100 and calls[0]["geometry"].startswith("POLYGON")
    assert service.get(18.9,72.7)["cache_status"] == "cached"
    assert len(calls) == 1


def test_obis_empty_is_distinct_from_upstream_failure(monkeypatch):
    monkeypatch.setattr(httpx.Client,"get",lambda self,url,params:httpx.Response(200,request=httpx.Request("GET",url),json={"total":0,"results":[]}))
    assert SpeciesService().get(18.9,72.7)["status"] == "empty"
    monkeypatch.setattr(httpx.Client,"get",lambda self,url,params:httpx.Response(429,request=httpx.Request("GET",url),text="private upstream details"))
    result=SpeciesService().get(18.9,72.7)
    assert result["status"] == "unavailable" and "private" not in str(result)


def test_bounded_cache_copies_and_evicts():
    cache=EvidenceCache(2)
    fetch=lambda:{"status":"available","values":[1]}
    cache.resolve("one",fetch)["values"].append(2)
    assert cache.resolve("one",fetch)["values"] == [1]
    cache.resolve("two",fetch);cache.resolve("three",fetch)
    assert len(cache.entries) == 2 and "one" not in cache.entries


@pytest.mark.parametrize("value", [None, {"type":"Point","coordinates":[72,19]}, {"type":"Polygon","coordinates":[[[72,19],[73,19],[73,20]]]}, {"type":"Polygon","coordinates":[[[200,19],[73,19],[73,20],[200,19]]]}])
def test_invalid_geometry_not_promoted(value):
    assert validated_geometry(value) is None


def test_model_provenance_never_invents_satellite():
    result=describe_field("weather.wave_height_m",1.2,{"source":"INCOIS_OSF_WW3","grid_lat":19,"grid_lon":73,"cache_status":"cached"})
    assert result["satellite"] is None and result["sensor"] is None
    assert result["evidence_type"] == "model_forecast" and result["unit"] == "m"
    assert result["spatial_resolution"] is None
    atmosphere=describe_field("weather.wind_speed_kmh",12,{"source":"Open-Meteo Weather"})
    assert atmosphere["source_url"] == "https://open-meteo.com/en/docs"


def test_display_geometry_is_smaller_preserves_holes_and_never_mutates_source():
    import copy
    from shapely.geometry import shape
    from app.services.display_geometry import reference_geometry
    ring = [[72 + i / 1000, 19] for i in range(101)] + [[72.1, 19.1], [72, 19.1], [72, 19]]
    hole = [[72.02,19.02],[72.02,19.04],[72.04,19.04],[72.04,19.02],[72.02,19.02]]
    original = {"type":"FeatureCollection", "features":[{"type":"Feature", "properties":{},"geometry":{"type":"Polygon","coordinates":[ring,hole]}}]}
    before = copy.deepcopy(original)
    result = reference_geometry(original)
    assert original == before
    assert len(result["features"][0]["geometry"]["coordinates"][0]) < len(ring)
    assert len(result["features"][0]["geometry"]["coordinates"]) == 2
    assert shape(result["features"][0]["geometry"]).equals(shape(original["features"][0]["geometry"]))
    result["features"].clear()
    assert reference_geometry(original)["features"]


def test_earth_engine_missing_configuration_has_no_geometry(monkeypatch):
    monkeypatch.delenv("EARTH_ENGINE_PROJECT",raising=False)
    result=EarthObservationService().get(18.9,72.7)
    assert result["status"] == "not_configured" and result["geometry"] is None


def test_earth_engine_real_contract_normalizes_features_and_cache(monkeypatch):
    ee=MagicMock()
    ee.ImageCollection.return_value.filterDate.return_value.sort.return_value.size.return_value.getInfo.return_value=1
    ee.Dictionary.return_value.getInfo.return_value={"time":datetime.now(timezone.utc).timestamp()*1000,"grid":[
        {"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[72,18],[73,18],[73,19],[72,18]]]},
         "properties":{"rainfall_mm_h":0,"elevation_m":2,"historical_water_occurrence_pct":None,"untrusted":"not forwarded"}}]}
    monkeypatch.setitem(sys.modules,"ee",ee)
    monkeypatch.setenv("EARTH_ENGINE_PROJECT","test-project")
    service=EarthObservationService();service.initialized_project="test-project"
    result=service.get(18.9,72.7)
    assert result["status"] == "available" and result["experimental"] is True
    assert result["geometry"]["features"][0]["properties"]["rainfall_mm_h"] == 0
    assert "untrusted" not in str(result)
    assert service.get(18.9,72.7)["cache_status"] == "cached"
    ee.Dictionary.return_value.getInfo.assert_called_once()


def test_earth_engine_empty_and_quota(monkeypatch):
    ee=MagicMock()
    ee.ImageCollection.return_value.filterDate.return_value.sort.return_value.size.return_value.getInfo.return_value=0
    monkeypatch.setitem(sys.modules,"ee",ee);monkeypatch.setenv("EARTH_ENGINE_PROJECT","test")
    service=EarthObservationService();service.initialized_project="test"
    assert service.get(18.9,72.7)["status"] == "empty"
    ee.ImageCollection.side_effect=RuntimeError("secret quota details")
    result=service.get(20.2,86.7)
    assert result["status"] == "unavailable" and "secret" not in str(result)


def test_optional_routes_require_authentication_and_owned_snapshot():
    from fastapi.testclient import TestClient
    from app.main import app
    client=TestClient(app)
    for name in ("species","earth-observation"):
        assert client.get(f"/api/intelligence/{name}?snapshot_id=other-user-snapshot").status_code == 401
