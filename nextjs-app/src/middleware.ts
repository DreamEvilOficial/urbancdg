import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/admin/login')) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (pathname === '/admin') {
    return response
  }

  if (pathname.startsWith('/admin')) {
    const adminAuth = request.cookies.get('admin-auth')?.value === '1'
    const adminSession = request.cookies.get('admin-session')?.value

    if (!adminAuth && !adminSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    if (adminSession) {
      try {
        const payload = adminSession.split('.')[0] || ''
        const json = atob(payload)
        const session = JSON.parse(json)
        if (!session?.expiresAt || Number(session.expiresAt) < Date.now()) {
          return NextResponse.redirect(new URL('/admin/login', request.url))
        }
      } catch {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
