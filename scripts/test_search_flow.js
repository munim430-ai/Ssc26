const { createClient } = require('@supabase/supabase-js')

const url = 'https://evpepimbliuuyuugdxwq.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cGVwaW1ibGl1dXl1dWdkeHdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM4NDYxMSwiZXhwIjoyMTAxOTYwNjExfQ.Ba1S1AhceA-dpC4uuiSKjQQChg9iuPzikiqIGgUbtvk'

const sb = createClient(url, serviceKey)

async function searchStudent(roll, boardCode, examCode, examYear, reg) {
  const cleanBoard = (boardCode || '').trim()
  const cleanExam = (examCode || '').trim()

  let q = sb.from('results').select('*').eq('roll_number', roll)

  if (cleanBoard) {
    q = q.ilike('board', cleanBoard)
  }

  if (cleanExam) {
    q = q.ilike('exam', cleanExam)
  }

  if (typeof examYear === 'number' && !isNaN(examYear) && examYear > 1990) {
    q = q.eq('exam_year', examYear)
  }

  // 1st attempt: Include registration number if provided
  if (typeof reg === 'number' && !isNaN(reg) && reg > 0) {
    const regQ = q.eq('registration_no', reg)
    const { data: regData } = await regQ.limit(1).maybeSingle()
    if (regData) return regData
  }

  // 2nd attempt: Fallback search by roll, board, exam, exam_year without reg restriction
  let fallbackQ = sb.from('results').select('*').eq('roll_number', roll)
  if (cleanBoard) fallbackQ = fallbackQ.ilike('board', cleanBoard)
  if (cleanExam) fallbackQ = fallbackQ.ilike('exam', cleanExam)
  if (typeof examYear === 'number' && !isNaN(examYear) && examYear > 1990) {
    fallbackQ = fallbackQ.eq('exam_year', examYear)
  }

  const { data, error } = await fallbackQ.limit(1).maybeSingle()
  if (error) {
    console.error('searchStudent error:', error.message)
    return null
  }
  return data
}

async function run() {
  console.log('--- Test A: reg=undefined ---')
  const rA = await searchStudent(536471, 'dhaka', 'ssc', 2026, undefined)
  console.log('Result A:', rA ? rA.student_name : 'null')

  console.log('--- Test B: reg=1310931557 ---')
  const rB = await searchStudent(536471, 'dhaka', 'ssc', 2026, 1310931557)
  console.log('Result B:', rB ? rB.student_name : 'null')
}

run().catch(console.error)
