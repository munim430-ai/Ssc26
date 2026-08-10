import sys
import os
import unittest

# Ensure src module is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.osint.heuristics import ScamHeuristicsEngine
from src.osint.processor import OSINTDataProcessor

class TestScamHeuristicsEngine(unittest.TestCase):

    def setUp(self):
        self.engine = ScamHeuristicsEngine()
        self.processor = OSINTDataProcessor()

    def test_bKash_monetary_request(self):
        post_text = "SSC 2026 result change available! Per subject 1500 taka. Send money via bKash to 01712345678. Contact inbox for proof."
        analysis = self.engine.analyze_post(post_text)

        self.assertTrue(analysis["heuristics"]["monetary_requests"]["detected"])
        self.assertTrue(analysis["is_scam"])
        self.assertIn("01712345678", analysis["extracted_iocs"]["phone_numbers"])
        self.assertEqual(analysis["risk_level"], "CRITICAL")

    def test_social_engineering_claim(self):
        post_text = "Direct board official access in IT section. We can increase SSC marks and GPA 5.00 guaranteed! Join our Telegram t.me/ssc_board_help"
        analysis = self.engine.analyze_post(post_text)

        self.assertTrue(analysis["heuristics"]["social_engineering"]["detected"])
        self.assertTrue(analysis["heuristics"]["external_diversion"]["detected"])
        self.assertIn("t.me/ssc_board_help", analysis["extracted_iocs"]["telegram_links"])
        self.assertGreaterEqual(analysis["threat_score"], 50)

    def test_benign_study_post(self):
        post_text = "SSC 2026 exam preparation notes for Physics and Higher Math. Download routine from official website board.gov.bd"
        analysis = self.engine.analyze_post(post_text)

        self.assertFalse(analysis["is_scam"])
        self.assertEqual(analysis["risk_level"], "LOW")
        self.assertLess(analysis["threat_score"], 25)

    def test_processor_export(self):
        raw_post = {
            "post_id": "test_101",
            "post_text": "SSC result correction available. bKash 01899887766. Telegram t.me/fake_result",
            "username": "ScammerX",
            "group_name": "SSC 2026 All Board Exam Help"
        }
        processed = self.processor.process_raw_post(raw_post)
        self.assertEqual(processed["post_id"], "test_101")
        self.assertIn(processed["threat_analysis"]["risk_level"], ["HIGH", "CRITICAL"])

if __name__ == "__main__":
    unittest.main()
