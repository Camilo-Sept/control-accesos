import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TOKEN_COOKIE = 'ca_token'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // público
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next()
  }

  // protegemos dashboard + registros
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/registros')
  if (!isProtected) return NextResponse.next()

  const token = req.cookies.get(TOKEN_COOKIE)?.value
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
