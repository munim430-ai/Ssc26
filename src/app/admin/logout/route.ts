import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth'

export async function POST() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
  const res = NextResponse.redirect(new URL('/admin/login', base))
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
