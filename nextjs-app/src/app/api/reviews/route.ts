import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const sql = `
      SELECT 
        id,
        calificacion AS rating,
        comentario,
        created_at,
        producto_id,
        cliente_nombre AS usuario_nombre
      FROM resenas
      WHERE aprobado = TRUE
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const reviews = await db.all(sql, [limit]);
    return NextResponse.json(reviews || []);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of error
  }
}
