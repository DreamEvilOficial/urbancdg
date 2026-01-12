import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiter (Best effort for serverless/edge)
const rateLimit = new Map();

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response = NextResponse.next()

  // --- 1. SECURITY HEADERS (CSP & OTHERS) ---
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://*.stripe.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.supabase.co https://*.stripe.com;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co https://*.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // --- 2. RATE LIMITING (API PROTECTION) ---
  if (pathname.startsWith('/api')) {
    const ip = request.ip || '127.0.0.1'
    const limit = 100 // requests
    const windowMs = 60 * 1000 // 1 minute
    
    const now = Date.now()
    const record = rateLimit.get(ip)

    if (record) {
        if (now - record.startTime > windowMs) {
            rateLimit.set(ip, { count: 1, startTime: now })
        } else {
            record.count++
            if (record.count > limit) {
                return new NextResponse('Too Many Requests', { status: 429 })
            }
        }
    } else {
        rateLimit.set(ip, { count: 1, startTime: now })
    }
  }

  // --- 3. EXISTING AUTH LOGIC & REDIRECTS ---

  // Redireccionar /admin (y sus subrutas) a /panel
  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/panel', request.url))
  }

  // Manejo de autenticación en /panel
  if (pathname === '/panel' || pathname === '/panel/') {
    return response
  }

  // Proteger subrutas de /panel
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

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
