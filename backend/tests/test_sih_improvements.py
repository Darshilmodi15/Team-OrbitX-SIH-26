"""Regression & feature tests for SIH 2026 Phase 1-3 upgrades."""
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from fastapi.testclient import TestClient
import httpx
import pytest

from app.agents.risk_agent import assess_risk
from app.main import app
from app.models.marine_snapshot import MarineSnapshot, SnapshotWeather
from app.services.demo_scenarios import DemoScenarioProvider, LiveProvider, SCENARIOS, SOURCE
from app.services.rate_limit import FixedWindowRateLimiter, rate_limiter
from app.services.sms import MSG91SMSTransport, TwilioSMSTransport, UnconfiguredSMS, get_sms_transport
from tests.auth_helpers import authenticate_client


def test_vessel_class_risk_profiles_and_defaults():
    moderate = {
        "wave_height_m": 1.1,
        "wind_speed_kmh": 26.0,
        "wave_period_s": 7.0,
        "cache_status": "fresh",
        "is_mock": False,
    }
    standard_default = assess_risk(moderate)
    canoe = assess_risk(moderate, vessel_class="traditional_canoe")
    trawler = assess_risk(moderate, vessel_class="mechanized_trawler")

    assert standard_default.level == "low"
    assert standard_default.vessel_class is None
    assert canoe.level == "caution"
    assert canoe.vessel_class == "traditional_canoe"
    assert trawler.level == "low"
    assert trawler.vessel_class == "mechanized_trawler"

    # Missing required period must still yield unknown even for small craft
    incomplete = {"wave_height_m": 0.5, "wind_speed_kmh": 10.0, "cache_status": "fresh", "is_mock": False}
    assert assess_risk(incomplete, vessel_class="traditional_canoe").level == "unknown"


def test_profile_vessel_class_persistence_and_endpoint_validation():
    client = authenticate_client(TestClient(app))
    patch_resp = client.patch("/api/user/profile", json={"vessel_class": "traditional_canoe"})
    assert patch_resp.status_code == 200, patch_resp.text
    assert patch_resp.json()["vessel_class"] == "traditional_canoe"

    get_resp = client.get("/api/user/profile")
    assert get_resp.status_code == 200
    assert get_resp.json()["vessel_class"] == "traditional_canoe"

    bad_vessel = client.get("/api/marine/risk?lat=18.9&lon=72.8&vessel_class=submarine")
    assert bad_vessel.status_code == 422


def test_authoritative_tide_contract_and_lunar_estimate(monkeypatch):
    monkeypatch.delenv("WORLDTIDES_API_KEY", raising=False)
    monkeypatch.delenv("STORMGLASS_API_KEY", raising=False)
    client = TestClient(app)

    assert client.get("/api/marine/tide?lat=20.9&lon=70.37").status_code == 503

    lunar = client.get("/api/marine/tide/lunar-estimate?lat=20.9&lon=70.37&date=2026-11-23")
    assert lunar.status_code == 200, lunar.text
    body = lunar.json()
    assert body["is_authoritative"] is False
    assert body["reliability_tier"] == "ASTRONOMICAL_ESTIMATE"
    assert body["status"] == "estimated"
    assert len(body["estimated_high_tide_windows_ist"]) >= 1
    assert "keel clearance" in body["disclaimer"].lower()

    # Configured WorldTides adapter returns 200 with mocked HTTP payload
    monkeypatch.setenv("WORLDTIDES_API_KEY", "test-worldtides-key")
    mock_resp = httpx.Response(
        200,
        json={
            "station": "Veraval",
            "extremes": [
                {"date": "2026-11-23T06:15:00+00:00", "height": 2.4, "type": "High"},
                {"date": "2026-11-23T12:30:00+00:00", "height": 0.6, "type": "Low"},
            ],
        },
        request=httpx.Request("GET", "https://www.worldtides.info/api/v3"),
    )
    with patch("httpx.Client.get", return_value=mock_resp):
        auth_tide = client.get("/api/marine/tide?lat=20.9&lon=70.37")
    assert auth_tide.status_code == 200
    assert auth_tide.json()["is_authoritative"] is True
    assert auth_tide.json()["source"] == "WorldTides Harmonic API"


