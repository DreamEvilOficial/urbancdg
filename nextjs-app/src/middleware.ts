import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Redireccionar /admin/login a /admin para unificar acceso y evitar rutas muertas
  if (pathname.startsWith('/admin/login')) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // 2. Permitir acceso libre a la raíz /admin (la página maneja el login inline)
  // Esto ROMPE el bucle de redirección: si no tienes sesión, llegas aquí y te quedas aquí.
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.next()
  }

  // 3. Proteger solo subrutas profundas de admin (ej: /admin/dashboard/settings)
  // Si alguien intenta entrar directo a una subruta sin sesión, va al login en /admin
  if (pathname.startsWith('/admin/')) {
    const adminSession = request.cookies.get('admin-session')?.value
    
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Verificar validez básica de la sesión
    try {
      const payload = adminSession.split('.')[0]
      // Usamos atob que es compatible con Edge Runtime
      const json = atob(payload)
      const session = JSON.parse(json)
      
      if (!session?.expiresAt || Number(session.expiresAt) < Date.now()) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    } catch (e) {
      // Si el token es inválido, redirigir al login
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
