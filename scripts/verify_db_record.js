const { Client } = require('pg')

const client = new Client({
  user: 'postgres.evpepimbliuuyuugdxwq',
  password: '9hc00ZZ633!',
  host: 'aws-0-ap-southeast-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
})

async function check() {
  await client.connect()
  const res = await client.query("SELECT roll_number, student_name, board, gpa, result_status, subjects FROM results WHERE roll_number = 180365")
  console.log('Database Result for 180365:', JSON.stringify(res.rows[0], null, 2))
  await client.end()
}

check().catch(console.error)
