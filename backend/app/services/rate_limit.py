"""Rate limiter with optional shared Redis backing and thread-safe in-memory fallback."""
from collections import OrderedDict, deque
import logging
import os
import threading
import time
from typing import Any, Optional
from fastapi import HTTPException, status

from app.services.redis_utils import normalize_redis_url

logger = logging.getLogger(__name__)

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class FixedWindowRateLimiter:
    """Shared fixed-window rate limiter (Redis when configured, in-memory fallback otherwise)."""

    def __init__(self, max_keys: int = 5000, redis_url: Optional[str] = None):
        self._events: OrderedDict[tuple[str, str], deque[float]] = OrderedDict()
        self._max_keys = max_keys
        self._lock = threading.Lock()
        self._redis_client: Optional[Any] = None

        raw_url = redis_url if redis_url is not None else (os.getenv("REDIS_URL") or os.getenv("KEY_VALUE_URL") or "")
        target_url = normalize_redis_url(raw_url)
        if REDIS_AVAILABLE and target_url:
            try:
                client = redis.Redis.from_url(
                    target_url,
                    decode_responses=True,
                    socket_timeout=1.5,
                    socket_connect_timeout=1.5,
                )
                client.ping()
                self._redis_client = client
                logger.info("Connected rate limiter to shared Redis store.")
            except Exception as exc:
                logger.warning("Redis rate limiter unavailable (%s); using in-memory store.", type(exc).__name__)
                self._redis_client = None

    def check(self, scope: str, subject: str, limit: int, window_seconds: int = 60) -> None:
        if self._redis_client is not None:
            try:
                bucket = int(time.time() // max(1, window_seconds))
                rkey = f"orca:rl:{scope}:{subject}:{bucket}"
                pipe = self._redis_client.pipeline()
                pipe.incr(rkey, 1)
                pipe.expire(rkey, max(1, window_seconds) + 5)
                count, _ = pipe.execute()
                if int(count) > limit:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many requests. Please retry later.",
                    )
                return
            except HTTPException:
                raise
            except Exception as exc:
                logger.warning("Redis rate-limit check failed (%s); falling back to memory.", type(exc).__name__)

        now = time.monotonic()
        key = (scope, subject)
        cutoff = now - window_seconds
        with self._lock:
            events = self._events.get(key)
            if events is None:
                events = deque()
                self._events[key] = events
            else:
                self._events.move_to_end(key)
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please retry later.",
                )
            events.append(now)
            while len(self._events) > self._max_keys:
                self._events.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._events.clear()
        if self._redis_client is not None:
            try:
                for k in self._redis_client.scan_iter(match="orca:rl:*", count=500):
                    self._redis_client.delete(k)
            except Exception as exc:
                logger.warning("Redis rate-limit clear skipped: %s", type(exc).__name__)


rate_limiter = FixedWindowRateLimiter()
