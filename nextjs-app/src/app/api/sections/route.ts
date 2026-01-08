import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const sections = await db.all('SELECT * FROM homepage_sections ORDER BY orden ASC');
    return NextResponse.json(sections);
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const { tipo, referencia_id, titulo, subtitulo, gif_url, orden, activo } = body;

    // Insert robusto: evitar columnas opcionales que puedan no existir aún (ej: gif_url)
    await db.run(
      'INSERT INTO homepage_sections (id, tipo, referencia_id, titulo, subtitulo, orden, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, tipo, referencia_id, titulo, subtitulo, orden ?? 0, activo ? 1 : 0]
    );

    // Si existe gif_url y la columna está disponible, intentar actualizarla (no crítico)
    if (gif_url) {
      await db.run('UPDATE homepage_sections SET gif_url = ? WHERE id = ?', [gif_url, id]);
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: 'Database error', details: error?.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, orden } = body;
    
    // Only supporting reordering for now based on the frontend usage
    if (orden !== undefined) {
        await db.run('UPDATE homepage_sections SET orden = ? WHERE id = ?', [orden, id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.run('DELETE FROM homepage_sections WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
