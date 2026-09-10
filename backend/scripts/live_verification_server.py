"""Isolated real-provider server for scripts/verify_live.py; never a production entrypoint."""
import os
from pathlib import Path


def create_app():
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    # Keep verification out of production databases and shared caches.
    root = Path(os.environ["ORCA_VERIFY_STATE_DIR"])
    os.environ["DATABASE_URL"] = f"sqlite:///{root / 'verification.db'}"
    os.environ["REDIS_URL"] = ""
    os.environ["KEY_VALUE_URL"] = ""
    os.environ["APP_ENV"] = "development"
    from app.db.session import init_db
    init_db()
    from app import main
    from app.services.marine_boundaries import marine_boundaries_service
    marine_boundaries_service.cache_dir = root / "eez"
    marine_boundaries_service.cache_dir.mkdir(exist_ok=True)
    if os.environ.get("ORCA_VERIFY_WEATHER_PROVIDER") == "open-meteo":
        from app.data.weather.open_meteo import OpenMeteoWeatherProvider
        main.weather_provider = OpenMeteoWeatherProvider(timeout_seconds=12)
    return main.app
