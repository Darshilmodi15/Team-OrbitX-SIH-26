from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.db.models import DeviceSession
from app.db.session import get_db_context
from app.services.auth.auth_service import create_token, decode_token
from tests.test_chat_ownership_rbac import register_account


def test_independent_logins_and_server_logout():
    client = TestClient(app)
    body, first = register_account(client, "two-devices")
    second_token = client.post("/api/auth/login", json={"email_or_phone": body["user"]["email"], "password": "safe-password-123"}).json()["access_token"]
    second = {"Authorization": "Bearer " + second_token}
    sessions = client.get("/api/auth/sessions", headers=first).json()
    assert len(sessions) == 2
    assert sum(row["current"] for row in sessions) == 1
    conversation = client.post("/api/conversations", headers=first, json={"title": "Shared trip"}).json()
    assert client.get(f"/api/conversations/{conversation['id']}", headers=second).json()["title"] == "Shared trip"
    assert client.post("/api/auth/logout", headers=first).status_code == 200
    assert client.get("/api/user/profile", headers=first).status_code == 401
    assert client.get("/api/user/profile", headers=second).status_code == 200


def test_session_ownership_revocation_and_expiry():
    client = TestClient(app)
    body, alice = register_account(client, "alice-session")
    _, bob = register_account(client, "bob-session")
    session_id = decode_token(alice["Authorization"][7:])["jti"]
    assert client.delete(f"/api/auth/sessions/{session_id}", headers=bob).status_code == 404
    assert all(row["id"] != session_id for row in client.get("/api/auth/sessions", headers=bob).json())
    with get_db_context() as db:
        db.get(DeviceSession, session_id).expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert client.get("/api/user/profile", headers=alice).status_code == 401
    one = {"Authorization": "Bearer " + create_token(body["user"]["id"], "USER")}
    two = {"Authorization": "Bearer " + create_token(body["user"]["id"], "USER")}
    assert client.delete("/api/auth/sessions", headers=one).status_code == 200
    assert client.get("/api/user/profile", headers=one).status_code == 401
    assert client.get("/api/user/profile", headers=two).status_code == 401
    assert client.get("/api/user/profile", headers=bob).status_code == 200


def test_expired_access_token_and_individual_revoke(monkeypatch):
    import importlib
    module = importlib.import_module("app.services.auth.auth_service")
    client = TestClient(app)
    body, owner = register_account(client, "expire-token")
    other_token = create_token(body["user"]["id"], "USER")
    other_id = decode_token(other_token)["jti"]
    assert client.delete(f"/api/auth/sessions/{other_id}", headers=owner).status_code == 200
    assert client.get("/api/user/profile", headers={"Authorization": "Bearer " + other_token}).status_code == 401
    monkeypatch.setattr(module, "JWT_EXPIRY_SECONDS", -1)
    expired = create_token(body["user"]["id"], "USER")
    assert client.get("/api/user/profile", headers={"Authorization": "Bearer " + expired}).status_code == 401
    assert client.get("/api/user/profile", headers=owner).status_code == 200


def test_storage_failure_never_returns_a_fake_conversation(monkeypatch):
    from app.routers.chat import chat_storage_service
    client = TestClient(app)
    _, owner = register_account(client, "storage-failure")
    def fail(*args):
        raise RuntimeError("private database error")
    monkeypatch.setattr(chat_storage_service, "create", fail)
    result = client.post("/api/conversations", headers=owner, json={"title": "Trip"})
    assert result.status_code == 503
    assert "private database" not in result.text
    assert "id" not in result.json()

