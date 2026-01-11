import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam === 'all' ? 1000 : parseInt(limitParam || '50');
    const productId = searchParams.get('productId');
    const approvedOnly = searchParams.get('approved') !== 'false';

    let sql = `
      SELECT 
        r.id,
        r.calificacion as rating,
        r.comentario,
        r.created_at,
        r.producto_id,
        r.cliente_nombre as usuario_nombre,
        r.cliente_email as usuario_email,
        r.aprobado,
        p.nombre as producto_nombre,
        p.imagen_url as producto_imagen
      FROM resenas r
      LEFT JOIN productos p ON r.producto_id = p.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (productId) {
      sql += ` AND r.producto_id = ?`;
      params.push(productId);
    }
    
    if (approvedOnly) {
      sql += ` AND r.aprobado = TRUE`;
    }

    sql += ` ORDER BY r.created_at DESC LIMIT ?`;
    params.push(limit);

    const reviews = await db.all(sql, params);
    return NextResponse.json(reviews || []);
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    // If table doesn't exist, return empty array instead of error
    if (error.message && error.message.includes('no such table')) {
        return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, aprobado, destacado } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.run(
      `UPDATE resenas SET aprobado = ?, destacado = ? WHERE id = ?`,
      [aprobado ?? true, destacado ?? false, id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.run(`DELETE FROM resenas WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
