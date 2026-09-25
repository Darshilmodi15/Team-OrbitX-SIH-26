"""Small reference-map geometry; NEVER use this derivative for boundary decisions."""
from copy import deepcopy
from threading import Lock

TOLERANCE_DEGREES = 0.002  # About 220 m latitude; not navigation-grade.


def _simplify(original):
    from shapely.geometry import shape, mapping
    features = []
    for feature in original.get("features", []):
        geometry = shape(feature["geometry"])
        simplified = geometry.simplify(TOLERANCE_DEGREES, preserve_topology=True)
        # Do not repair invalid source geometry or quietly drop small islands.
        if simplified.is_empty or not simplified.is_valid:
            simplified = geometry
        features.append({**feature, "geometry": mapping(simplified)})
    return {**original, "features": features, "metadata": {
        **original.get("metadata", {}), "display_only": True,
        "simplification": "Topology-preserving Douglas-Peucker",
        "tolerance_degrees": TOLERANCE_DEGREES,
        "warning": "Simplified reference display, not a navigation boundary. Spatial calculations use the original geometry.",
    }}


_lock = Lock()
_source = None
_display = None


def reference_geometry(geojson):
    # Boundary refresh replaces the source object. Retain one reference instead
    # of serializing the entire EEZ into an LRU key on every request.
    global _source, _display
    with _lock:
        if _source is not geojson:
            _display = _simplify(geojson)
            _source = geojson
        return deepcopy(_display)
