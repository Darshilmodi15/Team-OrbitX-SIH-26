"""Single source of truth for Matsya brand constants, domain config, and localized chatbot personas."""
import os
from typing import Dict, Optional

APP_NAME = "Matsya"
ENGINE_NAME = "ORCA"
ENGINE_FULL_NAME = "ORCA - Marine EcOsystem Reasoning with Collaborative Agents"
TAGLINE = "Matsya, powered by ORCA"
POWERED_BY = "powered by ORCA"

DEFAULT_PUBLIC_BASE_URL = "https://matsya.app"

DEMO_FISHERMAN_EMAIL = "fisherman@matsya.app"
DEMO_OFFICER_EMAIL = "officer@fisheries.gov.in"
DEMO_ADMIN_EMAIL = "admin@matsya.app"


def get_public_base_url() -> str:
    """Return configured public base URL (defaults to https://matsya.app)."""
    raw = os.getenv("PUBLIC_BASE_URL", "").strip().strip('"').strip("'").rstrip("/")
    return raw or DEFAULT_PUBLIC_BASE_URL


DEFAULT_ASSISTANT_PERSONA: Dict[str, str] = {
    "latin": "Sagar Mitra",
    "native": "सागर मित्र",
    "display": "Sagar Mitra",
    "prompt_name": "Sagar Mitra",
}

# Localized chatbot persona names keyed strictly by user preferred_language (pending native-speaker review).
ASSISTANT_PERSONAS: Dict[str, Dict[str, str]] = {
    "gu": {
        "latin": "Nakhuda",
        "native": "નાખુદા",
        "display": "નાખુદા",
        "prompt_name": "Nakhuda (નાખુદા)",
    },
    "mr": {
        "latin": "Daryasarang",
        "native": "दर्यासारंग",
        "display": "दर्यासारंग",
        "prompt_name": "Daryasarang (दर्यासारंग)",
    },
    "kn": {
        "latin": "Ambiga",
        "native": "ಅಂಬಿಗ",
        "display": "ಅಂಬಿಗ",
        "prompt_name": "Ambiga (ಅಂಬಿಗ)",
    },
    "ml": {
        "latin": "Kappithan",
        "native": "കപ്പിത്താൻ",
        "display": "കപ്പിത്താൻ",
        "prompt_name": "Kappithan (കപ്പിത്താൻ)",
    },
    "ta": {
        "latin": "Kadal Thunai",
        "native": "கடல் துணை",
        "display": "கடல் துணை",
        "prompt_name": "Kadal Thunai (கடல் துணை)",
    },
    "bn": {
        "latin": "Majhi",
        "native": "মাঝি",
        "display": "মাঝি",
        "prompt_name": "Majhi (মাঝি)",
    },
    "or": {
        "latin": "Majhi",
        "native": "ମାଝି",
        "display": "ମାଝି",
        "prompt_name": "Majhi (ମାଝି)",
    },
    "hi": {
        "latin": "Sagar Mitra",
        "native": "सागर मित्र",
        "display": "सागर मित्र",
        "prompt_name": "Sagar Mitra (सागर मित्र)",
    },
    "te": {
        "latin": "Sagar Mitra",
        "native": "सागर मित्र",
        "display": "Sagar Mitra",
        "prompt_name": "Sagar Mitra",
    },
    "en": {
        "latin": "Sagar Mitra",
        "native": "सागर मित्र",
        "display": "Sagar Mitra",
        "prompt_name": "Sagar Mitra",
    },
    "pa": {
        "latin": "Sagar Mitra",
        "native": "सागर मित्र",
        "display": "Sagar Mitra",
        "prompt_name": "Sagar Mitra",
    },
}


def get_assistant_persona(language: Optional[str]) -> Dict[str, str]:
    """Resolve the localized chatbot persona for a language code, falling back to Sagar Mitra."""
    if not language:
        return dict(DEFAULT_ASSISTANT_PERSONA)
    normalized = language.strip().lower().split("-")[0].split("_")[0]
    return dict(ASSISTANT_PERSONAS.get(normalized, DEFAULT_ASSISTANT_PERSONA))
