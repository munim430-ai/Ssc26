const { createClient } = require('@supabase/supabase-js')

const url = 'https://evpepimbliuuyuugdxwq.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cGVwaW1ibGl1dXl1dWdkeHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzODQ2MTEsImV4cCI6MjEwMTk2MDYxMX0.VMJX8raAx_HwpAxT-XO9rgezVdFChLiEkvdHZad4ODE'

const sb = createClient(url, anonKey)

async function test() {
  const roll = 536471
  console.log('Testing anon key query for Siyam...')
  const { data, error } = await sb.from('results').select('*').eq('roll_number', roll)
  if (error) {
    console.error('Anon query error:', error.message)
  } else {
    console.log('Anon query results:', data.length, JSON.stringify(data))
  }
}

test().catch(console.error)
