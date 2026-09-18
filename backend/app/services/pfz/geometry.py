"""Fail closed on unsupported or oversized optional advisory geometry."""
import math


def validated_geometry(value):
    if not isinstance(value, dict) or value.get("type") not in {"Polygon", "MultiPolygon"}:
        return None
    polygons = [value.get("coordinates")] if value["type"] == "Polygon" else value.get("coordinates")
    if not isinstance(polygons, list) or not 1 <= len(polygons) <= 20:
        return None
    count = 0
    for polygon in polygons:
        if not isinstance(polygon, list) or not 1 <= len(polygon) <= 20:
            return None
        for ring in polygon:
            if not isinstance(ring, list) or len(ring) < 4 or ring[0] != ring[-1]:
                return None
            count += len(ring)
            if count > 2000: return None
            for point in ring:
                if not isinstance(point, list) or len(point) != 2: return None
                if any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) for x in point): return None
                if not -180 <= point[0] <= 180 or not -90 <= point[1] <= 90: return None
    return {"type": value["type"], "coordinates": value["coordinates"]}
