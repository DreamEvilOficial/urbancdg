import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import db from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

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

    // Autenticación usando lib/db (con fallback)
    const user = await db.get('SELECT * FROM usuarios WHERE usuario = ? OR email = ?', [username, username]) as any

    if (!user) {
      console.warn('❌ User not found:', username)
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 })
    }

    // Verificar contraseña (bcrypt o texto plano legacy)
    let validPassword = false
    if (user.password_hash) {
      validPassword = bcrypt.compareSync(password, user.password_hash)
    } else if (user.contrasena) {
      validPassword = (password === user.contrasena)
    }

    if (!validPassword) {
      console.warn('❌ Invalid password for:', username)
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }
    
    // Mapear usuario para sesión
    const sessionUser = {
      id: user.id,
      email: user.email,
      usuario: user.usuario,
      nombre: user.nombre,
      rol: user.rol,
      admin: user.rol === 'admin' || user.rol === 'superadmin' || !!user.admin,
    }
    
    const sessionPayload = {
      user: sessionUser,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    }

    const sessionString = JSON.stringify(sessionPayload)
    const signature = await signData(sessionString, secret)
    
    // Usamos Buffer en Node para asegurar b64 limpio
    const payloadB64 = Buffer.from(sessionString).toString('base64');
    const cookieValue = payloadB64 + '.' + signature

    const response = NextResponse.json({ success: true, user: sessionUser })
    
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
