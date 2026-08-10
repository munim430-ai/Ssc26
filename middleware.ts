import { NextResponse, type NextRequest } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Allow the login page and login/logout route handlers themselves.
  if (pathname === '/admin/login') return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = await verifySession(token)
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
