import { createServerClient } from '@/lib/supabase-server'
import type { Board, Exam, ExaminationYear, Result } from '@/lib/types'

const DEFAULT_BOARDS: Board[] = [
  { code: 'barisal', name: 'Barisal' },
  { code: 'chittagong', name: 'Chittagong' },
  { code: 'comilla', name: 'Comilla' },
  { code: 'dhaka', name: 'Dhaka' },
  { code: 'dinajpur', name: 'Dinajpur' },
  { code: 'jessore', name: 'Jessore' },
  { code: 'madrasah', name: 'Madrasah' },
  { code: 'mymensingh', name: 'Mymensingh' },
  { code: 'rajshahi', name: 'Rajshahi' },
  { code: 'sylhet', name: 'Sylhet' },
  { code: 'tec', name: 'Technical' },
]

const DEFAULT_EXAMS: Exam[] = [
  { code: 'jsc', name: 'JSC/JDC' },
  { code: 'ssc', name: 'SSC/Dakhil/Equivalent' },
  { code: 'hsc', name: 'HSC/Alim/Equivalent' },
  { code: 'dibs', name: 'DIBS (Diploma in Business Studies)' },
]

// ---- Reference data for the search-form dropdowns -----------------------
export async function getEducationBoards(): Promise<Board[]> {
  try {
    const sb = createServerClient()
    const { data, error } = await sb.from('boards').select('*').order('name')
    if (error || !data || data.length === 0) return DEFAULT_BOARDS
    return data as Board[]
  } catch {
    return DEFAULT_BOARDS
  }
}

export async function getExaminations(): Promise<Exam[]> {
  try {
    const sb = createServerClient()
    const { data, error } = await sb.from('exams').select('*').order('name')
    if (error || !data || data.length === 0) return DEFAULT_EXAMS
    return data as Exam[]
  } catch {
    return DEFAULT_EXAMS
  }
}

// Years are generated programmatically (1996..currentYear).
export async function getExaminationYears(): Promise<ExaminationYear[]> {
  const current = new Date().getFullYear()
  const years: ExaminationYear[] = []
  for (let y = current; y >= 1996; y--) years.push({ year: y })
  return years
}

// ---- Lookup -------------------------------------------------------------
export async function searchStudent(
  roll: number,
  boardCode: string,
  _examCode: string,
  examYear?: number,
  reg?: number,
): Promise<Result | null> {
  try {
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
  } catch {
    return null
  }
}

export async function getResultById(id: string): Promise<Result | null> {
  try {
    const sb = createServerClient()
    const { data, error } = await sb.from('results').select('*').eq('id', id).maybeSingle()
    if (error) return null
    return (data as Result) ?? null
  } catch {
    return null
  }
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

export const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', 'D', 'F']
