"""Bounded, sanitized telemetry from real requests. Health reads never call paid APIs."""
import json
import logging
import threading
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
_lock = threading.RLock()
_recent = {}


def record(provider, *, success, http_status=None, reason=None, data_timestamp=None, mode="live", model=None):
    now = datetime.now(timezone.utc).isoformat()
    # Reasons are controlled codes, never raw provider bodies, URLs or exception text.
    reason = reason if reason and str(reason).replace('_', '').isalnum() else None
    with _lock:
        previous = snapshot(provider)
        value = {**previous, "last_checked": now, "http_status": http_status,
                 "status": "HEALTHY" if success and mode == "live" else "DEGRADED" if success else "DOWN",
                 "last_error_summary": None if success else reason or "PROVIDER_REQUEST_FAILED",
                 "real_data_arriving": success and mode in {"live", "fallback"}, "data_mode": mode,
                 "fallback_in_use": mode == "fallback", "data_timestamp": data_timestamp}
        if model and all(c.isalnum() or c in "-._/" for c in model):
            value["model"] = model
        if success and mode in {"live", "fallback"}:
            value["last_successful_response"] = now
        elif not success:
            value["last_failure"] = now
            value["last_failure_reason"] = reason or "PROVIDER_REQUEST_FAILED"
        _recent[provider] = value
        try:
            from app.db.session import get_db_context
            from app.db.models import SystemSetting
            with get_db_context() as db:
                key = f"provider_health.{provider}"
                row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
                if row is None:
                    row = SystemSetting(key=key, value=json.dumps(value), description="Sanitized provider request telemetry")
                    db.add(row)
                else:
                    row.value = json.dumps(value)
                    row.updated_at = datetime.now(timezone.utc)
        except Exception as exc:
            logger.warning("Provider telemetry persistence failed: %s", type(exc).__name__)


def snapshot(provider):
    value = _recent.get(provider)
    if value is None:
        try:
            from app.db.session import get_db_context
            from app.db.models import SystemSetting
            with get_db_context() as db:
                row = db.query(SystemSetting).filter(SystemSetting.key == f"provider_health.{provider}").first()
                value = json.loads(row.value) if row else None
        except Exception:
            value = None
    result = dict(value or {"status": "UNKNOWN", "last_checked": None, "last_error_summary": "NOT_YET_VERIFIED", "data_mode": "unavailable", "real_data_arriving": False})
    stamp = result.get("data_timestamp") or result.get("last_successful_response")
    if stamp:
        try:
            age = max(0, (datetime.now(timezone.utc) - datetime.fromisoformat(stamp.replace('Z', '+00:00')).replace(tzinfo=timezone.utc)).total_seconds())
            result["data_age_seconds"] = round(age)
            if age > 3600 and result["status"] == "HEALTHY":
                result.update(status="DEGRADED", real_data_arriving=False, data_mode="stale", last_error_summary="STALE_LAST_SUCCESS")
        except (ValueError, TypeError):
            pass
    return result


class ProviderUnavailable(RuntimeError):
    """An actual AI answer is unavailable; never substitute a scripted answer."""
    def __init__(self, reason="AI_PROVIDER_UNAVAILABLE", http_status=None):
        super().__init__(reason)
        self.reason = reason
        self.http_status = http_status


def failure_reason(error):
    status = getattr(error, "code", None)
    if status == 429:
        payload = getattr(error, "response_json", None) or getattr(error, "details", {}) or {}
        details = payload.get("error", payload).get("details", []) if isinstance(payload, dict) else []
        ids = [v.get("quotaId", "") for d in details for v in d.get("violations", [])]
        if any("PerDay" in q for q in ids): return "DAILY_QUOTA_EXHAUSTED"
        if any("PerMinute" in q for q in ids): return "RATE_LIMITED"
        return "RATE_LIMIT_OR_QUOTA"
    if status in (401, 403): return "AUTH_FAILED"
    if status == 404: return "MODEL_NOT_FOUND"
    if status == 400: return "MALFORMED_REQUEST"
    if isinstance(status, int) and status >= 500: return "PROVIDER_OUTAGE"
    if "timeout" in type(error).__name__.lower(): return "TIMEOUT"
    if isinstance(error, ImportError): return "SDK_IMPORT_ERROR"
    return "UPSTREAM_REQUEST_FAILED"
