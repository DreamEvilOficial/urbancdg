import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const sections = await db.all('SELECT * FROM homepage_sections ORDER BY orden ASC');
    return NextResponse.json(sections || []);
  } catch (error: any) {
    console.error('Error fetching sections:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tipo, referencia_id, titulo, subtitulo, gif_url, orden, activo } = body;

    // Validación más flexible: solo tipo y titulo son estrictamente obligatorios
    if (!tipo || !titulo) {
      return NextResponse.json({ error: 'Tipo y título son obligatorios' }, { status: 400 });
    }

    const sql = `
      INSERT INTO homepage_sections (tipo, referencia_id, titulo, subtitulo, gif_url, orden, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `;

    const result = await db.run(sql, [
      tipo, 
      referencia_id || '', // Evitar nulos si no se envía
      titulo, 
      subtitulo || '', 
      gif_url || '', 
      orden || 0, 
      activo ?? true
    ]);

    return NextResponse.json({ success: true, id: result.id });
  } catch (error: any) {
    console.error('Error creating section:', error);
    return NextResponse.json({ error: 'Error en el servidor: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, tipo, referencia_id, titulo, subtitulo, gif_url, orden, activo } = body;
    
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });

    const sql = `
      UPDATE homepage_sections 
      SET tipo = ?, referencia_id = ?, titulo = ?, subtitulo = ?, 
          gif_url = ?, orden = ?, activo = ?
      WHERE id = ?
    `;

    await db.run(sql, [
      tipo, referencia_id, titulo, subtitulo, 
      gif_url, orden, activo, id
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating section:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });

    await db.run('DELETE FROM homepage_sections WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting section:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
