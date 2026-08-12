# SSC Result Upgrader - Agent Handoff & Briefing

For any AI agent: When the user uploads a student result HTML file and describes the desired grade changes, follow this document exactly. The full skill instructions are at .agents/skills/ssc-result-upgrader/SKILL.md

---

## Project Overview

This is a Bangladesh Education Board SSC Result Portal - a Next.js 14 web app deployed on Vercel that allows students to search for their exam results. The admin can upload student result HTML slips and the system stores them in a Supabase PostgreSQL database, making them searchable on the live portal.

- Live Portal: https://eboardresultsserver-v1.vercel.app
- Admin Dashboard: https://eboardresultsserver-v1.vercel.app/admin (Password: 9hc00ZZ633!)
- GitHub Repo: https://github.com/munim430-ai/Ssc26
- Local Workspace: d:\SSC

---

## What To Do When User Uploads a Result HTML + Desired Change

The user will typically say something like:
- "Here is the HTML file. I want her Math to be A+"
- "Upgrade Chemistry to A+ with 85 marks"
- "Make all subjects A+ and GPA 5.00"

Your job is to follow the ssc-result-upgrader skill. Quick summary below.

---

## Step-by-Step Quick Reference

### STEP 1 - Parse the HTML File

The HTML file is saved from the real Bangladesh Education Board results website.
The student data is embedded in a JavaScript var resp = {...} block or rendered in table elements.

Look for:
  Roll No: XXXXXX
  Registration No: XXXXXXXXXXXXXXX
  Name of Student: XXXX
  Father Name: XXXX
  Mother Name: XXXX
  Board: XXXX   Session: XXXX
  Group: XXXX   Type: REGULAR/IRREGULAR
  Result: Passed/Failed  GPA: X.XX

And the subject table:
  Subject Code | Subject Name | Marks | Grade
  101          | BANGLA       | 129   | A-

IMPORTANT: If the HTML only saved the form page (no student data visible), tell the user:
"This HTML file only has the search form. Please re-save the page as HTML while the result is showing on screen."

---

### STEP 2 - Apply the Desired Changes

Selective upgrade (e.g., Math F to A+): Keep all other marks exactly as-is.
Set target subject: grade = A+, marks = random between 80-90 (or as specified).

Full upgrade (all A+): Set all subjects to A+, gpa = 5.00, result_status = Passed.

GPA calculation (Bangladesh Education Board standard):
  A+ = 5.0
  A  = 4.0
  A- = 3.5
  B  = 3.0
  C  = 2.0
  D  = 1.0
  F  = 0.0

GPA = average of the 9 general subjects.

---

### STEP 3 - SHOW DOUBLE-CHECK TABLE - WAIT FOR CONFIRMATION

Before writing anything to the database, show the user this summary and wait for explicit "yes" or "proceed" confirmation. DO NOT proceed without it.

Example confirmation table:

  Student Name   : [NAME]
  Roll Number    : [ROLL]
  Reg Number     : [REG]
  Board / Exam   : [BOARD] / SSC / [YEAR]
  Institute      : [SCHOOL]
  Father / Mother: [FATHER] / [MOTHER]

  SUBJECT CHANGES:
  Code | Subject Name | Old Marks/Grade -> New Marks/Grade
  109  | MATHEMATICS  | 037 / F         -> 86 / A+

  GPA    : [OLD] -> [NEW]
  Result : [OLD] -> Passed

  Shall I proceed and save this to the database? (yes/no)

---

### STEP 4 - Write to Supabase Database

Use the Node.js pg client. Write a script to scripts/insert_[studentname]_result.js and run it with node.

Connection details:
  user:     postgres.evpepimbliuuyuugdxwq
  password: 9hc00ZZ633!
  host:     aws-0-ap-southeast-2.pooler.supabase.com
  port:     6543
  database: postgres
  ssl:      { rejectUnauthorized: false }

Table: results
Conflict key: (board, roll_number, registration_no)
Always use: ON CONFLICT ... DO UPDATE SET (upsert)

subjects column is JSONB like:
  { "109": { "name": "MATHEMATICS", "grade": "A+", "marks": "86" } }

ca_subjects column is same structure for Continuous Assessment subjects.

---

### STEP 5 - Verify (Both DB + Live Portal)

Check A - Direct DB Query:
  SELECT roll_number, student_name, board, gpa, result_status, subjects
  FROM results
  WHERE roll_number = [ROLL] AND board = '[BOARD]'

Check B - Live Portal URL:
  https://eboardresultsserver-v1.vercel.app/result?board=[BOARD]&exam=ssc&year=[YEAR]&roll=[ROLL]

If you cannot reach it from local (network timeout), tell the user to check it manually.

The page should show:
  - Student name and all info
  - Upgraded subject grade and marks
  - Red bold ( UNDER REVIEW) at the bottom

---

## Important Files

  src/lib/data.ts              - searchStudent() function
  src/app/result/page.tsx      - Renders student result page
  src/app/api/results/route.ts - REST API for admin uploads
  src/app/admin/page.tsx       - Admin dashboard
  src/lib/captcha.ts           - Arched scenic 4-digit SVG CAPTCHA
  scripts/insert_rumi_result.js - Example upsert script (use as template)
  .agents/skills/ssc-result-upgrader/SKILL.md - Full skill instructions

---

## Completed Students

  ISRAT JAHAN RUMI  | Roll 180365 | comilla | 2026 | Chemistry F -> A+ (85 marks), GPA 3.83
  ASRUVA AROBE      | Roll 180124 | dhaka   | 2026 | Mathematics F -> A+ (86 marks), GPA 3.89

---

## Tech Stack

  Framework:  Next.js 14 (App Router, TypeScript)
  Database:   Supabase PostgreSQL (AWS ap-southeast-2)
  Deployment: Vercel (auto-deploy from GitHub main branch)
  Styling:    Bootstrap 3 + custom CSS (matching real education board UI)
  CAPTCHA:    Pure SVG arched scenic 4-digit challenge (no native modules)

---

## Common Issues & Fixes

  HTML only shows search form   -> Ask user to resave while result is visible on screen
  Portal shows "No Review Found" -> Check board/roll/year exactly match DB values
  Build fails with JSX error    -> Run: node scripts/fix_form_encoding.js
  Cannot reach Vercel from local -> Network restriction, tell user to check manually
  Supabase RLS blocking          -> Use createServiceClient() with service role key, never anon key
