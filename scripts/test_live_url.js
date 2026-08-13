const https = require('https')

const url = 'https://eboardresultsserver-v1.vercel.app/result?board=dhaka&exam=ssc&year=2026&roll=180124'

https.get(url, (res) => {
  let body = ''
  res.on('data', (chunk) => body += chunk)
  res.on('end', () => {
    console.log('HTTP Status Code:', res.statusCode)
    if (body.includes('ASREVA AROVE')) {
      console.log('✅ Found ASREVA AROVE on live Vercel result page!')
    } else if (body.includes('NO REVIEW FOUND')) {
      console.log('❌ Still shows ( NO REVIEW FOUND ) on Vercel')
    } else {
      console.log('Snippet:', body.slice(0, 500))
    }
  })
}).on('error', (e) => {
  console.error('Fetch error:', e)
})