def test_trip_economics_post_get_and_bounds():
    client = TestClient(app)
    res = client.post(
        "/api/marine/trip-economics",
        json={
            "origin_lat": 20.9,
            "origin_lon": 70.37,
            "vessel_class": "motorized_gillnetter",
            "fuel_price_inr": 100.0,
            "one_way_distance_km": 28.0,
            "wave_height_m": 1.6,
            "pfz_zones": [
                {"id": "z2", "landing_centre": "Outer Bank", "latitude": 20.5, "longitude": 70.1, "distance_km": 42.0},
                {"id": "z1", "landing_centre": "Near Shore", "latitude": 20.8, "longitude": 70.3, "distance_km": 14.0},
            ],
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["reliability_tier"] == "ORCA_HEURISTIC"
    assert data["is_navigation_clearance"] is False
    assert data["round_trip_distance_km"] == 56.0
    assert data["estimated_fuel_liters"] > 0
    assert data["estimated_fuel_cost_inr"] > 0
    assert data["pfz_guided_savings_vs_blind_search"]["estimated_saved_inr"] > 0
    assert data["ranked_pfz_options"][0]["id"] == "z1"

    get_res = client.get("/api/marine/trip-economics?origin_lat=20.9&origin_lon=70.37&one_way_distance_km=15")
    assert get_res.status_code == 200

    bad = client.post(
        "/api/marine/trip-economics",
        json={"origin_lat": 20.9, "origin_lon": 70.37, "fuel_price_inr": -10},
    )
    assert bad.status_code == 422


def test_sms_transport_adapters(monkeypatch):
    for key in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", "MSG91_AUTH_KEY", "SMS_WEBHOOK_URL"):
        monkeypatch.delenv(key, raising=False)
    assert isinstance(get_sms_transport(), UnconfiguredSMS)
    assert get_sms_transport().send("+919876543210", "hello").status == "not_sent"

    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC123")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "secret")
    monkeypatch.setenv("TWILIO_FROM_NUMBER", "+15005550006")
    transport = get_sms_transport()
    assert isinstance(transport, TwilioSMSTransport)
    ok_resp = httpx.Response(201, json={"sid": "SM999"}, request=httpx.Request("POST", "https://api.twilio.com"))
    with patch("httpx.Client.post", return_value=ok_resp):
        delivery = transport.send("+919876543210", "SOS test")
    assert delivery.status == "sent" and delivery.provider_reference == "SM999"

    monkeypatch.delenv("TWILIO_ACCOUNT_SID")
    monkeypatch.setenv("MSG91_AUTH_KEY", "msg-key")
    monkeypatch.setenv("MSG91_SENDER_ID", "ORCAMR")
    msg_transport = get_sms_transport()
    assert isinstance(msg_transport, MSG91SMSTransport)
    msg_resp = httpx.Response(200, json={"request_id": "REQ42"}, request=httpx.Request("POST", "https://api.msg91.com"))
    with patch("httpx.Client.post", return_value=msg_resp):
        assert msg_transport.send("+919876543210", "ORCA code").status == "sent"


def test_redis_rate_limiter_enforcement_and_fallback():
    limiter = FixedWindowRateLimiter(redis_url="")
    fake_pipe = MagicMock()
    fake_pipe.execute.side_effect = [[1, True], [2, True], [3, True]]
    fake_redis = MagicMock()
    fake_redis.pipeline.return_value = fake_pipe
    limiter._redis_client = fake_redis

    limiter.check("test", "user1", limit=2, window_seconds=60)
    limiter.check("test", "user1", limit=2, window_seconds=60)
    with pytest.raises(HTTPException) as exc:
        limiter.check("test", "user1", limit=2, window_seconds=60)
    assert exc.value.status_code == 429

    # Redis outage must fall back cleanly to in-memory limiter
    fake_redis.pipeline.side_effect = RuntimeError("redis down")
    limiter.check("fallback", "u2", limit=1, window_seconds=60)
    with pytest.raises(HTTPException) as exc2:
        limiter.check("fallback", "u2", limit=1, window_seconds=60)
    assert exc2.value.status_code == 429


def test_web_push_config_and_subscriptions(monkeypatch):
    client = TestClient(app)
    monkeypatch.delenv("VAPID_PUBLIC_KEY", raising=False)
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)
    cfg = client.get("/api/notifications/push/config")
    assert cfg.status_code == 200
    assert cfg.json()["configured"] is False
    assert cfg.json()["vapid_public_key"] is None

    monkeypatch.setenv("VAPID_PUBLIC_KEY", "BEl-test-public-key-value")
    monkeypatch.setenv("VAPID_PRIVATE_KEY", "top-secret-private-key")
    cfg2 = client.get("/api/notifications/push/config").json()
    assert cfg2["configured"] is True
    assert cfg2["vapid_public_key"] == "BEl-test-public-key-value"
    assert "top-secret-private-key" not in str(cfg2)

    authed = authenticate_client(TestClient(app))
    bad = authed.post(
        "/api/notifications/push/subscribe",
        json={"endpoint": "http://insecure.example/push", "keys": {"p256dh": "A" * 24, "auth": "B" * 16}},
    )
    assert bad.status_code == 400

    good = authed.post(
        "/api/notifications/push/subscribe",
        json={"endpoint": "https://fcm.googleapis.com/fcm/send/sub-1", "keys": {"p256dh": "A" * 32, "auth": "B" * 16}},
    )
    assert good.status_code == 200 and good.json()["status"] == "subscribed"

    dup = authed.post(
        "/api/notifications/push/subscribe",
        json={"endpoint": "https://fcm.googleapis.com/fcm/send/sub-1", "keys": {"p256dh": "C" * 32, "auth": "D" * 16}},
    )
    assert dup.status_code == 200 and dup.json()["status"] == "updated"

    rem = authed.request(
        "DELETE",
        "/api/notifications/push/subscribe",
        json={"endpoint": "https://fcm.googleapis.com/fcm/send/sub-1"},
    )
    assert rem.status_code == 200 and rem.json()["status"] == "removed"


def test_password_reset_unconfigured_and_full_lifecycle():
    rate_limiter.clear()
    unauth = TestClient(app)
    with patch("app.services.email.is_email_configured", return_value=False):
        res503 = unauth.post("/api/auth/forgot-password", json={"email_or_phone": "someone@example.com"})
    assert res503.status_code == 503
    assert res503.json()["detail"] == "PASSWORD_RESET_DELIVERY_UNCONFIGURED"

    # Register user and capture active session
    authed = authenticate_client(TestClient(app))
    profile = authed.get("/api/user/profile").json()
    user_email = profile["email"]

    sent_messages = []

    class CaptureEmail:
        def send(self, to_address, subject, body):
            sent_messages.append((to_address, subject, body))

    with (
        patch("app.services.email.is_email_configured", return_value=True),
        patch("app.services.email.get_email_transport", return_value=CaptureEmail()),
    ):
        req_res = unauth.post("/api/auth/forgot-password", json={"email_or_phone": user_email})
    assert req_res.status_code == 200
    assert len(sent_messages) == 1
    body_text = sent_messages[0][2]
    reset_code = [line.strip() for line in body_text.splitlines() if line.strip()][-1]

    confirm = unauth.post("/api/auth/reset-password", json={"token": reset_code, "new_password": "BrandNewPassword!2026"})
    assert confirm.status_code == 200

    # Prior session token must be revoked after password reset
    assert authed.get("/api/user/profile").status_code == 401

    # New password logs in cleanly
    login_ok = unauth.post("/api/auth/login", json={"email_or_phone": user_email, "password": "BrandNewPassword!2026"})
    assert login_ok.status_code == 200

    # Single-use token cannot be replayed
    replay = unauth.post("/api/auth/reset-password", json={"token": reset_code, "new_password": "AnotherPassword123"})
    assert replay.status_code == 400
    rate_limiter.clear()


def test_enhanced_demo_scenario_species_and_veraval_hazards():
    now = datetime.now(timezone.utc)
    base = MarineSnapshot(
        snapshot_id="test",
        location=SCENARIOS["veraval"],
        request={"requested_date": now.date().isoformat(), "requested_time": now.isoformat()},
        weather=SnapshotWeather(),
        ocean={"sst_c": None},
        pfz={"zones": []},
        tide={"availability": "unavailable"},
        boundary={"geometry": None},
        hazards=[],
        risk={},
        provenance={"cache_status": "unavailable"},
        missing_fields=[],
        expires_at=now.isoformat(),
        backend_sha="test",
    )
    demo = DemoScenarioProvider(LiveProvider(lambda: base), "veraval", now).snapshot()
    assert demo.pfz["zones"][0]["species"]
    assert demo.pfz["zones"][0]["depth_m"] > 0
    assert len(demo.hazards) >= 1
    assert all(h["source"] == SOURCE for h in demo.hazards)


def test_sqlite_wal_and_busy_timeout_configured(tmp_path):
    from sqlalchemy import create_engine, event, text
    from app.db.session import configure_sqlite_connection

    db_file = tmp_path / "wal_check.db"
    test_engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False, "timeout": 30},
    )

    @event.listens_for(test_engine, "connect")
    def _on_connect(dbapi_conn, connection_record):
        configure_sqlite_connection(dbapi_conn, connection_record, enable_wal=True)

    try:
        with test_engine.connect() as conn:
            journal_mode = conn.execute(text("PRAGMA journal_mode")).scalar()
            busy_timeout = conn.execute(text("PRAGMA busy_timeout")).scalar()
        assert str(journal_mode).lower() == "wal"
        assert int(busy_timeout) == 30000
    finally:
        test_engine.dispose()


