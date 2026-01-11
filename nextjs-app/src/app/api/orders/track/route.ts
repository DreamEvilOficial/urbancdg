import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Número de orden requerido' }, { status: 400 })
    }

    // Buscar por numero_orden (case insensitive idealmente, pero exacto está bien si normalizamos)
    // Usamos LIKE para ser un poco más flexibles o exact match
    const order = await db.get(
        `SELECT id, numero_orden, estado, total, created_at, tracking_code, tracking_url 
         FROM ordenes 
         WHERE numero_orden = ?`, 
        [id]
    )

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Track order error:', error)
    return NextResponse.json({ error: 'Error al buscar el pedido' }, { status: 500 })
  }
}
