"""Abstract base class for Potential Fishing Zone (PFZ) data providers."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List


class PFZProvider(ABC):
    """
    Abstract interface for Potential Fishing Zone (PFZ) data providers.

    Designed to allow real marine datasets and satellite advisory feeds (such as
    INCOIS PFZ advisories, SST/Chlorophyll-a ocean color feeds, or national fishery
    bulletins) to seamlessly replace mock implementations without modifying consuming
    agents or application pipelines.
    """

    @abstractmethod
    def get_pfz_zones(self, lat: float, lon: float) -> List[Dict[str, Any]]:
        """
        Retrieves potential fishing zones relative to a given geographic coordinate.

        Args:
            lat (float): Latitude coordinate in decimal degrees.
            lon (float): Longitude coordinate in decimal degrees.

        Returns:
            List[Dict[str, Any]]: List of PFZ dictionaries containing:
                - 'zone_id': str (e.g. 'PFZ-101')
                - 'name': str (e.g. 'Thermal Front Sector A')
                - 'lat': float (latitude of zone center)
                - 'lon': float (longitude of zone center)
                - 'distance_km': float (distance from inquiry location in km)
                - 'depth_m': int (estimated ocean depth in meters)
                - 'dominant_species': str (target fish species)
        """
        pass
