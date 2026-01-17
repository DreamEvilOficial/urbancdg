import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { sanitizeInput } from '@/lib/security'

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
  try {
    const body = await req.json()
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
        activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
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
    return NextResponse.json({ error: 'Error al crear cupón' }, { status: 500 })
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

