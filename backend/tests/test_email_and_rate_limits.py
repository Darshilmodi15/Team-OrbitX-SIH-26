"""Tests for Resend HTTP email transport, multipart HTML reset email, background sending, and proxy-aware rate limits."""
import json
import logging
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
import httpx

from app.main import app
from app.services.email import (
    ResendEmailTransport,
    SMTPEmailTransport,
    UnconfiguredEmail,
    get_email_transport,
    render_password_reset_email,
)
from app.services.rate_limit import rate_limiter


def test_email_transport_selection_resend_smtp_and_unconfigured(monkeypatch):
    for var in (
        "EMAIL_PROVIDER",
        "RESEND_API_KEY",
        "EMAIL_FROM",
        "EMAIL_REPLY_TO",
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASS",
        "SMTP_FROM",
        "SMTP_USE_TLS",
    ):
        monkeypatch.delenv(var, raising=False)

    assert isinstance(get_email_transport(), UnconfiguredEmail)

    # EMAIL_PROVIDER=resend with key selects ResendEmailTransport
    monkeypatch.setenv("EMAIL_PROVIDER", "resend")
    monkeypatch.setenv("RESEND_API_KEY", "re_test_secret_12345")
    monkeypatch.setenv("EMAIL_FROM", "Matsya <noreply@matsya.app>")
    monkeypatch.setenv("EMAIL_REPLY_TO", "support@matsya.app")
    transport = get_email_transport()
    assert isinstance(transport, ResendEmailTransport)
    assert transport.from_address == "Matsya <noreply@matsya.app>"
    assert transport.reply_to == "support@matsya.app"
    assert transport.timeout == 10.0

    # Missing RESEND_API_KEY falls back to SMTP if configured
    monkeypatch.delenv("RESEND_API_KEY")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.test")
    monkeypatch.setenv("SMTP_USER", "user@matsya.app")
    monkeypatch.setenv("SMTP_PASS", "pw")
    smtp_transport = get_email_transport()
    assert isinstance(smtp_transport, SMTPEmailTransport)
    assert smtp_transport.reply_to == "support@matsya.app"
    assert smtp_transport.timeout == 10.0

    # Default provider (smtp) uses SMTP even if RESEND_API_KEY is present
    monkeypatch.delenv("EMAIL_PROVIDER")
    monkeypatch.setenv("RESEND_API_KEY", "re_test_secret_12345")
    assert isinstance(get_email_transport(), SMTPEmailTransport)


def test_resend_transport_sends_multipart_payload_and_logs_failures_safely(caplog):
    captured = {}

    def fake_post(self, url, *, headers=None, json=None):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        return httpx.Response(200, json={"id": "em_123"}, request=httpx.Request("POST", url))

    transport = ResendEmailTransport(
        api_key="re_super_secret_key",
        from_address="Matsya <noreply@matsya.app>",
        reply_to="support@matsya.app",
    )

    with patch.object(httpx.Client, "post", fake_post):
        delivery = transport.send(
            "captain@example.com",
            "Matsya Password Reset Code",
            "Plain text code",
            html_body="<p>HTML code</p>",
        )

    assert delivery.status == "sent"
    assert delivery.provider == "resend"
    assert delivery.status_code == 200
    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Authorization"] == "Bearer re_super_secret_key"
    assert captured["json"] == {
        "from": "Matsya <noreply@matsya.app>",
        "to": ["captain@example.com"],
        "subject": "Matsya Password Reset Code",
        "text": "Plain text code",
        "html": "<p>HTML code</p>",
        "reply_to": "support@matsya.app",
    }

    # HTTP 422 failure logs structured warning without secret or recipient address
    def fake_fail_post(self, url, *, headers=None, json=None):
        return httpx.Response(422, json={"message": "invalid"}, request=httpx.Request("POST", url))

    caplog.clear()
    with caplog.at_level(logging.WARNING, logger="app.services.email"):
        with patch.object(httpx.Client, "post", fake_fail_post):
            failed = transport.send("private.user@example.com", "Subj", "Body")

    assert failed.status == "failed"
    assert failed.provider == "resend"
    assert failed.status_code == 422
    assert len(caplog.records) == 1
    msg = caplog.records[0].getMessage()
    assert "re_super_secret_key" not in msg
    assert "private.user@example.com" not in msg
    logged_json = json.loads(msg.split("email_delivery_failed ", 1)[1])
    assert logged_json == {"provider": "resend", "status_code": 422, "error_class": "HTTPStatusError"}


