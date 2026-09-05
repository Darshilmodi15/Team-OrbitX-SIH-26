import threading
import time
from collections import defaultdict, deque
from fastapi import HTTPException, status

class FixedWindowRateLimiter:
    """Small per-process guard; production edge throttling remains recommended."""
    def __init__(self):
        self._events = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, scope: str, subject: str, limit: int, window_seconds: int = 60) -> None:
        now = time.monotonic(); key = (scope, subject)
        with self._lock:
            events = self._events[key]
            while events and events[0] <= now - window_seconds: events.popleft()
            if len(events) >= limit:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Please retry later.")
            events.append(now)

    def clear(self) -> None:
        with self._lock: self._events.clear()

rate_limiter = FixedWindowRateLimiter()
