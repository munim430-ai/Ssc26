import sys
import os
import io

# Force UTF-8 encoding for standard output on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.osint.processor import OSINTDataProcessor
from src.osint.scraper import FacebookOSINTScraper

def main():
    print("=" * 65)
    print("  FACEBOOK OSINT SCRAPING & FRAUD DETECTION PIPELINE")
    print("  Target: SSC 2026 Result Change Scams")
    print("=" * 65)

    # Initialize Processor & Scraper
    processor = OSINTDataProcessor()
    scraper = FacebookOSINTScraper(processor)

    print("\n[+] Initializing Target Keywords & Public Facebook Group Scope...")
    for kw in scraper.SEARCH_KEYWORDS:
        print(f"    - Keyword: '{kw}'")

    print("\n[+] Target Public Facebook Groups:")
    for grp in scraper.TARGET_GROUPS:
        print(f"    - Group: {grp['name']} (ID: {grp['id']})")

    print("\n[+] Executing OSINT Data Harvesting & Heuristics Classification...")
    results = scraper.run_osint_pipeline()

    # Paths for output files
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    json_path = os.path.join(base_dir, "data", "ssc_2026_scam_dataset.json")
    csv_path = os.path.join(base_dir, "data", "ssc_2026_scam_dataset.csv")

    print(f"\n[+] Exporting JSON Dataset to: {json_path}")
    processor.export_json(json_path)

    print(f"[+] Exporting CSV Spreadsheet to: {csv_path}")
    processor.export_csv(csv_path)

    stats = processor.get_summary_stats()

    print("\n" + "=" * 65)
    print("  SUMMARY THREAT INTELLIGENCE STATISTICS")
    print("=" * 65)
    print(f"  Total Posts Analyzed:        {stats['total_posts']}")
    print(f"  Critical Risk Scams (75-100):{stats['critical_risk_count']}")
    print(f"  High Risk Scams (50-74):     {stats['high_risk_count']}")
    print(f"  Medium Risk Scams (25-49):   {stats['medium_risk_count']}")
    print(f"  Low Risk / Warning Posts:    {stats['low_risk_count']}")
    print(f"  Scam Ratio:                  {stats['scam_percentage']}%")
    print(f"  Extracted Scammer Phones:    {', '.join(stats['unique_scammer_phones'])}")
    print(f"  Extracted Telegram IoCs:     {', '.join(stats['unique_telegram_iocs'])}")
    print(f"  Extracted WhatsApp IoCs:     {', '.join(stats['unique_whatsapp_iocs'])}")
    print("=" * 65)
    print("\n[✓] OSINT Pipeline Execution Completed Successfully!")

if __name__ == "__main__":
    main()
