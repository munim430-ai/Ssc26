# SSC Student Result System — Design Spec

**Date:** 2026-08-11
**Status:** Approved (Sections 1–5) — **Revised 2026-08-11** after reviewing the pre-existing scaffold
**Stack:** Next.js 14 (App Router, TypeScript) + Supabase (cloud Postgres)

> ## Revision note (2026-08-11)
> A prior session built a substantial Student Portal in `ssc-result-system/src/` that closely matches the reference HTML:
> - `app/page.tsx` + `components/StudentSearchForm.tsx` — search form with all dropdowns, Roll/Reg toggle for Individual, EIIN/District/Center fields for Institution.
> - `app/result/page.tsx` + `components/BoardHeader.tsx` + `components/PrintButton.tsx` — result sheet with `.table-striped` tables, green header, Search Again + Print buttons.
> - `app/globals.css` (146 lines) + `app/bootstrap.min.css` (121 KB real Bootstrap 3.4.1) + `public/logo.png` — faithful visual foundation.
>
> **This portal is worth keeping.** The original plan (wipe `src/`, rebuild from scratch) is replaced with an **adapt-in-place** approach:
> - **Keep** all portal UI components, CSS, and the logo.
> - **Remove** the client-side CAPTCHA (`StudentSearchForm.tsx`) — spec §11 holds (no CAPTCHA in v1).
> - **Keep** the "Institution Result" dropdown option and its empty EIIN/District/Center fields, with the existing "Institution result search is not available" message (visual fidelity to the reference, even though the branch is non-functional in v1).
> - **Replace** the data layer (`lib/data.ts`, `lib/types.ts`) which currently targets a 10-table over-normalized schema that doesn't exist. Rewrite it to target the 3-table schema in §4.
> - **Build** the missing admin side (auth, middleware, dashboard CRUD with dynamic subject rows) per the original plan.
>
> The schema (§4), auth (§5), API (§6), and admin dashboard (§8) sections below are unchanged. Only the student-portal implementation (§7) and the plan's portal tasks change — now "adapt existing" rather than "build new."

## 1. Goal

A single web application with two strictly isolated surfaces:

- **Admin Dashboard (private):** one administrator adds/edits/deletes student results behind a password gate.
- **Student Portal (public):** anyone can look up a single student's result by entering matching credentials (Board + Roll + Registration), styled to match the Bangladesh Education Board result portal.

Reference UI files (in repo root):

- `regristation select.html` — public search form (green `#14A44D` header, dropdowns, Roll/Registration fields appear only for "Individual Result").
- `WEB BASED RESULT PUBLICATION SYSTEM FOR EDUCATION BOARD.html` — result sheet layout (Student Information Summary table + Subject-wise Grade tables, green striped theme).

## 2. Decisions (locked)

| Area | Decision |
|---|---|
| Backend / DB | Supabase (cloud Postgres) |
| Admin auth | Single password (`ADMIN_PASSWORD` env var) → HMAC-signed `admin_session` httpOnly cookie |
| Subject storage | Flexible JSONB columns + dynamic subject rows in the admin form |
| Public lookup key | `board + roll_number + registration_no` (unique constraint) |
| Public writes | None. Anon key is read-only via RLS. |

The admin password lives only in the developer's local `.env.local`; it is never committed, logged, or embedded in code beyond an env-var reference.

## 3. Architecture & Routing

```
ssc-result-system/
├─ .env.local                  # secrets (gitignored)
├─ .env.example                # template
├─ package.json                # next@14, react@18, @supabase/ssr, @supabase/supabase-js
├─ next.config.js, tsconfig.json
├─ middleware.ts               # guards /admin/* (cookie verify)
├─ supabase/migrations/001_schema.sql
└─ src/
   ├─ app/
   │  ├─ layout.tsx, globals.css
   │  ├─ (public)/             # student portal, no auth
   │  │  ├─ page.tsx           # search/login form
   │  │  ├─ result/page.tsx    # result sheet
   │  │  └─ portal.css
   │  ├─ admin/
   │  │  ├─ login/page.tsx
   │  │  ├─ logout/route.ts
   │  │  ├─ layout.tsx         # guarded shell
   │  │  ├─ page.tsx           # dashboard
   │  │  └─ admin.css
   │  └─ api/results/
   │     ├─ route.ts           # GET (list/lookup), POST (create)
   │     └─ [id]/route.ts      # GET, PATCH, DELETE
   └─ lib/
      ├─ supabase.ts           # browser client (anon key)
      ├─ supabase-server.ts    # server client (service role for writes)
      ├─ auth.ts               # HMAC sign/verify cookie
      ├─ grades.ts             # GRADES const
      └─ types.ts
```

### Isolation guarantees

- **Public routes** only ever call the read-only `GET` lookup endpoint and never receive other students' rows (server filters by exact key match).
- **Admin routes** (`/admin/*` except `/admin/login`) are gated by `middleware.ts` verifying the signed cookie.
- **API write routes** re-verify the cookie server-side before touching the DB (defense in depth).
- **RLS** at the DB layer: anon key = SELECT only; writes require the service role key, which is server-only and never shipped to the browser.

