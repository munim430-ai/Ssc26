import json
import csv
import os
from datetime import datetime
from typing import List, Dict, Any
from .heuristics import ScamHeuristicsEngine

class OSINTDataProcessor:
    """
    Data Aggregator, Normalizer, Threat Classifier, and Exporter for Facebook OSINT Scraping.
    """

    def __init__(self):
        self.heuristics_engine = ScamHeuristicsEngine()
        self.collected_posts: List[Dict[str, Any]] = []

    def process_raw_post(self, raw_post: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes a raw scraped Facebook post and runs fraud heuristics analysis.
        """
        post_id = raw_post.get("post_id") or raw_post.get("id") or f"fb_post_{len(self.collected_posts) + 1}"
        post_text = raw_post.get("post_text") or raw_post.get("text") or raw_post.get("content") or ""
        author = raw_post.get("username") or raw_post.get("author") or raw_post.get("user_id") or "Anonymous Scammer"
        author_url = raw_post.get("user_url") or raw_post.get("profile_url") or f"https://facebook.com/{author}"
        group_name = raw_post.get("group_name") or raw_post.get("group") or "SSC 2026 Public Community"
        group_id = raw_post.get("group_id") or "public_group"
        post_url = raw_post.get("post_url") or raw_post.get("link") or f"https://facebook.com/groups/{group_id}/posts/{post_id}"
        timestamp = raw_post.get("time") or raw_post.get("timestamp") or datetime.now().isoformat()
        if isinstance(timestamp, datetime):
            timestamp = timestamp.isoformat()

        images = raw_post.get("images") or raw_post.get("image_lowquality") or []
        if isinstance(images, str):
            images = [images]
        has_images = len(images) > 0 or raw_post.get("has_image", False)

        # Run heuristics classification
        analysis = self.heuristics_engine.analyze_post(
            post_text=post_text,
            has_images=has_images,
            image_captions=raw_post.get("image_captions", [])
        )

        normalized = {
            "post_id": post_id,
            "target_scope_group": group_name,
            "group_id": group_id,
            "author_name": author,
            "author_profile_url": author_url,
            "post_url": post_url,
            "timestamp": timestamp,
            "search_keyword_matched": raw_post.get("keyword_matched", "SSC 2026 result change"),
            "post_content": post_text,
            "has_media": has_images,
            "media_urls": images,
            "threat_analysis": {
                "risk_level": analysis["risk_level"],
                "threat_score": analysis["threat_score"],
                "is_scam": analysis["is_scam"],
                "heuristics_breakdown": analysis["heuristics"]
            },
            "extracted_iocs": analysis["extracted_iocs"]
        }

        self.collected_posts.append(normalized)
        return normalized

    def export_json(self, output_filepath: str) -> None:
        """
        Exports collected dataset to a structured JSON file.
        """
        os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
        summary = self.get_summary_stats()
        dataset = {
            "metadata": {
                "scan_time": datetime.now().isoformat(),
                "target_focus": "SSC 2026 Result Change Scams",
                "total_posts_analyzed": len(self.collected_posts),
                "stats": summary
            },
            "posts": self.collected_posts
        }
        with open(output_filepath, "w", encoding="utf-8") as f:
            json.dump(dataset, f, indent=2, ensure_ascii=False)

    def export_csv(self, output_filepath: str) -> None:
        """
        Exports collected dataset to a CSV spreadsheet.
        """
        os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
        fieldnames = [
            "post_id", "risk_level", "threat_score", "is_scam",
            "target_scope_group", "author_name", "post_url", "timestamp",
            "search_keyword_matched", "extracted_phones", "extracted_telegram",
            "extracted_whatsapp", "monetary_triggers", "social_eng_triggers",
            "visual_fraud_triggers", "post_content"
        ]
        with open(output_filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for p in self.collected_posts:
                threat = p["threat_analysis"]
                h = threat["heuristics_breakdown"]
                iocs = p["extracted_iocs"]
                writer.writerow({
                    "post_id": p["post_id"],
                    "risk_level": threat["risk_level"],
                    "threat_score": threat["threat_score"],
                    "is_scam": threat["is_scam"],
                    "target_scope_group": p["target_scope_group"],
                    "author_name": p["author_name"],
                    "post_url": p["post_url"],
                    "timestamp": p["timestamp"],
                    "search_keyword_matched": p["search_keyword_matched"],
                    "extracted_phones": "; ".join(iocs.get("phone_numbers", [])),
                    "extracted_telegram": "; ".join(iocs.get("telegram_handles", []) + iocs.get("telegram_links", [])),
                    "extracted_whatsapp": "; ".join(iocs.get("whatsapp_links", [])),
                    "monetary_triggers": "; ".join(h["monetary_requests"]["matches"]),
                    "social_eng_triggers": "; ".join(h["social_engineering"]["matches"]),
                    "visual_fraud_triggers": "; ".join(h["visual_fraud"]["matches"]),
                    "post_content": p["post_content"].replace("\n", " ")
                })

    def get_summary_stats(self) -> Dict[str, Any]:
        """
        Calculates high-level statistical summary for threat intelligence reporting.
        """
        total = len(self.collected_posts)
        critical = sum(1 for p in self.collected_posts if p["threat_analysis"]["risk_level"] == "CRITICAL")
        high = sum(1 for p in self.collected_posts if p["threat_analysis"]["risk_level"] == "HIGH")
        medium = sum(1 for p in self.collected_posts if p["threat_analysis"]["risk_level"] == "MEDIUM")
        low = sum(1 for p in self.collected_posts if p["threat_analysis"]["risk_level"] == "LOW")

        phone_numbers = set()
        telegrams = set()
        whatsapps = set()

        for p in self.collected_posts:
            phone_numbers.update(p["extracted_iocs"].get("phone_numbers", []))
            telegrams.update(p["extracted_iocs"].get("telegram_handles", []) + p["extracted_iocs"].get("telegram_links", []))
            whatsapps.update(p["extracted_iocs"].get("whatsapp_links", []))

        return {
            "total_posts": total,
            "critical_risk_count": critical,
            "high_risk_count": high,
            "medium_risk_count": medium,
            "low_risk_count": low,
            "scam_percentage": round((critical + high) / total * 100, 2) if total > 0 else 0.0,
            "unique_scammer_phones": list(phone_numbers),
            "unique_telegram_iocs": list(telegrams),
            "unique_whatsapp_iocs": list(whatsapps)
        }
