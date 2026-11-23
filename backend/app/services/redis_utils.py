"""Helpers for sanitizing Redis connection URLs read from environment variables."""
import re
from typing import Optional


def normalize_redis_url(raw_url: Optional[str]) -> str:
    """Clean and extract a Redis URL from pasted env strings or CLI snippets."""
    if not raw_url:
        return ""
    cleaned = raw_url.strip().strip('"').strip("'").strip()
    if not cleaned or cleaned.lower() in {"none", "null", "undefined", "false", '""', "''"}:
        return ""
    match = re.search(r'(rediss?://[^\s"\']+|unix://[^\s"\']+)', cleaned)
    if match:
        return match.group(1)
    return cleaned
