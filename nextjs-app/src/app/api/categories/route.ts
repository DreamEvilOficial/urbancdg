import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const categories = await db.all('SELECT * FROM categorias ORDER BY orden ASC');
    const subcategories = await db.all('SELECT * FROM subcategorias ORDER BY orden ASC');
    
    // Nest subcategories
    const result = categories.map((cat: any) => ({
        ...cat,
        activo: !!cat.activo,
        subcategorias: subcategories
            .filter((sub: any) => sub.categoria_id === cat.id)
            .map((sub: any) => ({ ...sub, activo: !!sub.activo }))
    }));
    
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const id = body.id || uuidv4();
        await db.run('INSERT INTO categorias (id, nombre, slug, orden, activo) VALUES (?, ?, ?, ?, ?)', [
            id, body.nombre, body.slug, body.orden || 0, body.activo ? 1 : 0
        ]);
        return NextResponse.json({ ...body, id });
    } catch(err) {
        return NextResponse.json({ error: 'Error creating category' }, { status: 500 });
    }
}
