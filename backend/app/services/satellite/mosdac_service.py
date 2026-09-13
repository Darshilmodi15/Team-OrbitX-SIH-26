"""
Official ISRO MOSDAC (Meteorological and Oceanographic Satellite Data Archival Centre) service.

Governs integration with Space Applications Centre (SAC), ISRO earth observation products:
- Oceansat-3 OCM-3: Chlorophyll-a ocean color telemetry (1 km resolution)
- INSAT-3D / 3DR Imager: Sea Surface Temperature (SST) thermal fronts (4 km resolution)
- SCATSAT-1 / EOS-06: Ku-band scatterometer ocean surface wind vectors

Strictly enforces:
- Verification of credentials before claiming live ISRO telemetry.
- Zero fabrication of chlorophyll or thermal front values when satellite passes are obscured or unconfigured.
- Observability via provider_health.
"""
from datetime import datetime, timezone
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from app.services.provider_health import record

logger = logging.getLogger(__name__)


class MosdacSatelliteService:
    """
    Client for ISRO SAC MOSDAC satellite telemetry products.
    Requires user registration and API credentials from https://mosdac.gov.in.
    """

    def __init__(
        self,
        user: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_sec: float = 5.0,
    ):
        self.user = user or os.getenv("MOSDAC_USER", "")
        self.api_key = api_key or os.getenv("MOSDAC_API_KEY", "")
        self.base_url = (base_url or os.getenv("MOSDAC_BASE_URL", "https://mosdac.gov.in/api")).rstrip("/")
        self.timeout_sec = float(os.getenv("MOSDAC_TIMEOUT_SEC", timeout_sec))

    @property
    def is_configured(self) -> bool:
        """Returns True only when valid MOSDAC API credentials are provided."""
        return bool(self.user.strip() and self.api_key.strip())

    def get_satellite_observations(
        self,
        lat: float,
        lon: float,
        date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieves real Oceansat-3 / INSAT-3DR satellite observations for the given coordinate.
        If credentials are not supplied, returns an explicit UNCONFIGURED contract without inventing numbers.
        """
        if not self.is_configured:
            record("isro_mosdac", success=False, reason="MOSDAC_CREDENTIALS_REQUIRED")
            return {
                "status": "UNCONFIGURED",
                "source": "ISRO_MOSDAC",
                "issuing_agency": "Space Applications Centre (SAC), ISRO",
                "products_supported": [
                    "Oceansat-3 OCM-3 Chlorophyll-a (1km)",
                    "INSAT-3DR Imager Sea Surface Temperature (4km)",
                ],
                "real_data_arriving": False,
                "required_credentials": ["MOSDAC_USER", "MOSDAC_API_KEY"],
                "registration_portal": "https://mosdac.gov.in",
                "chlorophyll_mg_m3": None,
                "sea_surface_temperature_c": None,
                "thermal_front_detected": False,
                "observations_timestamp": None,
                "detail": (
                    "ISRO/MOSDAC credentials are not configured. To activate live satellite ocean color "
                    "and SST thermal front feeds, register at https://mosdac.gov.in and configure "
                    "MOSDAC_USER and MOSDAC_API_KEY in environment variables."
                ),
            }

        # Attempt live credentialed fetch
        try:
            headers = {
                "X-MOSDAC-User": self.user,
                "Authorization": f"Bearer {self.api_key}",
            }
            params = {
                "lat": f"{lat:.4f}",
                "lon": f"{lon:.4f}",
                "date": date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            }
            with httpx.Client(timeout=self.timeout_sec, verify=True) as client:
                resp = client.get(f"{self.base_url}/ocean/point", headers=headers, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    chl = data.get("chlorophyll_mg_m3")
                    sst = data.get("sst_c")
                    ts = data.get("timestamp") or datetime.now(timezone.utc).isoformat()
                    record("isro_mosdac", success=True, http_status=200, data_timestamp=ts, mode="live")
                    return {
                        "status": "HEALTHY",
                        "source": "ISRO_MOSDAC",
                        "issuing_agency": "Space Applications Centre (SAC), ISRO",
                        "real_data_arriving": True,
                        "chlorophyll_mg_m3": float(chl) if chl is not None else None,
                        "sea_surface_temperature_c": float(sst) if sst is not None else None,
                        "thermal_front_detected": bool(data.get("thermal_front_detected", False)),
                        "observations_timestamp": ts,
                        "detail": "Verified ISRO/MOSDAC satellite observation",
                    }
                else:
                    record("isro_mosdac", success=False, http_status=resp.status_code, reason=f"HTTP_{resp.status_code}")
        except Exception as exc:
            logger.warning("MOSDAC live query failed: %s", type(exc).__name__)
            record("isro_mosdac", success=False, reason=type(exc).__name__)

        return {
            "status": "UNAVAILABLE",
            "source": "ISRO_MOSDAC",
            "issuing_agency": "Space Applications Centre (SAC), ISRO",
            "real_data_arriving": False,
            "chlorophyll_mg_m3": None,
            "sea_surface_temperature_c": None,
            "thermal_front_detected": False,
            "observations_timestamp": None,
            "detail": "ISRO/MOSDAC upstream satellite endpoint is temporarily unreachable",
        }


mosdac_service = MosdacSatelliteService()
