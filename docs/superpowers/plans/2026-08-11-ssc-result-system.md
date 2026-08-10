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

```
ssc-result-system/
├─ .env.local                     # secrets (gitignored)
├─ .env.example                   # template, committed
├─ package.json                   # deps + dev script on port 3001
├─ next.config.js
├─ tsconfig.json
├─ middleware.ts                  # guards /admin/*
├─ supabase/migrations/001_schema.sql
├─ vitest.config.ts
└─ src/
   ├─ app/
   │  ├─ layout.tsx               # root layout, imports globals.css
   │  ├─ globals.css              # shared resets + admin styles
   │  ├─ (public)/
   │  │  ├─ page.tsx              # search/login form
   │  │  ├─ result/page.tsx       # result sheet
   │  │  └─ portal.css            # port of reference portal CSS
   │  ├─ admin/
   │  │  ├─ login/page.tsx        # password form
   │  │  ├─ logout/route.ts       # clears cookie
   │  │  ├─ layout.tsx            # guarded shell
   │  │  ├─ page.tsx              # dashboard (list + form)
   │  │  └─ admin.css
   │  └─ api/results/
   │     ├─ route.ts              # GET list/lookup, POST create
   │     └─ [id]/route.ts         # GET, PATCH, DELETE
   └─ lib/
      ├─ supabase-browser.ts      # anon-key client
      ├─ supabase-server.ts       # service-role client (server only)
      ├─ auth.ts                  # HMAC sign/verify cookie
      ├─ grades.ts                # GRADES const + validator
      └─ types.ts                 # Result, SubjectEntry, etc.
```

**Responsibility split:**
- `lib/auth.ts` — pure crypto; no Next imports; unit-testable.
- `lib/grades.ts` — pure const + validator; unit-testable.
- `lib/supabase-browser.ts` — anon client used only in Client Components.
- `lib/supabase-server.ts` — service-role client used only in Route Handlers / Server Components; never imported by browser code.
- API routes are thin controllers: parse → auth check → call Supabase → shape response.
- Public components never import `supabase-server.ts` or `auth.ts`.

---

### Task 1: Project scaffold and config

**Files:**
- Modify: `ssc-result-system/package.json`
- Modify: `ssc-result-system/tsconfig.json`
- Modify: `ssc-result-system/next.config.js`
- Create: `ssc-result-system/.env.example`
- Create: `ssc-result-system/.env.local`
- Create: `ssc-result-system/.gitignore`
- Create: `ssc-result-system/vitest.config.ts`
- Delete: everything under `ssc-result-system/src/` (old over-normalized scaffold) and `ssc-result-system/supabase/migrations/001_initial_schema.sql`

**Interfaces:**
- Produces: a runnable `npm install && npm run dev` on port 3001.

- [ ] **Step 1: Wipe the old scaffold's src and migrations**

Run from `D:\SSC\ssc-result-system`:
```bash
rm -rf src supabase
```

- [ ] **Step 2: Write `package.json`**

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

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
module.exports = nextConfig;
```

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

(Do not start dev yet — there's no `src/app` yet. We verify boot in Task 8.)

- [ ] **Step 10: Commit**

```bash
cd /d/SSC
git add ssc-result-system/package.json ssc-result-system/tsconfig.json ssc-result-system/next.config.js ssc-result-system/.gitignore ssc-result-system/.env.example ssc-result-system/vitest.config.ts
git commit -m "chore: scaffold ssc-result-system (port 3001, vitest, supabase deps)"
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

### Task 3: Types and grade vocabulary

**Files:**
- Create: `ssc-result-system/src/lib/types.ts`
- Create: `ssc-result-system/src/lib/grades.ts`
- Create: `ssc-result-system/src/lib/grades.test.ts`

**Interfaces:**
- Produces: `Grade` type, `GRADES` array, `isGrade(x): x is Grade`, `SubjectEntry` type, `Result` type (DB row), `ResultInput` type (admin form payload).

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

- [ ] **Step 4: Write `types.ts`**

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

### Task 13: Student portal — search page

**Files:**
- Create: `ssc-result-system/src/app/(public)/portal.css`
- Create: `ssc-result-system/src/app/(public)/page.tsx`

**Interfaces:**
- Consumes: `GET /api/results?board=&roll=&reg=`; on success stores result JSON in `sessionStorage` key `lastResult` and `router.push('/result')`.
- Produces: a faithful replica of `regristation select.html` (green header, dropdowns, Roll/Reg fields shown only when Individual selected).

