import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { productoId, numeroOrden, nombre, email, comentario, rating } = await req.json()
    
    if (!productoId || !rating) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }
    
    const cleanRating = Number(rating)
    if (!Number.isFinite(cleanRating) || cleanRating < 1 || cleanRating > 5) {
      return NextResponse.json({ error: 'Calificación inválida' }, { status: 400 })
    }
    
    const text = String(comentario || '').trim()
    if (text.length > 500) { // Increased limit slightly but kept reasonable
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
      const order = await db.get('SELECT id FROM ordenes WHERE numero_orden = ?', [numeroOrden]);
      if (order) {
        // En un sistema real, buscaríamos en orden_items. 
        // Por ahora, si la orden existe, marcamos como intención de verificado.
        const item = await db.get(
          'SELECT 1 FROM orden_items WHERE orden_id = ? AND producto_id = ?', 
          [order.id, productoId]
        );
        if (item) verificado = true;
      }
    }

    const sql = `
      INSERT INTO resenas (
        producto_id, 
        cliente_nombre, 
        cliente_email, 
        calificacion, 
        comentario, 
        aprobado
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    // Por defecto las reseñas están aprobadas si son de una compra verificada, 
    // o pendientes (aprobado=false) si no lo son. 
    // Para simplificar según el esquema previo, las dejamos como TRUE pero podríamos cambiarlo.
    const aprobado = true; 

    await db.run(sql, [
      productoId,
      nombre || 'Cliente',
      email || null,
      cleanRating,
      text,
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
