import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { isGrade } from '@/lib/grades'
import type { Result, SubjectMap } from '@/lib/types'

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
    const v = val as { name?: unknown; grade?: unknown }
    if (typeof v.name !== 'string' || !isGrade(v.grade)) continue
    out[String(code)] = { name: v.name, grade: v.grade }
  }
  return out
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  if (!(await adminOk(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = createServiceClient()
  const { data, error } = await sb.from('results').select('*').eq('id', ctx.params.id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: 0, result: data as Result })
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  if (!(await adminOk(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  const strKeys = [
    'student_name','father_name','mother_name','group_name','student_type','gender',
    'date_of_birth','session','institute_name','result_status','remarks',
  ] as const
  for (const k of strKeys) if (typeof body[k] === 'string') update[k] = body[k]
  if (typeof body.board === 'string') update.board = body.board.toLowerCase().trim()
  if (typeof body.exam === 'string') update.exam = body.exam.toLowerCase().trim()

  for (const k of ['roll_number','registration_no','exam_year'] as const) {
    if (body[k] !== undefined) {
      const n = coerceInt(body[k])
      if (n === null) return NextResponse.json({ error: `${k} must be an integer` }, { status: 400 })
      update[k] = n
    }
  }
  if (typeof body.gpa === 'number') update.gpa = body.gpa
  if (body.subjects !== undefined) {
    const s = sanitizeSubjects(body.subjects)
    if (Object.keys(s).length === 0) return NextResponse.json({ error: 'At least one subject is required' }, { status: 400 })
    update.subjects = s
  }
  if (body.ca_subjects !== undefined) update.ca_subjects = sanitizeSubjects(body.ca_subjects)

  const sb = createServiceClient()
  const { data, error } = await sb.from('results').update(update).eq('id', ctx.params.id).select().single()
  if (error) {
    if (error.code === '23505')
      return NextResponse.json({ error: 'A result with this Board + Roll + Registration already exists.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ status: 0, result: data as Result })
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  if (!(await adminOk(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = createServiceClient()
  const { error } = await sb.from('results').delete().eq('id', ctx.params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ status: 0, ok: true })
}
