import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { supabase, supabaseAdmin } from '@/lib/supabase'
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
    let coupon

    // 1. Fetch Coupon with Fallback
    try {
      coupon = await db.get<any>(
        'SELECT * FROM cupones WHERE UPPER(codigo) = UPPER(?)',
        [codigoSanitizado]
      )
    } catch (err: any) {
      console.error('[coupons/validate] DB Error fetching coupon:', err.message)
      const client = supabaseAdmin || supabase
      const { data, error } = await client
        .from('cupones')
        .select('*')
        .ilike('codigo', codigoSanitizado)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('[coupons/validate] Fallback Error fetching coupon:', error.message)
        throw err
      }
      coupon = data
    }

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

    const usosActuales = coupon.usos_actuales || 0
    if (coupon.max_uso_total && usosActuales >= coupon.max_uso_total) {
      return NextResponse.json({ valid: false, error: 'El cupón alcanzó el límite de usos' }, { status: 400 })
    }

    const config = safeParseConfig(coupon.config)
    const categoriasIds: string[] = Array.isArray(config.categorias_ids) ? config.categorias_ids : []

    let baseTotal = 0

    if (Array.isArray(items) && items.length > 0) {
      const cartItems = items as CartItem[]
      const itemIds = cartItems.map((i) => i.id).filter((id) => id)

      if (itemIds.length > 0) {
        const productsMap = new Map<string, any>()

        // 2. Fetch Products with Fallback and Batching
        try {
          const placeholders = itemIds.map(() => '?').join(',')
          const products = await db.all<any>(
            `SELECT id, categoria_id, precio FROM productos WHERE id IN (${placeholders})`,
            itemIds
          )
          products.forEach((p) => productsMap.set(p.id, p))
        } catch (err: any) {
          console.error('[coupons/validate] DB Error fetching products:', err.message)
          const client = supabaseAdmin || supabase
          const { data, error } = await client
            .from('productos')
            .select('id, categoria_id, precio')
            .in('id', itemIds)

          if (error) {
            console.error('[coupons/validate] Fallback Error fetching products:', error.message)
            throw err
          }
          data?.forEach((p: any) => productsMap.set(p.id, p))
        }

        for (const item of cartItems) {
          const producto = productsMap.get(item.id)
          if (producto) {
            if (categoriasIds.length > 0) {
              if (producto.categoria_id && categoriasIds.includes(producto.categoria_id)) {
                const precio = sanitizePrice(producto.precio)
                const cantidad = Number(item.cantidad) || 1
                baseTotal += precio * cantidad
              }
            } else {
              const precio = sanitizePrice(producto.precio)
              const cantidad = Number(item.cantidad) || 1
              baseTotal += precio * cantidad
            }
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
        { status: 200 }
      )
    }

    if (baseTotal <= 0) {
      return NextResponse.json(
        { valid: false, error: 'El monto elegible para el cupón es cero' },
        { status: 200 }
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
    return NextResponse.json({ error: 'Error al validar cupón: ' + err.message }, { status: 500 })
  }
}

