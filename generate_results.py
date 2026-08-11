#!/usr/bin/env python3
"""
Generate 50 SSC result-card PNGs from result_template.html using Playwright.
Template fidelity: identical to the Bangladesh Education Board result page.
All randomness is seeded (random.seed(42)) for reproducibility.
"""
import os
import random
import html
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

# ── Paths ────────────────────────────────────────────────────────────────────
BASE = Path(r"D:\SSC")
TEMPLATE_PATH = BASE / "result_template.html"
LOGO_PATH = BASE / "logo_data_uri.txt"
OUTPUT_DIR = BASE / "result_cards"

# ── Data ──────────────────────────────────────────────────────────────────────
RECORDS = [
    (1,"Tanvir Hasan","Md. Abdul Hasan","Shahana Parvin","M"),
    (2,"Nusrat Jahan","Md. Kamrul Islam","Rokeya Begum","F"),
    (3,"Mehedi Hasan","Md. Mizanur Rahman","Nasrin Akter","M"),
    (4,"Sumaiya Islam","Md. Rafiqul Islam","Taslima Khatun","F"),
    (5,"Rakib Hossain","Md. Anwar Hossain","Farida Yasmin","M"),
    (6,"Sadia Afrin","Md. Jahangir Alam","Shirin Sultana","F"),
    (7,"Shakil Ahmed","Md. Nurul Amin","Rehana Parvin","M"),
    (8,"Mim Akter","Md. Selim Reza","Habiba Rahman","F"),
    (9,"Arif Hossain","Md. Delwar Hossain","Momtaz Begum","M"),
    (10,"Tania Rahman","Md. Abdur Rahman","Salma Khatun","F"),
    (11,"Sabbir Khan","Md. Mostafa Khan","Nahid Sultana","M"),
    (12,"Farhana Yasmin","Md. Lokman Hossain","Ayesha Siddika","F"),
    (13,"Jewel Miah","Md. Idris Miah","Rabeya Begum","M"),
    (14,"Bristi Akter","Md. Harun Rashid","Nargis Akter","F"),
    (15,"Naim Uddin","Md. Fazlul Karim","Rashida Begum","M"),
    (16,"Puspa Rani","Shyamal Chandra","Shikha Rani","F"),
    (17,"Ridwan Karim","Md. Abdul Karim","Mahmuda Khatun","M"),
    (18,"Lamia Sultana","Md. Rezaul Karim","Farzana Yasmin","F"),
    (19,"Sajid Hossain","Md. Shahidul Islam","Shahida Parvin","M"),
    (20,"Orchi Das","Nirmal Das","Mina Rani Das","F"),
    (21,"Fahim Shahriar","Md. Shahriar Kabir","Nilufa Kamal","M"),
    (22,"Jannatul Ferdous","Md. Mokbul Hossain","Rahima Begum","F"),
    (23,"Asif Iqbal","Md. Nazrul Islam","Kohinoor Akter","M"),
    (24,"Sraboni Akter","Md. Abul Kalam","Hasna Hena","F"),
    (25,"Mahim Chowdhury","Md. Anwar Chowdhury","Salma Chowdhury","M"),
    (26,"Nafisa Tabassum","Md. Golam Rabbani","Nasima Sultana","F"),
    (27,"Rubel Hasan","Md. Habibur Rahman","Amena Khatun","M"),
    (28,"Tasnia Moun","Md. Kamrul Hasan","Shahnaz Parvin","F"),
    (29,"Imran Hossain","Md. Yousuf Ali","Jesmin Akter","M"),
    (30,"Anika Nawar","Md. Shafiqul Islam","Rumana Islam","F"),
    (31,"Polash Kumar","Suresh Kumar","Swapna Rani","M"),
    (32,"Raisa Rahman","Md. Atiqur Rahman","Kamrun Nahar","F"),
    (33,"Siyam Ahmed","Md. Mahbub Alam","Shahana Akter","M"),
    (34,"Nadiya Islam","Md. Saiful Islam","Beauty Begum","F"),
    (35,"Tanjim Hossain","Md. Monir Hossain","Lovely Yasmin","M"),
    (36,"Afsana Mimi","Md. Zakir Hossain","Parvin Akter","F"),
    (37,"Rakibul Islam","Md. Aminul Islam","Safia Begum","M"),
    (38,"Mimona Jannat","Md. Shah Alam","Ruma Khatun","F"),
    (39,"Hasan Murad","Md. Abdus Sattar","Nazma Begum","M"),
    (40,"Tun Tun Akter","Md. Alamin Sheikh","Shefali Begum","F"),
    (41,"Joy Chowdhury","Md. Faruk Chowdhury","Nasrin Chowdhury","M"),
    (42,"Shorna Akter","Md. Belal Hossain","Jesmin Sultana","F"),
    (43,"Abrar Fahim","Md. Nasir Uddin","Tahmina Akter","M"),
    (44,"Nujhat Tasnim","Md. Obaidul Haque","Shahida Yasmin","F"),
    (45,"Dipankar Roy","Prokash Roy","Beauty Rani Roy","M"),
    (46,"Walid Hasan","Md. Rezaul Hasan","Shireen Akter","M"),
    (47,"Samia Sultana","Md. Kawsar Ahmed","Dalia Khatun","F"),
    (48,"Rafi Bin Islam","Md. Saiful Islam","Nipa Akter","M"),
    (49,"Mehzbin Chowdhury","Md. Altaf Chowdhury","Farida Chowdhury","F"),
    (50,"Ayman Sadiq","Md. Sadiqur Rahman","Mahmuda Begum","M"),
]

