import { createHmac } from 'crypto'

const CAPTCHA_SECRET = process.env.AUTH_SECRET || 'captcha_fallback_secret_key_12345'

export type CaptchaChallenge = {
  digits: string
  token: string
}

export function generateCaptchaChallenge(): CaptchaChallenge {
  // Generate 4 random digits (e.g. "4385")
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1).join('')
  const payload = `${digits}:${Date.now()}`
  const hmac = createHmac('sha256', CAPTCHA_SECRET).update(payload).digest('hex')
  const token = Buffer.from(`${payload}:${hmac}`).toString('base64url')

  return { digits, token }
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

    return inputAnswer.trim() === ansStr.trim()
  } catch {
    return false
  }
}

export function generateCaptchaSvg(digits: string): string {
  const width = 180
  const height = 55

  // Generate 4 digit positions along the arch curve
  const digitChars = digits.split('')
  const textElements = digitChars.map((char, idx) => {
    // Distribute X from 35px to 145px
    const x = 30 + idx * 38
    // Arch curve Y offset (peaks in middle)
    const curveY = 32 - Math.sin((idx + 0.5) / 4 * Math.PI) * 10
    // Subtle rotation (-10 to +10 deg)
    const rot = (idx - 1.5) * 6
    return `<text x="${x}" y="${curveY}" transform="rotate(${rot}, ${x}, ${curveY})" font-family="'Courier New', Impact, 'Arial Black', monospace" font-size="28" font-weight="900" fill="#FFFFFF" stroke="#111111" stroke-width="1.2" text-anchor="middle" filter="url(#shadow)">${char}</text>`
  }).join('')

  // Organic background elements matching scenic forest/mountain texture
  const bgTrees = Array.from({ length: 12 }).map((_, i) => {
    const tx = i * 16 + 5
    const ty = 30 + (i % 3) * 4
    const h = 25 + (i % 4) * 5
    return `<polygon points="${tx},${ty + h} ${tx + 8},${ty} ${tx + 16},${ty + h}" fill="${i % 2 === 0 ? '#2d5a27' : '#1e3f1a'}" opacity="0.8"/>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      {/* Arch Bridge Clip Path */}
      <clipPath id="arch-clip">
        <path d="M 0 ${height} Q ${width / 2} 8 ${width} ${height} L ${width} 14 Q ${width / 2} -22 0 14 Z" />
      </clipPath>
      {/* Background Scenic Gradient */}
      <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4e7d43"/>
        <stop offset="35%" stop-color="#7a9a60"/>
        <stop offset="70%" stop-color="#3b5e2b"/>
        <stop offset="100%" stop-color="#24401a"/>
      </linearGradient>
      <linearGradient id="sky-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#9bb3c8"/>
        <stop offset="100%" stop-color="#d4e2ee"/>
      </linearGradient>
      {/* Drop Shadow for White Stencil Text */}
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.8"/>
      </filter>
    </defs>

    {/* Clipped Container */}
    <g clip-path="url(#arch-clip)">
      {/* Sky Background */}
      <rect width="100%" height="100%" fill="url(#sky-grad)" />
      {/* Mountain Base */}
      <path d="M 0 45 L 30 20 L 70 38 L 120 15 L 160 35 L 180 25 L 180 60 L 0 60 Z" fill="#4d5d43" opacity="0.9" />
      <path d="M 0 50 L 45 30 L 95 45 L 140 28 L 180 50 L 180 60 L 0 60 Z" fill="#2d4224" opacity="0.95" />
      {/* Forest Trees */}
      ${bgTrees}
      {/* Texture Lines */}
      <line x1="10" y1="20" x2="170" y2="40" stroke="#ffffff" stroke-width="1.2" opacity="0.3" />
      <line x1="20" y1="40" x2="160" y2="20" stroke="#ffffff" stroke-width="1.2" opacity="0.3" />
      {/* Stencil Digit Characters */}
      ${textElements}
    </g>

    {/* Arch Border Outline */}
    <path d="M 0 ${height} Q ${width / 2} 8 ${width} ${height} M ${width} 14 Q ${width / 2} -22 0 14" stroke="#555555" stroke-width="1" fill="none" opacity="0.6" />
  </svg>`
}
