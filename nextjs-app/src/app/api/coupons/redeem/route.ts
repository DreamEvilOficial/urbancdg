import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()

    if (!code) {
      return NextResponse.json({ error: 'El código es requerido' }, { status: 400 })
    }

    const codigoSanitizado = sanitizeInput(String(code)).toUpperCase()

    const coupon = await db.get<any>(
      'SELECT * FROM cupones WHERE UPPER(codigo) = UPPER(?)',
      [codigoSanitizado]
    )

    if (!coupon) {
      return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 })
    }

    if (!coupon.activo) {
      return NextResponse.json({ error: 'Cupón inactivo' }, { status: 400 })
    }

    if (coupon.max_uso_total && coupon.usos_actuales >= coupon.max_uso_total) {
      return NextResponse.json({ error: 'El cupón alcanzó el límite de usos' }, { status: 400 })
    }

    await db.run(
      'UPDATE cupones SET usos_actuales = usos_actuales + 1, updated_at = NOW() WHERE id = ?',
      [coupon.id]
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[coupons/redeem][POST] Error:', err.message)
    return NextResponse.json({ error: 'Error al canjear cupón' }, { status: 500 })
  }
}

