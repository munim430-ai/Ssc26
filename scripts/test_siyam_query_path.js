const { Client } = require('pg')

const client = new Client({
  user: 'postgres.evpepimbliuuyuugdxwq',
  password: '9hc00ZZ633!',
  host: 'aws-0-ap-southeast-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  await client.connect()

  // Exact query path used by searchStudent() with all filters
  const r = await client.query(
    `SELECT roll_number, student_name, board, exam, exam_year
     FROM results
     WHERE roll_number = 536471
       AND board ILIKE 'dhaka'
       AND exam ILIKE 'ssc'
       AND exam_year = 2026`
  )
  console.log('With exam+year filters:', JSON.stringify(r.rows))

  // Also check: what type is exam_year column?
  const r2 = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'results' AND column_name IN ('roll_number','exam_year','board','exam')`
  )
  console.log('Column types:', JSON.stringify(r2.rows))

  await client.end()
}

run().catch(console.error)
