import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { sanitizeInput } from '@/lib/security'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const active = searchParams.get('active')

    const conditions: string[] = []
    const params: any[] = []

    if (code) {
      conditions.push('UPPER(codigo) = UPPER(?)')
      params.push(sanitizeInput(code))
    }

    if (active !== null) {
      conditions.push('activo = ?')
      params.push(active === 'true')
    }

    let sql = 'SELECT * FROM cupones'
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY created_at DESC'

    const rows = await db.all(sql, params)
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error('[coupons][GET] Error:', err.message)
    return NextResponse.json({ error: 'Error al obtener cupones' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let body
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    codigo,
    descripcion,
    tipo,
    valor,
    minimo_compra,
    max_uso_total,
    config,
    valido_desde,
    valido_hasta,
    activo,
  } = body

  if (!codigo) {
    return NextResponse.json({ error: 'El código es requerido' }, { status: 400 })
  }

  const codigoSanitizado = sanitizeInput(String(codigo)).toUpperCase()
  const descripcionSanitizada = descripcion ? sanitizeInput(String(descripcion)) : null
  const tipoFinal = tipo === 'fijo' ? 'fijo' : 'porcentaje'
  const valorNumero = Number(valor) || 0
  const minimoCompraNumero = minimo_compra !== undefined && minimo_compra !== null ? Number(minimo_compra) : 0
  const maxUsoTotalNumero = max_uso_total !== undefined && max_uso_total !== null ? Number(max_uso_total) : null
  const configJson = config ? JSON.stringify(config) : '{}'
  const newId = uuidv4()

  try {
    const sql = `
      INSERT INTO cupones (
        id,
        codigo,
        descripcion,
        tipo,
        valor,
        minimo_compra,
        max_uso_total,
        usos_actuales,
        config,
        valido_desde,
        valido_hasta,
        activo,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, NOW(), NOW())
      RETURNING id
    `

    const result = await db.run(sql, [
      newId,
      codigoSanitizado,
      descripcionSanitizada,
      tipoFinal,
      valorNumero,
      minimoCompraNumero,
      maxUsoTotalNumero,
      configJson,
      valido_desde || null,
      valido_hasta || null,
      activo !== undefined && activo !== null ? !!activo : true,
    ])

    return NextResponse.json({ success: true, id: result.id || newId })
  } catch (err: any) {
    console.error('[coupons][POST] Error:', err.message)

    // Fallback for connection errors
    if (err.message.includes('Tenant or user not found') || err.message.includes('connection') || err.message.includes('pool')) {
      console.log('⚠️ Attempting fallback insert via Supabase client')
      try {
        const client = supabaseAdmin || supabase
        const { error } = await client.from('cupones').insert({
          id: newId,
          codigo: codigoSanitizado,
          descripcion: descripcionSanitizada || null,
          tipo: tipoFinal,
          valor: valorNumero,
          minimo_compra: minimoCompraNumero,
          max_uso_total: maxUsoTotalNumero,
          usos_actuales: 0,
          config: configJson ? JSON.parse(configJson) : {},
          valido_desde: valido_desde || null,
          valido_hasta: valido_hasta || null,
          activo: activo !== undefined && activo !== null ? !!activo : true,
          updated_at: new Date().toISOString()
        })

        if (!error) {
          return NextResponse.json({ success: true, id: newId })
        }
        console.error('[coupons][POST] Fallback Error:', error.message)
        // If fallback fails, return both errors
        return NextResponse.json({ 
          error: 'Error al crear cupón (DB & Fallback failed)', 
          details: { db: err.message, fallback: error.message } 
        }, { status: 500 })
      } catch (fallbackErr: any) {
        console.error('[coupons][POST] Fallback Exception:', fallbackErr.message)
      }
    }

    return NextResponse.json({ error: 'Error al crear cupón: ' + err.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const {
      id,
      codigo,
      descripcion,
      tipo,
      valor,
      minimo_compra,
      max_uso_total,
      activo,
      config,
      valido_desde,
      valido_hasta,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'El ID es requerido' }, { status: 400 })
    }

    const codigoSanitizado = codigo ? sanitizeInput(String(codigo)).toUpperCase() : null
    const descripcionSanitizada = descripcion ? sanitizeInput(String(descripcion)) : null
    const tipoFinal = tipo === 'fijo' ? 'fijo' : tipo === 'porcentaje' ? 'porcentaje' : null
    const valorNumero = valor !== undefined && valor !== null ? Number(valor) : null
    const minimoCompraNumero = minimo_compra !== undefined && minimo_compra !== null ? Number(minimo_compra) : null
    const maxUsoTotalNumero = max_uso_total !== undefined && max_uso_total !== null ? Number(max_uso_total) : null
    const configJson = config !== undefined ? JSON.stringify(config) : null

    const fields: string[] = []
    const params: any[] = []

    if (codigoSanitizado !== null) {
      fields.push('codigo = ?')
      params.push(codigoSanitizado)
    }
    if (descripcionSanitizada !== null) {
      fields.push('descripcion = ?')
      params.push(descripcionSanitizada)
    }
    if (tipoFinal !== null) {
      fields.push('tipo = ?')
      params.push(tipoFinal)
    }
    if (valorNumero !== null) {
      fields.push('valor = ?')
      params.push(valorNumero)
    }
    if (minimoCompraNumero !== null) {
      fields.push('minimo_compra = ?')
      params.push(minimoCompraNumero)
    }
    if (maxUsoTotalNumero !== null) {
      fields.push('max_uso_total = ?')
      params.push(maxUsoTotalNumero)
    }
    if (configJson !== null) {
      fields.push('config = ?')
      params.push(configJson)
    }
    if (valido_desde !== undefined) {
      fields.push('valido_desde = ?')
      params.push(valido_desde || null)
    }
    if (valido_hasta !== undefined) {
      fields.push('valido_hasta = ?')
      params.push(valido_hasta || null)
    }
    if (activo !== undefined && activo !== null) {
      fields.push('activo = ?')
      params.push(!!activo)
    }

    fields.push('updated_at = NOW()')

    const sql = `
      UPDATE cupones
      SET ${fields.join(', ')}
      WHERE id = ?
    `

    params.push(id)

    await db.run(sql, params)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[coupons][PUT] Error:', err.message)
    return NextResponse.json({ error: 'Error al actualizar cupón' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'El ID es requerido' }, { status: 400 })
    }

    await db.run('DELETE FROM cupones WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[coupons][DELETE] Error:', err.message)
    return NextResponse.json({ error: 'Error al eliminar cupón' }, { status: 500 })
  }
}