### What gets replaced from the existing scaffold

The existing `ssc-result-system/` directory has an over-normalized incomplete scaffold (8 lookup tables, no UI, no auth). We wipe `src/` and `supabase/migrations/`, keep `package.json` deps (bumping as needed), `next.config.js`, `tsconfig.json`.

## 4. Database Schema

### `results` (core table)

```sql
CREATE TABLE results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number     BIGINT      NOT NULL,
  registration_no BIGINT      NOT NULL,
  board           TEXT        NOT NULL,
  exam            TEXT        NOT NULL,
  exam_year       INTEGER     NOT NULL,
  student_name    TEXT        NOT NULL,
  father_name     TEXT,
  mother_name     TEXT,
  group_name      TEXT,
  student_type    TEXT        DEFAULT 'REGULAR',
  gender          TEXT,
  date_of_birth   TEXT,
  session         TEXT,
  institute_name  TEXT,
  gpa             NUMERIC(3,2),
  result_status   TEXT,
  remarks         TEXT,
  subjects        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ca_subjects     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_student UNIQUE (board, roll_number, registration_no)
);

CREATE INDEX idx_results_lookup ON results (board, roll_number, registration_no);
```

**`subjects` / `ca_subjects` JSONB shape:**

```json
{
  "101": { "name": "BANGLA",   "grade": "A+" },
  "107": { "name": "ENGLISH",  "grade": "A"  },
  "109": { "name": "MATHEMATICS", "grade": "A+" }
}
```

Key = subject code (string). Each value = `{ name, grade }`. Continuous Assessment subjects go in `ca_subjects` so they render in a separate table on the result sheet.

### Grade vocabulary

Constrained at the app layer (admin `<select>`); the 9 allowed values:

```
A+, A, A-, B+, B, B-, C, D, F
```

`src/lib/grades.ts` exports `GRADES = ['A+','A','A-','B+','B','B-','C','D','F']`.

### Reference tables

```sql
CREATE TABLE boards (
  code TEXT PRIMARY KEY,   -- 'dhaka','chittagong','comilla','dinajpur','jessore',
  name TEXT NOT NULL       -- 'Dhaka',...
);
CREATE TABLE exams (
  code TEXT PRIMARY KEY,   -- 'jsc','ssc','hsc','dibs'
  name TEXT NOT NULL
);
```

Seeded with the exact 11 boards (`barisal, chittagong, comilla, dhaka, dinajpur, jessore, madrasah, mymensingh, rajshahi, sylhet, tec`) and 4 exams from the reference HTML.

### Row-Level Security

```sql
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_results" ON results
  FOR SELECT TO anon, authenticated USING (true);
```

The service role (used only server-side) bypasses RLS, so no INSERT/UPDATE/DELETE policy is needed.

## 5. Authentication Design

Single-password flow, no third-party auth provider:

1. **Login** (`POST /admin/login`):
   - Compare posted password to `ADMIN_PASSWORD` (constant-time) → on match, build payload `{ role:'admin', exp: now + 7d }`.
   - HMAC-sign it with `AUTH_SECRET`, set `admin_session` cookie: `httpOnly + Secure + SameSite=Lax + Path=/`.
2. **Guard** (`middleware.ts`): on `/admin/*` (except `/admin/login`), read cookie, verify HMAC, check `exp`. Fail → redirect `/admin/login`.
3. **Logout** (`POST /admin/logout`): clear cookie.
4. **API writes** (`POST/PATCH/DELETE /api/results*`): re-verify the cookie server-side; use service role key for DB writes.

## 6. API Surface

| Method + path | Caller | Auth | Supabase key | Purpose |
|---|---|---|---|---|
| `GET /api/results?board=&roll=&reg=` | Public | none | anon | Student lookup; returns the one match or 404 |
| `GET /api/results` (no query) | Admin | cookie | anon | List all for dashboard table |
| `GET /api/results/:id` | Admin | cookie | anon | Fetch one for the edit form |
| `POST /api/results` | Admin | cookie | service role | Create |
| `PATCH /api/results/:id` | Admin | cookie | service role | Update |
| `DELETE /api/results/:id` | Admin | cookie | service role | Delete |

**Public lookup contract:**

- Request: `?board=dhaka&roll=140884&reg=1520930524`
- Server: `SELECT … WHERE board=$1 AND roll_number=$2 AND registration_no=$3 LIMIT 1`
- Match → `200 { …result }`; client stores it and routes to `/result`.
- No match → `404 { error:'No result found for the given credentials' }`; client shows inline `.alert-info` error.

No CAPTCHA in v1. Can be layered on later if the public URL gets abused.

## 7. Frontend — Student Portal

CSS ported from `regristation select.html`'s `<style>` block so the look matches exactly: green `#14A44D` header, `.table-striped` tables with green header rows, `.panel` containers, `.btn-success` / `.btn-info` buttons.

### 7.1 Search/login page — existing `src/app/page.tsx` + `components/StudentSearchForm.tsx`

