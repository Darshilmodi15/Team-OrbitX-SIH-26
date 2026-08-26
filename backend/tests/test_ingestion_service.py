"""Unit tests for continuous INCOIS background ingestion service."""
import asyncio
import unittest
from unittest.mock import MagicMock, patch

from app.services.ingestion.incois_ingestion_service import (
    COASTAL_INGESTION_HUBS,
    run_single_ingestion_cycle,
    continuous_incois_ingestion_loop,
)


class TestIngestionService(unittest.IsolatedAsyncioTestCase):
    """Test suite for continuous INCOIS marine ingestion service."""

    async def test_run_single_ingestion_cycle(self):
        """Verifies single ingestion pass queries all coastal hubs and records telemetry."""
        mock_provider = MagicMock()
        mock_provider.get_weather.return_value = {
            "wave_height_m": 1.25,
            "wind_speed_kmh": 22.0,
            "source": "INCOIS_OSF_WW3",
            "cache_status": "live",
        }

        res = await run_single_ingestion_cycle(mock_provider)

        self.assertEqual(res["total_hubs"], len(COASTAL_INGESTION_HUBS))
        self.assertEqual(res["successful"], len(COASTAL_INGESTION_HUBS))
        self.assertEqual(res["failed"], 0)
        self.assertEqual(len(res["results"]), len(COASTAL_INGESTION_HUBS))
        self.assertEqual(mock_provider.get_weather.call_count, len(COASTAL_INGESTION_HUBS))

    async def test_continuous_ingestion_loop_cancellation(self):
        """Verifies continuous loop handles graceful cancellation without raising unhandled errors."""
        mock_provider = MagicMock()
        mock_provider.get_weather.return_value = {
            "wave_height_m": 1.10,
            "wind_speed_kmh": 18.0,
            "source": "INCOIS_OSF_WW3",
            "cache_status": "live",
        }

        task = asyncio.create_task(
            continuous_incois_ingestion_loop(mock_provider, interval_seconds=1)
        )
        await asyncio.sleep(0.05)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

        self.assertTrue(task.cancelled() or task.done())


if __name__ == "__main__":
    unittest.main()