def test_smtp_transport_sends_multipart_with_reply_to_and_logs_failures_safely(caplog):
    sent_messages = []

    class FakeSMTP:
        def __init__(self, host, port, timeout=10.0):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def starttls(self):
            pass

        def login(self, user, password):
            pass

        def send_message(self, msg):
            sent_messages.append(msg)

    transport = SMTPEmailTransport(
        host="smtp.example.test",
        port=587,
        username="user",
        password="smtp_secret_password",
        from_address="Matsya <noreply@matsya.app>",
        reply_to="support@matsya.app",
    )

    with patch("smtplib.SMTP", FakeSMTP):
        res = transport.send(
            "fisher@example.com",
            "Matsya Password Reset Code",
            "Plain body",
            html_body="<table><tr><td>HTML body</td></tr></table>",
        )

    assert res.status == "sent"
    assert len(sent_messages) == 1
    mime_msg = sent_messages[0]
    assert mime_msg["Reply-To"] == "support@matsya.app"
    assert mime_msg["From"] == "Matsya <noreply@matsya.app>"
    assert mime_msg.is_multipart()
    parts = {part.get_content_type(): part.get_content() for part in mime_msg.iter_parts()}
    assert "text/plain" in parts
    assert "text/html" in parts
    assert "Plain body" in parts["text/plain"]
    assert "HTML body" in parts["text/html"]

    # Structured error log hides password and recipient
    caplog.clear()
    with caplog.at_level(logging.WARNING, logger="app.services.email"):
        with patch("smtplib.SMTP", side_effect=TimeoutError("timed out")):
            failed = transport.send("secret.recipient@example.com", "Subj", "Body")
    assert failed.status == "failed"
    assert failed.provider == "smtp"
    msg = caplog.records[0].getMessage()
    assert "smtp_secret_password" not in msg
    assert "secret.recipient@example.com" not in msg
    logged_json = json.loads(msg.split("email_delivery_failed ", 1)[1])
    assert logged_json == {"provider": "smtp", "status_code": None, "error_class": "TimeoutError"}


def test_render_password_reset_email_branding_and_no_remote_images():
    subject, text_body, html_body = render_password_reset_email("CODE-XYZ-987654", expiry_minutes=15)
    assert subject == "Matsya Password Reset Code"
    assert "CODE-XYZ-987654" in text_body
    assert "15 minutes" in text_body
    assert "ignore" in text_body.lower()

    assert "Matsya" in html_body
    assert "#2FB5A3" in html_body
    assert "#12232B" in html_body
    assert "#F2FAF8" in html_body
    assert "<table" in html_body
    assert "<img" not in html_body.lower()
    assert "http://" not in html_body.lower()
    assert "https://" not in html_body.lower()
    assert "CODE-XYZ-987654" in html_body
    assert "15 minutes" in html_body
    assert "ignore" in html_body.lower()


def test_forgot_password_background_multipart_and_per_recipient_and_proxy_ip_limits():
    rate_limiter.clear()
    unauth = TestClient(app)
    user_email = f"reset-limit-{uuid.uuid4().hex[:8]}@example.com"
    reg = unauth.post(
        "/api/auth/register",
        json={"name": "Captain Test", "email": user_email, "password": "InitialPassword!2026"},
    )
    assert reg.status_code == 200

    sent = []

    class CaptureTransport:
        def send(self, to_address, subject, body, html_body=None, reply_to=None):
            sent.append((to_address, subject, body, html_body, reply_to))

    with (
        patch("app.services.email.is_email_configured", return_value=True),
        patch("app.services.email.get_email_transport", return_value=CaptureTransport()),
    ):
        # 3 requests across distinct forwarded IPs succeed for the same normalized email
        for idx, variant in enumerate((user_email, user_email.upper(), f"  {user_email}  "), start=1):
            r = unauth.post(
                "/api/auth/forgot-password",
                json={"email_or_phone": variant},
                headers={"X-Forwarded-For": f"198.51.100.{idx}, 10.0.0.1"},
            )
            assert r.status_code == 200
            assert r.json() == {
                "status": "ok",
                "message": "If a matching account exists, password reset instructions have been sent.",
            }

        assert len(sent) == 3
        assert sent[0][3] and "#2FB5A3" in sent[0][3]

        # 4th request for the same normalized email hits per-recipient limit (3 / 15 min) even from a fresh IP
        r4 = unauth.post(
            "/api/auth/forgot-password",
            json={"email_or_phone": user_email},
            headers={"X-Forwarded-For": "198.51.100.99"},
        )
        assert r4.status_code == 429
        assert len(sent) == 3

        # Non-existent email hits the exact same 3/15min limit without leaking existence
        for idx in range(3):
            r_unknown = unauth.post(
                "/api/auth/forgot-password",
                json={"email_or_phone": "ghost-user@example.com"},
                headers={"X-Forwarded-For": f"203.0.113.{idx + 1}"},
            )
            assert r_unknown.status_code == 200
            assert r_unknown.json() == {
                "status": "ok",
                "message": "If a matching account exists, password reset instructions have been sent.",
            }
        r_unknown_4 = unauth.post(
            "/api/auth/forgot-password",
            json={"email_or_phone": "GHOST-USER@example.com"},
            headers={"X-Forwarded-For": "203.0.113.50"},
        )
        assert r_unknown_4.status_code == 429
        # No extra emails sent for non-existent user
        assert len(sent) == 3

        # Proxy IP rate limit (5 / 5 min) isolates separate X-Forwarded-For IPs
        for idx in range(5):
            r_ip = unauth.post(
                "/api/auth/forgot-password",
                json={"email_or_phone": f"unique-{idx}@example.com"},
                headers={"X-Forwarded-For": "192.0.2.77"},
            )
            assert r_ip.status_code == 200
        r_ip_6 = unauth.post(
            "/api/auth/forgot-password",
            json={"email_or_phone": "unique-6@example.com"},
            headers={"X-Forwarded-For": "192.0.2.77"},
        )
        assert r_ip_6.status_code == 429
        # Another client IP is not blocked by 192.0.2.77's bucket
        r_other_ip = unauth.post(
            "/api/auth/forgot-password",
            json={"email_or_phone": "unique-7@example.com"},
            headers={"X-Forwarded-For": "192.0.2.88"},
        )
        assert r_other_ip.status_code == 200

    rate_limiter.clear()
