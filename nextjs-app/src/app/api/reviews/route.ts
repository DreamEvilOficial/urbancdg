import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const reviews = await db.all(`
      SELECT id, usuario_nombre, rating, comentario, created_at, producto_id
      FROM resenas
      WHERE activo = 1
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit]);
    
    return NextResponse.json(reviews || []);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of error
  }
}
