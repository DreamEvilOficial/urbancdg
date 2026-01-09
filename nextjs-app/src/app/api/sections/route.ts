import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const sections = await db.all('SELECT * FROM homepage_sections ORDER BY orden ASC');
    const normalized = (sections || []).map((s: any) => {
      let referencia = s.referencia_id;
      if (!referencia && s.config) {
        try {
          const cfg = typeof s.config === 'string' ? JSON.parse(s.config) : s.config;
          referencia = cfg?.referencia_id || cfg?.ref || referencia;
        } catch {}
      }
      return {
        ...s,
        referencia_id: referencia,
        activo: s.activo === 1 || s.activo === true
      };
    });
    return NextResponse.json(normalized);
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const { tipo, referencia_id, titulo, subtitulo, gif_url, orden, activo } = body;

    console.log('[sections:POST] Intentando crear sección', { id, tipo, referencia_id, titulo, orden, activo });

    // Insert robusto: evitar columnas opcionales que puedan no existir aún (ej: gif_url)
    const result = await db.run(
      'INSERT INTO homepage_sections (id, tipo, referencia_id, titulo, subtitulo, orden, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, tipo, referencia_id, titulo, subtitulo, orden ?? 0, activo ? 1 : 0]
    );

    if (!result || result.changes === 0) {
      console.warn('[sections:POST] Insert con db.run no aplicó cambios, probando fallback admin');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        const { data, error } = await supabaseAdmin
          .from('homepage_sections')
          .insert({
            id,
            tipo,
            referencia_id,
            titulo,
            subtitulo,
            orden: typeof orden === 'number' ? orden : 0,
            activo: !!activo
          })
          .select('id');
        if (error) {
          console.error('[sections:POST] Fallback admin insert error:', error.message);
          // Intentar esquema alternativo (compat): guardar referencia en 'config' como JSON texto
          const altPayload = {
            id,
            tipo,
            titulo,
            subtitulo,
            config: JSON.stringify({ referencia_id }),
            orden: typeof orden === 'number' ? orden : 0,
            activo: !!activo
          };
          const alt = await supabaseAdmin.from('homepage_sections').insert(altPayload).select('id');
          if (alt.error) {
            console.error('[sections:POST] Alternate insert error:', alt.error.message);
            return NextResponse.json({ error: 'Error al insertar sección', details: alt.error.message }, { status: 500 });
          }
        }
      } else {
        console.error('[sections:POST] Fallback admin no disponible (URL o Service Key ausentes)');
        return NextResponse.json({ error: 'No se pudo insertar la sección' }, { status: 500 });
      }
    }

    // Si existe gif_url y la columna está disponible, intentar actualizarla (no crítico)
    if (gif_url) {
      await db.run('UPDATE homepage_sections SET gif_url = ? WHERE id = ?', [gif_url, id]);
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('[sections:POST] Error inesperado:', error?.message || error);
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
