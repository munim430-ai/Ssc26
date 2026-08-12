const { createClient } = require('@supabase/supabase-js')

const url = 'https://evpepimbliuuyuugdxwq.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cGVwaW1ibGl1dXl1dWdkeHdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM4NDYxMSwiZXhwIjoyMTAxOTYwNjExfQ.Ba1S1AhceA-dpC4uuiSKjQQChg9iuPzikiqIGgUbtvk'

const sb = createClient(url, key)

async function test() {
  const roll = 180124
  const cleanBoard = 'dhaka'
  const cleanExam = 'ssc'
  const examYear = 2026

  console.log('Testing search for roll:', roll)

  // Test 1: exact string or number matching
  let q1 = sb.from('results').select('*').eq('roll_number', roll)
  const { data: d1, error: e1 } = await q1
  console.log('Test 1 (just roll eq number):', d1?.length, e1?.message)

  let q2 = sb.from('results').select('*').eq('roll_number', String(roll))
  const { data: d2, error: e2 } = await q2
  console.log('Test 2 (just roll eq string):', d2?.length, e2?.message)

  let q3 = sb.from('results').select('*').eq('roll_number', roll).ilike('board', cleanBoard).ilike('exam', cleanExam).eq('exam_year', examYear)
  const { data: d3, error: e3 } = await q3
  console.log('Test 3 (full query with eq exam_year number):', d3, e3?.message)
}

test().catch(console.error)
