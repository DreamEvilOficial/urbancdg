import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Redireccionar /admin (y sus subrutas) a /panel
  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/panel', request.url))
  }

  // 2. Manejo de autenticación en /panel
  // Si estamos en /panel y NO hay sesión, dejamos pasar porque la página maneja el login
  if (pathname === '/panel' || pathname === '/panel/') {
    return NextResponse.next()
  }

  // 3. Proteger subrutas de /panel
  if (pathname.startsWith('/panel/')) {
    const adminSession = request.cookies.get('admin-session')?.value
    
    if (!adminSession) {
      return NextResponse.redirect(new URL('/panel', request.url))
    }

    try {
      const payload = adminSession.split('.')[0]
      const json = atob(payload)
      const session = JSON.parse(json)
      
      if (!session?.expiresAt || Number(session.expiresAt) < Date.now()) {
        return NextResponse.redirect(new URL('/panel', request.url))
      }
    } catch (e) {
      return NextResponse.redirect(new URL('/panel', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/panel/:path*'],
}
