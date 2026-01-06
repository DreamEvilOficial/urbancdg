import { NextRequest, NextResponse } from 'next/server'
import { supabase as db } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { productoId, numeroOrden, nombre, comentario, rating } = await req.json()
    if (!productoId || !numeroOrden || !rating) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }
    const cleanRating = Number(rating)
    if (!Number.isFinite(cleanRating) || cleanRating < 1 || cleanRating > 5) {
      return NextResponse.json({ error: 'Calificación inválida' }, { status: 400 })
    }
    const text = String(comentario || '').trim()
    if (text.length === 0 || text.length > 50) {
      return NextResponse.json({ error: 'Comentario inválido' }, { status: 400 })
    }

    // Buscar orden por numero_orden
    const { data: orden, error: oErr } = await db
      .from('ordenes')
      .select('*')
      .eq('numero_orden', numeroOrden)
      .maybeSingle()
    if (oErr || !orden) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Intentar verificar si el producto estuvo en la orden (si existe el campo items)
    let verificada = false
    try {
      const raw = typeof (orden as any).items === 'string' ? JSON.parse((orden as any).items) : (orden as any).items
      if (Array.isArray(raw)) {
        verificada = raw.some((it: any) => String(it.id) === String(productoId))
      }
    } catch {}

    const insert = {
      producto_id: productoId,
      usuario_nombre: nombre || 'Cliente',
      rating: cleanRating,
      comentario: text,
      verificada,
      numero_orden: numeroOrden,
    }

    const { error: iErr } = await db.from('resenas').insert(insert as any)
    if (iErr) {
      return NextResponse.json({ error: 'No se pudo guardar la reseña' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: verificada ? '¡Reseña publicada!' : 'Reseña enviada (pendiente de verificación).' })
  } catch (e) {
    console.error('reviews/submit error', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
