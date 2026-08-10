import { NextRequest, NextResponse } from 'next/server'
import { isPasswordCorrect, signSession, sessionTtl, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  let body: { password?: string } = {}
  try {
    body = await req.json()
  } catch {
    /* empty body */
  }
  const password = typeof body.password === 'string' ? body.password : ''
  if (!isPasswordCorrect(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = await signSession({ role: 'admin', exp: Date.now() + sessionTtl() })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(sessionTtl() / 1000),
  })
  return res
}
