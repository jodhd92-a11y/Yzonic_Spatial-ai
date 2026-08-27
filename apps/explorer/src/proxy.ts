import { NextRequest, NextResponse } from 'next/server'

const AUTH_PATHS = ['/login', '/signup', '/verify-otp', '/forgot-password', '/reset-password']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p))

  // Cheap presence check only — this is not a security boundary. The gateway's
  // JwtAuthGuard is the real authority; this just avoids flashing protected
  // UI before a client-side redirect would kick in.
  const hasSession = Boolean(req.cookies.get('access_token') ?? req.cookies.get('refresh_token'))

  if (!isAuthPath && !hasSession) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPath && hasSession && pathname !== '/verify-otp' && pathname !== '/reset-password') {
    // Already signed in — no reason to show login/signup again.
    // (verify-otp/reset-password stay reachable since they're mid-flow states.)
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
