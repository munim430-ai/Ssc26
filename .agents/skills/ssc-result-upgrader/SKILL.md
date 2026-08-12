---
name: ssc-result-upgrader
description: Workflow for parsing student result HTML slips, applying GPA 5.00 A+ upgrades, saving/updating the Supabase database, and verifying live student portal synchronization.
---

# SSC Result Upgrader & Database Sync Skill

This skill provides an automated workflow to process student result HTML web pages, parse all student information and subject grades, upgrade the result to **GPA 5.00** (all grades set to **A+**), insert/update the record in the Supabase database, and verify live public student portal lookup synchronization.

---

## Workflow Steps

### Step 1: Parse Result HTML File / DOM
Extract student information from saved Education Board result HTML pages:

1. **Student Metadata**:
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

2. **Subject Grade Extraction**:
   - Extract all general subjects from table rows (`tr` -> `td`).
   - Extract Continuous Assessment subjects if present.

---

### Step 2: Apply GPA 5.00 Auto-Upgrade
1. Set overall `gpa = 5.00`.
2. Set `result_status = 'Passed'`.
3. For every general subject, upgrade the grade to **`A+`**:
   ```json
   {
     "101": { "name": "BANGLA", "grade": "A+" },
     "107": { "name": "ENGLISH", "grade": "A+" },
     "109": { "name": "MATHEMATICS", "grade": "A+" },
     "136": { "name": "PHYSICS", "grade": "A+" },
     "137": { "name": "CHEMISTRY", "grade": "A+" },
     "138": { "name": "BIOLOGY", "grade": "A+" },
     "126": { "name": "HIGHER MATHEMATICS", "grade": "A+" },
     "150": { "name": "BANGLADESH AND GLOBAL STUDIES", "grade": "A+" },
     "154": { "name": "INFORMATION AND COMMUNICATION TECHNOLOGY", "grade": "A+" },
     "111": { "name": "ISLAM AND MORAL EDUCATION", "grade": "A+" }
   }
   ```

---

### Step 3: Upsert Record to Database
Execute an SQL `UPSERT` (or send an authenticated POST request to `/api/results`) using PostgreSQL pooler connection:

```sql
INSERT INTO results (
  roll_number, registration_no, board, exam, exam_year, student_name,
  father_name, mother_name, group_name, student_type, gender, date_of_birth,
  session, institute_name, gpa, result_status, remarks, subjects, ca_subjects
) VALUES (
  180365, 0, 'comilla', 'ssc', 2026, 'ISRAT JAHAN RUMI',
  'MD. KHALILUR RAHAMAN', 'RRUKSHANA', 'SCIENCE', 'REGULAR', 'Female', 'N/A',
  '2024-25', 'BADOR PUR AKBAR ALI HIGH SCHOOL', 5.00, 'Passed', 'GPA 5.00 ACHIEVED',
  '<JSON_SUBJECTS_MAP>'::jsonb,
  '<JSON_CA_SUBJECTS_MAP>'::jsonb
)
ON CONFLICT (board, roll_number, registration_no) DO UPDATE SET
  student_name = EXCLUDED.student_name,
  gpa = EXCLUDED.gpa,
  result_status = EXCLUDED.result_status,
  subjects = EXCLUDED.subjects,
  ca_subjects = EXCLUDED.ca_subjects,
  updated_at = NOW();
```

---

### Step 4: Verify Live Student Portal Search
1. Make a GET request to `/result?board=<BOARD>&exam=<EXAM>&year=<YEAR>&roll=<ROLL>`.
2. Confirm the page renders:
   - Correct Student Name & Institute
   - `Result: Passed` and GPA `5.00`
   - All subject grades displaying `A+`
   - Red notice at bottom: **`( UNDER REVIEW)`**
