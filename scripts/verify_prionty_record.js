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
  const res = await client.query(
    `SELECT roll_number, student_name, board, gpa, result_status, subjects, ca_subjects
     FROM results
     WHERE roll_number = 302967 AND board = 'dhaka'`
  )
  if (res.rows.length === 0) {
    console.log('NO RECORD FOUND')
  } else {
    const r = res.rows[0]
    console.log(JSON.stringify({
      roll_number: r.roll_number,
      student_name: r.student_name,
      board: r.board,
      gpa: r.gpa,
      result_status: r.result_status,
      english: r.subjects['107'],
      geography: r.subjects['110'],
      total_subjects: Object.keys(r.subjects).length,
      ca_subjects: Object.keys(r.ca_subjects).length
    }, null, 2))
  }
  await client.end()
}

run().catch(console.error)
