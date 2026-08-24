"""Abstract base interface for maritime geofence and boundary intelligence providers."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List
from app.models.agent_models import GeofenceEvidence, GeofenceItem


class GeofenceProvider(ABC):
    """
    Abstract interface for evaluating vessel proximity to maritime boundaries,
    International Maritime Boundary Lines (IMBL), and Marine Protected Areas (MPAs).
    """

    @abstractmethod
    def evaluate_boundaries(self, lat: float, lon: float) -> GeofenceEvidence:
        """
        Evaluates proximity and containment of coordinates against all registered maritime zones.
        """
        pass

    @abstractmethod
    def get_all_geofences(self) -> List[Dict[str, Any]]:
        """
        Returns all registered geofence geometries and metadata for GIS mapping.
        """
        pass
