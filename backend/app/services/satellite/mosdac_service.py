"""MOSDAC integration status until a documented dataset ingestion adapter exists.

MOSDAC documents authenticated dataset search/download, not /api/ocean/point.
Credentials alone cannot activate point observations. Never transmit them to an
invented endpoint or replace a missing observation time with retrieval time.
"""
from typing import Any, Dict, Optional
from app.services.provider_health import record


class MosdacSatelliteService:
    def __init__(self, user=None, api_key=None, base_url=None, timeout_sec=5.0):
        # Preserve call compatibility; the former bearer-key interface is unsupported.
        pass

    @property
    def is_configured(self) -> bool:
        return False

    def get_satellite_observations(self, lat: float, lon: float, date: Optional[str] = None) -> Dict[str, Any]:
        record("isro_mosdac", success=False, reason="MOSDAC_ADAPTER_NOT_IMPLEMENTED")
        return {
            "status": "UNCONFIGURED", "integration_status": "NOT_IMPLEMENTED",
            "source": "ISRO_MOSDAC", "real_data_arriving": False,
            "products_supported": [], "required_credentials": [],
            "registration_portal": "https://www.mosdac.gov.in",
            "documentation_url": "https://www.mosdac.gov.in/downloadapi-manual",
            "chlorophyll_mg_m3": None, "sea_surface_temperature_c": None,
            "thermal_front_detected": None, "observations_timestamp": None,
            "detail": "MOSDAC dataset ingestion is not implemented. Select an available product, verify account access, and implement authenticated download, quality filtering and coordinate sampling before enabling observations. An API key alone does not enable this integration.",
        }


mosdac_service = MosdacSatelliteService()
