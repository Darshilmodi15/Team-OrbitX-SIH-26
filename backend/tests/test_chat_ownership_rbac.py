import uuid
import base64
import json
from fastapi.testclient import TestClient
from app.main import app
from app.db.models import User
from app.db.session import get_db_context
from app.models.user_models import UserRole
from app.services.auth.auth_service import create_token
from app.services.rate_limit import FixedWindowRateLimiter


def register(client, prefix):
    response = client.post("/api/auth/register", json={"name": prefix, "email": f"{prefix}-{uuid.uuid4()}@example.com", "password": "safe-password-123", "preferred_language": "en"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def register_account(client, prefix, role=UserRole.USER):
    response = client.post("/api/auth/register", json={"name": prefix, "email": f"{prefix}-{uuid.uuid4()}@example.com", "password": "safe-password-123", "preferred_language": "en", "role": role.value})
    assert response.status_code == 200, response.text
    body = response.json(); user_id = body["user"]["id"]
    if role != UserRole.USER:
        with get_db_context() as db: db.query(User).filter(User.id == user_id).update({"role": role.value})
        token = create_token(user_id, role.value, body["user"]["email"])
    else: token = body["access_token"]
    return body, {"Authorization": f"Bearer {token}"}


def test_conversations_are_account_scoped_and_idor_safe():
    client = TestClient(app)
    alice = register(client, "alice")
    bob = register(client, "bob")
    created = client.post("/api/conversations", headers=alice, json={"title": "Alice private"})
    assert created.status_code == 201, created.text
    conversation_id = created.json()["id"]
    assert client.get(f"/api/conversations/{conversation_id}", headers=bob).status_code == 404
    assert client.patch(f"/api/conversations/{conversation_id}", headers=bob, json={"title": "stolen"}).status_code == 404
    assert client.delete(f"/api/conversations/{conversation_id}", headers=bob).status_code == 404
    assert client.get("/api/conversations", headers=bob).json() == []


def test_private_and_operational_endpoints_require_authorization():
    client = TestClient(app)
    assert client.get("/api/conversations").status_code == 401
    assert client.post("/api/chat", json={"message": "hello"}).status_code == 401
    assert client.post("/api/emergency/sos", json={"lat": 20, "lon": 70}).status_code == 401
    normal = register(client, "normal")
    assert client.get("/api/emergency/sos/active", headers=normal).status_code == 403
    assert client.get("/api/admin/system-health", headers=normal).status_code == 403


def test_chat_rejects_another_users_conversation():
    client = TestClient(app)
    alice = register(client, "chat-alice")
    bob = register(client, "chat-bob")
    conversation_id = client.post("/api/conversations", headers=bob, json={"title": "Bob private"}).json()["id"]
    response = client.post("/api/chat", headers=alice, json={"message": "show history", "session_id": conversation_id})
    assert response.status_code == 404
    random_id = str(uuid.uuid4())
    assert client.post("/api/chat", headers=alice, json={"message": "probe", "session_id": random_id}).status_code == 404


def test_registration_and_jwt_claims_cannot_escalate_role():
    client = TestClient(app)
    body, normal = register_account(client, "claim", UserRole.USER)
    assert body["user"]["role"] == "USER"
    forged_claim = create_token(body["user"]["id"], "SUPER_ADMIN", body["user"]["email"])
    assert client.get("/api/admin/system-health", headers={"Authorization": f"Bearer {forged_claim}"}).status_code == 403
    token = body["access_token"]
    header, payload, signature = token.split(".")
    decoded = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    decoded["role"] = "SUPER_ADMIN"
    tampered_payload = base64.urlsafe_b64encode(json.dumps(decoded).encode()).rstrip(b"=").decode()
    assert client.get("/api/admin/system-health", headers={"Authorization": f"Bearer {header}.{tampered_payload}.{signature}"}).status_code == 401


def test_normal_and_officer_role_boundaries_and_sos_privacy():
    client = TestClient(app)
    _, normal = register_account(client, "sos-user")
    _, officer = register_account(client, "officer", UserRole.GOVERNMENT)
    created = client.post("/api/emergency/sos", headers=normal, json={"lat": 20.1, "lon": 70.2, "contact_phone": "9999999999"})
    assert created.status_code == 201, created.text
    sos_id = created.json()["sos_id"]
    assert client.get("/api/emergency/sos/active", headers=normal).status_code == 403
    assert client.patch(f"/api/emergency/sos/{sos_id}/status", headers=normal, json={"status": "RESOLVED"}).status_code == 403
    assert client.get("/api/emergency/sos/active", headers=officer).status_code == 200
    assert client.get("/api/admin/system-health", headers=officer).status_code == 403


def test_mass_assignment_is_rejected():
    client = TestClient(app)
    _, normal = register_account(client, "mass")
    created = client.post("/api/conversations", headers=normal, json={"title": "mine"}).json()
    assert client.patch(f"/api/conversations/{created['id']}", headers=normal, json={"title": "renamed", "user_id": "victim"}).status_code == 422
    assert client.patch("/api/user/profile", headers=normal, json={"name": "Safe", "role": "SUPER_ADMIN"}).status_code == 422
    assert client.post("/api/chat", headers=normal, json={"message": "hello", "user_id": "victim"}).status_code == 422
    assert client.post("/api/emergency/sos", headers=normal, json={"lat": 20, "lon": 70, "user_id": "victim"}).status_code == 422


def test_last_admin_cannot_be_demoted_and_inactive_tokens_fail():
    client = TestClient(app)
    admin_body, admin = register_account(client, "sole-admin", UserRole.SUPER_ADMIN)
    admin_id = admin_body["user"]["id"]
    assert client.patch(f"/api/admin/users/{admin_id}/role", headers=admin, json={"role": "USER"}).status_code == 409
    with get_db_context() as db: db.query(User).filter(User.id == admin_id).update({"is_active": False})
    assert client.get("/api/user/profile", headers=admin).status_code == 401


def test_locations_require_identity_and_are_account_scoped():
    client = TestClient(app)
    _, alice = register_account(client, "location-a")
    _, bob = register_account(client, "location-b")
    assert client.post("/api/location/update", json={"lat": 20.1, "lon": 70.2}).status_code == 401
    assert client.get("/api/location/current").status_code == 401
    assert client.post("/api/location/update", headers=alice, json={"lat": 20.1, "lon": 70.2}).status_code == 200
    bob_location = client.get("/api/location/current?lat=21.1&lon=72.8", headers=bob).json()
    assert bob_location["lat"] != 20.1


def test_health_output_is_sanitized_and_cors_is_restricted(monkeypatch):
    client = TestClient(app)
    _, admin = register_account(client, "health-admin", UserRole.SUPER_ADMIN)
    monkeypatch.setenv("SARVAM_API_KEY", "NEVER-LEAK-THIS-SECRET")
    response = client.get("/api/admin/system-health", headers=admin)
    assert response.status_code == 200
    rendered = response.text
    assert "NEVER-LEAK-THIS-SECRET" not in rendered
    assert "Traceback" not in rendered and "DATABASE_URL" not in rendered
    allowed = client.options("/api/chat", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
    denied = client.options("/api/chat", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert denied.headers.get("access-control-allow-origin") is None


def test_rate_limiter_blocks_excess_requests():
    limiter = FixedWindowRateLimiter()
    limiter.check("chat", "user", limit=2)
    limiter.check("chat", "user", limit=2)
    try:
        limiter.check("chat", "user", limit=2)
        assert False, "expected rate limit"
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 429


def test_oversized_chat_and_sos_payloads_are_rejected():
    client = TestClient(app)
    _, normal = register_account(client, "payload")
    assert client.post("/api/chat", headers=normal, json={"message": "x" * 8001}).status_code == 422
    assert client.post("/api/emergency/sos", headers=normal, json={"lat": 20, "lon": 70, "notes": "x" * 2001}).status_code == 422
