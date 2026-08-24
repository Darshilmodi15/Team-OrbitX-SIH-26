"""Unit tests for Bhashini Multilingual Service."""
import unittest
from app.services.bhashini import BhashiniService, SUPPORTED_LANGUAGES


class TestBhashiniService(unittest.TestCase):
    """Test suite for Bhashini language detection, NMT translation, and session caching."""

    def setUp(self):
        self.service = BhashiniService()

    def test_supported_languages(self):
        """Verify all required Indian regional languages are present in SUPPORTED_LANGUAGES."""
        self.assertIn("en", SUPPORTED_LANGUAGES)
        self.assertIn("hi", SUPPORTED_LANGUAGES)
        self.assertIn("gu", SUPPORTED_LANGUAGES)
        self.assertIn("mr", SUPPORTED_LANGUAGES)
        self.assertIn("ta", SUPPORTED_LANGUAGES)
        self.assertIn("te", SUPPORTED_LANGUAGES)
        self.assertIn("ml", SUPPORTED_LANGUAGES)
        self.assertIn("bn", SUPPORTED_LANGUAGES)
        self.assertIn("kn", SUPPORTED_LANGUAGES)
        self.assertIn("or", SUPPORTED_LANGUAGES)

    def test_detect_language_gujarati(self):
        """Test Gujarati script detection."""
        query = "કાલે વેરાવળ પાસે દરિયામાં જવું સલામત છે?"
        detected = self.service.detect_language(query)
        self.assertEqual(detected, "gu")

    def test_detect_language_hindi(self):
        """Test Hindi Devanagari script detection."""
        query = "क्या कल मुंबई के पास समुद्र में जाना सुरक्षित है?"
        detected = self.service.detect_language(query)
        self.assertEqual(detected, "hi")

    def test_detect_language_marathi(self):
        """Test Marathi Devanagari detection via lexical markers."""
        query = "उद्या रत्नागिरी जवळ समुद्रात जाणे सुरक्षित आहे काय?"
        detected = self.service.detect_language(query)
        self.assertEqual(detected, "mr")

    def test_detect_language_tamil(self):
        """Test Tamil script detection."""
        query = "நாளை சென்னை அருகே கடலுக்குச் செல்வது பாதுகாப்பானதா?"
        detected = self.service.detect_language(query)
        self.assertEqual(detected, "ta")

    def test_detect_language_telugu(self):
        """Test Telugu script detection."""
        query = "రేపు విశాఖపట్నం వద్ద సముద్రంలోకి వెళ్లడం సురక్షితమేనా?"
        detected = self.service.detect_language(query)
        self.assertEqual(detected, "te")

    def test_detect_language_bengali(self):
        """Test Bengali script detection."""
        query = "কাল কি পারাদ্বীপের কাছে সমুদ্রে যাওয়া নিরাপদ?"
        detected = self.service.detect_language(query)
        self.assertEqual(detected, "bn")

    def test_detect_language_english(self):
        """Test English detection."""
        query = "Is it safe to go to sea near Veraval tomorrow?"
        detected = self.service.detect_language(query)
        self.assertEqual(detected, "en")

    def test_session_language_persistence(self):
        """Test multi-turn session language caching."""
        session_id = "test-session-123"
        # First query in Gujarati
        detected_1 = self.service.detect_language("કાલે દરિયામાં જવું સલામત છે?", session_id=session_id)
        self.assertEqual(detected_1, "gu")
        self.assertEqual(self.service.get_session_language(session_id), "gu")

        # Second query with short text or session check
        cached_lang = self.service.get_session_language(session_id)
        self.assertEqual(cached_lang, "gu")

    def test_translation_gujarati_to_english(self):
        """Test Gujarati to English translation flow."""
        gujarati_text = "કાલે વેરાવળ પાસે દરિયામાં જવું સલામત છે?"
        translated = self.service.translate(gujarati_text, source_lang="gu", target_lang="en")
        self.assertIsInstance(translated, str)
        self.assertTrue(len(translated) > 0)
        # Verify translated query contains relevant terms
        self.assertTrue(
            any(k in translated.lower() for k in ["safe", "sea", "veraval", "tomorrow", "go"])
        )

    def test_translation_english_to_gujarati(self):
        """Test English to Gujarati translation flow."""
        english_text = "Conditions are SAFE for navigation and fishing."
        translated = self.service.translate(english_text, source_lang="en", target_lang="gu")
        self.assertIsInstance(translated, str)
        self.assertTrue(len(translated) > 0)

    def test_translation_identity(self):
        """Test translation identity when source == target."""
        text = "Operational Advisory"
        translated = self.service.translate(text, source_lang="en", target_lang="en")
        self.assertEqual(translated, text)


if __name__ == "__main__":
    unittest.main()
