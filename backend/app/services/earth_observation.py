"""Experimental context through backend-only Earth Engine credentials.

No flood prediction, inferred river distance, or marine risk override.
"""
import os
import math
from datetime import datetime, timedelta, timezone
from threading import Lock
from app.services.intelligence_cache import EvidenceCache

DATASETS = [
    {"dataset_id": "NASA/GPM_L3/IMERG_V07", "organization": "NASA GPM", "variable": "precipitation", "unit": "mm/h",
     "spatial_resolution": "0.1 degree (about 11 km)", "temporal_resolution": "30 minutes", "evidence_type": "satellite-derived precipitation estimate",
     "source_url": "https://developers.google.com/earth-engine/datasets/catalog/NASA_GPM_L3_IMERG_V07",
     "limitations": "Retrieval latency and gaps vary. Latest catalog observation may be old; this is not a forecast."},
    {"dataset_id": "JRC/GSW1_4/GlobalSurfaceWater", "organization": "EC JRC / Google", "variable": "occurrence", "unit": "%",
     "spatial_resolution": "30 m native; aggregated to 1 km for context", "temporal_resolution": "1984-2021 historical summary", "evidence_type": "Landsat-derived historical surface water",
     "source_url": "https://developers.google.com/earth-engine/datasets/catalog/JRC_GSW1_4_GlobalSurfaceWater",
     "limitations": "Historical water occurrence, not present flooding, a floodplain map, or tidal inundation prediction."},
    {"dataset_id": "USGS/SRTMGL1_003", "organization": "NASA / USGS", "variable": "elevation", "unit": "m",
     "spatial_resolution": "30 m native; aggregated to 1 km for context", "temporal_resolution": "February 2000 acquisition", "evidence_type": "radar-derived terrain",
     "source_url": "https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003",
     "limitations": "Not bathymetry. Vertical error and unresolved barriers prevent parcel-level or storm-surge flood prediction."},
]


class EarthObservationService:
    def __init__(self):
        self.cache = EvidenceCache(32)
        self.init_lock = Lock()
        self.initialized_project = None

    def get(self, lat, lon):
        project = os.getenv("EARTH_ENGINE_PROJECT", "").strip()
        return self.cache.resolve((project, lat, lon), lambda: self._fetch(project, lat, lon), ttl=3600)

    def _fetch(self, project, lat, lon):
        base = {"status": "not_configured", "experimental": True, "title": "Coastal & River Flood Context",
                "datasets": DATASETS, "retrieved_at": datetime.now(timezone.utc).isoformat(), "cache_status": "fresh",
                "geometry": None, "observation_period": None,
                "limitations": "Experimental rainfall, historical water and terrain context only. Not live flood prediction; no validated exposure score or river-distance model."}
        if not project:
            return {**base, "reason": "EARTH_ENGINE_PROJECT_REQUIRED"}
        try:
            import ee
            with self.init_lock:
                if self.initialized_project != project:
                    import google.auth
                    credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/earthengine", "https://www.googleapis.com/auth/cloud-platform"])
                    ee.Initialize(credentials=credentials, project=project)
                    ee.data.setDeadline(20000)
                    self.initialized_project = project
            now = datetime.now(timezone.utc)
            collection = ee.ImageCollection(DATASETS[0]["dataset_id"]).filterDate((now-timedelta(days=30)).isoformat(), now.isoformat()).sort("system:time_start", False)
            if collection.size().getInfo() == 0:
                return {**base, "status":"empty", "reason":"NO_RAINFALL_OBSERVATIONS_IN_LAST_30_DAYS"}
            latest = collection.first()
            # A bounded 3x3 grid around the selected site. Cells are analysis bins,
            # never inferred flood extents. Reduce mean reports sampling scale.
            cells = []
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    x, y = lon + dx * 0.1, lat + dy * 0.1
                    cells.append(ee.Feature(ee.Geometry.Rectangle([x-.05, y-.05, x+.05, y+.05]), {"kind": "analysis_cell"}))
            image = ee.Image.cat([
                ee.Image(latest).select("precipitation").rename("rainfall_mm_h"),
                ee.Image(DATASETS[1]["dataset_id"]).select("occurrence").rename("historical_water_occurrence_pct"),
                ee.Image(DATASETS[2]["dataset_id"]).select("elevation").rename("elevation_m"),
            ])
            result = ee.Dictionary({"time": ee.Image(latest).get("system:time_start"),
                "grid": image.reduceRegions(collection=ee.FeatureCollection(cells), reducer=ee.Reducer.mean(), scale=1000, tileScale=2).toList(9)}).getInfo()
            moment = datetime.fromtimestamp(result["time"] / 1000, timezone.utc)
            grid = result["grid"]
            if not isinstance(grid, list):
                raise ValueError("Invalid grid")
            from app.services.pfz.geometry import validated_geometry
            features = []
            for feature in grid[:9]:
                geometry = validated_geometry(feature.get("geometry"))
                if not geometry: continue
                properties = {}
                for key in ("rainfall_mm_h", "historical_water_occurrence_pct", "elevation_m"):
                    value = feature.get("properties", {}).get(key)
                    properties[key] = value if isinstance(value, (int,float)) and not isinstance(value,bool) and math.isfinite(value) else None
                features.append({"type":"Feature", "geometry":geometry, "properties":properties})
            available = any(any(v is not None for v in f["properties"].values()) for f in features)
            return {**base, "status": "available" if available else "empty", "geometry": {"type":"FeatureCollection", "features":features},
                    "observation_period": {"start": moment.isoformat(), "end": (moment+timedelta(minutes=30)).isoformat()},
                    "observation_age_hours": round((now-moment).total_seconds()/3600, 1), "analysis_scale_m": 1000}
        except ImportError:
            return {**base, "reason": "EARTH_ENGINE_RUNTIME_REQUIRED"}
        except Exception:
            # Credentials, raw upstream errors and signed tile URLs never escape.
            return {**base, "status": "unavailable", "reason": "EARTH_ENGINE_ACCESS_QUOTA_OR_DATA_UNAVAILABLE"}


earth_observation_service = EarthObservationService()
