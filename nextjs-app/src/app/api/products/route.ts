import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const slug = searchParams.get('slug');
        const category = searchParams.get('category');
        const featured = searchParams.get('featured');

        let sql = 'SELECT * FROM productos WHERE activo = TRUE';
        const params: any[] = [];

        if (id) {
            const product = await db.get('SELECT * FROM productos WHERE id = ?', [id]);
            return NextResponse.json(product);
        }

        if (slug) {
            const product = await db.get('SELECT * FROM productos WHERE slug = ?', [slug]);
            return NextResponse.json(product);
        }

        if (category) {
            sql += ' AND categoria_id = ?';
            params.push(category);
        }

        if (featured === 'true') {
            sql += ' AND destacado = TRUE';
        }

        sql += ' ORDER BY created_at DESC';

        const products = await db.all(sql, params);
        
        // Normalizar campos JSON si vienen como string (por compatibilidad)
        const normalized = products.map(p => ({
            ...p,
            imagenes: typeof p.imagenes === 'string' ? JSON.parse(p.imagenes) : p.imagenes,
            variantes: typeof p.variantes === 'string' ? JSON.parse(p.variantes) : p.variantes,
            metadata: typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata,
        }));

        return NextResponse.json(normalized);
    } catch (error: any) {
        console.error('[products:GET] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const id = body.id || uuidv4();
        
        const productData = {
            id,
            nombre: body.nombre,
            slug: body.slug || body.nombre.toLowerCase().replace(/ /g, '-'),
            descripcion: body.descripcion,
            precio: body.precio || 0,
            precio_original: body.precio_original,
            categoria_id: body.categoria_id,
            subcategoria_id: body.subcategoria_id,
            stock_actual: body.stock_actual || 0,
            stock_minimo: body.stock_minimo || 0,
            imagenes: JSON.stringify(body.imagenes || []),
            variantes: JSON.stringify(body.variantes || []),
            activo: body.activo !== undefined ? body.activo : true,
            destacado: body.destacado || false,
            top: body.top || false,
            metadata: JSON.stringify(body.metadata || {})
        };

        const sql = `
            INSERT INTO productos (
                id, nombre, slug, descripcion, precio, precio_original,
                categoria_id, subcategoria_id, stock_actual, stock_minimo,
                imagenes, variantes, activo, destacado, top, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                slug = EXCLUDED.slug,
                descripcion = EXCLUDED.descripcion,
                precio = EXCLUDED.precio,
                precio_original = EXCLUDED.precio_original,
                categoria_id = EXCLUDED.categoria_id,
                subcategoria_id = EXCLUDED.subcategoria_id,
                stock_actual = EXCLUDED.stock_actual,
                stock_minimo = EXCLUDED.stock_minimo,
                imagenes = EXCLUDED.imagenes,
                variantes = EXCLUDED.variantes,
                activo = EXCLUDED.activo,
                destacado = EXCLUDED.destacado,
                top = EXCLUDED.top,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
        `;

        const params = [
            productData.id, productData.nombre, productData.slug, productData.descripcion,
            productData.precio, productData.precio_original, productData.categoria_id,
            productData.subcategoria_id, productData.stock_actual, productData.stock_minimo,
            productData.imagenes, productData.variantes, productData.activo,
            productData.destacado, productData.top, productData.metadata
        ];

        await db.run(sql, params);

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error('[products:POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
