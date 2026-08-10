import re
from typing import Dict, List, Any, Tuple

class ScamHeuristicsEngine:
    """
    Multi-dimensional Threat Classifier & IoC Extractor for SSC 2026 Result Change Scams.
    Evaluates posts based on 4 primary heuristic pillars:
    1. Monetary Requests (bKash/Nagad/Rocket/Bank/Crypto)
    2. Social Engineering Claims (Board Insider/IT Dept/Glitch)
    3. External Diversion (Telegram/WhatsApp/Phone numbers)
    4. Visual Fraud (Proof claims/Edited mark sheets)
    """

    # --- Heuristic 1: Monetary Requests ---
    MONETARY_PATTERNS = [
        r'\b(?:bkash|b-kash| বিকাশ)\b',
        r'\b(?:nagad|নগদ)\b',
        r'\b(?:rocket|রকেট)\b',
        r'\b(?:upay|উপায়)\b',
        r'\b(?:upi|crypto|usdt|binance)\b',
        r'\b(?:bank transfer|ব্যাংক ট্র্যান্সফার)\b',
        r'\b(?:advance fee|advance payment|অগ্রিম ফি|অগ্রিম টাকা|টাকা পেমেন্ট)\b',
        r'\b(?:per subject|প্রতি বিষয়|বিষয় প্রতি|৫০[০-৯] টাকা|১০[০-৯]{2} টাকা)\b',
        r'\b(?:fee|charge|চার্জ|পেমেন্ট|ফি)\b',
        r'\b(?:send money|cash in|সেন্ড মানি|ক্যাশ ইন)\b',
    ]

    # --- Heuristic 2: Social Engineering & Authority Impersonation ---
    SOCIAL_ENG_PATTERNS = [
        r'\b(?:insider|insider access|ইনসাইডার|বোর্ড কর্মকর্তা)\b',
        r'\b(?:it department|it section|আইটি বিভাগ|আইটি সেকশন|আইটি অফিসার)\b',
        r'\b(?:software glitch|system glitch|সার্ভার গ্লিচ|সিস্টেম হ্যাক)\b',
        r'\b(?:board official|board chairman|শিক্ষা বোর্ড চেয়ারম্যান|বোর্ড মেম্বার)\b',
        r'\b(?:database alter|database hack|ডাটাবেজ পরিবর্তন|রেজাল্ট সংশোধন)\b',
        r'\b(?:rescrutiny bypass|board challenge hack|বোর্ড চ্যালেঞ্জ)\b',
        r'\b(?:100% guaranteed|১০০% গ্যারান্টি|গ্যারান্টি সহ)\b',
        r'\b(?:ssc 2026 result change|ssc result change|রেজাল্ট পরিবর্তন|মার্কস বৃদ্ধি)\b',
        r'\b(?:grade upgrade|gpa 5\.00|gpa 5 guaranteed|এ প্লাস পাওয়ার উপায়)\b'
    ]

    # --- Heuristic 3: External Diversion & Contact Extraction ---
    EXTERNAL_DIVERSION_PATTERNS = [
        r't\.me\/[a-zA-Z0-9_]+',
        r'telegram(?:\.me)?\/[a-zA-Z0-9_]+',
        r'chat\.whatsapp\.com\/[a-zA-Z0-9]+',
        r'wa\.me\/\+?\d+',
        r'whatsapp\s*:\s*\+?\d+',
        r'bit\.ly\/[a-zA-Z0-9_]+',
        r'tinyurl\.com\/[a-zA-Z0-9_]+',
        r'inbox\s*(?:me|us|করুন|করো)',
        r'inbox\s*only',
        r'যোগাযোগ\s*করুন'
    ]

    PHONE_PATTERN = r'\b(?:(?:\+?88)?01[3-9]\d{8})\b'
    TELEGRAM_HANDLE_PATTERN = r'@([a-zA-Z0-9_]{4,32})'
    WHATSAPP_LINK_PATTERN = r'https?:\/\/(?:chat\.whatsapp\.com|wa\.me)\/[a-zA-Z0-9_+=\-]+'

    # --- Heuristic 4: Visual Fraud & Proof Exploitation ---
    VISUAL_FRAUD_PATTERNS = [
        r'\b(?:proof available|proof in comments|proof in inbox|প্রমাণ সহ|প্রমাণ আছে)\b',
        r'\b(?:edited mark sheet|marksheet screenshot|মার্কেট শিট প্রমাণ|রেজাল্ট শিট)\b',
        r'\b(?:before after|before\/after|আগে পরে|আগের রেজাল্ট)\b',
        r'\b(?:live proof|লাইভ প্রুফ|ভিডিও প্রুফ)\b',
        r'\b(?:check screenshot|ইনবক্সে স্ক্রিনশট)\b'
    ]

    def analyze_post(self, post_text: str, has_images: bool = False, image_captions: List[str] = None) -> Dict[str, Any]:
        """
        Analyzes raw post text and metadata to classify scam status and extract IoCs.
        """
        full_text = post_text + " " + (" ".join(image_captions) if image_captions else "")

        # 1. Monetary Requests Analysis
        monetary_matches = []
        for pattern in self.MONETARY_PATTERNS:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            if matches:
                monetary_matches.extend(matches)

        # 2. Social Engineering Analysis
        social_eng_matches = []
        for pattern in self.SOCIAL_ENG_PATTERNS:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            if matches:
                social_eng_matches.extend(matches)

        # 3. External Diversion Analysis
        diversion_matches = []
        for pattern in self.EXTERNAL_DIVERSION_PATTERNS:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            if matches:
                diversion_matches.extend(matches)

        # 4. Visual Fraud Analysis
        visual_fraud_matches = []
        for pattern in self.VISUAL_FRAUD_PATTERNS:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            if matches:
                visual_fraud_matches.extend(matches)

        if has_images and (re.search(r'mark\s*sheet|result|gpa|board', full_text, re.I) or "proof" in full_text.lower()):
            visual_fraud_matches.append("Image attachment with mark sheet / result claims")

        # --- IoC Extraction ---
        phone_numbers = list(set(re.findall(self.PHONE_PATTERN, full_text)))
        telegram_handles = list(set(re.findall(self.TELEGRAM_HANDLE_PATTERN, full_text)))
        whatsapp_links = list(set(re.findall(self.WHATSAPP_LINK_PATTERN, full_text)))
        telegram_links = list(set(re.findall(r'(?:https?:\/\/)?t\.me\/[a-zA-Z0-9_]+', full_text)))

        # Clean up telegram handles (exclude common non-handle keywords)
        telegram_handles = [h for h in telegram_handles if h.lower() not in ['gmail', 'yahoo', 'facebook', 'whatsapp', 'gmail.com', 'outlook']]

        # --- Awareness / Anti-Scam Warning Check ---
        is_awareness = bool(re.search(r'\b(?:সতর্কতা|সচেতনতা|সাবধান|প্রতারক চক্র|ভুয়া|পেমেন্ট করবেন না|scam alert|awareness|don\'t pay)\b', full_text, re.I))

        # --- Threat Scoring Model ---
        score = 0
        if monetary_matches:
            score += 30 + min(len(monetary_matches) * 5, 15)
        if social_eng_matches:
            score += 25 + min(len(social_eng_matches) * 5, 15)
        if diversion_matches or phone_numbers or whatsapp_links or telegram_links:
            score += 25
        if visual_fraud_matches:
            score += 20

        # Adjust for anti-scam awareness warnings without IoCs
        if is_awareness and not (phone_numbers or whatsapp_links or telegram_links or telegram_handles):
            score = max(0, score - 60)

        score = min(score, 100)

        # Categorize Threat Level
        if is_awareness and score < 45:
            risk_level = "LOW (AWARENESS)"
        elif score >= 75:
            risk_level = "CRITICAL"
        elif score >= 50:
            risk_level = "HIGH"
        elif score >= 25:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        is_scam = score >= 45 and not (is_awareness and score < 50)

        return {
            "risk_level": risk_level,
            "threat_score": score,
            "is_scam": is_scam,
            "heuristics": {
                "monetary_requests": {
                    "detected": len(monetary_matches) > 0,
                    "matches": list(set(monetary_matches))
                },
                "social_engineering": {
                    "detected": len(social_eng_matches) > 0,
                    "matches": list(set(social_eng_matches))
                },
                "external_diversion": {
                    "detected": len(diversion_matches) > 0 or len(phone_numbers) > 0 or len(whatsapp_links) > 0,
                    "matches": list(set(diversion_matches))
                },
                "visual_fraud": {
                    "detected": len(visual_fraud_matches) > 0,
                    "matches": list(set(visual_fraud_matches))
                }
            },
            "extracted_iocs": {
                "phone_numbers": phone_numbers,
                "telegram_handles": telegram_handles,
                "telegram_links": telegram_links,
                "whatsapp_links": whatsapp_links
            }
        }
