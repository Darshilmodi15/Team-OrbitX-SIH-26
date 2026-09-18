"""Small reference-map geometry; NEVER use this derivative for boundary decisions."""
import json
from functools import lru_cache
from shapely.geometry import shape, mapping

TOLERANCE_DEGREES = 0.002  # About 220 m latitude; not navigation-grade.


@lru_cache(maxsize=4)
def _simplify(serialized):
    original = json.loads(serialized)
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


def reference_geometry(geojson):
    # Round-trip returns a private copy so immutable cached source/derivatives stay untouched.
    return json.loads(json.dumps(_simplify(json.dumps(geojson, sort_keys=True))))
