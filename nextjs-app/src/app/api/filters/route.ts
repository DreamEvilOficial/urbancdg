import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin.from('filtros_especiales').select('*').order('orden', { ascending: true });
        if (error) throw error;
        return NextResponse.json(data);
    }

    const filters = await db.all('SELECT * FROM filtros_especiales ORDER BY orden ASC');
    return NextResponse.json(filters);
  } catch (err) {
    console.error('Error getting filters:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const { nombre, clave, imagen_url, icono, activo, orden } = body;

    if (supabaseAdmin) {
        const { error } = await supabaseAdmin.from('filtros_especiales').insert({
            id,
            nombre,
            clave,
            icono: icono || '',
            imagen_url: imagen_url || '',
            activo: activo ? true : false,
            orden: orden || 0
        });
        if (error) throw error;
        return NextResponse.json({ success: true, id });
    }

    await db.run(
      'INSERT INTO filtros_especiales (id, nombre, clave, icono, imagen_url, activo, orden) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, nombre, clave, icono || '', imagen_url || '', activo ? 1 : 0, orden || 0]
    );

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Error creating filter:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;
        
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const keys = Object.keys(updates);
        const values = Object.values(updates);
        
        // Handle boolean conversion for 'activo'
        const activoIndex = keys.indexOf('activo');
        if (activoIndex !== -1) {
            values[activoIndex] = values[activoIndex] ? 1 : 0;
        }

        const setClause = keys.map(key => `${key} = ?`).join(', ');
        
        await db.run(`UPDATE filtros_especiales SET ${setClause} WHERE id = ?`, [...values, id]);
        
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await db.run('DELETE FROM filtros_especiales WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
