import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const cols = await db.all<any>(`PRAGMA table_info('resenas')`);
    const names = new Set<string>((cols || []).map((c: any) => String(c.name)));

    const usernameExpr =
      names.has('usuario_nombre') ? 'usuario_nombre' :
      names.has('nombre_usuario') ? 'nombre_usuario' :
      names.has('usuario') ? 'usuario' :
      names.has('nombre') ? 'nombre' : `'Cliente'`;

    const ratingExpr =
      names.has('rating') ? 'rating' :
      names.has('puntuacion') ? 'puntuacion' :
      names.has('calificacion') ? 'calificacion' : '0';

    const comentarioExpr =
      names.has('comentario') ? 'comentario' :
      names.has('comentarios') ? 'comentarios' :
      names.has('texto') ? 'texto' : `''`;

    const createdExpr =
      names.has('created_at') ? 'created_at' :
      names.has('fecha_creacion') ? 'fecha_creacion' :
      names.has('fecha') ? 'fecha' : `datetime('now')`;

    const productoExpr =
      names.has('producto_id') ? 'producto_id' :
      names.has('product_id') ? 'product_id' :
      names.has('producto') ? 'producto' : 'NULL';

    const whereActivo = names.has('activo') ? 'WHERE activo = 1' : '';

    const sql = `
      SELECT 
        id, 
        ${ratingExpr} AS rating, 
        ${comentarioExpr} AS comentario, 
        ${createdExpr} AS created_at, 
        ${productoExpr} AS producto_id, 
        ${usernameExpr} AS usuario_nombre
      FROM resenas
      ${whereActivo}
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
