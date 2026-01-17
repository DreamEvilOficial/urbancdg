import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { sanitizeInput, sanitizePrice } from '@/lib/security'

export const dynamic = 'force-dynamic'

type CartItem = {
  id: string
  cantidad: number
}

function safeParseConfig(input: any): any {
  if (!input) return {}
  if (typeof input === 'object') return input
  try {
    return JSON.parse(input)
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code, items, total } = await req.json()

    if (!code) {
      return NextResponse.json({ error: 'El código es requerido' }, { status: 400 })
    }

    const codigoSanitizado = sanitizeInput(String(code)).toUpperCase()

    const coupon = await db.get<any>(
      'SELECT * FROM cupones WHERE UPPER(codigo) = UPPER(?)',
      [codigoSanitizado]
    )

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Cupón no encontrado' }, { status: 404 })
    }

    if (!coupon.activo) {
      return NextResponse.json({ valid: false, error: 'Cupón inactivo' }, { status: 400 })
    }

    const now = new Date()

    if (coupon.valido_desde) {
      const desde = new Date(coupon.valido_desde)
      if (now < desde) {
        return NextResponse.json({ valid: false, error: 'El cupón aún no está activo' }, { status: 400 })
      }
    }

    if (coupon.valido_hasta) {
      const hasta = new Date(coupon.valido_hasta)
      if (now > hasta) {
        return NextResponse.json({ valid: false, error: 'El cupón ha expirado' }, { status: 400 })
      }
    }

    if (coupon.max_uso_total && coupon.usos_actuales >= coupon.max_uso_total) {
      return NextResponse.json({ valid: false, error: 'El cupón alcanzó el límite de usos' }, { status: 400 })
    }

    const config = safeParseConfig(coupon.config)
    const categoriasIds: string[] = Array.isArray(config.categorias_ids) ? config.categorias_ids : []

    let baseTotal = 0

    if (Array.isArray(items) && items.length > 0) {
      const cartItems = items as CartItem[]

      if (categoriasIds.length > 0) {
        for (const item of cartItems) {
          const producto = await db.get<any>(
            'SELECT id, categoria_id, precio FROM productos WHERE id = ?',
            [item.id]
          )

          if (producto && producto.categoria_id && categoriasIds.includes(producto.categoria_id)) {
            const precio = sanitizePrice(producto.precio)
            const cantidad = Number(item.cantidad) || 1
            baseTotal += precio * cantidad
          }
        }
      } else {
        for (const item of cartItems) {
          const producto = await db.get<any>(
            'SELECT id, precio FROM productos WHERE id = ?',
            [item.id]
          )

          if (producto) {
            const precio = sanitizePrice(producto.precio)
            const cantidad = Number(item.cantidad) || 1
            baseTotal += precio * cantidad
          }
        }
      }
    } else if (typeof total === 'number') {
      baseTotal = total
    }

    if (coupon.minimo_compra && baseTotal < Number(coupon.minimo_compra)) {
      return NextResponse.json(
        {
          valid: false,
          error: 'No se alcanza el mínimo de compra para usar este cupón',
          minimo_compra: Number(coupon.minimo_compra),
        },
        { status: 400 }
      )
    }

    if (baseTotal <= 0) {
      return NextResponse.json(
        { valid: false, error: 'El monto elegible para el cupón es cero' },
        { status: 400 }
      )
    }

    const tipo = coupon.tipo === 'fijo' ? 'fijo' : 'porcentaje'
    const valor = Number(coupon.valor) || 0

    let discountAmount = 0

    if (tipo === 'porcentaje') {
      discountAmount = Math.round((baseTotal * valor) / 100)
    } else {
      discountAmount = valor
    }

    if (discountAmount > baseTotal) {
      discountAmount = baseTotal
    }

    const clientTotal = typeof total === 'number' ? total : baseTotal
    const finalTotal = Math.max(0, clientTotal - discountAmount)

    return NextResponse.json({
      valid: true,
      code: coupon.codigo,
      tipo,
      valor,
      appliedTo: baseTotal,
      discountAmount,
      finalTotal,
      categorias_ids: categoriasIds,
      minimo_compra: coupon.minimo_compra ? Number(coupon.minimo_compra) : 0,
      message: 'Cupón aplicado correctamente',
    })
  } catch (err: any) {
    console.error('[coupons/validate][POST] Error:', err.message)
    return NextResponse.json({ error: 'Error al validar cupón' }, { status: 500 })
  }
}

