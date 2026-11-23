"""Email transport contract, Resend HTTPS API adapter, SMTP fallback, and branded templates."""
from dataclasses import dataclass
from email.message import EmailMessage
import html
import json
import logging
import os
import smtplib
from typing import Any, Protocol
import httpx

from app.core.brand import APP_NAME, POWERED_BY

logger = logging.getLogger(__name__)

RESEND_EMAILS_URL = "https://api.resend.com/emails"
DEFAULT_EMAIL_FROM = f"{APP_NAME} <noreply@matsya.app>"
DEFAULT_EMAIL_TIMEOUT = 10.0


@dataclass(frozen=True)
class EmailDelivery:
    status: str
    reason: str | None = None
    provider: str | None = None
    status_code: int | None = None


class EmailTransport(Protocol):
    def send(
        self,
        to_address: str,
        subject: str,
        body: str,
        html_body: str | None = None,
        reply_to: str | None = None,
    ) -> EmailDelivery: ...


def _log_delivery_failure(provider: str, status_code: int | None, error_class: str) -> None:
    """Emit a structured failure warning without secrets or recipient addresses."""
    payload = {
        "provider": provider,
        "status_code": status_code,
        "error_class": error_class,
    }
    logger.warning("email_delivery_failed %s", json.dumps(payload, separators=(",", ":")))


class UnconfiguredEmail:
    def send(
        self,
        to_address: str,
        subject: str,
        body: str,
        html_body: str | None = None,
        reply_to: str | None = None,
    ) -> EmailDelivery:
        return EmailDelivery("not_sent", reason="No email gateway configured", provider="none")


class ResendEmailTransport:
    """HTTPS API email adapter backed by Resend (uses port 443, compatible with Render free tier)."""

    def __init__(
        self,
        api_key: str,
        from_address: str,
        reply_to: str = "",
        timeout: float = DEFAULT_EMAIL_TIMEOUT,
    ):
        self.api_key = api_key
        self.from_address = from_address
        self.reply_to = reply_to
        self.timeout = timeout

    def send(
        self,
        to_address: str,
        subject: str,
        body: str,
        html_body: str | None = None,
        reply_to: str | None = None,
    ) -> EmailDelivery:
        recipient = to_address.strip()
        if not recipient:
            _log_delivery_failure("resend", None, "EmptyRecipient")
            return EmailDelivery("failed", reason="EMPTY_RECIPIENT", provider="resend")

        payload: dict[str, Any] = {
            "from": self.from_address,
            "to": [recipient],
            "subject": subject,
            "text": body,
        }
        if html_body:
            payload["html"] = html_body
        effective_reply_to = (reply_to if reply_to is not None else self.reply_to).strip()
        if effective_reply_to:
            payload["reply_to"] = effective_reply_to

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=self.timeout, verify=True) as client:
                resp = client.post(RESEND_EMAILS_URL, headers=headers, json=payload)
            if 200 <= resp.status_code < 300:
                return EmailDelivery("sent", reason="resend", provider="resend", status_code=resp.status_code)
            _log_delivery_failure("resend", resp.status_code, "HTTPStatusError")
            return EmailDelivery(
                "failed",
                reason=f"RESEND_HTTP_{resp.status_code}",
                provider="resend",
                status_code=resp.status_code,
            )
        except Exception as exc:
            _log_delivery_failure("resend", None, type(exc).__name__)
            return EmailDelivery("failed", reason=type(exc).__name__, provider="resend")


