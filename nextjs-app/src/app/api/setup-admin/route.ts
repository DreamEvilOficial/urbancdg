import { NextResponse } from 'next/server'
import db from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const username = 'admin'
    const password = 'Omega10'
    const hashedPassword = bcrypt.hashSync(password, 10)
    
    // Check if exists
    const existing = await db.get('SELECT * FROM usuarios WHERE usuario = ?', [username])
    
    if (existing) {
      // Update password
      await db.run('UPDATE usuarios SET password_hash = ? WHERE usuario = ?', [hashedPassword, username])
      // Update role
      await db.run('UPDATE usuarios SET rol = ? WHERE usuario = ?', ['admin', username])
      
      return NextResponse.json({ message: 'Usuario admin actualizado correctamente', user: username })
    }
    
    // Create
    await db.run(
      'INSERT INTO usuarios (usuario, email, password_hash, rol, nombre, fecha_registro, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, 'admin@urban.com', hashedPassword, 'admin', 'Administrador', new Date().toISOString(), true]
    )
    
    return NextResponse.json({ message: 'Usuario admin creado correctamente', user: username })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
