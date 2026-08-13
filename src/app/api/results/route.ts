import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { isGrade } from '@/lib/grades'
import type { Result, ResultInput, SubjectEntry, SubjectMap } from '@/lib/types'

async function adminOk(req: NextRequest): Promise<boolean> {
  return !!(await verifySession(req.cookies.get(SESSION_COOKIE)?.value))
}

function coerceInt(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

function sanitizeSubjects(raw: unknown): SubjectMap {
  if (typeof raw !== 'object' || raw === null) return {}
  const out: SubjectMap = {}
  for (const [code, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val !== 'object' || val === null) continue
    const v = val as { name?: unknown; grade?: unknown; marks?: unknown }
    if (typeof v.name !== 'string' || !isGrade(v.grade)) continue
    const entry: SubjectEntry = { name: v.name, grade: v.grade }
    if (v.marks !== undefined && v.marks !== null && String(v.marks).trim() !== '') {
      entry.marks = String(v.marks).trim()
    }
    out[String(code)] = entry
  }
  return out
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const board = url.searchParams.get('board')
  const roll = url.searchParams.get('roll')
  const reg = url.searchParams.get('reg')

  // Public lookup mode: case-insensitive matching with fallback
  if (board !== null || roll !== null || reg !== null) {
    if (!board || !roll) {
      return NextResponse.json({ error: 'board and roll are required' }, { status: 400 })
    }
    const rollNum = coerceInt(roll)
    const regNum = reg ? coerceInt(reg) : null
    if (rollNum === null) {
      return NextResponse.json({ error: 'roll must be an integer' }, { status: 400 })
    }
    const sb = createServiceClient()

    // Primary search with board (case-insensitive) + roll (+ reg if available)
    if (regNum !== null) {
      const { data: regData } = await sb.from('results')
        .select('*')
        .eq('roll_number', rollNum)
        .ilike('board', board.trim())
        .eq('registration_no', regNum)
        .limit(1)
        .maybeSingle()
      if (regData) return NextResponse.json({ status: 0, result: regData as Result })
    }

    // Fallback without reg requirement
    const { data, error } = await sb.from('results')
      .select('*')
      .eq('roll_number', rollNum)
      .ilike('board', board.trim())
      .limit(1)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'No result found for the given credentials' }, { status: 404 })
    return NextResponse.json({ status: 0, result: data as Result })
  }

  // Admin list mode (requires cookie).
  if (!(await adminOk(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('results')
    .select('id, roll_number, student_name, board, exam, exam_year, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await adminOk(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const roll_number = coerceInt(body.roll_number)
  const registration_no = coerceInt(body.registration_no)
  if (roll_number === null || registration_no === null)
    return NextResponse.json({ error: 'roll_number and registration_no must be integers' }, { status: 400 })
  if (typeof body.board !== 'string' || !body.board) return NextResponse.json({ error: 'board required' }, { status: 400 })
  if (typeof body.exam !== 'string' || !body.exam) return NextResponse.json({ error: 'exam required' }, { status: 400 })
  const exam_year = coerceInt(body.exam_year)
  if (exam_year === null) return NextResponse.json({ error: 'exam_year must be an integer' }, { status: 400 })
  if (typeof body.student_name !== 'string' || !body.student_name.trim())
    return NextResponse.json({ error: 'student_name required' }, { status: 400 })

  const subjects = sanitizeSubjects(body.subjects)
  if (Object.keys(subjects).length === 0)
    return NextResponse.json({ error: 'At least one subject is required' }, { status: 400 })

  const payload: Omit<ResultInput, 'id' | 'created_at' | 'updated_at'> = {
    roll_number, registration_no,
    board: String(body.board).toLowerCase().trim(),
    exam: String(body.exam).toLowerCase().trim(),
    exam_year,
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
  }

  const sb = createServiceClient()
  const { data, error } = await sb.from('results').insert(payload).select().single()
  if (error) {
    if (error.code === '23505') // unique_violation
      return NextResponse.json({ error: 'A result with this Board + Roll + Registration already exists.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ status: 0, result: data as Result }, { status: 201 })
}
