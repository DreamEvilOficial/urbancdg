import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { productoId, numeroOrden, nombre, email, comentario, rating, comprobanteUrl } = await req.json()
    
    if (!productoId || !rating) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }
    
    const cleanRating = Number(rating)
    if (!Number.isFinite(cleanRating) || cleanRating < 1 || cleanRating > 5) {
      return NextResponse.json({ error: 'Calificación inválida' }, { status: 400 })
    }
    
    const text = String(comentario || '').trim()
    if (text.length > 500) { 
      return NextResponse.json({ error: 'Comentario demasiado largo' }, { status: 400 })
    }

    // Verificar si el producto existe
    const product = await db.get('SELECT id FROM productos WHERE id = ?', [productoId]);
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Si se proporciona número de orden, verificar si existe y si el producto estaba en ella
    let verificado = false;
    if (numeroOrden) {
      // En un sistema real, verificaríamos contra la tabla de órdenes.
      // Por ahora, confiamos en que si mandan el comprobante es un paso de verificación manual.
      // Pero si tenemos tabla de ordenes, podemos chequear.
      try {
        const order = await db.get('SELECT id FROM ordenes WHERE numero_orden = ?', [numeroOrden]);
        if (order) {
            const item = await db.get(
              'SELECT 1 FROM orden_items WHERE orden_id = ? AND producto_id = ?', 
              [order.id, productoId]
            );
            if (item) verificado = true;
        }
      } catch (err) {
        console.error('Error verificando orden:', err);
        // No bloqueamos el submit si falla la verificación automática, lo dejamos para revisión manual
      }
    }

    const sql = `
      INSERT INTO resenas (
        producto_id, 
        cliente_nombre, 
        cliente_email, 
        calificacion, 
        comentario, 
        numero_orden,
        comprobante_url,
        verificado,
        aprobado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Por defecto las reseñas requieren aprobación
    const aprobado = false; 

    await db.run(sql, [
      productoId,
      nombre || 'Cliente',
      email || null,
      cleanRating,
      text,
      numeroOrden || null,
      comprobanteUrl || null,
      verificado,
      aprobado
    ]);

    return NextResponse.json({ 
      success: true, 
      message: '¡Reseña enviada con éxito!' 
    });
  } catch (e: any) {
    console.error('reviews/submit error', e)
    return NextResponse.json({ error: 'Error interno: ' + e.message }, { status: 500 })
  }
}
