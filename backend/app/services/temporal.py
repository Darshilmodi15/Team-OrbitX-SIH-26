"""
Temporal resolution and forecast verification service for ORCA Marine AI.

Translates human time references (e.g. 'tomorrow morning', 'kale savare', 'kal subah')
and query parameters into authoritative IST/UTC time windows, selects valid forecast
timesteps, and verifies that returned model predictions actually match the requested timeframe.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import date as dt_date, datetime, time as dt_time, timedelta, timezone
import re
from typing import Any, Dict, List, Optional, Tuple

IST = timezone(timedelta(hours=5, minutes=30))
UTC = timezone.utc


@dataclass
class TemporalResolution:
    """Represents a resolved operational time window."""
    target_date: str                 # "YYYY-MM-DD"
    period: str                      # "morning", "afternoon", "evening", "night", "day", "current"
    time_hint: Optional[str]         # e.g. "tomorrow morning", "tomorrow"
    start_ist: datetime              # IST window start
    end_ist: datetime                # IST window end
    start_utc: datetime              # UTC window start
    end_utc: datetime                # UTC window end
    target_utc: datetime             # Target representative UTC point
    is_future: bool                  # Target is in the future
    is_explicit_future: bool         # Explicitly requested future period
    description: str                 # e.g. "2026-09-10 06:00–12:00 IST (tomorrow morning)"


def resolve_query_time(
    text: str = "",
    request_date: Optional[str] = None,
    base_time: Optional[datetime] = None,
) -> TemporalResolution:
    """
    Resolves natural language temporal hints and date parameters into a structured TemporalResolution.
    Handles Indian regional terms (Gujarati, Hindi, Marathi, Tamil, Telugu) and English.
    """
    now_utc = base_time or datetime.now(UTC)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=UTC)
    now_ist = now_utc.astimezone(IST)
    today_ist = now_ist.date()

    q = (text or "").lower()
    
    # 1. Check relative day references
    target_date = today_ist
    period = "current"
    time_hint = None
    is_explicit_future = False

    # Day after tomorrow
    if any(k in q for k in ["day after tomorrow", "parso", "parva", "parnam"]):
        target_date = today_ist + timedelta(days=2)
        period = "morning"
        time_hint = "day after tomorrow"
        is_explicit_future = True

    # Tomorrow + sub-day periods
    elif any(k in q for k in [
        "tomorrow morning", "kale savare", "kal subah", "udya sakali", "naalai kaalai",
        "repu podduna", "naale ravile", "kaal sokale", "sakal"
    ]):
        target_date = today_ist + timedelta(days=1)
        period = "morning"
        time_hint = "tomorrow morning"
        is_explicit_future = True
    elif any(k in q for k in [
        "tomorrow afternoon", "kale bapore", "kal dopahar", "udya dupari", "naalai madhyanam"
    ]):
        target_date = today_ist + timedelta(days=1)
        period = "afternoon"
        time_hint = "tomorrow afternoon"
        is_explicit_future = True
    elif any(k in q for k in [
        "tomorrow evening", "kale saanje", "kal shaam", "udya sandhyakali", "naalai maalai"
    ]):
        target_date = today_ist + timedelta(days=1)
        period = "evening"
        time_hint = "tomorrow evening"
        is_explicit_future = True
    elif any(k in q for k in [
        "tomorrow night", "kale raatre", "kal raat", "udya ratri"
    ]):
        target_date = today_ist + timedelta(days=1)
        period = "night"
        time_hint = "tomorrow night"
        is_explicit_future = True
    elif any(k in q for k in [
        "tomorrow", "kale", "kal", "udya", "naalai", "repu", "naale", "kaale", "aavtikaale"
    ]):
        target_date = today_ist + timedelta(days=1)
        # Marine operations typically center on morning departure windows
        period = "morning"
        time_hint = "tomorrow"
        is_explicit_future = True

    # Today + sub-day periods
    elif any(k in q for k in ["today morning", "aaje savare", "aaj subah", "aaj sakali"]):
        target_date = today_ist
        period = "morning"
        time_hint = "today morning"
    elif any(k in q for k in ["this afternoon", "afternoon", "bapore", "dopahar"]):
        target_date = today_ist
        period = "afternoon"
        time_hint = "afternoon"
    elif any(k in q for k in ["tonight", "aaje raatre", "aaj raat", "aaj ratri"]):
        target_date = today_ist
        period = "night"
        time_hint = "tonight"
    elif any(k in q for k in ["today", "aaje", "aaj", "aaji", "innaiku", "ee roju", "innu"]):
        target_date = today_ist
        period = "day"
        time_hint = "today"

    # Fallback to request_date parameter if provided
    if request_date and not is_explicit_future:
        try:
            parsed_req = dt_date.fromisoformat(request_date[:10])
            if parsed_req > today_ist:
                target_date = parsed_req
                if period == "current":
                    period = "morning"
                time_hint = f"date:{parsed_req.isoformat()}"
                is_explicit_future = True
            elif parsed_req == today_ist:
                target_date = parsed_req
            else:
                target_date = parsed_req
        except (ValueError, TypeError):
            pass

    # Window definitions in IST
    if period == "morning":
        start_ist_t = dt_time(6, 0)
        end_ist_t = dt_time(12, 0)
        desc_period = "06:00–12:00 IST"
    elif period == "afternoon":
        start_ist_t = dt_time(12, 0)
        end_ist_t = dt_time(18, 0)
        desc_period = "12:00–18:00 IST"
    elif period == "evening":
        start_ist_t = dt_time(18, 0)
        end_ist_t = dt_time(21, 0)
        desc_period = "18:00–21:00 IST"
    elif period == "night":
        start_ist_t = dt_time(21, 0)
        end_ist_t = dt_time(23, 59, 59)
        desc_period = "21:00–24:00 IST"
    elif period == "day":
        start_ist_t = dt_time(6, 0)
        end_ist_t = dt_time(18, 0)
        desc_period = "06:00–18:00 IST"
    else:  # "current"
        start_ist_t = now_ist.time()
        end_ist_t = (now_ist + timedelta(hours=3)).time()
        desc_period = f"{now_ist.strftime('%H:%M')} IST (current)"

    start_ist = datetime.combine(target_date, start_ist_t, tzinfo=IST)
    end_ist = datetime.combine(target_date, end_ist_t, tzinfo=IST)
    start_utc = start_ist.astimezone(UTC)
    end_utc = end_ist.astimezone(UTC)

    # Center target UTC in the operational window
    target_utc = start_utc + (end_utc - start_utc) / 2
    is_future = target_utc > now_utc

    hint_label = f" ({time_hint})" if time_hint else ""
    description = f"{target_date.isoformat()} {desc_period}{hint_label}"

    return TemporalResolution(
        target_date=target_date.isoformat(),
        period=period,
        time_hint=time_hint,
        start_ist=start_ist,
        end_ist=end_ist,
        start_utc=start_utc,
        end_utc=end_utc,
        target_utc=target_utc,
        is_future=is_future,
        is_explicit_future=is_explicit_future,
        description=description,
    )


def verify_forecast_timestamp(
    forecast_time_str: Optional[str],
    temporal_res: TemporalResolution,
) -> Tuple[bool, str]:
    """
    VERIFIES that a returned forecast timestep actually matches the requested operational period.
    Prevents returning today's measurements or historical first-row data when tomorrow was requested.
    """
    if not forecast_time_str:
        return False, "Forecast timestamp is missing or null."

    try:
        dt = datetime.fromisoformat(str(forecast_time_str).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
    except (ValueError, TypeError) as err:
        return False, f"Invalid forecast timestamp format '{forecast_time_str}': {err}"

    dt_ist = dt.astimezone(IST)
    dt_utc = dt.astimezone(UTC)

    if temporal_res.is_explicit_future:
        # Verify date match in IST or UTC
        date_ist = dt_ist.date().isoformat()
        date_utc = dt_utc.date().isoformat()
        if date_ist != temporal_res.target_date and date_utc != temporal_res.target_date:
            return False, (
                f"Returned forecast valid at {forecast_time_str} (IST date: {date_ist}) "
                f"does not match requested target date {temporal_res.target_date}."
            )

        # For sub-day periods (morning, afternoon, etc.), verify proximity within 3 hours of window
        margin = timedelta(hours=3)
        window_start = temporal_res.start_utc - margin
        window_end = temporal_res.end_utc + margin
        if not (window_start <= dt_utc <= window_end):
            return False, (
                f"Forecast valid at {forecast_time_str} ({dt_ist.strftime('%H:%M')} IST) "
                f"is outside the requested {temporal_res.period} window ({temporal_res.description})."
            )

    return True, "OK"
