import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-key-urban-cdg');

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const sessionToken = req.cookies.get('session')?.value

  // Protected routes pattern
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/admin') || 
                          req.nextUrl.pathname.startsWith('/profile') ||
                          req.nextUrl.pathname.startsWith('/checkout')

  // Allow login page in admin
  if (req.nextUrl.pathname.startsWith('/admin/login')) {
      return res;
  }

  if (isProtectedRoute) {
      if (!sessionToken) {
          const redirectUrl = new URL('/admin/login', req.url)
          redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
          // Adjust redirect for non-admin routes if needed, but keeping simple for now
          if (!req.nextUrl.pathname.startsWith('/admin')) {
             // redirectUrl.pathname = '/login'; // If we had a general login
          }
          return NextResponse.redirect(redirectUrl)
      }

      try {
          await jwtVerify(sessionToken, SECRET_KEY)
          // Valid session
      } catch (error) {
          // Invalid token
          const redirectUrl = new URL('/admin/login', req.url)
          return NextResponse.redirect(redirectUrl) 
      }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/checkout/:path*'],
}
