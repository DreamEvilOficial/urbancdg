import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { paqarService } from '@/services/paqarService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la orden' }, { status: 400 })
    }

    const trimmed = id.trim()

    const order = await db.get(
      'SELECT id, numero_orden, estado, total, created_at, tracking_code, tracking_url FROM ordenes WHERE numero_orden = ? OR id = ? OR tracking_code = ?',
      [trimmed, trimmed, trimmed]
    )

    if (!order) {
      return NextResponse.json({ error: 'No se encontró la orden' }, { status: 404 })
    }

    let trackingInfo = null
    if ((order as any).tracking_code) {
      try {
        trackingInfo = await paqarService.trackShipment((order as any).tracking_code)
      } catch (error) {
        console.error('[orders/track] Error consultando seguimiento:', error)
      }
    }

    return NextResponse.json({
      ...order,
      trackingInfo
    })
  } catch (err: any) {
    console.error('[orders/track] Error:', err.message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
