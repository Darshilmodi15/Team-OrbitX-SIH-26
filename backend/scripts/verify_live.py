"""Real HTTP/provider verification. No mocks; failed or fallback-only flows exit nonzero.

Run from backend: python scripts/verify_live.py --output /tmp/orca-live.json
Starts temporary local ORCA servers with real providers and isolated persistence.
Lifespan is disabled to avoid seeding accounts and polling eleven unrelated hubs.
Only a public test sentence is submitted to the paid Sarvam speech APIs.
"""
import argparse
import base64
from contextlib import contextmanager
from datetime import datetime, timezone
import io
import json
import math
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import wave

import httpx

BACKEND = Path(__file__).resolve().parents[1]


@contextmanager
def server(provider):
    with tempfile.TemporaryDirectory(prefix="orca-live-") as state:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        env = {**os.environ, "ORCA_VERIFY_STATE_DIR": state,
               "ORCA_VERIFY_WEATHER_PROVIDER": provider}
        # Never print raw server logs, provider bodies, environment or credentials.
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "scripts.live_verification_server:create_app",
            "--factory", "--host", "127.0.0.1", "--port", str(port),
            "--lifespan", "off", "--no-access-log"], cwd=BACKEND, env=env,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=90, trust_env=False) as client:
                for _ in range(100):
                    if process.poll() is not None:
                        raise RuntimeError("LOCAL_SERVER_START_FAILED")
                    try:
                        if client.get("/health", timeout=1).status_code == 200:
                            break
                    except httpx.HTTPError:
                        pass
                    time.sleep(.2)
                else:
                    raise RuntimeError("LOCAL_SERVER_START_TIMEOUT")
                yield client, Path(state)
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


