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

    console.log('[sections:POST] Iniciando creación:', { id, tipo });

    // Estrategia 1: Intentar insertar con db.run (si funciona, genial)
    try {
      const result = await db.run(
        'INSERT INTO homepage_sections (id, tipo, referencia_id, titulo, subtitulo, orden, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, tipo, referencia_id, titulo, subtitulo, orden ?? 0, activo ? 1 : 0]
      );
      
      if (result && result.changes > 0) {
        // Éxito en el primer intento
        if (gif_url) {
           await db.run('UPDATE homepage_sections SET gif_url = ? WHERE id = ?', [gif_url, id]).catch(() => {});
        }
        return NextResponse.json({ success: true, id });
      }
    } catch (e) {
      console.warn('[sections:POST] db.run falló, probando admin client:', e);
    }

    // Estrategia 2: Cliente Admin Supabase (Fuerza Bruta)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Faltan credenciales de Admin (SUPABASE_SERVICE_ROLE_KEY)');
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let lastError = '';

    // Intento A: Esquema Completo
    const attemptA = await admin.from('homepage_sections').insert({
      id,
      tipo,
      referencia_id,
      titulo,
      subtitulo,
      orden: orden ?? 0,
      activo: activo ? true : false
    });

    if (!attemptA.error) {
      return NextResponse.json({ success: true, id, method: 'admin_full' });
    }
    lastError = attemptA.error.message;
    console.warn('[sections:POST] Admin insert A falló:', lastError);

    // Intento B: Esquema Compat (referencia en config)
    const attemptB = await admin.from('homepage_sections').insert({
      id,
      tipo,
      titulo,
      subtitulo,
      config: JSON.stringify({ referencia_id }),
      orden: orden ?? 0,
      activo: activo ? 1 : 0 // Probamos 1/0 por si acaso
    });

    if (!attemptB.error) {
      return NextResponse.json({ success: true, id, method: 'admin_compat' });
    }
    lastError = attemptB.error.message;
    console.warn('[sections:POST] Admin insert B falló:', lastError);

    // Si todo falla, devolvemos el último error
    return NextResponse.json({ 
      error: 'No se pudo crear la sección', 
      details: `Intento A y B fallaron. Último error: ${lastError}` 
    }, { status: 500 });

  } catch (error: any) {
    console.error('[sections:POST] Critical error:', error);
    return NextResponse.json({ 
      error: 'Error crítico en servidor', 
      details: error?.message || String(error) 
    }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, orden } = body;
    
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
