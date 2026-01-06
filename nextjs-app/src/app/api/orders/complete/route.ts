import { NextRequest, NextResponse } from 'next/server'
import { supabase as db } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    // Evitar doble descuento: revisar logs
    const { data: already, error: logErr } = await db
      .from('admin_logs')
      .select('id')
      .eq('action', 'ORDER_STOCK_DISCOUNT')
      .eq('record_id', id)
      .maybeSingle()
    if (logErr) console.warn('admin_logs check error', logErr)
    if (already) return NextResponse.json({ ok: true, skipped: true })

    // Traer orden con items
    const { data: order, error: orderErr } = await db
      .from('ordenes')
      .select('*')
      .eq('id', id)
      .single()
    if (orderErr || !order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

    let items: any[] = []
    try {
      const raw = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      items = Array.isArray(raw) ? raw : []
    } catch {
      items = []
    }

    if (!items.length) return NextResponse.json({ error: 'Sin items para descontar' }, { status: 400 })

    let updated = 0
    for (const it of items) {
      if (!it?.id || !it?.cantidad) continue
      // Leer stock actual
      const { data: prod, error: pErr } = await db
        .from('productos')
        .select('stock_actual')
        .eq('id', it.id)
        .single()
      if (pErr || !prod) continue
      const nuevo = Math.max(0, (prod.stock_actual || 0) - Number(it.cantidad))
      const { error: upErr } = await db
        .from('productos')
        .update({ stock_actual: nuevo })
        .eq('id', it.id)
      if (!upErr) updated += 1
    }

    await db.from('admin_logs').insert({
      action: 'ORDER_STOCK_DISCOUNT',
      table_name: 'productos',
      record_id: id,
      new_data: { updated },
    })

    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    console.error('orders/complete error', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
