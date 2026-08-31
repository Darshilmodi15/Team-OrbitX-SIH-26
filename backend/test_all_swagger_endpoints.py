import sys
import os
import json
import traceback
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)

def test_all_endpoints():
    schema = app.openapi()
    paths = schema.get("paths", {})
    results = []
    
    # 1. Login with seeded SUPER_ADMIN
    auth_headers = {}
    try:
        login_res = client.post("/api/auth/login", json={
            "email_or_phone": "admin@orca.marine",
            "password": "adminpassword123"
        })
        if login_res.status_code == 200:
            token = login_res.json().get("access_token")
            auth_headers = {"Authorization": f"Bearer {token}"}
            print("Successfully authenticated SUPER_ADMIN user (admin@orca.marine).")
        else:
            print("Login failed:", login_res.status_code, login_res.text)
    except Exception as e:
        print("Auth exception:", e)

    # 2. Get a sample notification ID if available
    sample_notif_id = "test-notification-id"
    try:
        notifs_res = client.get("/api/notifications", headers=auth_headers)
        if notifs_res.status_code == 200 and len(notifs_res.json().get("notifications", [])) > 0:
            sample_notif_id = notifs_res.json()["notifications"][0]["id"]
    except Exception:
        pass

    # 3. Iterate over all OpenAPI paths
    for path, methods in paths.items():
        for method, details in methods.items():
            method_upper = method.upper()
            summary = details.get("summary", "")
            
            actual_path = path
            if "{announcement_id}" in actual_path:
                actual_path = actual_path.replace("{announcement_id}", "GOV-ANN-2026-01")
            if "{user_id}" in actual_path:
                actual_path = actual_path.replace("{user_id}", "USR-DEMO-01")
            if "{notification_id}" in actual_path:
                actual_path = actual_path.replace("{notification_id}", sample_notif_id)

            query_params = {}
            json_body = None
            files = None
            
            if "lat" in str(details) or "latitude" in str(details):
                query_params["lat"] = 18.9220
                query_params["lon"] = 72.8347
                query_params["latitude"] = 18.9220
                query_params["longitude"] = 72.8347
                
            if "date" in str(details):
                query_params["date"] = "2026-08-31"

            # Route specific payloads
            if method_upper == "POST":
                if path == "/query":
                    json_body = {
                        "location": {"lat": 18.9220, "lon": 72.8347},
                        "date": "2026-08-31",
                        "question": "Is it safe to fish tomorrow?",
                        "language": "en"
                    }
                elif path == "/api/chat":
                    json_body = {
                        "message": "Is it safe to go out to sea?",
                        "session_id": "test-session-123",
                        "lat": 18.9220,
                        "lon": 72.8347,
                        "language": "en"
                    }
                elif path == "/api/simulate":
                    json_body = {
                        "lat": 18.9220,
                        "lon": 72.8347,
                        "delta_wave_height_m": 1.0,
                        "delta_wind_speed_kmh": 15.0
                    }
                elif path == "/api/demo/dahanu":
                    json_body = {}
                elif path == "/api/location/validate":
                    json_body = {"lat": 18.9220, "lon": 72.8347}
                elif path == "/api/location/update":
                    json_body = {"lat": 18.9220, "lon": 72.8347, "accuracy_m": 10.0}
                elif path == "/api/emergency/sos":
                    json_body = {
                        "vessel_name": "Matsya Shakti",
                        "registration_no": "IND-MH-01-1234",
                        "lat": 18.9220,
                        "lon": 72.8347,
                        "crew_count": 4,
                        "emergency_nature": "Engine Failure / Adrift at Sea",
                        "contact_phone": "+919876543210"
                    }
                elif path == "/api/detect-language":
                    json_body = {"text": "kya main kal fishing ja sakta hoon?"}
                elif path == "/api/translate":
                    json_body = {"text": "Is it safe to go fishing?", "source_language": "en", "target_language": "gu"}
                elif path == "/api/notifications/check":
                    json_body = {"lat": 18.9220, "lon": 72.8347}
                elif path == "/api/notifications/read-all":
                    json_body = {}
                elif path == "/api/auth/register":
                    json_body = {
                        "name": "Unique Fisherman",
                        "email": "unique_fisherman_999@orca.marine",
                        "mobile_number": "+919999911199",
                        "password": "TestPassword123!",
                        "preferred_language": "gu",
                        "role": "USER"
                    }
                elif path == "/api/auth/login":
                    json_body = {"email_or_phone": "admin@orca.marine", "password": "adminpassword123"}
                elif path == "/api/auth/google":
                    json_body = {"google_token": "mock_valid_google_token_1234567890"}
                elif path == "/api/voice/transcribe":
                    # multipart audio file
                    wav_header = b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
                    files = {"file": ("test.wav", io.BytesIO(wav_header), "audio/wav")}
                elif path == "/api/voice/transcribe-base64":
                    json_body = {"audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=", "language_code": "hi-IN"}
                elif path == "/api/voice/speak":
                    json_body = {"text": "સમુદ્ર સુરક્ષિત છે.", "target_language": "gu", "speaker": "meera"}
                elif path == "/api/marine-boundaries/check":
                    json_body = {"lat": 18.9220, "lon": 72.8347}
                elif path == "/api/government/announcements":
                    json_body = {
                        "title": "Monsoon Advisory 2026",
                        "issuing_authority": "Ministry of Fisheries",
                        "state_or_national": "National",
                        "publish_date": "2026-08-31",
                        "effective_dates": "Immediate",
                        "summary": "Monsoon warning",
                        "full_text": "All vessels advised to maintain VHF watch.",
                        "category": "Advisory",
                        "reference_number": "ANN-TEST-01",
                        "severity": "INFO"
                    }
                else:
                    json_body = {}

            elif method_upper == "PATCH":
                if path == "/api/user/profile":
                    json_body = {"name": "Updated Darshil"}
                elif "/role" in path:
                    json_body = {"role": "GOVERNMENT"}
                else:
                    json_body = {}

            # Execute request
            try:
                headers = auth_headers
                if files:
                    resp = client.post(actual_path, params=query_params, files=files, headers=headers)
                elif method_upper == "GET":
                    resp = client.get(actual_path, params=query_params, headers=headers)
                elif method_upper == "POST":
                    resp = client.post(actual_path, params=query_params, json=json_body, headers=headers)
                elif method_upper == "PATCH":
                    resp = client.patch(actual_path, params=query_params, json=json_body, headers=headers)
                elif method_upper == "DELETE":
                    resp = client.delete(actual_path, params=query_params, headers=headers)
                else:
                    resp = None
                    
                status = resp.status_code if resp is not None else 0
                error_detail = ""
                if status >= 500:
                    error_detail = f"500 SERVER ERROR: {resp.text}"
                elif status == 422:
                    error_detail = f"422 VALIDATION ERROR: {resp.text}"
                elif status == 404:
                    error_detail = f"404 NOT FOUND: {resp.text}"
                elif status == 401 or status == 403:
                    error_detail = f"AUTH {status}: {resp.text}"
                elif status == 400:
                    error_detail = f"400 BAD REQUEST: {resp.text}"
                    
                results.append({
                    "method": method_upper,
                    "path": path,
                    "actual_path": actual_path,
                    "status": status,
                    "summary": summary,
                    "error_detail": error_detail,
                    "response_sample": resp.text[:200] if resp is not None else ""
                })
            except Exception as e:
                results.append({
                    "method": method_upper,
                    "path": path,
                    "actual_path": actual_path,
                    "status": "EXCEPTION",
                    "summary": summary,
                    "error_detail": f"Exception: {str(e)}\n{traceback.format_exc()}",
                    "response_sample": ""
                })

    print(f"\n=======================================================")
    print(f"       SWAGGER ENDPOINT AUDIT REPORT ({len(results)} Routes)")
    print(f"=======================================================")
    status_counts = {}
    for r in results:
        code = r["status"]
        status_counts[code] = status_counts.get(code, 0) + 1
    print("Status code distribution:", status_counts)
    
    errors = [r for r in results if r["status"] not in (200, 201, 204)]
    print(f"\nNon-2xx / Failed Endpoints: {len(errors)}")
    for r in errors:
        print(f"\n[{r['status']}] {r['method']} {r['path']}")
        print(f"  Summary: {r['summary']}")
        print(f"  Error detail: {r['error_detail']}")

if __name__ == "__main__":
    test_all_endpoints()
