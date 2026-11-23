"""Email transport contract and SMTP adapter for password resets and alerts."""
from dataclasses import dataclass
from email.message import EmailMessage
import logging
import os
import smtplib
from typing import Protocol

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmailDelivery:
    status: str
    reason: str | None = None


class EmailTransport(Protocol):
    def send(self, to_address: str, subject: str, body: str) -> EmailDelivery: ...


class UnconfiguredEmail:
    def send(self, to_address: str, subject: str, body: str) -> EmailDelivery:
        return EmailDelivery("not_sent", reason="No SMTP gateway configured")


class SMTPEmailTransport:
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        from_address: str,
        use_tls: bool = True,
        timeout: float = 10.0,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.from_address = from_address
        self.use_tls = use_tls
        self.timeout = timeout

    def send(self, to_address: str, subject: str, body: str) -> EmailDelivery:
        recipient = to_address.strip()
        if not recipient:
            return EmailDelivery("failed", reason="EMPTY_RECIPIENT")
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = self.from_address
        msg["To"] = recipient
        msg.set_content(body)
        try:
            with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.send_message(msg)
            return EmailDelivery("sent", reason="smtp")
        except Exception as exc:
            logger.warning("SMTP email delivery failed: %s", type(exc).__name__)
            return EmailDelivery("failed", reason=type(exc).__name__)


def get_email_transport() -> EmailTransport:
    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASS", "").strip()
    sender = os.getenv("SMTP_FROM", "").strip() or user
    if host and sender:
        port = int(os.getenv("SMTP_PORT", "587") or "587")
        use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() != "false"
        return SMTPEmailTransport(host, port, user, password, sender, use_tls=use_tls)
    return UnconfiguredEmail()


def is_email_configured() -> bool:
    return not isinstance(get_email_transport(), UnconfiguredEmail)
