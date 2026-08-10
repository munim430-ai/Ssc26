# SSC Student Result System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js + Supabase app with a password-gated Admin Dashboard (CRUD on student results) and a public Student Portal (search by Board+Roll+Reg, render an exact match of the Bangladesh Education Board result sheet).

**Architecture:** Single Next.js 14 App Router app with two isolated route trees: `(public)/` for the student portal and `admin/` for the dashboard (gated by a signed-cookie middleware). Supabase Postgres stores results with a JSONB `subjects`/`ca_subjects` column; RLS allows public read-only access while writes require the server-side service role key.

**Tech Stack:** Next.js 14.2 (App Router, TypeScript), React 18, Supabase JS v2 + SSR, Vitest for unit tests. Bootstrap-3-derived CSS ported from the reference HTML.

## Global Constraints

- **Port:** dev server runs on `3001` (`next dev -p 3001`) — port 3000 is taken by the unrelated firecrawl server and must not be touched.
- **Secrets:** `ADMIN_PASSWORD`, `AUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` live only in `ssc-result-system/.env.local` (gitignored). Never commit them or embed the literal admin password in code.
- **Admin password (user-supplied, for the developer's `.env.local` only):** `9hc00ZZ633!`
- **Grade vocabulary:** exactly `['A+','A','A-','B+','B','B-','C','D','F']` — enforced via `<select>` in the admin form and exported from `src/lib/grades.ts`.
- **Public lookup key:** `board + roll_number + registration_no` (UNIQUE constraint in DB).
- **Lookup behavior:** exact match returns the one row; no match returns HTTP 404. Public never sees other rows.
- **UI fidelity:** public portal CSS must be ported from `regristation select.html` / `WEB BASED RESULT PUBLICATION SYSTEM FOR EDUCATION BOARD.html` (green `#14A44D` header, `.table-striped` tables with green thead, `.panel` containers, `.btn-success`/`.btn-info` buttons).
- **Working directory for all `npm`/`next` commands:** `D:\SSC\ssc-result-system` (the scaffold lives in this subfolder, NOT the repo root which holds the unrelated firecrawl app).
- **Type of Result:** only "Individual/Detailed Result" is offered in v1. "Institution Result" is omitted (no EIIN/center data model).
- **TypeScript strict mode** is on (`tsconfig.json`).

---

## File Structure

> **Revision (2026-08-11):** a prior session built a faithful Student Portal in `src/app/page.tsx`, `src/app/result/page.tsx`, `src/components/{BoardHeader,StudentSearchForm,PrintButton}.tsx`, `src/app/globals.css`, `src/app/bootstrap.min.css`, and `public/logo.png`. **We keep all of it.** Tasks below adapt the existing files rather than creating new ones for the portal.

```
ssc-result-system/
├─ .env.local                     # secrets (gitignored)
├─ .env.example                   # template, committed
├─ package.json                   # deps + dev script on port 3001
├─ next.config.js
├─ tsconfig.json
├─ middleware.ts                  # NEW — guards /admin/*
├─ supabase/migrations/001_schema.sql   # NEW — replaces old 10-table schema
├─ vitest.config.ts               # NEW
├─ public/logo.png                # EXISTS
└─ src/
   ├─ app/
   │  ├─ layout.tsx               # EXISTS — keep
   │  ├─ globals.css              # EXISTS — keep; add admin styles at bottom
   │  ├─ bootstrap.min.css        # EXISTS — keep (real Bootstrap 3.4.1)
   │  ├─ page.tsx                 # EXISTS — keep (portal home)
   │  ├─ result/page.tsx          # EXISTS — REWRITE data reads to new schema
   │  ├─ admin/                   # NEW — auth + dashboard
   │  │  ├─ login/page.tsx
   │  │  ├─ login/route.ts
   │  │  ├─ logout/route.ts
   │  │  ├─ layout.tsx
   │  │  ├─ page.tsx              # replaces the existing stub
   │  │  └─ admin.css
   │  └─ api/results/             # NEW
   │     ├─ route.ts              # GET list/lookup, POST create
   │     └─ [id]/route.ts         # GET, PATCH, DELETE
   ├─ components/
   │  ├─ BoardHeader.tsx          # EXISTS — keep
   │  ├─ PrintButton.tsx          # EXISTS — keep
   │  └─ StudentSearchForm.tsx    # EXISTS — EDIT: strip CAPTCHA
   └─ lib/
      ├─ supabase-browser.ts      # NEW (anon client)
      ├─ supabase-server.ts       # EXISTS — keep the createServerClient() factory
      ├─ auth.ts                  # NEW — HMAC sign/verify cookie
      ├─ grades.ts                # NEW — GRADES const + validator
      ├─ types.ts                 # EXISTS — REWRITE for new schema
      └─ data.ts                  # EXISTS — REWRITE for new schema
```

**Responsibility split (unchanged):**
- `lib/auth.ts` — pure crypto; no Next imports; unit-testable.
- `lib/grades.ts` — pure const + validator; unit-testable.
- `lib/supabase-browser.ts` — anon client used only in Client Components.
- `lib/supabase-server.ts` — service-role factory used only in Route Handlers / Server Components; never imported by browser code.
- API routes are thin controllers: parse → auth check → call Supabase → shape response.
- Public components never import `supabase-server.ts` or `auth.ts`.

---

### Task 1: Project config (adapt existing scaffold)

**Files:**
- Modify: `ssc-result-system/package.json` (add vitest, set dev port 3001)
- Modify: `ssc-result-system/tsconfig.json` (no change expected — verify)
- Keep as-is: `ssc-result-system/next.config.js`
- Create: `ssc-result-system/.env.example`
- Create: `ssc-result-system/.env.local`
- Create: `ssc-result-system/.gitignore`
- Create: `ssc-result-system/vitest.config.ts`
- Delete: `ssc-result-system/supabase/migrations/001_initial_schema.sql` (old 10-table schema; replaced in Task 2)

**Do NOT delete** anything under `src/` — the portal UI is kept and adapted in later tasks.

**Interfaces:**
- Produces: a runnable `npm install && npm run dev` on port 3001.

- [ ] **Step 1: Delete only the old migration file**

Run from `D:\SSC\ssc-result-system`:
```bash
rm -f supabase/migrations/001_initial_schema.sql
```

- [ ] **Step 2: Update `package.json`** — add vitest, set dev/start ports to 3001

Replace the `scripts` and `devDependencies` blocks so the file reads:

```json
{
  "name": "ssc-result-system",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "18.3.0",
    "react-dom": "18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0"
  },
  "devDependencies": {
    "@types/node": "20.14.0",
    "@types/react": "18.3.0",
    "@types/react-dom": "18.3.0",
    "typescript": "5.5.0",
    "eslint": "8.57.0",
    "eslint-config-next": "14.2.0",
    "vitest": "^1.6.0"
  }
}
```

```json
{
  "name": "ssc-result-system",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "18.3.0",
    "react-dom": "18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0"
  },
  "devDependencies": {
    "@types/node": "20.14.0",
    "@types/react": "18.3.0",
    "@types/react-dom": "18.3.0",
    "typescript": "5.5.0",
    "eslint": "8.57.0",
    "eslint-config-next": "14.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 3: Verify existing `tsconfig.json`**

The existing file already targets ES2020 with `strict: true`, `jsx: preserve`, and the `@/*` path alias — no changes needed. Confirm:

```bash
cd /d/SSC/ssc-result-system
cat tsconfig.json
```
Expected: `paths: { "@/*": ["./src/*"] }` and `strict: true`. If the alias is missing, add it; otherwise leave the file alone.

- [ ] **Step 4: Verify existing `next.config.js`**

```bash
cat next.config.js
```
Expected: a minimal config with `reactStrictMode`. Leave as-is.

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
.next/
out/
.env
.env.local
.env.*.local
*.log
.DS_Store
next-env.d.ts
.vercel
```

- [ ] **Step 6: Write `.env.example`**

```
# Copy to .env.local and fill in real values. Never commit .env.local.
ADMIN_PASSWORD=9hc00ZZ633!
AUTH_SECRET=replace-with-a-random-32-plus-char-string
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 7: Write `.env.local`** (developer fills in Supabase keys later; AUTH_SECRET generated now)

Generate a random AUTH_SECRET locally:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Write `ssc-result-system/.env.local`:
```
ADMIN_PASSWORD=9hc00ZZ633!
AUTH_SECRET=<paste-generated-hex>
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 8: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 9: Install deps and verify dev server boots on 3001**

```bash
cd /d/SSC/ssc-result-system
npm install
```

Then verify the existing portal compiles (it will throw at runtime because `lib/data.ts` still points at the old schema — that's fine; we only need it to *typecheck/build*):

```bash
npm run build
```
Expected: build may report errors from `lib/data.ts` / `lib/types.ts` referencing old tables. **That's expected** — Tasks 3 and the data-layer rewrite fix it. If the build fails for *unrelated* reasons (missing deps, syntax), fix those now.

- [ ] **Step 10: Commit**

```bash
cd /d/SSC
git add ssc-result-system/package.json ssc-result-system/.gitignore ssc-result-system/.env.example ssc-result-system/vitest.config.ts
git commit -m "chore: config for ssc-result-system (port 3001, vitest); keep existing portal"
```

---

### Task 2: Supabase schema migration

**Files:**
- Create: `ssc-result-system/supabase/migrations/001_schema.sql`

**Interfaces:**
- Produces: the `results`, `boards`, `exams` tables, the `uq_student` UNIQUE constraint, `idx_results_lookup` index, RLS policy, and seed rows for 11 boards + 4 exams.

- [ ] **Step 1: Write the migration SQL**

`ssc-result-system/supabase/migrations/001_schema.sql`:

```sql
-- Reference tables --------------------------------------------------------
CREATE TABLE IF NOT EXISTS boards (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS exams (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO boards (code, name) VALUES
  ('barisal','Barisal'),('chittagong','Chittagong'),('comilla','Comilla'),
  ('dhaka','Dhaka'),('dinajpur','Dinajpur'),('jessore','Jessore'),
  ('madrasah','Madrasah'),('mymensingh','Mymensingh'),('rajshahi','Rajshahi'),
  ('sylhet','Sylhet'),('tec','Technical')
ON CONFLICT (code) DO NOTHING;

INSERT INTO exams (code, name) VALUES
  ('jsc','JSC/JDC'),('ssc','SSC/Dakhil/Equivalent'),
  ('hsc','HSC/Alim/Equivalent'),('dibs','DIBS (Diploma in Business Studies)')
ON CONFLICT (code) DO NOTHING;

-- Core results table ------------------------------------------------------
CREATE TABLE IF NOT EXISTS results (
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

CREATE INDEX IF NOT EXISTS idx_results_lookup
  ON results (board, roll_number, registration_no);

-- auto-touch updated_at ---------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS results_updated_at ON results;
CREATE TRIGGER results_updated_at BEFORE UPDATE ON results
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row-Level Security ------------------------------------------------------
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_results" ON results;
CREATE POLICY "public_read_results" ON results
  FOR SELECT TO anon, authenticated USING (true);
```

- [ ] **Step 2: Commit**

```bash
cd /d/SSC
git add ssc-result-system/supabase/migrations/001_schema.sql
git commit -m "feat(db): schema, RLS, seed for boards/exams/results"
```

- [ ] **Step 3: Apply the migration (manual, requires Supabase project)**

> The developer runs this once they have a Supabase project: open the Supabase Dashboard → SQL Editor → paste the contents of `001_schema.sql` → Run. No automated test; the seed rows should appear in `boards` (11) and `exams` (4).

---

### Task 3: Types and grade vocabulary (replace existing `types.ts`)

**Files:**
- Replace: `ssc-result-system/src/lib/types.ts` (currently holds the old 10-table type set — overwrite it)
- Create: `ssc-result-system/src/lib/grades.ts`
- Create: `ssc-result-system/src/lib/grades.test.ts`

**Interfaces:**
- Produces: `Grade` type, `GRADES` array, `isGrade(x): x is Grade`, `SubjectEntry` type, `Result` type (DB row), `ResultInput` type (admin form payload), `Board`, `Exam` reference-table types.

> **Note:** The old `types.ts` exports `EducationBoard`, `Examination`, `ExaminationYear`, `SubjectGroup`, `StudentType`, `Gender`, `Subject`, `Student`, `StudentGrade` — these are referenced by the existing `lib/data.ts` and `components/StudentSearchForm.tsx`. Those files are rewritten/edited in Task 3b and Task 13, so removing the old types here will temporarily break compilation. That's fine; the build only needs to be green again after Task 14.

- [ ] **Step 1: Write the failing test**

`ssc-result-system/src/lib/grades.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GRADES, isGrade } from './grades';

describe('grades', () => {
  it('lists the 9 allowed grades', () => {
    expect(GRADES).toEqual(['A+','A','A-','B+','B','B-','C','D','F']);
  });
  it('accepts valid grades', () => {
    expect(isGrade('A+')).toBe(true);
    expect(isGrade('F')).toBe(true);
  });
  it('rejects invalid grades', () => {
    expect(isGrade('Z')).toBe(false);
    expect(isGrade('')).toBe(false);
    expect(isGrade('a+')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /d/SSC/ssc-result-system
npx vitest run src/lib/grades.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write `grades.ts`**

```ts
export const GRADES = ['A+','A','A-','B+','B','B-','C','D','F'] as const;
export type Grade = typeof GRADES[number];

export function isGrade(x: unknown): x is Grade {
  return typeof x === 'string' && (GRADES as readonly string[]).includes(x);
}
```

- [ ] **Step 4: Write `types.ts`** (overwrite the existing file)

```ts
export type SubjectEntry = { name: string; grade: string };
export type SubjectMap = Record<string, SubjectEntry>; // keyed by subject code (string)

export type Result = {
  id: string;
  roll_number: number;
  registration_no: number;
  board: string;
  exam: string;
  exam_year: number;
  student_name: string;
  father_name: string | null;
  mother_name: string | null;
  group_name: string | null;
  student_type: string | null;
  gender: string | null;
  date_of_birth: string | null;
  session: string | null;
  institute_name: string | null;
  gpa: number | null;
  result_status: string | null;
  remarks: string | null;
  subjects: SubjectMap;
  ca_subjects: SubjectMap;
  created_at: string;
  updated_at: string;
};

// Payload the admin form sends (no id/timestamps)
export type ResultInput = Omit<Result, 'id' | 'created_at' | 'updated_at'>;

// Reference tables
export type Board = { code: string; name: string };
export type Exam = { code: string; name: string };
```

- [ ] **Step 5: Run test to verify pass**

```bash
npx vitest run src/lib/grades.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/lib/
git commit -m "feat(lib): result types and grade vocabulary"
```

---

### Task 3b: Rewrite data layer for the new schema

The existing `src/lib/data.ts` queries the old 10-table model. We replace its contents so the existing portal pages (`app/page.tsx`, `app/result/page.tsx`) get data from the new `results`/`boards`/`exams` tables. The public function names the portal already imports (`getEducationBoards`, `getExaminations`, `getExaminationYears`, `searchStudent`) are preserved so the calling pages need minimal changes.

**Files:**
- Replace: `ssc-result-system/src/lib/data.ts`

**Interfaces:**
- Consumes: `createServerClient` from `@/lib/supabase-server`, types `Board`, `Exam`, `Result` from `@/lib/types`.
- Produces: `getEducationBoards(): Promise<Board[]>`, `getExaminations(): Promise<Exam[]>`, `getExaminationYears(): Promise<{year:number}[]>`, `searchStudent(board, roll, examYear, reg?): Promise<Result | null>`, `getResultById(id): Promise<Result | null>`, `calculateGPA(result): number | null`.

- [ ] **Step 1: Verify `createServerClient` exists in `supabase-server.ts`**

```bash
cd /d/SSC/ssc-result-system
grep "export function createServerClient\|export const createServerClient" src/lib/supabase-server.ts
```
Expected: a match. If the existing factory is named differently (e.g. default export), adapt the import in Step 2 to match. (Do not change `supabase-server.ts` here — Task 5 may add a `supabaseBrowser`; the server factory stays.)

- [ ] **Step 2: Overwrite `src/lib/data.ts`**

```ts
import { createServerClient } from '@/lib/supabase-server';
import type { Board, Exam, Result } from '@/lib/types';

// ---- Reference data for the search-form dropdowns -----------------------
export async function getEducationBoards(): Promise<Board[]> {
  const sb = createServerClient();
  const { data, error } = await sb.from('boards').select('*').order('name');
  if (error) throw error;
  return (data as Board[]) ?? [];
}

export async function getExaminations(): Promise<Exam[]> {
  const sb = createServerClient();
  const { data, error } = await sb.from('exams').select('*').order('name');
  if (error) throw error;
  return (data as Exam[]) ?? [];
}

// Years are generated client-side in the reference; we return a static list
// so the existing StudentSearchForm stays simple. Range: 1996..currentYear.
export async function getExaminationYears(): Promise<{ year: number }[]> {
  const current = new Date().getFullYear();
  const years: { year: number }[] = [];
  for (let y = current; y >= 1996; y--) years.push({ year: y });
  return years;
}

// ---- Lookup -------------------------------------------------------------
// Matches the new (board, roll_number, registration_no) unique key.
// `examYear` is accepted for signature compatibility but the new schema uses
// the unique triple, so it's only used as an extra filter for safety.
export async function searchStudent(
  roll: number,
  boardCode: string,
  _examCode: string,
  examYear?: number,
  reg?: number,
): Promise<Result | null> {
  const sb = createServerClient();
  let q = sb
    .from('results')
    .select('*')
    .eq('roll_number', roll)
    .eq('board', boardCode);
  if (typeof examYear === 'number') q = q.eq('exam_year', examYear);
  if (typeof reg === 'number') q = q.eq('registration_no', reg);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) return null;
  return (data as Result) ?? null;
}

export async function getResultById(id: string): Promise<Result | null> {
  const sb = createServerClient();
  const { data, error } = await sb.from('results').select('*').eq('id', id).maybeSingle();
  if (error) return null;
  return (data as Result) ?? null;
}

// ---- GPA ----------------------------------------------------------------
const GRADE_POINTS: Record<string, number> = {
  'A+': 5.0, 'A': 4.0, 'A-': 3.5, 'B+': 3.0, 'B': 2.5, 'B-': 2.0,
  'C': 1.5, 'D': 1.0, 'F': 0.0,
};

export function calculateGPA(result: Pick<Result, 'subjects'>): number | null {
  const entries = Object.values(result.subjects);
  if (entries.length === 0) return null;
  let sum = 0, n = 0;
  for (const e of entries) {
    const p = GRADE_POINTS[e.grade];
    if (typeof p === 'number') { sum += p; n++; }
  }
  if (n === 0) return null;
  return Math.round((sum / n) * 100) / 100;
}
```

- [ ] **Step 3: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/lib/data.ts
git commit -m "feat(lib): rewrite data layer for new results/boards/exams schema"
```

---

### Task 4: Auth helpers (HMAC-signed cookie)

**Files:**
- Create: `ssc-result-system/src/lib/auth.ts`
- Create: `ssc-result-system/src/lib/auth.test.ts`

**Interfaces:**
- Produces: `signSession(payload): string`, `verifySession(token): SessionPayload | null`, `SESSION_COOKIE = 'admin_session'`, type `SessionPayload`. Pure functions using Node `crypto`; no Next imports.

- [ ] **Step 1: Write the failing test**

`ssc-result-system/src/lib/auth.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signSession, verifySession, SESSION_COOKIE } from './auth';

describe('auth', () => {
  const original = process.env.AUTH_SECRET;
  beforeAll(() => { process.env.AUTH_SECRET = 'test-secret-32-chars-min-length!!'; });
  afterAll(() => { process.env.AUTH_SECRET = original; });

  it('round-trips a valid session', () => {
    const token = signSession({ role: 'admin', exp: Date.now() + 1000 });
    const out = verifySession(token);
    expect(out).not.toBeNull();
    expect(out?.role).toBe('admin');
  });

  it('rejects an expired session', () => {
    const token = signSession({ role: 'admin', exp: Date.now() - 1000 });
    expect(verifySession(token)).toBeNull();
  });

  it('rejects a tampered token', () => {
    const token = signSession({ role: 'admin', exp: Date.now() + 1000 });
    expect(verifySession(token + 'x')).toBeNull();
  });

  it('exposes the cookie name', () => {
    expect(SESSION_COOKIE).toBe('admin_session');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/lib/auth.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write `auth.ts`**

```ts
import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE = 'admin_session';
const ALGO = 'sha256';
const TTL_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionPayload = { role: 'admin'; exp: number };

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error('AUTH_SECRET missing or too short (need >=16 chars)');
  }
  return s;
}

export function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac(ALGO, getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac(ALGO, getSecret()).update(body).digest();
  let given: Buffer;
  try { given = Buffer.from(sig, 'base64url'); }
  catch { return null; }
  if (expected.length !== given.length) return null;
  if (!timingSafeEqual(expected, given)) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch { return null; }
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
  if (payload.role !== 'admin') return null;
  return payload;
}

export function sessionTtl(): number { return TTL_DEFAULT_MS; }

export function isPasswordCorrect(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(password));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
npx vitest run src/lib/auth.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/lib/auth.ts ssc-result-system/src/lib/auth.test.ts
git commit -m "feat(lib): HMAC-signed admin session helpers"
```

---

### Task 5: Supabase clients

**Files:**
- Create: `ssc-result-system/src/lib/supabase-browser.ts`
- Create: `ssc-result-system/src/lib/supabase-server.ts`

**Interfaces:**
- Produces: `supabaseBrowser` (anon key, safe for Client Components) and `supabaseService` (service role, server-only) clients.

- [ ] **Step 1: Write `supabase-browser.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Soft message; app still imports — actual calls will throw later.
  console.warn('Supabase browser env vars missing.');
}

export const supabaseBrowser = createClient(url ?? '', anon ?? '', {
  auth: { persistSession: false },
});
```

- [ ] **Step 2: Write `supabase-server.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

// SERVER-ONLY. Never import from a Client Component ('use client').
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn('Supabase server env vars missing.');
}

export const supabaseService = createClient(url ?? '', serviceKey ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

- [ ] **Step 3: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/lib/supabase-browser.ts ssc-result-system/src/lib/supabase-server.ts
git commit -m "feat(lib): supabase browser (anon) and server (service) clients"
```

---

### Task 6: Root layout and globals.css

**Files:**
- Create: `ssc-result-system/src/app/layout.tsx`
- Create: `ssc-result-system/src/app/globals.css`

**Interfaces:**
- Produces: root HTML shell. `globals.css` holds shared resets + admin styles; portal-specific CSS lives in `(public)/portal.css` (Task 12).

- [ ] **Step 1: Write `globals.css`**

```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  color: #212529;
  background: #fff;
}
.container-fluid { width: 100%; padding: 0 15px; }

/* Shared form control look (mirrors Bootstrap 3 from reference) */
.form-control {
  display: block; width: 100%; height: 34px; padding: 6px 12px;
  font-size: 14px; line-height: 1.42857;
  color: #555; background-color: #fff; background-image: none;
  border: 1px solid #ccc; border-radius: 4px;
}
.form-control:focus { border-color: #66afe9; outline: none; }
label { font-weight: 700; display: inline-block; max-width: 100%; }

/* Buttons (from reference) */
.btn {
  display: inline-block; padding: 6px 12px; margin-bottom: 0;
  font-size: 14px; line-height: 1.42857; text-align: center;
  cursor: pointer; border-radius: 10px; border-style: none; color: #fff;
}
.btn-success { background-color: #14A44D; }
.btn-info    { background-color: #54B4D3; }
.btn-primary { background-color: #3B71CA; }
.btn-danger  { background-color: #DC4C64; }
.btn-warning { background-color: #E4A11B; }
.btn-light   { background-color: #FBFBFB; color: #212529; border: 1px solid #ddd; }

/* Admin-only layout helpers (portal uses its own portal.css) */
.admin-shell { max-width: 1200px; margin: 0 auto; padding: 20px; }
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 900px) { .admin-grid { grid-template-columns: 1fr; } }
.admin-card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; background: #fafafa; }
.admin-card h2 { margin-top: 0; font-size: 18px; }
.admin-table { width: 100%; border-collapse: collapse; background: #fff; }
.admin-table th, .admin-table td { padding: 8px 10px; border-bottom: 1px solid #eee; text-align: left; font-size: 13px; }
.admin-table th { background: #f3f3f3; }
.error-box { color: #DC4C64; font-size: 13px; margin-top: 8px; }
.row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.col { flex: 1; min-width: 160px; }
.subject-row { display: flex; gap: 6px; margin-bottom: 6px; }
.subject-row input, .subject-row select { padding: 6px 8px; }
.muted { color: #888; font-size: 12px; }
```

- [ ] **Step 2: Write `layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SSC Result System',
  description: 'Student result publication system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/app/layout.tsx ssc-result-system/src/app/globals.css
git commit -m "feat(app): root layout and shared globals.css"
```

---

### Task 7: Auth middleware guard

**Files:**
- Create: `ssc-result-system/middleware.ts`

**Interfaces:**
- Consumes: `verifySession`, `SESSION_COOKIE` from `@/lib/auth` (note: middleware runs in edge runtime; the auth helpers use only Node `crypto`'s `createHmac`/`timingSafeEqual`, which are available in the Next edge runtime via the `node:crypto` polyfill — verified in Step 3).
- Produces: redirects unauthenticated `/admin/*` (except `/admin/login`) to `/admin/login`.

- [ ] **Step 1: Write `middleware.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow the login page itself.
  if (pathname === '/admin/login') return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

- [ ] **Step 2: Verify the edge runtime supports the crypto calls**

Run:
```bash
cd /d/SSC/ssc-result-system
npm run build
```
Expected: build succeeds. If `createHmac` is unavailable in the edge runtime, the build will error — in that case, switch `middleware.ts` to import from `https://esm.sh/` is NOT allowed; instead move the verify logic to use the Web Crypto API (`crypto.subtle`) and rewrite `verifySession` to accept an async signature. (Assumption to verify during build.)

- [ ] **Step 3: Commit**

```bash
cd /d/SSC
git add ssc-result-system/middleware.ts
git commit -m "feat(auth): middleware guard for /admin/*"
```

---

### Task 8: Admin login page and logout route

**Files:**
- Create: `ssc-result-system/src/app/admin/login/page.tsx`
- Create: `ssc-result-system/src/app/admin/login/route.ts`
- Create: `ssc-result-system/src/app/admin/logout/route.ts`

**Interfaces:**
- Consumes: `isPasswordCorrect`, `signSession`, `sessionTtl`, `SESSION_COOKIE` from `@/lib/auth`.
- Produces: `POST /admin/login` (sets cookie, redirects to `?next` or `/admin`) and `POST /admin/logout` (clears cookie, redirects to `/admin/login`).

- [ ] **Step 1: Write the login form (Client Component)**

`ssc-result-system/src/app/admin/login/page.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      const next = params.get('next') || '/admin';
      router.replace(next);
    } else {
      setError('Incorrect password.');
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
      <h2 style={{ marginTop: 0 }}>Admin Login</h2>
      <form onSubmit={submit}>
        <div className="col" style={{ marginBottom: 10 }}>
          <label htmlFor="pw">Password</label>
          <input
            id="pw" type="password" className="form-control"
            value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required
          />
        </div>
        {error && <div className="error-box">{error}</div>}
        <button className="btn btn-success" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Write the login route handler**

`ssc-result-system/src/app/admin/login/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { isPasswordCorrect, signSession, sessionTtl, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  let body: { password?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const password = typeof body.password === 'string' ? body.password : '';
  if (!isPasswordCorrect(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = signSession({ role: 'admin', exp: Date.now() + sessionTtl() });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(sessionTtl() / 1000),
  });
  return res;
}
```

- [ ] **Step 3: Write the logout route handler**

`ssc-result-system/src/app/admin/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'));
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
```

- [ ] **Step 4: Manual smoke test (requires Supabase env filled)**

```bash
cd /d/SSC/ssc-result-system
npm run dev
```
Visit `http://localhost:3001/admin` → should redirect to `/admin/login`. Enter wrong password → "Incorrect password." Enter `9hc00ZZ633!` → redirects to `/admin` (will 404 on the dashboard page until Task 11 — that's fine; cookie is set).

- [ ] **Step 5: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/app/admin/login ssc-result-system/src/app/admin/logout
git commit -m "feat(admin): login page, login + logout route handlers"
```

---

### Task 9: API — public lookup and admin list (GET)

**Files:**
- Create: `ssc-result-system/src/app/api/results/route.ts`

**Interfaces:**
- Consumes: `supabaseService` from `@/lib/supabase-server`, `verifySession`, `SESSION_COOKIE` from `@/lib/auth`, `Result` from `@/lib/types`.
- Produces:
  - `GET /api/results?board=&roll=&reg=` (public) → `200 { result }` or `404 { error }`.
  - `GET /api/results` with no query (admin, requires cookie) → `200 { results: Result[] }`.

- [ ] **Step 1: Write `route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-server';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import type { Result } from '@/lib/types';

function adminOk(req: NextRequest): boolean {
  return !!verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const board = url.searchParams.get('board');
  const roll = url.searchParams.get('roll');
  const reg = url.searchParams.get('reg');

  // Public lookup mode
  if (board !== null || roll !== null || reg !== null) {
    if (!board || !roll || !reg) {
      return NextResponse.json({ error: 'board, roll, reg are all required' }, { status: 400 });
    }
    const rollNum = Number(roll);
    const regNum = Number(reg);
    if (!Number.isInteger(rollNum) || !Number.isInteger(regNum)) {
      return NextResponse.json({ error: 'roll and reg must be integers' }, { status: 400 });
    }
    const { data, error } = await supabaseService
      .from('results')
      .select('*')
      .eq('board', board)
      .eq('roll_number', rollNum)
      .eq('registration_no', regNum)
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'No result found for the given credentials' }, { status: 404 });
    return NextResponse.json({ result: data as Result });
  }

  // Admin list mode
  if (!adminOk(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseService
    .from('results')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ results: (data as Result[]) ?? [] });
}
```

- [ ] **Step 2: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/app/api/results/route.ts
git commit -m "feat(api): GET results — public lookup + admin list"
```

---

### Task 10: API — create, edit, delete (POST/PATCH/DELETE)

**Files:**
- Create: `ssc-result-system/src/app/api/results/route.ts` (add POST)
- Create: `ssc-result-system/src/app/api/results/[id]/route.ts`

**Interfaces:**
- Consumes: `supabaseService`, `verifySession`, `SESSION_COOKIE`, `ResultInput`, `GRADES`, `isGrade`.
- Produces: `POST /api/results` (create), `GET/PATCH/DELETE /api/results/:id`.

- [ ] **Step 1: Add POST handler to `route.ts`**

Append to `ssc-result-system/src/app/api/results/route.ts` (before the final closing of the file — i.e., add this export after `GET`):

```ts
import { isGrade } from '@/lib/grades';
import type { ResultInput, SubjectMap } from '@/lib/types';

function coerceInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

function sanitizeSubjects(raw: unknown): SubjectMap {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: SubjectMap = {};
  for (const [code, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val !== 'object' || val === null) continue;
    const v = val as { name?: unknown; grade?: unknown };
    if (typeof v.name !== 'string' || !isGrade(v.grade)) continue;
    out[String(code)] = { name: v.name, grade: v.grade };
  }
  return out;
}

export async function POST(req: NextRequest) {
  if (!adminOk(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const roll_number = coerceInt(body.roll_number);
  const registration_no = coerceInt(body.registration_no);
  if (roll_number === null || registration_no === null)
    return NextResponse.json({ error: 'roll_number and registration_no must be integers' }, { status: 400 });
  if (typeof body.board !== 'string' || !body.board) return NextResponse.json({ error: 'board required' }, { status: 400 });
  if (typeof body.exam !== 'string' || !body.exam) return NextResponse.json({ error: 'exam required' }, { status: 400 });
  const exam_year = coerceInt(body.exam_year);
  if (exam_year === null) return NextResponse.json({ error: 'exam_year must be an integer' }, { status: 400 });
  if (typeof body.student_name !== 'string' || !body.student_name.trim())
    return NextResponse.json({ error: 'student_name required' }, { status: 400 });

  const subjects = sanitizeSubjects(body.subjects);
  if (Object.keys(subjects).length === 0)
    return NextResponse.json({ error: 'At least one subject is required' }, { status: 400 });

  const payload: Omit<ResultInput, 'id' | 'created_at' | 'updated_at'> = {
    roll_number, registration_no,
    board: body.board, exam: body.exam, exam_year,
    student_name: String(body.student_name).trim(),
    father_name: typeof body.father_name === 'string' ? body.father_name : null,
    mother_name: typeof body.mother_name === 'string' ? body.mother_name : null,
    group_name: typeof body.group_name === 'string' ? body.group_name : null,
    student_type: typeof body.student_type === 'string' ? body.student_type : 'REGULAR',
    gender: typeof body.gender === 'string' ? body.gender : null,
    date_of_birth: typeof body.date_of_birth === 'string' ? body.date_of_birth : null,
    session: typeof body.session === 'string' ? body.session : null,
    institute_name: typeof body.institute_name === 'string' ? body.institute_name : null,
    gpa: typeof body.gpa === 'number' ? body.gpa : null,
    result_status: typeof body.result_status === 'string' ? body.result_status : null,
    remarks: typeof body.remarks === 'string' ? body.remarks : null,
    subjects,
    ca_subjects: sanitizeSubjects(body.ca_subjects),
  };

  const { data, error } = await supabaseService.from('results').insert(payload).select().single();
  if (error) {
    if (error.code === '23505') // unique_violation
      return NextResponse.json({ error: 'A result with this Board + Roll + Registration already exists.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ result: data as Result }, { status: 201 });
}
```

- [ ] **Step 2: Write `[id]/route.ts`**

`ssc-result-system/src/app/api/results/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase-server';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { isGrade } from '@/lib/grades';
import type { Result, ResultInput, SubjectMap } from '@/lib/types';

function adminOk(req: NextRequest): boolean {
  return !!verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}

function coerceInt(v: unknown): number | null {
  const n = Number(v); return Number.isInteger(n) ? n : null;
}
function sanitizeSubjects(raw: unknown): SubjectMap {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: SubjectMap = {};
  for (const [code, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val !== 'object' || val === null) continue;
    const v = val as { name?: unknown; grade?: unknown };
    if (typeof v.name !== 'string' || !isGrade(v.grade)) continue;
    out[String(code)] = { name: v.name, grade: v.grade };
  }
  return out;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  if (!adminOk(_req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseService.from('results').select('*').eq('id', ctx.params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ result: data as Result });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  if (!adminOk(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  const strKeys = ['student_name','father_name','mother_name','group_name','student_type','gender','date_of_birth','session','institute_name','result_status','remarks','board','exam'] as const;
  for (const k of strKeys) if (typeof body[k] === 'string') update[k] = body[k];
  for (const k of ['roll_number','registration_no','exam_year'] as const) {
    if (body[k] !== undefined) {
      const n = coerceInt(body[k]);
      if (n === null) return NextResponse.json({ error: `${k} must be an integer` }, { status: 400 });
      update[k] = n;
    }
  }
  if (typeof body.gpa === 'number') update.gpa = body.gpa;
  if (body.subjects !== undefined) {
    const s = sanitizeSubjects(body.subjects);
    if (Object.keys(s).length === 0) return NextResponse.json({ error: 'At least one subject is required' }, { status: 400 });
    update.subjects = s;
  }
  if (body.ca_subjects !== undefined) update.ca_subjects = sanitizeSubjects(body.ca_subjects);

  const { data, error } = await supabaseService.from('results').update(update).eq('id', ctx.params.id).select().single();
  if (error) {
    if (error.code === '23505')
      return NextResponse.json({ error: 'A result with this Board + Roll + Registration already exists.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ result: data as Result });
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  if (!adminOk(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabaseService.from('results').delete().eq('id', ctx.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/app/api/results/
git commit -m "feat(api): create/update/delete result endpoints"
```

---

### Task 11: Admin layout shell

**Files:**
- Create: `ssc-result-system/src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: nothing (middleware already gated this route group).
- Produces: a `.admin-shell` wrapper with header + logout button, rendered around all `/admin/*` (except `/admin/login`, which is a sibling route not under this layout — wait, it IS under `/admin/`. To avoid wrapping the login page, this layout renders children plainly when on `/admin/login`).

- [ ] **Step 1: Write `layout.tsx`**

```tsx
import { headers } from 'next/headers';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = headers();
  const path = h.get('x-path') || ''; // not always set; fallback handled client-side
  // We always render the shell; the login page renders its own minimal centered card
  // and the shell's chrome is acceptable around it. Logout button hidden on login.
  return (
    <div className="admin-shell">
      <div className="admin-header">
        <h1 style={{ margin: 0, fontSize: 20 }}>SSC Admin Dashboard</h1>
        <form action="/admin/logout" method="post">
          <button className="btn btn-danger" type="submit">Logout</button>
        </form>
      </div>
      {children}
    </div>
  );
}
```

> Note: a `<form action="/admin/logout" method="post">` issues a native POST → our `POST /admin/logout` handler redirects. This works without JS.

- [ ] **Step 2: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/app/admin/layout.tsx
git commit -m "feat(admin): dashboard shell layout"
```

---

### Task 12: Admin dashboard page (list + add/edit form)

**Files:**
- Create: `ssc-result-system/src/app/admin/page.tsx`
- Create: `ssc-result-system/src/app/admin/admin.css`

**Interfaces:**
- Consumes: `GET /api/results` (list), `POST /api/results`, `PATCH /api/results/:id`, `DELETE /api/results/:id`; `GRADES` from `@/lib/grades`; `Result` from `@/lib/types`.
- Produces: the two-panel admin dashboard with dynamic subject rows.

- [ ] **Step 1: Write `admin.css`**

```css
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-grid .full { grid-column: 1 / -1; }
.field label { display:block; font-size: 12px; margin-bottom: 2px; }
.subject-block { margin-top: 8px; }
.subject-block h3 { font-size: 14px; margin: 6px 0; }
.add-subject-btn { margin-top: 4px; }
.result-list-table { width: 100%; }
.result-list-table th { background:#14A44D; color:#fff; }
.msg-ok { color:#14A44D; font-size:13px; }
```

- [ ] **Step 2: Write `page.tsx`** (Client Component, full dashboard)

`ssc-result-system/src/app/admin/page.tsx`:

```tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { GRADES } from '@/lib/grades';
import type { Result } from '@/lib/types';
import './admin.css';

type Row = { code: string; name: string; grade: string };

const EMPTY = {
  roll_number: '', registration_no: '', board: 'dhaka', exam: 'ssc', exam_year: String(new Date().getFullYear()),
  student_name: '', father_name: '', mother_name: '', group_name: 'SCIENCE', student_type: 'REGULAR',
  gender: 'Male', date_of_birth: '', session: '', institute_name: '', gpa: '', result_status: 'Passed', remarks: '',
};

const BOARDS = [
  ['barisal','Barisal'],['chittagong','Chittagong'],['comilla','Comilla'],['dhaka','Dhaka'],
  ['dinajpur','Dinajpur'],['jessore','Jessore'],['madrasah','Madrasah'],['mymensingh','Mymensingh'],
  ['rajshahi','Rajshahi'],['sylhet','Sylhet'],['tec','Technical'],
] as const;
const EXAMS = [['jsc','JSC/JDC'],['ssc','SSC/Dakhil/Equivalent'],['hsc','HSC/Alim/Equivalent'],['dibs','DIBS']] as const;
const YEARS = Array.from({ length: new Date().getFullYear() - 1995 }, (_, i) => String(new Date().getFullYear() - i));

export default function AdminDashboard() {
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY });
  const [subs, setSubs] = useState<Row[]>([{ code: '', name: '', grade: 'A+' }]);
  const [caSubs, setCaSubs] = useState<Row[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [list, setList] = useState<Result[]>([]);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const r = await fetch('/api/results', { cache: 'no-store' });
    if (r.ok) setList((await r.json()).results ?? []);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  function setField(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function pack(rows: Row[]) {
    const out: Record<string, { name: string; grade: string }> = {};
    for (const r of rows) {
      const code = r.code.trim();
      if (!code) continue;
      out[code] = { name: r.name.trim(), grade: r.grade };
    }
    return out;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setMsg(''); setBusy(true);
    const payload = {
      ...form,
      roll_number: Number(form.roll_number),
      registration_no: Number(form.registration_no),
      exam_year: Number(form.exam_year),
      gpa: form.gpa === '' ? null : Number(form.gpa),
      subjects: pack(subs),
      ca_subjects: pack(caSubs),
    };
    const url = editingId ? `/api/results/${editingId}` : '/api/results';
    const method = editingId ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!r.ok) { setErr((await r.json().catch(() => ({}))).error || 'Save failed'); return; }
    setMsg(editingId ? 'Updated.' : 'Saved.');
    reset();
    await loadList();
  }

  function reset() {
    setForm({ ...EMPTY }); setSubs([{ code: '', name: '', grade: 'A+' }]); setCaSubs([]); setEditingId(null);
  }

  function editRow(r: Result) {
    setEditingId(r.id);
    setForm({
      roll_number: String(r.roll_number), registration_no: String(r.registration_no), board: r.board, exam: r.exam,
      exam_year: String(r.exam_year), student_name: r.student_name, father_name: r.father_name || '',
      mother_name: r.mother_name || '', group_name: r.group_name || '', student_type: r.student_type || 'REGULAR',
      gender: r.gender || 'Male', date_of_birth: r.date_of_birth || '', session: r.session || '',
      institute_name: r.institute_name || '', gpa: r.gpa == null ? '' : String(r.gpa),
      result_status: r.result_status || 'Passed', remarks: r.remarks || '',
    });
    setSubs(rowsFrom(r.subjects));
    setCaSubs(rowsFrom(r.ca_subjects));
  }

  async function delRow(id: string) {
    if (!confirm('Delete this result permanently?')) return;
    const r = await fetch(`/api/results/${id}`, { method: 'DELETE' });
    if (r.ok) { await loadList(); if (editingId === id) reset(); }
  }

  const filtered = list.filter((r) =>
    !filter || String(r.roll_number).includes(filter) || r.student_name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="admin-grid">
      {/* LEFT: form */}
      <div className="admin-card">
        <h2>{editingId ? 'Edit Result' : 'Add New Result'}</h2>
        {msg && <div className="msg-ok">{msg}</div>}
        {err && <div className="error-box">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field"><label>Roll Number*</label>
              <input className="form-control" type="number" required value={form.roll_number}
                onChange={(e) => setField('roll_number', e.target.value)} /></div>
            <div className="field"><label>Registration No*</label>
              <input className="form-control" type="number" required value={form.registration_no}
                onChange={(e) => setField('registration_no', e.target.value)} /></div>
            <div className="field"><label>Board*</label>
              <select className="form-control" value={form.board} onChange={(e) => setField('board', e.target.value)}>
                {BOARDS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select></div>
            <div className="field"><label>Exam*</label>
              <select className="form-control" value={form.exam} onChange={(e) => setField('exam', e.target.value)}>
                {EXAMS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select></div>
            <div className="field"><label>Year*</label>
              <select className="form-control" value={form.exam_year} onChange={(e) => setField('exam_year', e.target.value)}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select></div>
            <div className="field"><label>Group</label>
              <input className="form-control" value={form.group_name} onChange={(e) => setField('group_name', e.target.value)} /></div>
            <div className="field full"><label>Student Name*</label>
              <input className="form-control" required value={form.student_name}
                onChange={(e) => setField('student_name', e.target.value)} /></div>
            <div className="field"><label>Father&apos;s Name</label>
              <input className="form-control" value={form.father_name} onChange={(e) => setField('father_name', e.target.value)} /></div>
            <div className="field"><label>Mother&apos;s Name</label>
              <input className="form-control" value={form.mother_name} onChange={(e) => setField('mother_name', e.target.value)} /></div>
            <div className="field"><label>Type</label>
              <select className="form-control" value={form.student_type} onChange={(e) => setField('student_type', e.target.value)}>
                <option>REGULAR</option><option>PRIVATE</option><option>IRREGULAR</option>
              </select></div>
            <div className="field"><label>Gender</label>
              <select className="form-control" value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
                <option>Male</option><option>Female</option><option>N/A</option>
              </select></div>
            <div className="field"><label>Date of Birth (DD-MM-YYYY)</label>
              <input className="form-control" value={form.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} /></div>
            <div className="field"><label>Session (e.g. 2020-21)</label>
              <input className="form-control" value={form.session} onChange={(e) => setField('session', e.target.value)} /></div>
            <div className="field full"><label>Institute Name</label>
              <input className="form-control" value={form.institute_name} onChange={(e) => setField('institute_name', e.target.value)} /></div>
            <div className="field"><label>GPA (e.g. 5.00)</label>
              <input className="form-control" type="number" step="0.01" value={form.gpa}
                onChange={(e) => setField('gpa', e.target.value)} /></div>
            <div className="field"><label>Result Status</label>
              <input className="form-control" value={form.result_status} onChange={(e) => setField('result_status', e.target.value)} /></div>
            <div className="field full"><label>Remarks</label>
              <input className="form-control" value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} /></div>
          </div>

          <div className="subject-block">
            <h3>Subjects (Grade)</h3>
            {subs.map((r, i) => (
              <div className="subject-row" key={i}>
                <input className="form-control" placeholder="Code" style={{ maxWidth: 90 }} value={r.code}
                  onChange={(e) => upRow(setSubs, i, { code: e.target.value })} />
                <input className="form-control" placeholder="Subject name" value={r.name}
                  onChange={(e) => upRow(setSubs, i, { name: e.target.value })} />
                <select className="form-control" style={{ maxWidth: 90 }} value={r.grade}
                  onChange={(e) => upRow(setSubs, i, { grade: e.target.value })}>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <button type="button" className="btn btn-danger"
                  onClick={() => removeRow(setSubs, i)} disabled={subs.length === 1}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-light add-subject-btn" onClick={() => setSubs((s) => [...s, { code: '', name: '', grade: 'A+' }])}>+ Add Subject</button>
          </div>

          <div className="subject-block">
            <h3>Continuous Assessment Subjects (optional)</h3>
            {caSubs.map((r, i) => (
              <div className="subject-row" key={i}>
                <input className="form-control" placeholder="Code" style={{ maxWidth: 90 }} value={r.code}
                  onChange={(e) => upRow(setCaSubs, i, { code: e.target.value })} />
                <input className="form-control" placeholder="Subject name" value={r.name}
                  onChange={(e) => upRow(setCaSubs, i, { name: e.target.value })} />
                <select className="form-control" style={{ maxWidth: 90 }} value={r.grade}
                  onChange={(e) => upRow(setCaSubs, i, { grade: e.target.value })}>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <button type="button" className="btn btn-danger" onClick={() => removeRow(setCaSubs, i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-light add-subject-btn"
              onClick={() => setCaSubs((s) => [...s, { code: '', name: '', grade: 'A+' }])}>+ Add CA Subject</button>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn btn-success" type="submit" disabled={busy}>{busy ? 'Saving…' : (editingId ? 'Update Result' : 'Save Result')}</button>
            {editingId && <button className="btn btn-light" type="button" onClick={reset}>Cancel Edit</button>}
          </div>
        </form>
      </div>

      {/* RIGHT: list */}
      <div className="admin-card">
        <h2>All Results ({filtered.length})</h2>
        <input className="form-control" placeholder="Filter by roll or name" value={filter}
          onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 10 }} />
        <table className="admin-table result-list-table">
          <thead><tr><th>Roll</th><th>Name</th><th>Board</th><th>Exam/Year</th><th></th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.roll_number}</td>
                <td>{r.student_name}</td>
                <td>{r.board}</td>
                <td>{r.exam.toUpperCase()} {r.exam_year}</td>
                <td>
                  <button className="btn btn-light" type="button" onClick={() => editRow(r)}>Edit</button>{' '}
                  <button className="btn btn-danger" type="button" onClick={() => delRow(r.id)}>Del</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="muted">No results.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function rowsFrom(map: Record<string, { name: string; grade: string }>): Row[] {
  const rows = Object.entries(map).map(([code, v]) => ({ code, name: v.name, grade: v.grade }));
  return rows.length ? rows : [{ code: '', name: '', grade: 'A+' }];
}
function upRow(setter: React.Dispatch<React.SetStateAction<Row[]>>, i: number, patch: Partial<Row>) {
  setter((arr) => arr.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
}
function removeRow(setter: React.Dispatch<React.SetStateAction<Row[]>>, i: number) {
  setter((arr) => arr.filter((_, idx) => idx !== i));
}
```

- [ ] **Step 3: Manual test (requires Supabase env + a row)**

```bash
cd /d/SSC/ssc-result-system && npm run dev
```
- Open `http://localhost:3001/admin`, log in with `9hc00ZZ633!`.
- Fill the form (Roll `140884`, Reg `1520930524`, Board `dhaka`, name `SANIA AKTER`, add a few subjects) → Save → row appears in the right table.
- Click Edit → form populates → change a grade → Update → row updates.
- Click Del → confirm → row disappears.

- [ ] **Step 4: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/app/admin/page.tsx ssc-result-system/src/app/admin/admin.css
git commit -m "feat(admin): dashboard with dynamic subject rows + list/edit/delete"
```

---

### Task 13: Adapt existing portal — strip CAPTCHA, align with new lookup

The search page (`src/app/page.tsx`) and form (`src/components/StudentSearchForm.tsx`) already exist and faithfully replicate `regristation select.html`. **We keep them** and make two edits:
1. Remove the client-side CAPTCHA (state, `generateCaptcha`, the captcha `<div>` row, the captcha check in `handleSubmit`).
2. Simplify `handleSubmit` to call the new `GET /api/results?board=&roll=&reg=` lookup directly, then `router.push('/result?...')`.

`src/app/page.tsx` needs no change — it already calls `getEducationBoards`, `getExaminations`, `getExaminationYears` (all preserved in the rewritten `lib/data.ts` from Task 3b) and passes them to `StudentSearchForm`.

**Files:**
- Edit: `ssc-result-system/src/components/StudentSearchForm.tsx`

**Interfaces:**
- Consumes: `EducationBoard`/`Examination`/`ExaminationYear` props (now mapped to the new `Board`/`Exam`/{year} types — see Step 2 for the type import fix); `GET /api/results?board=&roll=&reg=`.
- Produces: a CAPTCHA-free search form that navigates to `/result?board=&exam=&year=&roll=&reg=` on a successful match.

- [ ] **Step 1: Read the current `StudentSearchForm.tsx`**

```bash
cd /d/SSC/ssc-result-system
cat src/components/StudentSearchForm.tsx
```
Confirm it has: `captcha`/`captchaCode`/`captchaDataUrl` state, a `generateCaptcha` function, a `useEffect` that calls `generateCaptcha`, the captcha check in `handleSubmit`, and the captcha `<div>` row (id `col_10`). All of these get deleted in Step 2.

- [ ] **Step 2: Replace `src/components/StudentSearchForm.tsx`** with the cleaned version

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Board, Exam } from '@/lib/types'

interface Props {
  boards: Board[]
  exams: Exam[]
  years: { year: number }[]
}

export default function StudentSearchForm({ boards, exams, years }: Props) {
  const router = useRouter()
  const [board, setBoard] = useState('')
  const [exam, setExam] = useState('')
  const [year, setYear] = useState('')
  const [resultType, setResultType] = useState('')
  const [roll, setRoll] = useState('')
  const [reg, setReg] = useState('')
  const [eiin, setEiin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const showIndividual = resultType === '1'
  const showInstitution = resultType === '2'
  const showActionFields = resultType !== ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!board || !exam || !year || !resultType) {
      setErrorMsg('Please choose Exam, Year, Board first.')
      return
    }

    setLoading(true)
    try {
      if (showIndividual) {
        if (!roll) {
          setErrorMsg('Please enter Roll Number.')
          setLoading(false)
          return
        }
        const params = new URLSearchParams({ board, exam, year, roll })
        if (reg) params.set('reg', reg)
        // Verify the result exists before navigating; the result page also re-reads it.
        const res = await fetch(`/api/results?${params.toString()}`)
        if (!res.ok) {
          setErrorMsg('Result not found. Please check your credentials.')
          setLoading(false)
          return
        }
        router.push(`/result?${params.toString()}`)
      } else if (showInstitution) {
        if (!eiin) {
          setErrorMsg('Please enter EIIN Number of Institution.')
          setLoading(false)
          return
        }
        setErrorMsg('Institution result search is not available in this system.')
        setLoading(false)
      }
    } catch {
      setErrorMsg('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="panel panel-default">
      <div className="panel-heading">Please provide the following information to view result</div>
      <div className="panel-body">
        <div className="row">
          <div className="col-md-12">
            <form role="form" onSubmit={handleSubmit}>
              {/* Name of Board */}
              <div className="row" id="col_1">
                <div id="row_board">
                  <div className="form-group col-md-5"><label htmlFor="board">Name of Board</label></div>
                  <div className="form-group col-md-7">
                    <select id="board" name="board" className="form-control" required value={board} onChange={(e) => setBoard(e.target.value)}>
                      <option value="">Select One</option>
                      {boards.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Name of Examination */}
              <div className="row" id="col_2">
                <div id="row_exam">
                  <div className="form-group col-md-5"><label htmlFor="exam">Name of Examination</label></div>
                  <div className="form-group col-md-7">
                    <select id="exam" name="exam" className="form-control" required value={exam} onChange={(e) => setExam(e.target.value)}>
                      <option value="">Select One</option>
                      {exams.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Year of Examination */}
              <div className="row" id="col_3">
                <div id="row_year">
                  <div className="form-group col-md-5"><label htmlFor="year">Year of Examination</label></div>
                  <div className="form-group col-md-7">
                    <select id="year" name="year" className="form-control" required value={year} onChange={(e) => setYear(e.target.value)}>
                      <option value="">Select One</option>
                      {years.map((y) => <option key={y.year} value={y.year}>{y.year}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Type of Result */}
              <div className="row" id="col_4">
                <div id="row_result_type">
                  <div className="form-group col-md-5"><label htmlFor="result_type"><font color="red">Type of Result</font></label></div>
                  <div className="form-group col-md-7">
                    <select id="result_type" name="result_type" className="form-control" required value={resultType} onChange={(e) => setResultType(e.target.value)}>
                      <option value="">Select One</option>
                      <option value="1">Individual/Detailed Result</option>
                      <option value="2">Institution Result</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Roll Number */}
              <div className="row" id="col_5">
                <div id="row_roll" style={{ display: showIndividual ? '' : 'none' }}>
                  <div className="form-group col-md-5"><label htmlFor="roll">Roll Number of Examinee</label></div>
                  <div className="form-group col-md-7">
                    <input className="form-control" type="number" name="roll" id="roll" required={showIndividual} value={roll} onChange={(e) => setRoll(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Registration Number */}
              <div className="row" id="col_6">
                <div id="row_reg" style={{ display: showIndividual ? '' : 'none' }}>
                  <div className="form-group col-md-5"><label htmlFor="reg">Registration Number of Examinee</label></div>
                  <div className="form-group col-md-7">
                    <input className="form-control" type="number" name="reg" id="reg" value={reg} onChange={(e) => setReg(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* EIIN Number (Institution — non-functional in v1, kept for fidelity) */}
              <div className="row" id="col_7">
                <div id="row_eiin" style={{ display: showInstitution ? '' : 'none' }}>
                  <div className="form-group col-md-5">
                    <label htmlFor="eiin">EIIN Number of Institution</label>
                  </div>
                  <div className="form-group col-md-7">
                    <input className="form-control" type="number" name="eiin" id="eiin" required={showInstitution} value={eiin} onChange={(e) => setEiin(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="row" id="col_11">
                <div id="row_submit" style={{ display: showActionFields ? '' : 'none' }}>
                  <div className="form-group"><label htmlFor="submit"></label></div>
                  <div className="form-group">
                    <input className="btn btn-success center-block" type="submit" name="submit" id="submit" value={loading ? 'Loading...' : 'View Result'} disabled={loading} />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="alert alert-danger text-center" role="alert" style={{ marginTop: '10px' }}>
                  {errorMsg}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
```

Key differences from the original:
- **CAPTCHA removed** — no `captcha`/`captchaCode`/`captchaDataUrl` state, no `generateCaptcha`, no `useEffect`, no `col_10` row, no captcha check.
- **Types** — props are now `Board[]`, `Exam[]`, `{year:number}[]` (matches the new `types.ts` + `data.ts`). Option `key`/`value` use `b.code`/`x.code`/`y.year` (the new flat columns) instead of `b.id`/`x.id`/`y.id`.
- **Institution fields simplified** — kept the EIIN field (no Tree/List buttons, since those opened external finders we don't have); District/Center dropdowns removed (they were empty stubs).

- [ ] **Step 3: Verify `src/app/page.tsx` still compiles**

```bash
cd /d/SSC/ssc-result-system
npx tsc --noEmit
```
Expected: no type errors. (`page.tsx` imports `BoardHeader` + `StudentSearchForm` + three data functions — all preserved.)

- [ ] **Step 4: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/components/StudentSearchForm.tsx
git commit -m "feat(portal): strip CAPTCHA; align search form with new schema/types"
```

---

### Task 14: Adapt existing result sheet to the new flat schema

The result page (`src/app/result/page.tsx`) already replicates `WEB BASED RESULT PUBLICATION SYSTEM…html` — green header, `.table-striped` tables, Search Again + Print buttons, remarks box. **We keep the JSX layout** and only change the **data reads**: the old deeply-nested `student.grades[].subject.code` / `student.board.name` shape becomes the flat `result.subjects` / `result.ca_subjects` JSONB maps + `result.board` scalar.

**Files:**
- Edit: `ssc-result-system/src/app/result/page.tsx`

**Interfaces:**
- Consumes: `searchStudent` from `@/lib/data` (rewritten in Task 3b); `Result` from `@/lib/types`; `getEducationBoards` to resolve `result.board` (code) → display name.
- Produces: a result sheet that reads from the new `results` row shape.

- [ ] **Step 1: Replace `src/app/result/page.tsx`** with the schema-aligned version

```tsx
import Link from 'next/link'
import BoardHeader from '@/components/BoardHeader'
import PrintButton from '@/components/PrintButton'
import { searchStudent, getEducationBoards } from '@/lib/data'
import type { Result, SubjectEntry } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: {
    board?: string
    exam?: string
    year?: string
    roll?: string
    reg?: string
  }
}

const EXAM_NAMES: Record<string, string> = {
  jsc: 'JSC or Equivalent',
  ssc: 'SSC or Equivalent',
  hsc: 'HSC or Equivalent',
  dibs: 'DIBS',
}

export default async function ResultPage({ searchParams }: Props) {
  const { board, exam, year, roll, reg } = searchParams

  let result: Result | null = null
  let notFound = false

  if (board && roll) {
    result = await searchStudent(
      parseInt(roll),
      board,
      exam ?? '',
      year ? parseInt(year) : undefined,
      reg ? parseInt(reg) : undefined,
    )
    if (!result) notFound = true
  } else {
    notFound = true
  }

  // Resolve board code -> display name for the summary table.
  let boardName = result?.board?.toUpperCase() ?? ''
  if (result) {
    const boards = await getEducationBoards()
    const hit = boards.find((b) => b.code === result!.board)
    if (hit) boardName = hit.name.toUpperCase()
  }

  const examHeader = `${EXAM_NAMES[exam ?? ''] ?? (exam?.toUpperCase() ?? '')} Examination - ${year ?? ''}`
  const regularGrades: Array<[string, SubjectEntry]> = result ? Object.entries(result.subjects) : []
  const caGrades: Array<[string, SubjectEntry]> = result ? Object.entries(result.ca_subjects) : []
  const resultText = result?.result_status
    || (result?.gpa != null ? `GPA=${result.gpa.toFixed(2)}` : 'Passed')

  return (
    <div className="container-fluid">
      <BoardHeader />
      <div id="page-wrapper">
        <div className="row">
          <div className="col-md-12">
            <div className="page-header text-center" id="page-header">
              <h3>Result of {examHeader}</h3>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="row buttons" id="buttons_up">
            <div className="text-center">
              <div className="btn-group">
                <Link href="/" className="btn btn-success search-button" id="search" title="Click here to search another result">
                  Search Again
                </Link>
                <PrintButton />
              </div>
            </div>
          </div>
          <br />
          <div className="col-md-12">
            <div id="result_display">
              {notFound ? (
                <div className="alert alert-danger text-center" role="alert">
                  Result not found. Please check your credentials.
                </div>
              ) : result && (
                <div className="table-container">
                  {/* Student Information Summary */}
                  <table className="table-striped">
                    <thead>
                      <tr><th colSpan={4}>Student Information Summary</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Roll No</td><td>{result.roll_number}</td>
                        <td>Registration No</td><td>{result.registration_no || '[NOT SHOWN]'}</td>
                      </tr>
                      <tr><td>Name of Student</td><td colSpan={3}>{result.student_name}</td></tr>
                      {result.father_name && (
                        <tr><td>Father&apos;s Name</td><td colSpan={3}>{result.father_name}</td></tr>
                      )}
                      {result.mother_name && (
                        <tr><td>Mother&apos;s Name</td><td colSpan={3}>{result.mother_name}</td></tr>
                      )}
                      <tr>
                        <td>Board</td><td>{boardName}</td>
                        <td>Session</td><td>{result.session || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>{result.board === 'tec' ? 'Trade' : 'Group'}</td>
                        <td>{result.group_name?.toUpperCase() || 'N/A'}</td>
                        <td>Type: {result.student_type?.toUpperCase() || 'REGULAR'}</td>
                        <td>Gender: {result.gender || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Result</td><td>{resultText}</td>
                        <td>Date of Birth</td><td>{result.date_of_birth || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Name of Institute</td>
                        <td colSpan={3}><span id="i_name">{result.institute_name || ''}</span></td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="alert alert-info text-center" id="err_msg" style={{ display: 'none' }}></div>

                  {/* Subject-wise Grade/Marks */}
                  {regularGrades.length > 0 && (
                    <>
                      <div className="text-center"><h4>Subject-wise Grade/Marks</h4></div>
                      <table className="table-striped">
                        <thead>
                          <tr><th>Subject Code</th><th>Subject Name</th><th>Grade</th></tr>
                        </thead>
                        <tbody>
                          {regularGrades.map(([code, v]) => (
                            <tr key={code}>
                              <td className="cent-align">{code}</td>
                              <td><span className={`code_${code}`}>{v.name.toUpperCase()}</span></td>
                              <td className="cent-align">{v.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="divpadding"></div>
                    </>
                  )}

                  {/* Continuous Assessment */}
                  {caGrades.length > 0 && (
                    <>
                      <div className="text-center"><h4>Subject-wise Grade/Marks for Continuous Assessment</h4></div>
                      <table className="table-striped">
                        <thead>
                          <tr><th>Subject Code</th><th>Subject Name</th><th>Grade</th></tr>
                        </thead>
                        <tbody>
                          {caGrades.map(([code, v]) => (
                            <tr key={code}>
                              <td className="cent-align">{code}</td>
                              <td><span className={`code_${code}`}>{v.name.toUpperCase()}</span></td>
                              <td className="cent-align">{v.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="divpadding"></div>
                    </>
                  )}

                  {/* Remarks */}
                  {result.remarks && (
                    <div className="alert alert-info text-center" role="alert">
                      {result.remarks}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="row buttons" id="buttons_down"><br /></div>
          <br />
        </div>
      </div>
      <div id="dev_info">
        <p>Powered by <i>Inter-Education Board Coordination Committee</i></p>
        <p>Result Information Maintenance and Update: <i>Respective Board</i></p>
        <p>© All rights reserved</p>
      </div>
    </div>
  )
}
```

Key differences from the original:
- **Lookup** — calls `searchStudent(roll, board, exam, year, reg)` (rewritten signature from Task 3b) and gets back a flat `Result` (or `null`).
- **Grades** — iterates `Object.entries(result.subjects)` / `Object.entries(result.ca_subjects)` instead of filtering a `student.grades[]` relation.
- **Board name** — resolves `result.board` (code) to a display name via `getEducationBoards()`.
- **Result/GPA** — reads from `result.result_status` or falls back to `result.gpa`.
- **Remarks** — `result.remarks` is a single text field (not an array).

- [ ] **Step 2: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/app/result/page.tsx
git commit -m "feat(portal): adapt result sheet to new flat results schema"
```

---


### Task 15: README and final wiring

**Files:**
- Create: `ssc-result-system/README.md`
- Modify: `ssc-result-system/.env.local` (developer fills Supabase keys — not committed)

**Interfaces:**
- Produces: a README with setup steps and a final `npm run build` that passes.

- [ ] **Step 1: Write `README.md`**

````markdown
# SSC Result System

Admin Dashboard + public Student Result Portal built with Next.js 14 + Supabase.

## Setup

1. **Create a Supabase project** at https://supabase.com and copy:
   - Project URL
   - anon key
   - service role key

2. **Apply the schema** — open Supabase Dashboard → SQL Editor → paste
   `supabase/migrations/001_schema.sql` → Run. This creates `results`,
   `boards`, `exams`, the unique lookup constraint, the lookup index, RLS
   policy, and seeds the 11 boards + 4 exams.

3. **Configure environment** — copy `.env.example` to `.env.local` and fill:
   ```
   ADMIN_PASSWORD=9hc00ZZ633!
   AUTH_SECRET=<any random 32+ char string — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role key>
   ```

4. **Install and run** (note: port 3001, since 3000 is in use elsewhere in this repo):
   ```bash
   npm install
   npm run dev
   ```

5. **Use it**:
   - Public portal: http://localhost:3001
   - Admin dashboard: http://localhost:3001/admin (password `9hc00ZZ633!`)

## Tests

```bash
npm test           # run unit tests once
npm run test:watch # watch mode
```

## Architecture

- `(public)/` — student portal (search + result sheet). Read-only.
- `admin/` — password-gated dashboard (CRUD on results).
- `api/results/` — thin route handlers; public GET does exact-match lookup,
  admin writes require the signed `admin_session` cookie.
- `lib/auth.ts` — HMAC-signed session cookie (pure, unit-tested).
- `lib/supabase-server.ts` — service role client, server-only.
- RLS enforces read-only access for the anon key.

See `docs/superpowers/specs/2026-08-11-ssc-result-system-design.md` for the full design.
````

- [ ] **Step 2: Run build + tests**

```bash
cd /d/SSC/ssc-result-system
npm test
npm run build
```
Expected: all vitest tests pass; `next build` succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
cd /d/SSC
git add ssc-result-system/README.md
git commit -m "docs: README with setup and architecture summary"
```

---

## Self-Review

**0. Revision note** — this plan was revised after discovering a pre-existing, near-faithful Student Portal in `src/`. Tasks 1, 3, 3b, 13, 14 now adapt existing files rather than create new ones. The admin/auth/schema/API tasks (2, 4, 5, 6, 7, 8, 9, 10, 11, 12) stand largely as originally written. Per the user: the "Institution Result" dropdown option is **kept** (non-functional, with "not available" message), and the **CAPTCHA is removed** from the search form.

**1. Spec coverage** — checked each spec section against tasks:
- §3 Architecture/routing → Task 1 (config, keep portal), Task 6 (verify root layout), Tasks 8/11 (admin shell + guard).
- §4 Schema → Task 2 (full SQL incl. RLS, seed, index, UNIQUE).
- §5 Auth → Task 4 (helpers, unit-tested), Task 7 (middleware), Task 8 (login/logout).
- §6 API → Task 9 (GET lookup/list), Task 10 (POST/PATCH/DELETE).
- §7 Student portal → **Task 13 (adapt search form: strip CAPTCHA, align types)** + **Task 14 (adapt result sheet to flat schema)**. Portal CSS/Bootstrap/logo kept as-is. Data layer rewritten in Task 3b.
- §8 Admin dashboard → Tasks 11 + 12 (shell, dynamic subject rows, list, edit, delete).
- §9 Env vars → Task 1 `.env.example`, README in Task 15.
- §10 Setup → README Task 15.
- §11 Out of scope → Institution data branch (UI kept, no data), CAPTCHA removed, no PDF, no bulk import, no multi-admin.

**2. Placeholder scan** — no TBD/TODO; all code blocks are complete. Two intentional blanks are real developer inputs: `.env.local` Supabase keys (filled by developer per README) and the AUTH_SECRET hex (generated via the documented command).

**3. Type consistency** — `Result` and `ResultInput` defined in Task 3 are reused in Tasks 3b, 9, 10, 12, 13, 14 with matching field names (`subjects`, `ca_subjects`, `roll_number`, `registration_no`, etc.). `SubjectMap = Record<string, {name, grade}>` matches what `sanitizeSubjects` returns (Task 10), what the admin `pack()` builds (Task 12), what `Object.entries(result.subjects)` iterates (Task 14), and what `Result.subjects` is typed as (Task 3). `Board`/`Exam` types (Task 3) match the rewritten `data.ts` return types (Task 3b) and the `StudentSearchForm` props (Task 13). `GRADES` is imported in Tasks 10 and 12 with the same constant name. `SESSION_COOKIE` / `signSession` / `verifySession` / `isPasswordCorrect` / `sessionTtl` names are identical across Tasks 4, 7, 8, 9, 10.

**4. Cross-file type flow (critical, since the portal is kept):**
- `lib/types.ts` (Task 3) exports `Board`, `Exam`, `Result`, `ResultInput`, `SubjectEntry`, `SubjectMap`.
- `lib/data.ts` (Task 3b) imports those, returns `Board[]` / `Exam[]` / `{year}[]` / `Result|null` — matches what `app/page.tsx` (unchanged) passes to `StudentSearchForm` and what `app/result/page.tsx` (Task 14) consumes.
- `StudentSearchForm.tsx` (Task 13) imports `Board`, `Exam` and accepts `{year:number}[]` — matches.
- Admin `page.tsx` (Task 12) imports `GRADES` from `lib/grades` and `Result` from `lib/types` — matches.

**Open risks:**
1. **Edge-runtime crypto** (Task 7 Step 2): if `crypto.createHmac` is unavailable in middleware, rewrite `verifySession` against Web Crypto (`crypto.subtle`). Flagged where it surfaces.
2. **Supabase factory name** (Task 3b Step 1): assumes `lib/supabase-server.ts` exports `createServerClient()`. Step 1 verifies and adapts if named differently. Note `data.ts` only reads, so anon-key is acceptable there; service role is used only by API routes (Tasks 9–10).