- [ ] **Step 1: Write `portal.css`** (excerpt of the reference's `<style>` that matters)

```css
#main-header2 {
  height: auto; margin: 15px 0; background-color: #14A44D;
  padding: 10px; text-align: center; border-radius: 10px;
  display: flex; align-items: center; gap: 12px;
}
#main-header2 h4, #main-header2 h5 { color: #fff; margin: 2px 0; }
#page-wrapper { padding: 0 50px; }
@media (max-width: 767px) { #page-wrapper { padding: 0 10px; } }
.page-header { text-align: center; }
.panel {
  margin-bottom: 20px; background-color: #fff; border: 1px solid transparent;
  border-radius: 4px; box-shadow: 0 1px 1px rgba(0,0,0,.05);
}
.panel-default { border-color: #ddd; }
.panel-heading {
  padding: 10px 15px; border-bottom: 1px solid transparent;
  border-top-left-radius: 3px; border-top-right-radius: 3px;
  color: #333; background-color: #f5f5f5; border-color: #ddd;
}
.panel-body { padding: 15px; }
.form-group { margin-bottom: 15px; }
.alert { padding: 10px; border-radius: 10px; margin-bottom: 12px; }
.alert-info { background-color: #e6f7ff; color: #0c5460; border: 1px solid #bee5eb; }
.center-block { display: block; margin-left: auto; margin-right: auto; }
.form-row { display: grid; grid-template-columns: 5fr 7fr; gap: 8px 16px; align-items: center; margin-bottom: 10px; }
.form-row label { font-weight: 700; }
#dev_info { background:#DCDCDC; padding:10px; border-radius:10px; margin:15px 0; text-align:center; }
#dev_info p { text-align:center; line-height:1.3; font-size:11px; margin: 2px 0; }
.govt-logo { width: 80px; height: 80px; padding: 5px; }
```

- [ ] **Step 2: Write `page.tsx`**

`ssc-result-system/src/app/(public)/page.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './portal.css';

const BOARDS = [
  ['barisal','Barisal'],['chittagong','Chittagong'],['comilla','Comilla'],['dhaka','Dhaka'],
  ['dinajpur','Dinajpur'],['jessore','Jessore'],['madrasah','Madrasah'],['mymensingh','Mymensingh'],
  ['rajshahi','Rajshahi'],['sylhet','Sylhet'],['tec','Technical'],
] as const;
const EXAMS = [['jsc','JSC/JDC'],['ssc','SSC/Dakhil/Equivalent'],['hsc','HSC/Alim/Equivalent'],['dibs','DIBS (Diploma in Business Studies)']] as const;
const YEARS = Array.from({ length: new Date().getFullYear() - 1995 }, (_, i) => String(new Date().getFullYear() - i));

export default function PortalSearchPage() {
  const router = useRouter();
  const [board, setBoard] = useState('');
  const [exam, setExam] = useState('');
  const [year, setYear] = useState('');
  const [resultType, setResultType] = useState('');
  const [roll, setRoll] = useState('');
  const [reg, setReg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const individual = resultType === '1';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    if (!individual) { setBusy(false); return; }
    if (!board || !roll || !reg) {
      setErr('Please fill Board, Roll and Registration.');
      setBusy(false); return;
    }
    const r = await fetch(`/api/results?board=${encodeURIComponent(board)}&roll=${encodeURIComponent(roll)}&reg=${encodeURIComponent(reg)}`);
    setBusy(false);
    if (r.ok) {
      const data = await r.json();
      sessionStorage.setItem('lastResult', JSON.stringify(data.result));
      router.push('/result');
    } else if (r.status === 404) {
      setErr('No result found for the given credentials.');
    } else {
      setErr('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="container-fluid">
      <div id="main-header2">
        <div className="govt-logo" aria-hidden style={{
          background: '#fff', borderRadius: 8, flex: '0 0 80px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#14A44D', fontWeight: 700,
        }}>GOVT</div>
        <div style={{ flex: 1 }}>
          <h4>WEB BASED RESULT PUBLICATION SYSTEM FOR EDUCATION BOARD</h4>
          <h5>JSC/JDC/SSC/DAKHIL/HSC/ALIM AND EQUIVALENT EXAMINATION</h5>
        </div>
      </div>

      <div id="page-wrapper">
        <div className="panel panel-default">
          <div className="panel-heading">Please provide the following information to view result</div>
          <div className="panel-body">
            <form onSubmit={submit}>
              <div className="form-row">
                <label htmlFor="board">Name of Board</label>
                <select id="board" className="form-control" value={board} onChange={(e) => setBoard(e.target.value)} required>
                  <option value="">Select One</option>
                  {BOARDS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>

                <label htmlFor="exam">Name of Examination</label>
                <select id="exam" className="form-control" value={exam} onChange={(e) => setExam(e.target.value)} required>
                  <option value="">Select One</option>
                  {EXAMS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>

                <label htmlFor="year">Year of Examination</label>
                <select id="year" className="form-control" value={year} onChange={(e) => setYear(e.target.value)} required>
                  <option value="">Select One</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>

                <label htmlFor="rt" style={{ color: 'red' }}>Type of Result</label>
                <select id="rt" className="form-control" value={resultType} onChange={(e) => setResultType(e.target.value)} required>
                  <option value="">Select One</option>
                  <option value="1">Individual/Detailed Result</option>
                </select>

                {individual && <>
                  <label htmlFor="roll">Roll Number of Examinee</label>
                  <input id="roll" className="form-control" type="number" value={roll}
                    onChange={(e) => setRoll(e.target.value)} required />
                  <label htmlFor="reg">Registration Number of Examinee</label>
                  <input id="reg" className="form-control" type="number" value={reg}
                    onChange={(e) => setReg(e.target.value)} required />
                </>}
              </div>

              {err && <div className="alert alert-info">{err}</div>}

              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button className="btn btn-success center-block" type="submit" disabled={busy}>
                  {busy ? 'Searching…' : 'View Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="dev_info">
        <p>Powered by <i>Inter-Education Board Coordination Committee</i></p>
        <p>Result Information Maintenance and Update: <i>Respective Board</i></p>
        <p>© All rights reserved</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/app/\(public\)/
git commit -m "feat(portal): student search page replicating reference UI"
```

---

### Task 14: Student portal — result sheet

**Files:**
- Create: `ssc-result-system/src/app/(public)/result/page.tsx`

**Interfaces:**
- Consumes: reads `sessionStorage['lastResult']` (set by the search page); renders `Result`. If absent, prompts to go back and search.
- Produces: a faithful replica of `WEB BASED RESULT PUBLICATION SYSTEM…html`.

- [ ] **Step 1: Write `result/page.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Result } from '@/lib/types';

export default function ResultPage() {
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('lastResult') : null;
    if (raw) { try { setR(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  if (!r) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <p>No result loaded. Please search first.</p>
        <Link className="btn btn-success" href="/">Go to Search</Link>
      </div>
    );
  }

  const subs = Object.entries(r.subjects);
  const caSubs = Object.entries(r.ca_subjects);

  return (
    <div className="container-fluid">
      <div id="page-wrapper">
        <div className="page-header">
          <h3>Result of {examLabel(r.exam)} Examination - {r.exam_year}</h3>
        </div>

        <Buttons />

        <div className="table-container">
          <table className="table-striped">
            <thead><tr><th colSpan={4}>Student Information Summary</th></tr></thead>
            <tbody>
              <tr><td>Roll No</td><td>{r.roll_number}</td><td>Registration No</td><td>{r.registration_no}</td></tr>
              <tr><td>Name of Student</td><td colSpan={3}>{r.student_name}</td></tr>
              {r.father_name && <tr><td>Father&apos;s Name</td><td colSpan={3}>{r.father_name}</td></tr>}
              {r.mother_name && <tr><td>Mother&apos;s Name</td><td colSpan={3}>{r.mother_name}</td></tr>}
              <tr><td>Board</td><td>{r.board.toUpperCase()}</td><td>Session</td><td>{r.session || 'N/A'}</td></tr>
              <tr>
                <td>Group</td><td>{r.group_name || 'N/A'}</td>
                <td>Type: {r.student_type || 'N/A'}</td><td>Gender: {r.gender || 'N/A'}</td>
              </tr>
              <tr>
                <td>Result</td><td>{r.result_status || (r.gpa != null ? `GPA=${r.gpa.toFixed(2)}` : 'N/A')}</td>
                <td>Date of Birth</td><td>{r.date_of_birth || 'N/A'}</td>
              </tr>
              <tr><td>Name of Institute</td><td colSpan={3}>{r.institute_name || 'N/A'}</td></tr>
            </tbody>
          </table>

          <div style={{ height: 10 }} />

          <div style={{ textAlign: 'center' }}><h4>Subject-wise Grade/Marks</h4></div>
          <table className="table-striped">
            <thead><tr><th>Subject Code</th><th>Subject Name</th><th>Grade</th></tr></thead>
            <tbody>
              {subs.map(([code, v]) => (
                <tr key={code}>
                  <td className="cent-align">{code}</td>
                  <td>{v.name}</td>
                  <td className="cent-align">{v.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {caSubs.length > 0 && (
            <>
              <div className="divpadding" />
              <div style={{ textAlign: 'center' }}><h4>Subject-wise Grade/Marks for Continuous Assessment</h4></div>
              <table className="table-striped">
                <thead><tr><th>Subject Code</th><th>Subject Name</th><th>Grade</th></tr></thead>
                <tbody>
                  {caSubs.map(([code, v]) => (
                    <tr key={code}>
                      <td className="cent-align">{code}</td>
                      <td>{v.name}</td>
                      <td className="cent-align">{v.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {r.remarks && (
            <>
              <div className="divpadding" />
              <div className="alert alert-info" style={{ textAlign: 'center' }}>
                <strong>Remarks:</strong> {r.remarks}
              </div>
            </>
          )}
        </div>

        <Buttons />
      </div>

      <style jsx>{`
        .table-container { width: 100%; overflow-x: auto; }
        .table-striped {
          width: 90%; margin: auto; border-collapse: collapse;
          box-shadow: 0 0 20px rgba(0,0,0,.15);
        }
        .table-striped thead tr { background-color: #14A44D; color: #fff; text-align: left; }
        .table-striped th, .table-striped td { padding: 12px 15px; }
        .table-striped tbody tr { border-bottom: 1px solid #ddd; }
        .table-striped tbody tr:nth-of-type(even) { background-color: #f3f3f3; }
        .table-striped tbody tr:last-of-type { border-bottom: 2px solid #009879; }
        .cent-align { text-align: center; }
        .divpadding { padding: 10px 0; }
        @media print {
          .btn, .no-print { display: none !important; }
          .table-striped { width: 100% !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

function Buttons() {
  return (
    <div className="no-print" style={{ textAlign: 'center', margin: '10px 0' }}>
      <Link className="btn btn-success" href="/">Search Again</Link>{' '}
      <button className="btn btn-info" onClick={() => window.print()}>Print</button>
    </div>
  );
}

function examLabel(code: string): string {
  switch (code) {
    case 'jsc': return 'JSC or Equivalent';
    case 'ssc': return 'SSC or Equivalent';
    case 'hsc': return 'HSC or Equivalent';
    case 'dibs': return 'DIBS';
    default: return code.toUpperCase();
  }
}
```

- [ ] **Step 2: Manual end-to-end test**

Prerequisites: `.env.local` filled with real Supabase keys, migration applied, and at least one result created via `/admin`.

```bash
cd /d/SSC/ssc-result-system && npm run dev
```
1. Open `http://localhost:3001/`.
2. Select Board = Dhaka, Exam = SSC, Year, Type = Individual, enter the Roll + Registration you created.
3. Click "View Result" → result sheet renders matching the reference layout (green header rows, striped tables, "Search Again"/"Print" buttons).
4. Click "Print" → browser print preview shows tables only (buttons hidden).
5. Try a wrong Roll → inline alert "No result found for the given credentials."

- [ ] **Step 3: Commit**

```bash
cd /d/SSC
git add ssc-result-system/src/app/\(public\)/result/
git commit -m "feat(portal): result sheet replicating reference layout"
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

**1. Spec coverage** — checked each spec section against tasks:
- §3 Architecture/routing → Task 1 (scaffold), Task 6 (layouts), Tasks 8/11 (admin shell + guard).
- §4 Schema → Task 2 (full SQL incl. RLS, seed, index, UNIQUE).
- §5 Auth → Task 4 (helpers, unit-tested), Task 7 (middleware), Task 8 (login/logout).
- §6 API → Task 9 (GET lookup/list), Task 10 (POST/PATCH/DELETE).
- §7 Student portal → Task 13 (search), Task 14 (result sheet) — both port reference CSS.
- §8 Admin dashboard → Tasks 11 + 12 (shell, dynamic subject rows, list, edit, delete).
- §9 Env vars → Task 1 `.env.example`, README in Task 15.
- §10 Setup → README Task 15.
- §11 Out of scope → omitted intentionally (no Institution result, no CAPTCHA, no PDF, no bulk import, no multi-admin).

**2. Placeholder scan** — no TBD/TODO; all code blocks are complete. Two intentional blanks are real developer inputs: `.env.local` Supabase keys (filled by developer per README) and the AUTH_SECRET hex (generated via the documented command).

**3. Type consistency** — `Result` and `ResultInput` defined in Task 3 are reused in Tasks 9, 10, 12, 14 with matching field names (`subjects`, `ca_subjects`, `roll_number`, `registration_no`, etc.). `SubjectMap = Record<string, {name, grade}>` matches what `sanitizeSubjects` returns and what the admin `pack()` builds and the result page iterates. `GRADES` exported from Task 3's `grades.ts` is imported in Tasks 10 and 12 with the same constant name. `SESSION_COOKIE` / `signSession` / `verifySession` / `isPasswordCorrect` / `sessionTtl` names are identical across Tasks 4, 7, 8, 9, 10.

**One open risk** (flagged in Task 7 Step 2): the edge-runtime compatibility of Node `crypto.createHmac` in `middleware.ts`. If the build errors, the fallback is to rewrite `verifySession` against the Web Crypto API (`crypto.subtle.importKey` + `sign('HMAC', …)`). This is the single most likely build-time surprise and is called out where it would surface.
