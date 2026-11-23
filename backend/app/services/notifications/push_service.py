"""Web Push subscription store and VAPID configuration status."""
import logging
import os
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from app.db.models import PushSubscriptionRecord
from app.db.session import get_db_context

logger = logging.getLogger(__name__)


def get_vapid_public_key() -> Optional[str]:
    val = os.getenv("VAPID_PUBLIC_KEY", "").strip()
    return val or None


def is_push_configured() -> bool:
    pub = get_vapid_public_key()
    priv = os.getenv("VAPID_PRIVATE_KEY", "").strip()
    return bool(pub and priv)


def get_push_config_status() -> Dict[str, Any]:
    pub = get_vapid_public_key()
    return {
        "configured": is_push_configured(),
        "vapid_public_key": pub,
        "subject": os.getenv("VAPID_SUBJECT", "mailto:support@matsya.app"),
    }


def _validate_endpoint(endpoint: str) -> str:
    cleaned = endpoint.strip()
    parsed = urlparse(cleaned)
    is_local_dev = parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}
    if parsed.scheme != "https" and not is_local_dev:
        raise ValueError("Push endpoint must use HTTPS.")
    if not parsed.netloc or len(cleaned) > 1024:
        raise ValueError("Invalid push subscription endpoint.")
    return cleaned


def save_push_subscription(
    user_id: str,
    endpoint: str,
    p256dh: str,
    auth: str,
    user_agent: str = "",
) -> Dict[str, Any]:
    clean_endpoint = _validate_endpoint(endpoint)
    if not p256dh.strip() or not auth.strip():
        raise ValueError("Missing push encryption keys.")
    if not re.fullmatch(r"[A-Za-z0-9_+/=-]{16,255}", p256dh.strip()):
        raise ValueError("Invalid p256dh key format.")
    if not re.fullmatch(r"[A-Za-z0-9_+/=-]{8,255}", auth.strip()):
        raise ValueError("Invalid auth secret format.")

    with get_db_context() as db:
        existing = db.query(PushSubscriptionRecord).filter(
            PushSubscriptionRecord.endpoint == clean_endpoint
        ).first()
        if existing:
            existing.user_id = user_id
            existing.p256dh = p256dh.strip()
            existing.auth = auth.strip()
            existing.user_agent = user_agent[:512] if user_agent else None
            db.flush()
            return {"id": existing.id, "endpoint": existing.endpoint, "status": "updated"}

        rec = PushSubscriptionRecord(
            user_id=user_id,
            endpoint=clean_endpoint,
            p256dh=p256dh.strip(),
            auth=auth.strip(),
            user_agent=user_agent[:512] if user_agent else None,
        )
        db.add(rec)
        db.flush()
        return {"id": rec.id, "endpoint": rec.endpoint, "status": "subscribed"}


def delete_push_subscription(user_id: str, endpoint: str) -> bool:
    clean_endpoint = endpoint.strip()
    with get_db_context() as db:
        deleted = (
            db.query(PushSubscriptionRecord)
            .filter(
                PushSubscriptionRecord.user_id == user_id,
                PushSubscriptionRecord.endpoint == clean_endpoint,
            )
            .delete(synchronize_session=False)
        )
        return deleted > 0


def list_push_subscriptions(user_id: str) -> List[Dict[str, Any]]:
    with get_db_context() as db:
        rows = (
            db.query(PushSubscriptionRecord)
            .filter(PushSubscriptionRecord.user_id == user_id)
            .order_by(PushSubscriptionRecord.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "endpoint": r.endpoint,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