**Already built** — replicates `regristation select.html`:

- Green header (`#main-header2`) via `components/BoardHeader.tsx`, with `/logo.png`.
- `.panel` "Please provide the following information to view result".
- Dropdowns: Board (11), Exam (4), Year (1996–current), Type of Result.
- **Type of Result:** "Individual/Detailed Result" **and** "Institution Result" both offered. Individual is fully functional; Institution renders its EIIN/District/Center fields but shows "Institution result search is not available in this system." on submit (kept for visual fidelity to the reference).
- Roll Number + Registration Number fields appear only when Individual is selected (mirrors the reference's `show_result_type()` JS).
- **CAPTCHA removed** — the prior canvas-based client CAPTCHA is stripped from `StudentSearchForm.tsx`. Submit goes straight to lookup.
- Submit → `GET /api/results?board=&roll=&reg=` → on success `router.push('/result?...')`; on miss show inline `.alert-danger` "Result not found…".
- Footer `#dev_info`: "Powered by Inter-Education Board Coordination Committee" etc.

**Changes required to the existing form:** delete all CAPTCHA state/logic (`captcha`, `captchaCode`, `captchaDataUrl`, `generateCaptcha`, the captcha `<div>` row, the captcha-check in `handleSubmit`); leave everything else.

### 7.2 Result sheet — existing `src/app/result/page.tsx` + `components/PrintButton.tsx`

**Already built** — replicates `WEB BASED RESULT PUBLICATION SYSTEM…html`:

- `.page-header h3` "Result of {Exam} Examination - {Year}".
- `.btn-group` with "Search Again" (green `Link`) + `PrintButton` (cyan, `window.print()`).
- **Table 1 — Student Information Summary** (`.table-striped`, `colspan=4` header): Roll No / Registration No, Name, Father, Mother, Board / Session, Group / Type / Gender, Result / DOB, Institute.
- **Table 2 — Subject-wise Grade/Marks**: Subject Code, Subject Name, Grade. Rows from `student.grades` where `is_continuous_assessment` is false.
- **Table 3 — Subject-wise Grade/Marks for Continuous Assessment** (rendered only if any CA grades exist): same columns.
- **Remarks** in an `.alert-info` box beneath the tables (joining `student.remarks[].remark_text`).

**Changes required to the existing page:** it currently reads from a deeply-nested relational shape (`student.grades[].subject.code`, `student.board.name`, etc.) produced by the old 10-table schema. After the schema swap it must read from the flatter `results` row with JSONB `subjects`/`ca_subjects` maps. Concretely: replace the `grades.filter(...)` logic with `Object.entries(result.subjects)` / `Object.entries(result.ca_subjects)`, and replace `student.board?.name` with `result.board` (looked up against the `boards` table for display name).

## 8. Frontend — Admin Dashboard

Separate, cleaner style (not mimicking the govt portal). Uses the same Bootstrap-like classes for consistency.

### 8.1 `/admin/login`

Centered card: password input, submit, inline error on wrong password.

### 8.2 `/admin` (guarded dashboard)

Two-panel layout:

- **Left — Add/Edit Result form:** Roll Number, Registration No, Board, Exam, Year, Student Name, Father, Mother, Group, Type, Gender, DOB, Session, Institute, GPA, Result status, Remarks, then **dynamic subject rows**:
  - Each row: subject code (text) + subject name (text) + grade (`<select>` of the 9 grades) + remove ✕.
  - "Add Subject" appends a row; packing into `subjects` JSONB on submit.
  - A second dynamic group for **Continuous Assessment** subjects → `ca_subjects`.
  - Validation: roll + registration numeric, board/exam required, ≥1 subject required; duplicate `(board,roll,reg)` surfaced clearly (UNIQUE violation).
- **Right — All Results table:** searchable list (Roll / Name / Board) with Edit (loads into the left form) and Delete actions.

## 9. Environment Variables

```
ADMIN_PASSWORD=                  # set by developer
AUTH_SECRET=                     # any random 32+ char string
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`.env.example` ships with empty placeholders; `.env.local` holds real values and is gitignored.

## 10. Setup Steps

1. Create a Supabase project → copy URL, anon key, service role key.
2. Run `supabase/migrations/001_schema.sql` in the Supabase SQL editor (tables + seed + RLS).
3. Fill `.env.local`.
4. `npm install && npm run dev` → `http://localhost:3001` (portal), `http://localhost:3001/admin` (dashboard, password-gated).

> **Port note:** the `dev` script runs `next dev -p 3001` because port 3000 is already occupied in this repo by the unrelated `firecrawl-website-cloner` Express server (`D:\SSC\server.mjs`, PID at runtime varies). The two apps coexist without conflict.

## 11. Out of Scope (v1)

- Institution / district / center / EIIN result **data** — the dropdown option and fields are kept in the UI for fidelity, but the branch returns "not available" (no EIIN/center table is modeled).
- CAPTCHA on the public search — **removed** from the existing form.
- Multiple admin accounts / role management.
- Bulk import of results.
- PDF download / testimonial generation.
