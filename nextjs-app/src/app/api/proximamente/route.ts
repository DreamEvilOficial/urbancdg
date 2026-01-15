import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { email, producto_id } = await req.json()

    if (!email || !producto_id) {
      return NextResponse.json({ error: 'Email y producto requeridos' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Configuración de servidor incompleta' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Insertar en la tabla proximamente_notificaciones
    const { error } = await supabase
      .from('proximamente_notificaciones')
      .upsert({ email, producto_id }, { onConflict: 'email, producto_id' })

    if (error) {
      console.error('Error insertando notificación:', error)
      return NextResponse.json({ error: 'Error guardando notificación' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Notificación registrada correctamente' })
  } catch (error: any) {
    console.error('Error en API proximamente:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
