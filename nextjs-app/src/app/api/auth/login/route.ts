import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Supabase client (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Función para firmar datos (HMAC-SHA256)
async function signData(data: string, secret: string) {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const dataData = encoder.encode(data)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataData)
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'urban-fallback-secret-2024'

    console.log('Intento de login para:', username)

    // Autenticación real contra Supabase
    const { data, error } = await supabase.rpc('auth_login', {
      p_username: username,
      p_password: password,
    })

    const user = Array.isArray(data) ? data[0] : data
    
    if (error || !user || user.error) {
      console.warn('❌ Auth failed:', username, error || user?.error)
      const details = error ? error.message : (user?.error || 'Credenciales inválidas')
      return NextResponse.json({ error: details }, { status: 401 })
    }
    
    const sessionPayload = {
      user: {
        id: user.id,
        email: user.email,
        usuario: user.usuario,
        nombre: user.nombre,
        rol: user.rol,
        admin: !!user.admin,
        // Add any other fields you want to include in the session
        // For example, if your auth_login RPC returns more user details:
        // lastLogin: user.last_login,
        // organizationId: user.organization_id,
      },
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    }

    const sessionString = JSON.stringify(sessionPayload)
    const signature = await signData(sessionString, secret)
    
    // Usamos Buffer en Node para asegurar b64 limpio
    const payloadB64 = Buffer.from(sessionString).toString('base64');
    const cookieValue = payloadB64 + '.' + signature

    const response = NextResponse.json({ success: true, user: user })
    
    response.cookies.set({
      name: 'admin-session',
      value: cookieValue,
      httpOnly: true,
      secure: false, // Temporalmente false para asegurar que funcione en localhost sin HTTPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    // Cookie de ayuda para el frontend (no crítica)
    response.cookies.set({
      name: 'admin-auth',
      value: '1',
      httpOnly: false,
      secure: false, // Localhost fix
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Login route error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
