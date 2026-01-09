import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productoId = searchParams.get('producto') || searchParams.get('productoId')
  
  if (!productoId) {
    return NextResponse.json({ reviews: [], average: 0 })
  }

  try {
    const sql = `
      SELECT 
        id, 
        cliente_nombre as usuario_nombre, 
        comentario, 
        calificacion as rating, 
        created_at
      FROM resenas
      WHERE producto_id = ? AND aprobado = TRUE
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const reviews = await db.all(sql, [productoId]);
    
    const averageSql = `
      SELECT AVG(calificacion) as average 
      FROM resenas 
      WHERE producto_id = ? AND aprobado = TRUE
    `;
    const avgResult = await db.get(averageSql, [productoId]);
    const average = avgResult?.average || 0;

    return NextResponse.json({ 
      reviews: reviews || [], 
      average: Number(Number(average).toFixed(1))
    })
  } catch (e: any) {
    console.error('reviews/list error', e)
    return NextResponse.json({ reviews: [], average: 0, error: e.message })
  }
}
