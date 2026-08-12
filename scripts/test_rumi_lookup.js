const http = require('https')

http.get('https://eboardresultsserver-v1.vercel.app/result?board=comilla&exam=ssc&year=2026&roll=180365', (res) => {
  let body = ''
  res.on('data', chunk => body += chunk)
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode)
    if (body.includes('ISRAT JAHAN RUMI')) console.log('✅ Found student name ISRAT JAHAN RUMI')
    if (body.includes('GPA=5.00') || body.includes('Passed')) console.log('✅ Result status Passed / GPA 5.00')
    if (body.includes('UNDER REVIEW')) console.log('✅ ( UNDER REVIEW) banner displayed!')
  })
})
