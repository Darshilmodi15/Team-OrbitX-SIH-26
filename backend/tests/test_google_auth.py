"""Google identity security regressions; provider claims are controlled test inputs."""
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db_context
from app.db.models import User
from app.services.auth import auth_service

CLIENT = "orca-test.apps.googleusercontent.com"
CLAIMS = {"sub": "google-subject-1", "email": "captain@gmail.com", "email_verified": True, "name": "Captain"}


def login(claims=None):
    with patch.dict("os.environ", {"GOOGLE_CLIENT_ID": CLIENT}), patch("google.oauth2.id_token.verify_oauth2_token", return_value=claims or CLAIMS) as verify:
        response = TestClient(app).post("/api/auth/google", json={"google_token": "test-only-google-token-0001"})
        assert verify.call_args.args[2] == CLIENT
        return response


@pytest.mark.parametrize("changes", [{"email_verified": False}, {"email_verified": "true"}, {"sub": ""}, {"email": ""}])
def test_incomplete_or_unverified_identity_is_rejected(changes):
    assert login({**CLAIMS, **changes}).status_code == 401


def test_subject_persists_across_signins_and_email_changes():
    first = login()
    assert first.status_code == 200
    auth_service._users.clear()
    auth_service._lookup.clear()
    second = login({**CLAIMS, "email": "renamed@gmail.com"})
    assert second.status_code == 200
    assert first.json()["user"]["id"] == second.json()["user"]["id"]
    with get_db_context() as db:
        assert db.query(User).count() == 1
    token = second.json()["access_token"]
    assert TestClient(app).get("/api/user/profile", headers={"Authorization": "Bearer " + token}).status_code == 200


def test_disabled_google_account_cannot_login():
    account = login().json()["user"]["id"]
    with get_db_context() as db:
        db.get(User, account).is_active = False
    assert login().status_code == 403


def test_database_failure_never_creates_memory_user_or_session():
    with patch("app.db.session.get_db_context", side_effect=RuntimeError("offline")):
        response = login()
    assert response.status_code == 503
    assert CLAIMS["email"] not in auth_service._lookup


def test_google_transport_failure_is_not_invalid_credentials():
    from google.auth.exceptions import TransportError
    with patch.dict("os.environ", {"GOOGLE_CLIENT_ID": CLIENT}), patch("google.oauth2.id_token.verify_oauth2_token", side_effect=TransportError("offline")):
        response = TestClient(app).post("/api/auth/google", json={"google_token": "test-only-google-token-0001"})
    assert response.status_code == 503


def register(email):
    response = TestClient(app).post("/api/auth/register", json={"name":"Existing Captain", "email":email, "password":"test-strong-password"})
    assert response.status_code == 200
    return response.json()["user"]["id"]


def test_authoritative_email_links_existing_account_and_preserves_db_role():
    user_id = register(CLAIMS["email"])
    with get_db_context() as db:
        db.get(User, user_id).role = "GOVERNMENT"
    response = login()
    assert response.status_code == 200
    assert response.json()["user"]["id"] == user_id
    assert response.json()["user"]["role"] == "GOVERNMENT"


def test_non_authoritative_email_cannot_take_over_password_account():
    register("captain@external.example")
    assert login({**CLAIMS, "email":"captain@external.example"}).status_code == 409


def test_different_google_subject_cannot_take_over_bound_account():
    assert login().status_code == 200
    assert login({**CLAIMS, "sub":"different-subject"}).status_code == 409


def test_client_cannot_supply_roles_or_claims():
    response = TestClient(app).post("/api/auth/google", json={"google_token":"test-only-google-token-0001", "role":"SUPER_ADMIN", "email":CLAIMS["email"]})
    assert response.status_code == 422


def test_invalid_issuer_is_rejected_without_server_error():
    from google.auth.exceptions import GoogleAuthError
    with patch.dict("os.environ", {"GOOGLE_CLIENT_ID": CLIENT}), patch("google.oauth2.id_token.verify_oauth2_token", side_effect=GoogleAuthError("wrong issuer")):
        response = TestClient(app).post("/api/auth/google", json={"google_token": "test-only-google-token-0001"})
    assert response.status_code == 401
