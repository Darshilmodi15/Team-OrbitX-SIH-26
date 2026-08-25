"""
Tests for ORCA Historical Marine Observations, Before-vs-After Trends, and Database Persistence.
"""
from datetime import datetime, timezone, timedelta
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.models import MarineObservation
from app.repositories import MarineObservationRepository
from app.services.admin.admin_service import AdminService


class TestHistoricalObservations(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.admin_service = AdminService()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def test_record_and_fetch_temporal_observations(self):
        """Tests inserting observation with past timestamp and querying historical window."""
        lat, lon = 18.9220, 72.8347
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(hours=24)

        # 1. Record yesterday's calm baseline observation
        MarineObservationRepository.record_observation(
            db=self.db,
            latitude=lat,
            longitude=lon,
            region_cell="18.900_72.850",
            wave_height_m=0.85,
            wind_speed_kmh=12.0,
            sst_c=28.0,
            risk_level="SAFE",
            timestamp=yesterday,
            source="INCOIS_OSF_WW3",
        )

        # 2. Record today's current roughened observation
        MarineObservationRepository.record_observation(
            db=self.db,
            latitude=lat,
            longitude=lon,
            region_cell="18.900_72.850",
            wave_height_m=1.75,
            wind_speed_kmh=24.5,
            sst_c=28.4,
            risk_level="CAUTION",
            timestamp=now,
            source="INCOIS_OSF_WW3",
        )
        self.db.commit()

        # Query latest observation
        latest = MarineObservationRepository.get_latest_observation(self.db, lat, lon)
        self.assertIsNotNone(latest)
        self.assertEqual(latest.wave_height_m, 1.75)
        self.assertEqual(latest.risk_level, "CAUTION")

        # Query historical window (24h ago)
        hist = MarineObservationRepository.get_historical_window(self.db, lat, lon, hours_ago=24)
        self.assertIsNotNone(hist)
        self.assertEqual(hist.wave_height_m, 0.85)

    def test_trend_calculation_deteriorating(self):
        """Verifies before-vs-after delta flags 'DETERIORATING' when wave/wind increases significantly."""
        lat, lon = 18.9220, 72.8347
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(hours=24)

        with patch("app.db.session.get_db_context") as mock_ctx:
            mock_ctx.return_value.__enter__.return_value = self.db

            MarineObservationRepository.record_observation(
                db=self.db,
                latitude=lat,
                longitude=lon,
                region_cell="18.900_72.850",
                wave_height_m=0.90,
                wind_speed_kmh=14.0,
                sst_c=28.0,
                risk_level="SAFE",
                timestamp=yesterday,
            )
            MarineObservationRepository.record_observation(
                db=self.db,
                latitude=lat,
                longitude=lon,
                region_cell="18.900_72.850",
                wave_height_m=1.85,
                wind_speed_kmh=28.0,
                sst_c=28.2,
                risk_level="CAUTION",
                timestamp=now,
            )
            self.db.commit()

            comparison = self.admin_service.get_historical_comparison(lat=lat, lon=lon, period_hours=24)
            self.assertEqual(comparison.safety_trend, "DETERIORATING")
            self.assertGreater(comparison.wave_delta_m, 0.5)
            self.assertGreater(comparison.wind_delta_kmh, 10.0)
            self.assertIn("roughened", comparison.summary_advisory)

    def test_trend_calculation_improving(self):
        """Verifies before-vs-after delta flags 'IMPROVING' when wave height drops."""
        lat, lon = 18.9220, 72.8347
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(hours=24)

        with patch("app.db.session.get_db_context") as mock_ctx:
            mock_ctx.return_value.__enter__.return_value = self.db

            MarineObservationRepository.record_observation(
                db=self.db,
                latitude=lat,
                longitude=lon,
                region_cell="18.900_72.850",
                wave_height_m=2.40,
                wind_speed_kmh=35.0,
                sst_c=27.5,
                risk_level="UNSAFE",
                timestamp=yesterday,
            )
            MarineObservationRepository.record_observation(
                db=self.db,
                latitude=lat,
                longitude=lon,
                region_cell="18.900_72.850",
                wave_height_m=1.20,
                wind_speed_kmh=16.0,
                sst_c=28.1,
                risk_level="SAFE",
                timestamp=now,
            )
            self.db.commit()

            comparison = self.admin_service.get_historical_comparison(lat=lat, lon=lon, period_hours=24)
            self.assertEqual(comparison.safety_trend, "IMPROVING")
            self.assertLess(comparison.wave_delta_m, -0.5)
            self.assertIn("settled", comparison.summary_advisory)


if __name__ == "__main__":
    unittest.main()
