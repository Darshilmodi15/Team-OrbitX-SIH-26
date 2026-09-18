"""Future near-shore cellular transport contract. No gateway is configured."""
from typing import Protocol
from dataclasses import dataclass

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
