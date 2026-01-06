import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const active = searchParams.get('active');
  const admin = searchParams.get('admin');
  const destacado = searchParams.get('destacado');
  const top = searchParams.get('top');
  const limit = searchParams.get('limit');
  const category_slug = searchParams.get('category_slug');
  const slug = searchParams.get('slug');

  // Si viene un slug, responder con ese producto específico (como lista de 1 para consistencia)
  if (slug) {
    try {
      const p: any = await db.get('SELECT * FROM productos WHERE slug = ?', [slug]);
      if (!p) return NextResponse.json([]);
      const safeParse = (str: string, fallback: any) => {
        if (!str) return fallback;
        try { return JSON.parse(str); } catch { return fallback; }
      };
      const parsed = {
        ...p,
        activo: !!p.activo,
        destacado: !!p.destacado,
        top: !!p.top,
        imagenes: safeParse(p.imagenes, []),
        variantes: safeParse(p.variantes, []),
        dimensiones: safeParse(p.dimensiones, null),
        metadata: safeParse(p.metadata, null),
      };
      return NextResponse.json([parsed]);
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  let query = 'SELECT * FROM productos WHERE 1=1';
  let params: any[] = [];

  if (active === 'true') {
    query += ' AND activo = 1';
  }
  
  if (destacado === 'true') {
    query += ' AND destacado = 1';
  }

  if (top === 'true') {
    query += ' AND top = 1';
  }

  try {
    if (category_slug) {
         const category = await db.get('SELECT id FROM categorias WHERE slug = ?', [category_slug]) as any;
         if (category) {
             query += ' AND categoria_id = ?';
             params.push(category.id);
         } else {
             return NextResponse.json([]);
         }
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const products = await db.all(query, params);
    
    // Parse JSON fields safely
    const parsedProducts = products.map((p: any) => {
        const safeParse = (str: string, fallback: any) => {
            if (!str) return fallback;
            try { return JSON.parse(str); } catch { return fallback; }
        };

        return {
            ...p,
            activo: !!p.activo,
            destacado: !!p.destacado,
            top: !!p.top,
            imagenes: safeParse(p.imagenes, []),
            variantes: safeParse(p.variantes, []),
            dimensiones: safeParse(p.dimensiones, null),
            metadata: safeParse(p.metadata, null),
        };
    });
    return NextResponse.json(parsedProducts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = body.id || uuidv4();
    
    await db.run(`
        INSERT INTO productos (
            id, nombre, slug, descripcion, precio, precio_original, descuento_porcentaje,
            stock_actual, stock_minimo, categoria_id, subcategoria_id, imagen_url,
            imagenes, variantes, activo, destacado, top, sku, peso, dimensiones,
            proveedor_nombre, proveedor_contacto, precio_costo, metadata
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?
        )
    `, [
        id, body.nombre, body.slug, body.descripcion, body.precio, body.precio_original, body.descuento_porcentaje,
        body.stock_actual, body.stock_minimo, body.categoria_id, body.subcategoria_id, body.imagen_url,
        JSON.stringify(body.imagenes || []), JSON.stringify(body.variantes || []), body.activo ? 1 : 0, body.destacado ? 1 : 0, body.top ? 1 : 0, body.sku, body.peso, JSON.stringify(body.dimensiones || {}),
        body.proveedor_nombre, body.proveedor_contacto, body.precio_costo, JSON.stringify(body.metadata || {})
    ]);

    return NextResponse.json({ ...body, id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
