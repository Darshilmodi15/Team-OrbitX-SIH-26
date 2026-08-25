"""Unit and Integration tests for ORCA Authentication & User Profile Management."""
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user_models import UserRole
from app.services.auth import (
    auth_service,
    create_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestAuthService(unittest.TestCase):
    """Tests for AuthService password hashing, JWT generation, and role checks."""

    def test_password_hashing_and_verification(self):
        pwd = "secure_fisherman_pass_2026"
        hashed, salt = hash_password(pwd)
        self.assertTrue(verify_password(pwd, hashed, salt))
        self.assertFalse(verify_password("wrong_pass", hashed, salt))

    def test_jwt_token_encode_decode(self):
        user_id = "user_12345"
        role = "USER"
        token = create_token(user_id, role, "fisherman@orca.marine")
        payload = decode_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["sub"], user_id)
        self.assertEqual(payload["role"], role)

    def test_invalid_jwt_token_rejection(self):
        self.assertIsNone(decode_token("invalid.tampered.token"))


class TestAuthEndpoints(unittest.TestCase):
    """Integration tests for /api/auth and /api/user endpoints."""

    def setUp(self):
        self.client = TestClient(app)

    def test_login_demo_fisherman(self):
        payload = {
            "email_or_phone": "fisherman@orca.marine",
            "password": "password123",
        }
        res = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["name"], "Captain Ramesh Koli")
        self.assertEqual(data["user"]["role"], "USER")

    def test_login_demo_government_officer(self):
        payload = {
            "email_or_phone": "officer@fisheries.gov.in",
            "password": "govpassword123",
        }
        res = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["user"]["role"], "GOVERNMENT")

    def test_registration_and_profile_flow(self):
        payload = {
            "name": "Arun Patil",
            "email": "arun.patil.coastal@orca.marine",
            "mobile_number": "9811223344",
            "password": "mypassword123",
            "preferred_language": "mr",
            "role": "USER",
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 200)
        reg_data = res.json()
        token = reg_data["access_token"]
        self.assertEqual(reg_data["user"]["preferred_language"], "mr")

        # Fetch profile using Bearer token
        headers = {"Authorization": f"Bearer {token}"}
        prof_res = self.client.get("/api/user/profile", headers=headers)
        self.assertEqual(prof_res.status_code, 200)
        prof_data = prof_res.json()
        self.assertEqual(prof_data["name"], "Arun Patil")

        # Update profile preferred language to Gujarati
        patch_res = self.client.patch("/api/user/profile", json={"preferred_language": "gu"}, headers=headers)
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["preferred_language"], "gu")

    def test_duplicate_registration_rejection(self):
        payload = {
            "name": "Duplicate User",
            "email": "fisherman@orca.marine",  # already exists
            "password": "password123",
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
