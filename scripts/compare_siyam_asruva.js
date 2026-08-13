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
    `SELECT * FROM results WHERE roll_number IN (180124, 536471) ORDER BY roll_number`
  )
  for (const row of r.rows) {
    console.log('=== roll', row.roll_number, '===')
    for (const [k, v] of Object.entries(row)) {
      let s = typeof v === 'object' ? JSON.stringify(v) : String(v)
      if (s.length > 200) s = s.slice(0, 200) + '...'
      console.log(`  ${k}: ${s}`)
    }
  }
  await client.end()
}

run().catch(console.error)
