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

  // Count rows matching roll 536471 with various filter combos
  const combos = [
    { name: 'roll only', sql: `SELECT id, student_name, board, exam, exam_year FROM results WHERE roll_number = 536471` },
    { name: 'roll+board', sql: `SELECT id, student_name, board, exam, exam_year FROM results WHERE roll_number = 536471 AND board ILIKE 'dhaka'` },
    { name: 'roll+board+exam', sql: `SELECT id, student_name, board, exam, exam_year FROM results WHERE roll_number = 536471 AND board ILIKE 'dhaka' AND exam ILIKE 'ssc'` },
    { name: 'roll+board+exam+year', sql: `SELECT id, student_name, board, exam, exam_year FROM results WHERE roll_number = 536471 AND board ILIKE 'dhaka' AND exam ILIKE 'ssc' AND exam_year = 2026` },
    { name: 'Asruva roll+all', sql: `SELECT id, student_name, board, exam, exam_year FROM results WHERE roll_number = 180124 AND board ILIKE 'dhaka' AND exam ILIKE 'ssc' AND exam_year = 2026` },
    { name: 'Rumi roll+all', sql: `SELECT id, student_name, board, exam, exam_year FROM results WHERE roll_number = 180365 AND board ILIKE 'comilla' AND exam ILIKE 'ssc' AND exam_year = 2026` },
  ]

  for (const combo of combos) {
    const r = await client.query(combo.sql)
    console.log(`${combo.name}: ${r.rows.length} row(s)`)
    for (const row of r.rows) console.log('   ', JSON.stringify(row))
  }

  await client.end()
}

run().catch(console.error)
