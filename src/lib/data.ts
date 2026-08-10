import { createServerClient } from '@/lib/supabase-server'
import type { Board, Exam, ExaminationYear, Result } from '@/lib/types'

// ---- Reference data for the search-form dropdowns -----------------------
export async function getEducationBoards(): Promise<Board[]> {
  const sb = createServerClient()
  const { data, error } = await sb.from('boards').select('*').order('name')
  if (error) throw error
  return (data as Board[]) ?? []
}

export async function getExaminations(): Promise<Exam[]> {
  const sb = createServerClient()
  const { data, error } = await sb.from('exams').select('*').order('name')
  if (error) throw error
  return (data as Exam[]) ?? []
}

// Years are generated programmatically (1996..currentYear).
export async function getExaminationYears(): Promise<ExaminationYear[]> {
  const current = new Date().getFullYear()
  const years: ExaminationYear[] = []
  for (let y = current; y >= 1996; y--) years.push({ year: y })
  return years
}

// ---- Lookup -------------------------------------------------------------
// Matches the (board, roll_number, registration_no) unique key.
// `examCode` and `examYear` are accepted for signature compatibility with
// the existing StudentSearchForm; the unique triple is the real filter, but
// we also narrow by year when provided for safety.
export async function searchStudent(
  roll: number,
  boardCode: string,
  _examCode: string,
  examYear?: number,
  reg?: number,
): Promise<Result | null> {
  const sb = createServerClient()
  let q = sb
    .from('results')
    .select('*')
    .eq('roll_number', roll)
    .eq('board', boardCode)
  if (typeof examYear === 'number') q = q.eq('exam_year', examYear)
  if (typeof reg === 'number') q = q.eq('registration_no', reg)
  const { data, error } = await q.limit(1).maybeSingle()
  if (error) return null
  return (data as Result) ?? null
}

export async function getResultById(id: string): Promise<Result | null> {
  const sb = createServerClient()
  const { data, error } = await sb.from('results').select('*').eq('id', id).maybeSingle()
  if (error) return null
  return (data as Result) ?? null
}

// ---- GPA ----------------------------------------------------------------
const GRADE_POINTS: Record<string, number> = {
  'A+': 5.0, 'A': 4.0, 'A-': 3.5, 'B+': 3.0, 'B': 2.5, 'B-': 2.0,
  'C': 1.5, 'D': 1.0, 'F': 0.0,
}

export function calculateGPA(result: Pick<Result, 'subjects'>): number | null {
  const entries = Object.values(result.subjects)
  if (entries.length === 0) return null
  let sum = 0, n = 0
  for (const e of entries) {
    const p = GRADE_POINTS[e.grade]
    if (typeof p === 'number') { sum += p; n++ }
  }
  if (n === 0) return null
  return Math.round((sum / n) * 100) / 100
}

// Back-compat: StudentSearchForm imports GRADE_OPTIONS indirectly via AdminDashboard.
export const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', 'D', 'F']
