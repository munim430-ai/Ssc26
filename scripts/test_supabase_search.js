const { createClient } = require('@supabase/supabase-js')

const url = 'https://evpepimbliuuyuugdxwq.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cGVwaW1ibGl1dXl1dWdkeHdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM4NDYxMSwiZXhwIjoyMTAxOTYwNjExfQ.Ba1S1AhceA-dpC4uuiSKjQQChg9iuPzikiqIGgUbtvk'

const sb = createClient(url, key)

async function test() {
  // SIYAM — the failing roll
  const roll = 536471
  const cleanBoard = 'dhaka'
  const cleanExam = 'ssc'
  const examYear = 2026

  console.log('Testing search for roll:', roll)

  // Test 1: exact string or number matching
  let q1 = sb.from('results').select('*').eq('roll_number', roll)
  const { data: d1, error: e1 } = await q1
  console.log('Test 1 (just roll eq number):', d1?.length, JSON.stringify(d1?.map((r) => ({ roll: r.roll_number, name: r.student_name, board: r.board, exam: r.exam, year: r.exam_year }))), e1?.message)

  let q2 = sb.from('results').select('*').eq('roll_number', String(roll))
  const { data: d2, error: e2 } = await q2
  console.log('Test 2 (just roll eq string):', d2?.length, JSON.stringify(d2?.map((r) => ({ roll: r.roll_number, name: r.student_name, board: r.board, exam: r.exam, year: r.exam_year }))), e2?.message)

  // Exact searchStudent() fallback query: roll eq + ilike board + ilike exam + eq exam_year
  let q3 = sb.from('results').select('*').eq('roll_number', roll).ilike('board', cleanBoard).ilike('exam', cleanExam).eq('exam_year', examYear)
  const { data: d3, error: e3 } = await q3
  console.log('Test 3 (full query with eq exam_year number):', JSON.stringify(d3?.map((r) => ({ roll: r.roll_number, name: r.student_name, board: r.board, exam: r.exam, year: r.exam_year }))), e3?.message)

  // Same but WITHOUT exam filter (proves which filter breaks it)
  let q4 = sb.from('results').select('*').eq('roll_number', roll).ilike('board', cleanBoard).eq('exam_year', examYear)
  const { data: d4, error: e4 } = await q4
  console.log('Test 4 (no exam filter):', d4?.length, d4?.[0]?.student_name, e4?.message)

  // Same but WITHOUT year filter
  let q5 = sb.from('results').select('*').eq('roll_number', roll).ilike('board', cleanBoard).ilike('exam', cleanExam)
  const { data: d5, error: e5 } = await q5
  console.log('Test 5 (no year filter):', d5?.length, d5?.[0]?.student_name, e5?.message)
}

test().catch(console.error)
