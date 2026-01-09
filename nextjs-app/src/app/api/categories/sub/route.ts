
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const id = body.id || uuidv4();

        if (supabaseAdmin) {
            console.log('[subcategories:POST] Intentando crear con Supabase Admin');
            const { error } = await supabaseAdmin.from('subcategorias').insert({
                id,
                categoria_id: body.categoria_id,
                nombre: body.nombre,
                slug: body.slug,
                orden: body.orden || 0,
                activo: body.activo !== undefined ? body.activo : true
            });

            if (error) {
                console.error('[subcategories:POST] Error de Supabase Admin:', error);
                throw error;
            }
            
            return NextResponse.json({ ...body, id, method: 'admin' });
        }

        console.log('[subcategories:POST] Fallback a DB local');
        await db.run('INSERT INTO subcategorias (id, categoria_id, nombre, slug, orden, activo) VALUES (?, ?, ?, ?, ?, ?)', [
            id, body.categoria_id, body.nombre, body.slug, body.orden || 0, body.activo !== false ? 1 : 0
        ]);

        return NextResponse.json({ ...body, id, method: 'db_run' });
    } catch (err: any) {
        console.error('[subcategories:POST] Error:', err);
        return NextResponse.json({ 
            error: 'Error al crear subcategoría', 
            details: err.message || JSON.stringify(err) 
        }, { status: 500 });
    }
}