def test_database_url_normalizes_pasted_psql_and_quotes(monkeypatch):
    from app.db.session import get_database_url

    monkeypatch.setenv("DATABASE_URL", ' "postgresql://u:p@db.example:5432/orca" ')
    res1 = get_database_url()
    assert res1.startswith(("postgresql+psycopg://", "postgresql+psycopg2://", "postgresql://"))
    assert res1.endswith("://u:p@db.example:5432/orca")

    monkeypatch.setenv("DATABASE_URL", "psql 'postgresql://u:p@db.example:5432/orca?sslmode=require'")
    res2 = get_database_url()
    assert res2.endswith("://u:p@db.example:5432/orca?sslmode=require")

    monkeypatch.setenv("DATABASE_URL", "DATABASE_URL=postgres://u:p@db.example:5432/orca")
    res3 = get_database_url()
    assert res3.endswith("://u:p@db.example:5432/orca")


def test_redis_url_normalization_and_clients():
    from app.data.weather.cache import MarineWeatherCache
    from app.services.redis_utils import normalize_redis_url

    expected = "rediss://default:tok@host.upstash.io:6379"
    assert normalize_redis_url(None) == ""
    assert normalize_redis_url("  'none'  ") == ""
    assert normalize_redis_url(f' "{expected}" ') == expected
    assert normalize_redis_url(f"redis-cli --tls -u {expected}") == expected
    assert normalize_redis_url(f"REDIS_URL={expected}") == expected

    fake_client = MagicMock()
    fake_client.ping.return_value = True
    with patch("redis.Redis.from_url", return_value=fake_client) as rl_from_url:
        limiter = FixedWindowRateLimiter(redis_url=f"redis-cli --tls -u {expected}")
        assert limiter._redis_client is fake_client
        assert rl_from_url.call_args.args[0] == expected

    with patch("redis.Redis.from_url", return_value=fake_client) as cache_from_url:
        cache = MarineWeatherCache(redis_url=f'"{expected}"')
        assert cache._redis_client is fake_client
        assert cache_from_url.call_args.args[0] == expected

    with patch("redis.Redis.from_url") as redis_none:
        FixedWindowRateLimiter(redis_url="none")
        MarineWeatherCache(redis_url="none")
        redis_none.assert_not_called()


def test_seed_database_is_idempotent():
    from app.db.models import User
    from app.db.session import get_db_context
    from seed.seed_database import seed_database

    seed_database(skip_init=True)
    seed_database(skip_init=True)

    with get_db_context() as db:
        assert db.query(User).filter(User.id == "USR-DEMO-01").count() == 1
        assert db.query(User).filter(User.email == "fisherman@orca.marine").count() == 1
