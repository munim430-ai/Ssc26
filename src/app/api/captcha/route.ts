import { NextRequest, NextResponse } from 'next/server'
import { generateCaptchaChallenge, generateCaptchaSvg, verifyCaptchaToken } from '@/lib/captcha'

export const dynamic = 'force-dynamic'

export async function GET() {
  const challenge = generateCaptchaChallenge()
  const svg = generateCaptchaSvg(challenge.num1, challenge.num2)

  const res = new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })

  res.cookies.set('captcha_token', challenge.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  })

  return res
}

export async function POST(req: NextRequest) {
  try {
    const { answer } = await req.json()
    const token = req.cookies.get('captcha_token')?.value
    if (!token || !answer) {
      return NextResponse.json({ ok: false, error: 'CAPTCHA token or answer missing' }, { status: 400 })
    }

    const isValid = verifyCaptchaToken(String(answer), token)
    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Incorrect CAPTCHA answer' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }
}