BOARDS = ["DHAKA","CHITTAGONG","COMILLA","RAJSHAHI","JESSORE","BARISAL","SYLHET","DINAJPUR","MYMENSINGH"]

INSTITUTE = {
    "DHAKA": "DHAKA MODEL HIGH SCHOOL",
    "CHITTAGONG": "CHITTAGONG MODEL HIGH SCHOOL",
    "COMILLA": "COMILLA ADARSHA HIGH SCHOOL",
    "RAJSHAHI": "RAJSHAHI MODEL HIGH SCHOOL",
    "JESSORE": "JESSORE ADARSHA HIGH SCHOOL",
    "BARISAL": "BARISAL MODEL HIGH SCHOOL",
    "SYLHET": "SYLHET MODEL HIGH SCHOOL",
    "DINAJPUR": "DINAJPUR ADARSHA HIGH SCHOOL",
    "MYMENSINGH": "MYMENSINGH MODEL HIGH SCHOOL",
}

# Subject lists per group (code, name)
SCIENCE = [
    (101,"BANGLA"),(107,"ENGLISH"),(109,"MATHEMATICS"),
    (150,"BANGLADESH AND GLOBAL STUDIES"),(111,"ISLAM AND MORAL EDUCATION"),
    (136,"PHYSICS"),(137,"CHEMISTRY"),(138,"BIOLOGY"),
    (154,"INFORMATION AND COMMUNICATION TECHNOLOGY"),(126,"HIGHER MATHEMATICS"),
]
COMMERCE = [
    (101,"BANGLA"),(107,"ENGLISH"),(109,"MATHEMATICS"),
    (150,"BANGLADESH AND GLOBAL STUDIES"),(111,"ISLAM AND MORAL EDUCATION"),
    (146,"ACCOUNTING"),(152,"FINANCE AND BANKING"),(143,"BUSINESS ENTREPRENEURSHIP"),
    (154,"INFORMATION AND COMMUNICATION TECHNOLOGY"),
]
HUMANITIES = [
    (101,"BANGLA"),(107,"ENGLISH"),(109,"MATHEMATICS"),
    (150,"BANGLADESH AND GLOBAL STUDIES"),(111,"ISLAM AND MORAL EDUCATION"),
    (110,"GEOGRAPHY AND ENVIRONMENT"),
    (153,"HISTORY OF BANGLADESH AND WORLD CIVILIZATION"),
    (140,"CIVICS AND CITIZENSHIP"),
    (154,"INFORMATION AND COMMUNICATION TECHNOLOGY"),
]
CA = [
    (147,"PHYSICAL EDUCATION, HEALTH AND SPORTS"),
    (156,"CAREER EDUCATION"),
]

# Hindu-named records use Hindu Moral Education (112) instead of Islam (111)
HINDU_RECORDS = {16, 20, 31, 45}


