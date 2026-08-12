import { createHmac } from 'crypto'

const CAPTCHA_SECRET = process.env.AUTH_SECRET || 'captcha_fallback_secret_key_12345'

export type CaptchaChallenge = {
  num1: number
  num2: number
  answer: number
  token: string
}

export function generateCaptchaChallenge(): CaptchaChallenge {
  const num1 = Math.floor(Math.random() * 9) + 1
  const num2 = Math.floor(Math.random() * 9) + 1
  const answer = num1 + num2

  const payload = `${answer}:${Date.now()}`
  const hmac = createHmac('sha256', CAPTCHA_SECRET).update(payload).digest('hex')
  const token = Buffer.from(`${payload}:${hmac}`).toString('base64url')

  return { num1, num2, answer, token }
}

export function verifyCaptchaToken(inputAnswer: string, token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const [ansStr, tsStr, hmac] = decoded.split(':')
    if (!ansStr || !tsStr || !hmac) return false

    // Check expiration (5 minutes)
    const ts = parseInt(tsStr, 10)
    if (isNaN(ts) || Date.now() - ts > 5 * 60 * 1000) return false

    // Verify HMAC signature
    const expectedHmac = createHmac('sha256', CAPTCHA_SECRET).update(`${ansStr}:${tsStr}`).digest('hex')
    if (hmac !== expectedHmac) return false

    return parseInt(inputAnswer.trim(), 10) === parseInt(ansStr, 10)
  } catch {
    return false
  }
}

export function generateCaptchaSvg(num1: number, num2: number): string {
  const text = `${num1} + ${num2} = `
  const width = 130
  const height = 40

  // Noise lines
  const lines = Array.from({ length: 4 }).map(() => {
    const x1 = Math.floor(Math.random() * width)
    const y1 = Math.floor(Math.random() * height)
    const x2 = Math.floor(Math.random() * width)
    const y2 = Math.floor(Math.random() * height)
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#14A44D" stroke-width="1.5" opacity="0.6"/>`
  }).join('')

  // Noise dots
  const dots = Array.from({ length: 25 }).map(() => {
    const cx = Math.floor(Math.random() * width)
    const cy = Math.floor(Math.random() * height)
    const r = (Math.random() * 1.5 + 0.5).toFixed(1)
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#3B71CA" opacity="0.5"/>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#F5F5F5" rx="6" ry="6" stroke="#cccccc" stroke-width="1"/>
    ${dots}
    ${lines}
    <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="Verdana, Geneva, sans-serif" font-size="20" font-weight="bold" fill="#222222" letter-spacing="2">
      ${text}
    </text>
  </svg>`
}
