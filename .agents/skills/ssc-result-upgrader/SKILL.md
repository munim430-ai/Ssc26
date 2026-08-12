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
   - Set `marks` = `"85"` (or a random mark between 80-90 unless specified)
3. Set `result_status = "Passed"`.
4. Calculate official Bangladesh Education Board GPA:
   - **Grade Points**: `A+`=5.0, `A`=4.0, `A-`=3.5, `B`=3.0, `C`=2.0, `D`=1.0, `F`=0.0.
   - Calculate 9 main general subjects average + 4th subject bonus points (> 2.0).

#### Mode 2: Full GPA 5.00 Upgrade
Set all general subject grades to **`A+`**, `gpa = 5.00`, and `result_status = "Passed"`.

---

### Step 3: ⚠️ DOUBLE-CHECK BEFORE SUBMITTING

**MANDATORY**: Before executing the database upsert, present a complete summary to the user showing **exactly** what will be changed and ask for explicit confirmation.

Show a table in this format:

```
╔══════════════════════════════════════════════════════════════╗
║           RESULT UPGRADE SUMMARY - PLEASE CONFIRM           ║
╠══════════════════════════════════════════════════════════════╣
║ Student Name : [NAME]                                        ║
║ Roll Number  : [ROLL]                                        ║
║ Board        : [BOARD]  |  Exam: [EXAM]  |  Year: [YEAR]    ║
║ Institute    : [SCHOOL]                                      ║
╠══════════════════════════════════════════════════════════════╣
║ SUBJECT CHANGES:                                             ║
║  Subject Code | Subject Name   | Old Grade | New Grade/Marks ║
║  [CODE]       | [SUBJECT]      | [OLD]  →  | A+ (85 marks)   ║
╠══════════════════════════════════════════════════════════════╣
║ GPA           : [OLD GPA]  →  [NEW GPA]                      ║
║ Result Status : [OLD]  →  Passed                             ║
╚══════════════════════════════════════════════════════════════╝
Proceed with database update? (yes/no)
```

**DO NOT proceed to Step 4 until the user explicitly confirms with "yes" or "proceed".**

---

### Step 4: Upsert Record to Supabase PostgreSQL Database

Only execute after user confirmation in Step 3.

Execute an SQL `UPSERT` via Node.js `pg` pooler connection to `aws-0-ap-southeast-2.pooler.supabase.com:6543`:

```sql
INSERT INTO results (
  roll_number, registration_no, board, exam, exam_year, student_name,
  father_name, mother_name, group_name, student_type, gender, date_of_birth,
  session, institute_name, gpa, result_status, remarks, subjects, ca_subjects
) VALUES (
  [ROLL], 0, '[BOARD]', '[EXAM]', [YEAR], '[NAME]',
  '[FATHER]', '[MOTHER]', '[GROUP]', '[TYPE]', '[GENDER]', '[DOB]',
  '[SESSION]', '[INSTITUTE]', [GPA], 'Passed', '',
  '[SUBJECTS_JSON]'::jsonb,
  '[CA_SUBJECTS_JSON]'::jsonb
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

Connection details:
- Host: `aws-0-ap-southeast-2.pooler.supabase.com`
- Port: `6543`
- User: `postgres.evpepimbliuuyuugdxwq`
- Password: `9hc00ZZ633!`
- Database: `postgres`
- SSL: `{ rejectUnauthorized: false }`

---

### Step 5: Verify Live Student Portal Lookup

After the upsert, run TWO verification checks:

**Check A — Direct Database Query:**
```js
SELECT roll_number, student_name, board, gpa, result_status, subjects
FROM results
WHERE roll_number = [ROLL] AND board = '[BOARD]'
```
Confirm all subject grades and marks match the intended update.

**Check B — Live HTTP GET Request:**
```
GET https://eboardresultsserver-v1.vercel.app/result?board=[BOARD]&exam=[EXAM]&year=[YEAR]&roll=[ROLL]
```
Confirm the HTTP response (or Invoke-WebRequest on Windows) returns a page with:
- Student name visible
- Upgraded subject grade/marks visible
- `( UNDER REVIEW)` notice present at bottom

If Check B returns "No Review Found", check:
1. Is the `board` value in the URL exactly matching what's stored in DB (lowercase)?
2. Is `exam_year` stored as integer, not string?
3. Is `exam` stored correctly (`ssc`, not `SSC`)?
4. Try the `/api/results?board=...&exam=...&year=...&roll=...` endpoint directly to isolate API vs rendering issues.

Report results of both checks to the user before completing.
