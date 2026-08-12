---
name: ssc-result-upgrader
description: Workflow for parsing student result HTML slips, applying selective or full GPA 5.00 A+ upgrades with numerical marks, saving/updating the Supabase database, and verifying live student portal synchronization.
---

# SSC Result Upgrader & Database Sync Skill

This skill defines an automated end-to-end workflow for AI agents to process student result HTML web pages, parse all student metadata and numerical marks, apply targeted grade/mark changes (e.g., Chemistry `F` -> `A+` with `85` marks) or full **GPA 5.00** upgrades, upsert the result into the Supabase PostgreSQL database, and verify live student portal synchronization.

---

## 1. Input Specification

When invoked, the agent receives:
- **`html_file_path`**: Path to the student's original result HTML file (`.html` or `.htm`).
- **`target_changes`**: Instructions specifying which subject(s) to upgrade:
  - *Selective Upgrade*: e.g., `137 CHEMISTRY: Grade A+, Marks 85` (preserves all other exact marks & grades).
  - *Full Upgrade*: e.g., `ALL: Grade A+, GPA 5.00`.

---

## 2. Step-by-Step Execution Workflow

### Step 1: Parse Student Metadata & Subject Table from HTML
Read and extract all 13 fields from the DOM:
- `roll_number`: Examinee Roll Number (integer)
- `registration_no`: Registration Number (integer, default `0` if not shown)
- `student_name`: Name of Student
- `father_name`: Father's Name
- `mother_name`: Mother's Name
- `board`: Education Board code (`dhaka`, `comilla`, `barisal`, `chittagong`, `dinajpur`, `jessore`, `madrasah`, `mymensingh`, `rajshahi`, `sylhet`, `tec`)
- `exam`: Exam code (`ssc`, `hsc`, `jsc`, `dibs`)
- `exam_year`: Examination Year (integer, e.g. `2026`)
- `group_name`: Group (`SCIENCE`, `HUMANITIES`, `BUSINESS STUDIES`)
- `student_type`: Type (`REGULAR`, `PRIVATE`, `IRREGULAR`)
- `gender`: Gender (`Male`, `Female`, `N/A`)
- `session`: Academic Session (e.g. `2024-25`)
- `date_of_birth`: Date of Birth string or `N/A`
- `institute_name`: School / Institute Name

Extract all subjects, grades, and numerical marks from the HTML tables:
- **General Subjects**: Subject Code, Subject Name, Marks, Grade.
- **Continuous Assessment (CA)**: Subject Code, Subject Name, Marks, Grade.

---

### Step 2: Apply Grade & Mark Modifications

#### Mode 1: Selective Upgrade (Preserve Exact Original Marks + Change Specified Subject)
1. Keep all non-target subject marks and grades exactly as parsed from the original HTML.
2. Update the target subject code (e.g. `137 CHEMISTRY`):
   - Set `grade` = `"A+"`
   - Set `marks` = `"85"` (or specified mark between 80-90)
3. Set `result_status = "Passed"`.
4. Calculate official Bangladesh Education Board GPA:
   - **Grade Points**: `A+`=5.0, `A`=4.0, `A-`=3.5, `B`=3.0, `C`=2.0, `D`=1.0, `F`=0.0.
   - Calculate 9 main general subjects average + 4th subject bonus points (> 2.0).

#### Mode 2: Full GPA 5.00 Upgrade
Set all general subject grades to **`A+`**, `gpa = 5.00`, and `result_status = "Passed"`.

---

### Step 3: Upsert Record to Supabase PostgreSQL Database

Execute an SQL `UPSERT` using Node.js `pg` pooler connection (`aws-0-ap-southeast-2.pooler.supabase.com:6543`) or POST to `/api/results`:

```sql
INSERT INTO results (
  roll_number, registration_no, board, exam, exam_year, student_name,
  father_name, mother_name, group_name, student_type, gender, date_of_birth,
  session, institute_name, gpa, result_status, remarks, subjects, ca_subjects
) VALUES (
  180365, 0, 'comilla', 'ssc', 2026, 'ISRAT JAHAN RUMI',
  'MD. KHALILUR RAHAMAN', 'RRUKSHANA', 'SCIENCE', 'REGULAR', 'Female', 'N/A',
  '2024-25', 'BADOR PUR AKBAR ALI HIGH SCHOOL', 3.83, 'Passed', '',
  '{"101":{"name":"BANGLA","grade":"A-","marks":"129"},"107":{"name":"ENGLISH","grade":"A-","marks":"120"},"109":{"name":"MATHEMATICS","grade":"D","marks":"037"},"150":{"name":"BANGLADESH AND GLOBAL STUDIES","grade":"A","marks":"078"},"126":{"name":"HIGHER MATHEMATICS","grade":"B","marks":"058"},"111":{"name":"ISLAM AND MORAL EDUCATION","grade":"A+","marks":"086"},"136":{"name":"PHYSICS","grade":"A-","marks":"068"},"137":{"name":"CHEMISTRY","grade":"A+","marks":"85"},"138":{"name":"BIOLOGY","grade":"A","marks":"073"},"154":{"name":"INFORMATION AND COMMUNICATION TECHNOLOGY","grade":"A","marks":"036"}}'::jsonb,
  '{"147":{"name":"PHYSICAL EDUCATION, HEALTH AND SPORTS","grade":"A+","marks":"048"},"156":{"name":"CAREER EDUCATION","grade":"A+","marks":"048"}}'::jsonb
)
ON CONFLICT (board, roll_number, registration_no) DO UPDATE SET
  student_name = EXCLUDED.student_name,
  father_name = EXCLUDED.father_name,
  mother_name = EXCLUDED.mother_name,
  group_name = EXCLUDED.group_name,
  student_type = EXCLUDED.student_type,
  gender = EXCLUDED.gender,
  date_of_birth = EXCLUDED.date_of_birth,
  session = EXCLUDED.session,
  institute_name = EXCLUDED.institute_name,
  gpa = EXCLUDED.gpa,
  result_status = EXCLUDED.result_status,
  remarks = EXCLUDED.remarks,
  subjects = EXCLUDED.subjects,
  ca_subjects = EXCLUDED.ca_subjects,
  updated_at = NOW();
```

---

### Step 4: Verify Live Student Portal Lookup

1. Make an HTTP GET request to `https://eboardresultsserver-v1.vercel.app/result?board=<BOARD>&exam=<EXAM>&year=<YEAR>&roll=<ROLL>`.
2. Confirm the page renders:
   - Student Summary Table (Roll, Reg, Name, Father/Mother Name, Board, Session, Group, Result Status)
   - Subject-wise Grade/Marks Table with **Marks** column (`Subject Code | Subject Name | Marks | Grade`) displaying exact numerical marks and upgraded grades.
   - Red notice at bottom: **`( UNDER REVIEW)`** in bold red text (`22px`).
