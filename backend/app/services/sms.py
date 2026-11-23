"""Near-shore SMS transport contract and env-configured provider adapters.

Default behavior when no provider keys are configured remains UnconfiguredSMS
so missing gateway credentials never fabricate successful message delivery.
"""
from dataclasses import dataclass
import logging
import os
from typing import Protocol
import httpx

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SMSDelivery:
    status: str
    provider_reference: str | None = None
    reason: str | None = None


class SMSTransport(Protocol):
    def send(self, destination: str, message: str) -> SMSDelivery: ...


class UnconfiguredSMS:
    def send(self, destination: str, message: str) -> SMSDelivery:
        return SMSDelivery("not_sent", reason="No SMS gateway configured; cellular service required")


class TwilioSMSTransport:
    """SMS adapter backed by Twilio REST API."""

    def __init__(self, account_sid: str, auth_token: str, from_number: str, timeout: float = 8.0):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number
        self.timeout = timeout

    def send(self, destination: str, message: str) -> SMSDelivery:
        dest = destination.strip()
        if not dest:
            return SMSDelivery("failed", reason="EMPTY_DESTINATION")
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        try:
            with httpx.Client(timeout=self.timeout, verify=True) as client:
                resp = client.post(
                    url,
                    auth=(self.account_sid, self.auth_token),
                    data={"To": dest, "From": self.from_number, "Body": message[:1500]},
                )
            if 200 <= resp.status_code < 300:
                payload = resp.json() if resp.content else {}
                return SMSDelivery("sent", provider_reference=payload.get("sid"), reason="twilio")
            return SMSDelivery("failed", reason=f"TWILIO_HTTP_{resp.status_code}")
        except Exception as exc:
            logger.warning("Twilio SMS dispatch failed: %s", type(exc).__name__)
            return SMSDelivery("failed", reason=type(exc).__name__)


class MSG91SMSTransport:
    """SMS adapter backed by MSG91 v5 API (popular across Indian maritime/gov stacks)."""

    def __init__(self, auth_key: str, sender_id: str, template_id: str = "", timeout: float = 8.0):
        self.auth_key = auth_key
        self.sender_id = sender_id
        self.template_id = template_id
        self.timeout = timeout

    def send(self, destination: str, message: str) -> SMSDelivery:
        dest = destination.strip().lstrip("+")
        if not dest:
            return SMSDelivery("failed", reason="EMPTY_DESTINATION")
        headers = {"authkey": self.auth_key, "Content-Type": "application/json"}
        if self.template_id:
            url = "https://control.msg91.com/api/v5/flow/"
            body = {
                "template_id": self.template_id,
                "sender": self.sender_id or "ORCAMR",
                "short_url": "0",
                "recipients": [{"mobiles": dest, "message": message[:1000]}],
            }
        else:
            url = "https://api.msg91.com/api/v2/sendsms"
            body = {
                "sender": self.sender_id or "ORCAMR",
                "route": "4",
                "country": "91",
                "sms": [{"message": message[:1000], "to": [dest]}],
            }
        try:
            with httpx.Client(timeout=self.timeout, verify=True) as client:
                resp = client.post(url, headers=headers, json=body)
            if 200 <= resp.status_code < 300:
                payload = resp.json() if resp.content else {}
                ref = payload.get("request_id") or payload.get("message")
                return SMSDelivery("sent", provider_reference=str(ref) if ref else None, reason="msg91")
            return SMSDelivery("failed", reason=f"MSG91_HTTP_{resp.status_code}")
        except Exception as exc:
            logger.warning("MSG91 SMS dispatch failed: %s", type(exc).__name__)
            return SMSDelivery("failed", reason=type(exc).__name__)


class WebhookSMSTransport:
    """Generic HTTP JSON webhook transport for custom NIC / NICSI / local SMS gateways."""

    def __init__(self, url: str, bearer_token: str = "", timeout: float = 8.0):
        self.url = url
        self.bearer_token = bearer_token
        self.timeout = timeout

    def send(self, destination: str, message: str) -> SMSDelivery:
        dest = destination.strip()
        if not dest:
            return SMSDelivery("failed", reason="EMPTY_DESTINATION")
        headers = {"Content-Type": "application/json"}
        if self.bearer_token:
            headers["Authorization"] = f"Bearer {self.bearer_token}"
        try:
            with httpx.Client(timeout=self.timeout, verify=True) as client:
                resp = client.post(self.url, headers=headers, json={"to": dest, "body": message[:1500]})
            if 200 <= resp.status_code < 300:
                payload = resp.json() if resp.content else {}
                return SMSDelivery("sent", provider_reference=payload.get("id"), reason="webhook")
            return SMSDelivery("failed", reason=f"WEBHOOK_HTTP_{resp.status_code}")
        except Exception as exc:
            logger.warning("Webhook SMS dispatch failed: %s", type(exc).__name__)
            return SMSDelivery("failed", reason=type(exc).__name__)


def get_sms_transport() -> SMSTransport:
    """Returns configured SMS gateway transport or UnconfiguredSMS when unset."""
    sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_num = os.getenv("TWILIO_FROM_NUMBER", "").strip()
    if sid and token and from_num:
        return TwilioSMSTransport(sid, token, from_num)

    msg91_key = os.getenv("MSG91_AUTH_KEY", "").strip()
    msg91_sender = os.getenv("MSG91_SENDER_ID", "").strip()
    msg91_tpl = os.getenv("MSG91_TEMPLATE_ID", "").strip()
    if msg91_key and (msg91_sender or msg91_tpl):
        return MSG91SMSTransport(msg91_key, msg91_sender, msg91_tpl)

    webhook_url = os.getenv("SMS_WEBHOOK_URL", "").strip()
    if webhook_url:
        return WebhookSMSTransport(webhook_url, os.getenv("SMS_WEBHOOK_TOKEN", "").strip())

    return UnconfiguredSMS()


def is_sms_configured() -> bool:
    return not isinstance(get_sms_transport(), UnconfiguredSMS)
