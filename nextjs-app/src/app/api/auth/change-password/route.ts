import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import db from '@/lib/db'
import bcrypt from 'bcryptjs'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'secret-key-urban-cdg');

export async function POST(request: Request) {
  const sessionToken = cookies().get('session')?.value
  
  if (!sessionToken) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { payload } = await jwtVerify(sessionToken, SECRET_KEY)
    const userId = payload.sub as string

    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Verify current password
    const user = await db.get('SELECT password_hash, contrasena FROM usuarios WHERE id = ?', [userId]) as any;
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    let valid = false;
    if (user.password_hash) {
        valid = bcrypt.compareSync(currentPassword, user.password_hash);
    } else if (user.contrasena) {
        valid = (currentPassword === user.contrasena);
    }

    if (!valid) {
       return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 })
    }

    // Update password
    const newHash = bcrypt.hashSync(newPassword, 10);
    // Update both for consistency, or just hash. 
    // We update 'contrasena' to something dummy or same hash to avoid confusion in legacy, 
    // but better to just populate password_hash and rely on it.
    await db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [newHash, userId]);

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('change-password route error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