def subject_table(title, subjects):
    """Build a subject-wise grade/marks table block (matches template structure)."""
    rows = []
    for code, name in subjects:
        rows.append(
            f'<tr><td class="cent-align">{code}</td>'
            f'<td><span class="code_{code}">{name}</span></td>'
            f'<td class="cent-align">A+</td></tr>'
        )
    return (
        f'<div class="text-center"><h4>{title}</h4></div>'
        f'<table class="table-striped"><thead><tr>'
        f'<th>Subject Code</th><th>Subject Name</th><th>Grade</th></tr></thead>'
        f'<tbody>{"".join(rows)}</tbody></table>'
        f'<div class="divpadding"></div>'
    )


def build_subject_tables(group, record_no):
    """Return full HTML string for both subject tables."""
    base = {
        "SCIENCE": SCIENCE,
        "COMMERCE": COMMERCE,
        "HUMANITIES": HUMANITIES,
    }[group]
    subjects = list(base)
    if record_no in HINDU_RECORDS:
        subjects = [
            (112, "HINDU MORAL EDUCATION") if c == 111 else (c, n)
            for c, n in subjects
        ]
    return (
        subject_table("Subject-wise Grade/Marks", subjects)
        + subject_table("Subject-wise Grade/Marks for Continuous Assessment", CA)
    )


def random_dob():
    """Random date between 2009-01-01 and 2010-12-31, formatted DD-MM-YYYY."""
    start = date(2009, 1, 1)
    end = date(2010, 12, 31)
    delta = (end - start).days
    d = start + timedelta(days=random.randint(0, delta))
    return f"{d.day:02d}-{d.month:02d}-{d.year}"


def main():
    random.seed(42)

    if not TEMPLATE_PATH.exists():
        raise SystemExit(f"ERROR: template not found: {TEMPLATE_PATH}")
    if not LOGO_PATH.exists():
        raise SystemExit(f"ERROR: logo data not found: {LOGO_PATH}")

    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    logo_uri = LOGO_PATH.read_text(encoding="utf-8").strip()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    rows = []
    for rec in RECORDS:
        no, student, father, mother, gender = rec
        group = ["SCIENCE", "COMMERCE", "HUMANITIES"][(no - 1) % 3]
        board = BOARDS[(no - 1) % 9]
        institute = INSTITUTE[board]

        roll = str(random.randint(100000, 999999))
        reg = str(random.randint(1000000000, 9999999999))
        dob = random_dob()

        data = {
            "__LOGO_URI__": logo_uri,
            "__STUDENT_NAME__": student.upper(),
            "__FATHER_NAME__": father.upper(),
            "__MOTHER_NAME__": mother.upper(),
            "__ROLL_NO__": roll,
            "__REG_NO__": reg,
            "__BOARD__": board,
            "__SESSION__": "2026",
            "__GROUP__": group,
 "__GENDER__": "Male" if gender == "M" else "Female",
            "__RESULT__": "GPA=5.00",
            "__DOB__": dob,
            "__INSTITUTE__": institute,
            "__SUBJECT_TABLES__": build_subject_tables(group, no),
        }
        html_out = template
        for k, v in data.items():
            html_out = html_out.replace(k, v)

        # sanity: no leftover tokens
        if "__" in html_out:
            leftover = [t for t in data if t in html_out]
            raise RuntimeError(f"record {no}: tokens left unreplaced: {leftover}")

        rows.append((no, f"{student.upper()}", board, group, html_out))

    # Render with Playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1100, "height": 1000}, device_scale_factor=2)
        page = context.new_page()
        for no, name, board, group, html_out in rows:
            page.set_content(html_out, wait_until="load")
            page.wait_for_timeout(400)
            out_path = OUTPUT_DIR / f"result_{no:02d}.png"
            page.screenshot(path=str(out_path), full_page=True)
            print(f"result_{no:02d}.png | {name} | {board} | {group}")
        browser.close()

    # Verify
    missing = []
    for no, *_ in rows:
        p = OUTPUT_DIR / f"result_{no:02d}.png"
        if not p.exists() or p.stat().st_size == 0:
            missing.append(f"result_{no:02d}.png")
    if missing:
        raise SystemExit(f"MISSING/EMPTY: {missing}")
    print(f"\nDONE: 50 images generated in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
