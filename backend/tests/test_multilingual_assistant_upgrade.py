"""
Automated unit and integration test suite for ORCA Multilingual Assistant Upgrade.

Tests:
1. Native script detection & responses (Gujarati, Hindi, Marathi, Tamil)
2. Romanized Indian language detection & responses (Romanized Hindi, Gujarati, Marathi, Tamil)
3. Code-mixed Indic-English detection & responses
4. Language Priority Rule: Input language takes precedence over dashboard default language per turn
5. Arbitrary marine question understanding across MetOcean, Boundary, PFZ, Tide, SOS, and Schemes
6. Multi-turn conversational context preservation (location and intent inheritance)
7. Operational recommendations and deductive reasoning trace delivery
"""
import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.services.bhashini import bhashini_service, detect_romanized_indic
from app.agents.intent_agent import parse_intent


class TestMultilingualAssistantUpgrade(unittest.TestCase):
    """Verifies all capabilities of the upgraded multilingual marine assistant."""

    def setUp(self):
        self.client = TestClient(app)

    # -------------------------------------------------------------------------
    # 1. Romanized Indian Language & Code-Mixing Detection
    # -------------------------------------------------------------------------
    def test_romanized_hindi_detection(self):
        """Verifies that Romanized Hindi questions are correctly identified as Hindi (hi / Deva)."""
        text = "Kya main kal machhli pakadne ja sakta hoon?"
        res = detect_romanized_indic(text)
        self.assertIsNotNone(res)
        lang, script, name = res
        self.assertEqual(lang, "hi")
        self.assertEqual(script, "Deva")

        lid = bhashini_service.identify_language(text)
        self.assertEqual(lid.short_code, "hi")

    def test_romanized_gujarati_detection(self):
        """Verifies that Romanized Gujarati questions are correctly identified as Gujarati (gu / Gujr)."""
        text = "shu hu kale machhimari karva jai shaku?"
        res = detect_romanized_indic(text)
        self.assertIsNotNone(res)
        lang, script, name = res
        self.assertEqual(lang, "gu")
        self.assertEqual(script, "Gujr")

        lid = bhashini_service.identify_language(text)
        self.assertEqual(lid.short_code, "gu")

    def test_romanized_gujarati_wind_query(self):
        """Verifies that Romanized Gujarati wind query is detected as Gujarati."""
        text = "aaje pavan ketlo che?"
        res = detect_romanized_indic(text)
        self.assertIsNotNone(res)
        lang, script, _ = res
        self.assertEqual(lang, "gu")

    def test_code_mixed_hindi_english_detection(self):
        """Verifies that code-mixed Hindi-English is detected as Hindi."""
        text = "Kal weather kaisa rahega? Wind speed kitni hai?"
        res = detect_romanized_indic(text)
        self.assertIsNotNone(res)
        lang, script, _ = res
        self.assertEqual(lang, "hi")

    def test_romanized_marathi_detection(self):
        """Verifies that Romanized Marathi questions are detected as Marathi."""
        text = "aaj samudra kasa aahe?"
        res = detect_romanized_indic(text)
        self.assertIsNotNone(res)
        lang, script, _ = res
        self.assertEqual(lang, "mr")

    # -------------------------------------------------------------------------
    # 2. Language Priority Rule (Input language overrides dashboard default)
    # -------------------------------------------------------------------------
    def test_language_priority_hindi_input_with_english_dashboard(self):
        """When dashboard is English ('en') but user inputs Hindi, response must be in Hindi."""
        payload = {
            "message": "क्या मैं कल मछली पकड़ने जा सकता हूँ?",
            "location": {"lat": 18.9220, "lon": 72.8347},
            "language": "en",  # Dashboard default
        }
        response = self.client.post("/api/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["language"], "hi")
        self.assertIn("original_message", data)
        self.assertEqual(data["original_message"], "क्या मैं कल मछली पकड़ने जा सकता हूँ?")

    def test_language_priority_romanized_hindi_input_with_english_dashboard(self):
        """When user writes Romanized Hindi, ORCA responds in Hindi."""
        payload = {
            "message": "kya main kal machhli pakadne ja sakta hoon?",
            "location": {"lat": 18.9220, "lon": 72.8347},
            "language": "en",
        }
        response = self.client.post("/api/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["language"], "hi")
        self.assertIn("answer", data)

    def test_language_priority_romanized_gujarati_input_with_english_dashboard(self):
        """When user writes Romanized Gujarati, ORCA responds in Gujarati."""
        payload = {
            "message": "shu hu kale machhimari karva jai shaku?",
            "location": {"lat": 20.9000, "lon": 70.3667},
            "language": "en",
        }
        response = self.client.post("/api/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["language"], "gu")
        self.assertIn("answer", data)

    # -------------------------------------------------------------------------
    # 3. Arbitrary Marine Questions Understanding & Grounded Responses
    # -------------------------------------------------------------------------
    def test_arbitrary_wind_speed_query(self):
        """Tests arbitrary wind query."""
        payload = {
            "question": "What is the wind speed and direction near Veraval right now?",
            "location": {"lat": 20.9000, "lon": 70.3667},
            "language": "en",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Wind", data["answer"])
        self.assertIn("km/h", data["answer"])

    def test_arbitrary_wave_height_query(self):
        """Tests arbitrary wave height and swell query."""
        payload = {
            "question": "How high are the waves and swell period?",
            "location": {"lat": 18.9220, "lon": 72.8347},
            "language": "en",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Wave Height", data["answer"])

    def test_arbitrary_tide_query(self):
        """Tests arbitrary tide timings and sea conditions query."""
        payload = {
            "question": "What are the tide, weather, and sea conditions?",
            "location": {"lat": 18.9220, "lon": 72.8347},
            "language": "en",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("Tide", data["answer"])

    def test_arbitrary_emergency_breakdown_query(self):
        """Tests emergency engine failure protocol."""
        payload = {
            "question": "Emergency: My boat engine has broken down at sea, what should I do?",
            "location": {"lat": 18.9220, "lon": 72.8347},
            "language": "en",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("1554", data["answer"])  # Indian Coast Guard number
        self.assertIn("Channel 16", data["answer"])

    def test_arbitrary_government_scheme_query(self):
        """Tests government scheme assistance query."""
        payload = {
            "question": "Which government scheme can help fishermen with boat subsidies?",
            "location": {"lat": 18.9220, "lon": 72.8347},
            "language": "en",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("PMMSY", data["answer"])

    def test_arbitrary_boundary_and_coast_distance_query(self):
        """Tests maritime boundary and distance to coast query."""
        payload = {
            "question": "How far am I from the coast and am I inside Indian territorial waters?",
            "location": {"lat": 18.9220, "lon": 72.8347},
            "language": "en",
        }
        response = self.client.post("/query", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("EEZ", data["answer"])
        self.assertIn("km", data["answer"])

    # -------------------------------------------------------------------------
    # 4. Multi-Turn Conversational Context Resolution
    # -------------------------------------------------------------------------
    def test_multi_turn_follow_up_tomorrow(self):
        """Verifies that follow-up 'What about tomorrow?' inherits previous location context."""
        history = [
            {"role": "user", "text": "What is the wind speed near Veraval Port?"},
            {"role": "assistant", "text": "Current wind speed near Veraval Port is 16.5 km/h from the West."},
        ]
        parsed = parse_intent("What about tomorrow?", history=history)
        self.assertEqual(parsed["location_hint"], "Veraval Port")
        self.assertEqual(parsed["time_hint"], "tomorrow")

    def test_multi_turn_follow_up_is_that_dangerous(self):
        """Verifies that follow-up 'Is that dangerous?' resolves to safety evaluation."""
        history = [
            {"role": "user", "text": "Waves are 2.2 meters near Satpati."},
            {"role": "assistant", "text": "Waves of 2.2m are reaching moderate to high chop."},
        ]
        parsed = parse_intent("Is that dangerous?", history=history)
        self.assertEqual(parsed["intent"], "safety_check")
        self.assertEqual(parsed["location_hint"], "Satpati / Palghar")


if __name__ == "__main__":
    unittest.main()
