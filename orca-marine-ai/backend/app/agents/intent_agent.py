"""Intent classification agent for ORCA Marine AI."""
import json
import os
from typing import Any, Dict, Optional
import anthropic
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are an intent classification assistant for ORCA Marine AI.
Classify the user's question into one of the following intent types:
- "safety_check"
- "nearest_pfz"
- "weather_conditions"
- "general"

Extract any mentioned location as "location_hint" or null if no location is mentioned.

Respond ONLY with JSON in the form:
{"intent": "<type>", "location_hint": "<any location mentioned or null>"}"""

VALID_INTENTS = {"safety_check", "nearest_pfz", "weather_conditions", "general"}


def _fallback_intent(question: str) -> Dict[str, Any]:
    """Heuristic fallback for intent classification if API is unavailable."""
    q_lower = question.lower()
    if any(k in q_lower for k in ["safe", "safety", "risk", "danger", "hazard", "can i sail", "can i fish", "ok to go"]):
        return {"intent": "safety_check", "location_hint": None}
    elif any(k in q_lower for k in ["pfz", "fishing zone", "fish zone", "nearest fish", "catch fish", "tuna", "mackerel"]):
        return {"intent": "nearest_pfz", "location_hint": None}
    elif any(k in q_lower for k in ["weather", "wind", "wave", "forecast", "temp", "rain", "storm", "sea condition"]):
        return {"intent": "weather_conditions", "location_hint": None}
    return {"intent": "general", "location_hint": None}


def parse_intent(question: str) -> Dict[str, Any]:
    """
    Classifies the user's question into an intent type using the Anthropic API.
    
    Intent types:
    - 'safety_check'
    - 'nearest_pfz'
    - 'weather_conditions'
    - 'general'
    
    Returns a dictionary with 'intent' and 'location_hint'.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback_intent(question)

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=256,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": question}
            ],
        )

        content_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                content_text += block.text
            elif isinstance(block, dict) and "text" in block:
                content_text += block["text"]
            elif isinstance(block, str):
                content_text += block

        raw_text = content_text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[len("```json"):].strip()
        if raw_text.startswith("```"):
            raw_text = raw_text[len("```"):].strip()
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3].strip()

        data = json.loads(raw_text)
        intent = data.get("intent", "general")
        if intent not in VALID_INTENTS:
            intent = "general"
        location_hint = data.get("location_hint")
        return {
            "intent": intent,
            "location_hint": location_hint if location_hint else None,
        }
    except Exception:
        return _fallback_intent(question)
