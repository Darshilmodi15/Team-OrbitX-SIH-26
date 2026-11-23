import threading
import time
from collections import OrderedDict, deque
from fastapi import HTTPException, status


class FixedWindowRateLimiter:
    """Small per-process guard; production edge throttling remains recommended."""

    def __init__(self, max_keys: int = 5000):
        self._events: OrderedDict[tuple[str, str], deque[float]] = OrderedDict()
        self._max_keys = max_keys
        self._lock = threading.Lock()

    def check(self, scope: str, subject: str, limit: int, window_seconds: int = 60) -> None:
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


rate_limiter = FixedWindowRateLimiter()
