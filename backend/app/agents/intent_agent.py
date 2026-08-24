"""Intent classification agent for ORCA Marine AI."""
import json
import os
from typing import Any, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are an intent classification assistant for ORCA Marine AI.
Classify the user's question into one of the following intent types:
- "safety_check"
- "nearest_pfz"
- "weather_conditions"
- "general"

Extract any mentioned location as "location_hint" or null if no location is mentioned.

Respond ONLY with valid JSON in the form:
{"intent": "<type>", "location_hint": "<any location mentioned or null>"}"""

VALID_INTENTS = {"safety_check", "nearest_pfz", "weather_conditions", "general"}


def _fallback_intent(question: str) -> Dict[str, Any]:
    """Heuristic fallback for intent classification if API key is not provided or call fails."""
    q_lower = question.lower()
    if any(k in q_lower for k in ["safe", "safety", "risk", "danger", "hazard", "can i sail", "can i fish", "ok to go"]):
        return {"intent": "safety_check", "location_hint": None}
    elif any(k in q_lower for k in ["pfz", "fishing zone", "fish zone", "nearest fish", "catch fish", "tuna", "mackerel"]):
        return {"intent": "nearest_pfz", "location_hint": None}
    elif any(k in q_lower for k in ["weather", "wind", "wave", "forecast", "temp", "rain", "storm", "sea condition"]):
        return {"intent": "weather_conditions", "location_hint": None}
    return {"intent": "general", "location_hint": None}


def _clean_json_text(raw_text: str) -> str:
    raw_text = raw_text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[len("```json"):].strip()
    if raw_text.startswith("```"):
        raw_text = raw_text[len("```"):].strip()
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3].strip()
    return raw_text


def parse_intent(question: str) -> Dict[str, Any]:
    """
    Classifies the user's question into an intent type using Gemini or Anthropic API.
    
    Intent types:
    - 'safety_check'
    - 'nearest_pfz'
    - 'weather_conditions'
    - 'general'
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    # 1. Try Gemini API if GEMINI_API_KEY is available
    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            for model_name in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"]:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=question,
                        config={"system_instruction": SYSTEM_PROMPT},
                    )
                    raw_text = _clean_json_text(response.text)
                    data = json.loads(raw_text)
                    intent = data.get("intent", "general")
                    if intent not in VALID_INTENTS:
                        intent = "general"
                    return {
                        "intent": intent,
                        "location_hint": data.get("location_hint") or None,
                    }
                except Exception:
                    continue
        except Exception:
            pass


    # 2. Try Anthropic API if ANTHROPIC_API_KEY is available
    if anthropic_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=256,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": question}],
            )
            content_text = "".join(
                block.text if hasattr(block, "text") else str(block)
                for block in response.content
            )
            raw_text = _clean_json_text(content_text)
            data = json.loads(raw_text)
            intent = data.get("intent", "general")
            if intent not in VALID_INTENTS:
                intent = "general"
            return {
                "intent": intent,
                "location_hint": data.get("location_hint") or None,
            }
        except Exception:
            pass

    # 3. Heuristic fallback
    return _fallback_intent(question)