class SMTPEmailTransport:
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        from_address: str,
        use_tls: bool = True,
        reply_to: str = "",
        timeout: float = DEFAULT_EMAIL_TIMEOUT,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.from_address = from_address
        self.use_tls = use_tls
        self.reply_to = reply_to
        self.timeout = timeout

    def send(
        self,
        to_address: str,
        subject: str,
        body: str,
        html_body: str | None = None,
        reply_to: str | None = None,
    ) -> EmailDelivery:
        recipient = to_address.strip()
        if not recipient:
            _log_delivery_failure("smtp", None, "EmptyRecipient")
            return EmailDelivery("failed", reason="EMPTY_RECIPIENT", provider="smtp")

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = self.from_address
        msg["To"] = recipient
        effective_reply_to = (reply_to if reply_to is not None else self.reply_to).strip()
        if effective_reply_to:
            msg["Reply-To"] = effective_reply_to
        msg.set_content(body)
        if html_body:
            msg.add_alternative(html_body, subtype="html")

        try:
            with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.send_message(msg)
            return EmailDelivery("sent", reason="smtp", provider="smtp", status_code=250)
        except Exception as exc:
            smtp_code = getattr(exc, "smtp_code", None)
            status_code = smtp_code if isinstance(smtp_code, int) else None
            _log_delivery_failure("smtp", status_code, type(exc).__name__)
            return EmailDelivery("failed", reason=type(exc).__name__, provider="smtp", status_code=status_code)


def render_password_reset_email(raw_token: str, expiry_minutes: int = 15) -> tuple[str, str, str]:
    """Build subject, plain-text body, and branded table-based HTML (no remote images) for password resets."""
    subject = f"{APP_NAME} Password Reset Code"
    text_body = (
        f"Use this single-use reset code within {expiry_minutes} minutes to reset your {APP_NAME} password. "
        f"If you did not request this, you can safely ignore this email.\n\n"
        f"{raw_token}\n"
    )
    safe_token = html.escape(raw_token)
    safe_app = html.escape(APP_NAME)
    safe_powered = html.escape(POWERED_BY)
    html_body = f"""<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#F2FAF8;color:#12232B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F2FAF8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid #D5ECE6;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#2FB5A3;padding:20px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:0.3px;">{safe_app}</td>
                  </tr>
                  <tr>
                    <td style="padding-top:2px;font-size:12px;color:#E8FAF6;">{safe_powered}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 12px 0;font-size:18px;font-weight:700;color:#12232B;">Password reset code</p>
                <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#12232B;">
                  Enter this single-use code in {safe_app} to reset your password. This code expires in <strong>{expiry_minutes} minutes</strong>.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;">
                  <tr>
                    <td align="center" style="background-color:#F2FAF8;border:1px solid #2FB5A3;border-radius:8px;padding:18px 16px;font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;letter-spacing:1.5px;color:#12232B;word-break:break-all;">
                      {safe_token}
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px 0;font-size:13px;line-height:1.5;color:#3B545E;">
                  If you did not request this, you can safely ignore this email. Your password will remain unchanged.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #E2F1ED;padding-top:14px;">
                  <tr>
                    <td style="font-size:12px;color:#55707A;">
                      Need help? Contact <a href="mailto:support@matsya.app" style="color:#2FB5A3;text-decoration:none;font-weight:600;">support@matsya.app</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""
    return subject, text_body, html_body


def get_email_transport() -> EmailTransport:
    provider = os.getenv("EMAIL_PROVIDER", "smtp").strip().lower()
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    email_from = os.getenv("EMAIL_FROM", "").strip()
    reply_to = os.getenv("EMAIL_REPLY_TO", "").strip()

    if provider == "resend" and resend_key:
        sender = email_from or os.getenv("SMTP_FROM", "").strip() or DEFAULT_EMAIL_FROM
        return ResendEmailTransport(
            api_key=resend_key,
            from_address=sender,
            reply_to=reply_to,
            timeout=DEFAULT_EMAIL_TIMEOUT,
        )

    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASS", "").strip()
    sender = email_from or os.getenv("SMTP_FROM", "").strip() or user
    if host and sender:
        port = int(os.getenv("SMTP_PORT", "587") or "587")
        use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() != "false"
        return SMTPEmailTransport(
            host,
            port,
            user,
            password,
            sender,
            use_tls=use_tls,
            reply_to=reply_to,
            timeout=DEFAULT_EMAIL_TIMEOUT,
        )
    return UnconfiguredEmail()


def is_email_configured() -> bool:
    return not isinstance(get_email_transport(), UnconfiguredEmail)