def weather_result(data, expected):
    stamp = data.get("forecast_valid_at") or data.get("forecast_time")
    age = None
    if stamp:
        try:
            valid = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
            if valid.tzinfo is None:
                valid = valid.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - valid).total_seconds()
        except (ValueError, TypeError):
            pass
    complete = all(isinstance(data.get(k), (int, float)) and not isinstance(data[k], bool)
                   and math.isfinite(data[k]) and data[k] >= 0
                   for k in ("wave_height_m", "wind_speed_kmh"))
    passed = (data.get("source") == expected and data.get("is_mock") is False
              and data.get("cache_status") == "fresh" and complete
              and age is not None and -3600 <= age <= 10800)
    keys = ("source", "cache_status", "is_mock", "wave_height_m", "wind_speed_kmh",
            "wave_period_s", "wind_gust_kmh", "forecast_valid_at", "forecast_time",
            "issued_at", "retrieved_at")
    return {"passed": passed, **{k: data.get(k) for k in keys},
            "valid_time_age_seconds": round(age) if age is not None else None}


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = {"checked_at": datetime.now(timezone.utc).isoformat(),
              "scope": "local HTTP API -> real providers; isolated DB/cache; lifespan disabled",
              "coordinates": {"lat": 18.9, "lon": 72.5}, "checks": {}}
    checks = report["checks"]
    for provider, expected in [("incois", "INCOIS_OSF_WW3"),
                               ("open-meteo", "open_meteo_marine_api")]:
        try:
            with server(provider) as (client, state):
                started = time.monotonic()
                response = client.get("/api/marine/conditions", params=report["coordinates"])
                checks[provider] = {"http_status": response.status_code,
                    "elapsed_seconds": round(time.monotonic() - started, 2),
                    **weather_result(response.json(), expected)}
                checks[provider]["passed"] &= response.status_code == 200
                if provider != "incois":
                    continue
                cached = client.get("/api/marine/conditions", params=report["coordinates"])
                cached_data = cached.json()
                checks["cache"] = {"http_status": cached.status_code,
                    "cache_status": cached_data.get("cache_status"),
                    "passed": cached.status_code == 200 and cached_data.get("cache_status") == "cached"
                        and all(cached_data.get(k) == response.json().get(k) for k in
                            ("source", "wave_height_m", "wind_speed_kmh", "forecast_time"))}
                risk = client.get("/api/marine/risk", params=report["coordinates"])
                data = risk.json()
                checks["risk"] = {"http_status": risk.status_code,
                    "evidence_completeness": data.get("evidence_completeness"),
                    "assessment_type": data.get("assessment_type"), "profile": data.get("profile"),
                    "passed": risk.status_code == 200 and data.get("assessment_type") == "ORCA_HEURISTIC"
                        and "SAFE TO SAIL" not in risk.text
                        and (data.get("evidence_completeness") == "complete"
                            or data.get("profile", {}).get("overall") in ("UNKNOWN", "HIGH", "CRITICAL"))}
                started = time.monotonic()
                eez = client.get("/api/marine-boundaries/eez", params={"force_refresh": "true"})
                geo = eez.json()
                metadata = geo.get("metadata", {})
                checks["vliz"] = {"http_status": eez.status_code,
                    "elapsed_seconds": round(time.monotonic() - started, 2),
                    "retrieval_status": metadata.get("retrieval_status"),
                    "feature_count": len(geo.get("features", [])),
                    "passed": eez.status_code == 200 and metadata.get("retrieval_status") == "live_wfs"
                        and bool(geo.get("features"))}
                boundary = client.get("/api/marine-boundaries/check", params=report["coordinates"])
                boundary_data = boundary.json()
                checks["vliz_boundary"] = {"http_status": boundary.status_code,
                    "inside_eez": boundary_data.get("inside_eez"),
                    "distance_to_boundary_km": boundary_data.get("distance_to_boundary_km"),
                    "passed": checks["vliz"]["passed"] and boundary.status_code == 200
                        and isinstance(boundary_data.get("inside_eez"), bool)
                        and isinstance(boundary_data.get("distance_to_boundary_km"), (int, float))}
                speak = client.post("/api/voice/speak", json={
                    "text": "This is an ORCA voice integration test.", "language": "en"})
                voice = speak.json()
                checks["sarvam_tts"] = {"http_status": speak.status_code,
                    "source": voice.get("source"), "passed": False}
                if (speak.status_code == 200 and voice.get("is_mock") is False
                        and voice.get("source") == "sarvam_bulbul_v3"):
                    audio = base64.b64decode(voice.get("audio_base64", ""), validate=True)
                    with wave.open(io.BytesIO(audio)) as wav:
                        seconds = wav.getnframes() / wav.getframerate()
                    checks["sarvam_tts"].update(passed=seconds > 0,
                        audio_bytes=len(audio), duration_seconds=round(seconds, 2))
                    stt = client.post("/api/voice/transcribe", data={"language": "en"},
                        files={"file": ("orca-verification.wav", audio, "audio/wav")})
                    transcript = stt.json()
                    text = transcript.get("transcript", "")
                    checks["sarvam_stt"] = {"http_status": stt.status_code,
                        "source": transcript.get("source"), "transcript": text,
                        "passed": stt.status_code == 200 and transcript.get("is_mock") is False
                            and transcript.get("source") == "sarvam_saaras_v3"
                            and "voice" in text.lower() and "test" in text.lower()}
                else:
                    checks["sarvam_stt"] = {"passed": False, "reason": "BLOCKED_BY_TTS_FAILURE"}
                # Safe telemetry codes identify upstream HTTP/quota failures without exposing keys.
                import sqlite3
                with sqlite3.connect(state / "verification.db") as db:
                    rows = db.execute("SELECT key, value FROM system_settings WHERE key LIKE 'provider_health.%'").fetchall()
                report["provider_telemetry"] = {k: json.loads(v) for k, v in rows}
        except Exception as exc:
            checks[provider + "_verification_error"] = {"passed": False, "reason": type(exc).__name__}
    report["passed"] = all(checks.get(k, {}).get("passed") for k in
        ("incois", "open-meteo", "vliz", "vliz_boundary", "sarvam_tts", "sarvam_stt", "risk", "cache"))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(run())
