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
  const r = await client.query(
    `SELECT roll_number, student_name, board, exam, exam_year, gpa, result_status, subjects, ca_subjects
     FROM results WHERE roll_number = 536471 AND board = 'dhaka'`
  )
  console.log(JSON.stringify(r.rows[0], null, 2))
  await client.end()
}

run().catch(console.error)
