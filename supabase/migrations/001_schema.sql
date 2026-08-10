-- ============================================================
-- SSC Result System — schema, seed, RLS
-- Run in Supabase Dashboard → SQL Editor (or: supabase db push)
-- ============================================================

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
-- NOTE: no INSERT/UPDATE/DELETE policy — service_role bypasses RLS, and only
-- the server uses it (SUPABASE_SERVICE_ROLE_KEY, never shipped to browser).
