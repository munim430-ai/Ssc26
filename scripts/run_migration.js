const { Client } = require('pg')
const fs = require('fs')

const passwords = ['9hc00ZZ633!', 'sb_secret_0V0MtLJSqRzP4Ly36U2T']
const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'sa-east-1',
  'ca-central-1'
]

async function testConnection() {
  const sql = fs.readFileSync('supabase/migrations/001_schema.sql', 'utf8')
  const ref = 'evpepimbliuuyuugdxwq'
  
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`
    for (const pwd of passwords) {
      const user = `postgres.${ref}`
      const port = 6543
      
      const client = new Client({
        user,
        password: pwd,
        host,
        port,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000
      })
      try {
        await client.connect()
        console.log(`🎉 SUCCESS! Connected to ${host}`)
        await client.query(sql)
        console.log('🎉 SUCCESS! Migration executed successfully!')
        await client.end()
        return true
      } catch (err) {
        if (!err.message.includes('tenant/user')) {
          console.log(`Found tenant on ${host}: ${err.message}`)
        }
        try { await client.end() } catch {}
      }
    }
  }
  console.log('Finished scanning regions.')
  return false
}

testConnection()
