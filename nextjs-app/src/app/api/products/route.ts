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

        const normalizeProduct = (p: any) => {
            if (!p) return null;
            return {
                ...p,
                activo: p.activo === true || p.activo === 1 || p.activo === 'true',
                destacado: p.destacado === true || p.destacado === 1 || p.destacado === 'true',
                top: p.top === true || p.top === 1 || p.top === 'true',
                proximo_lanzamiento: p.proximo_lanzamiento === true || p.proximo_lanzamiento === 1 || p.proximo_lanzamiento === 'true',
                nuevo_lanzamiento: p.nuevo_lanzamiento === true || p.nuevo_lanzamiento === 1 || p.nuevo_lanzamiento === 'true',
                imagenes: typeof p.imagenes === 'string' ? JSON.parse(p.imagenes) : (p.imagenes || []),
                variantes: typeof p.variantes === 'string' ? JSON.parse(p.variantes) : (p.variantes || []),
                metadata: typeof p.metadata === 'string' ? JSON.parse(p.metadata) : (p.metadata || {}),
                dimensiones: typeof p.dimensiones === 'string' ? JSON.parse(p.dimensiones) : (p.dimensiones || null),
            };
        };

        if (id) {
            const product = await db.get('SELECT * FROM productos WHERE id = ?', [id]);
            return NextResponse.json(normalizeProduct(product));
        }

        if (slug) {
            const product = await db.get('SELECT * FROM productos WHERE slug = ?', [slug]);
            // El cliente espera un array para el endpoint de búsqueda
            return NextResponse.json(product ? [normalizeProduct(product)] : []);
        }

        let sql = 'SELECT * FROM productos WHERE activo = TRUE';
        const params: any[] = [];

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
        const normalized = products.map(normalizeProduct);

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
            slug: body.slug || body.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            descripcion: body.descripcion,
            precio: body.precio || 0,
            precio_original: body.precio_original,
            descuento_porcentaje: body.descuento_porcentaje || 0,
            categoria_id: body.categoria_id,
            subcategoria_id: body.subcategoria_id,
            stock_actual: body.stock_actual || 0,
            stock_minimo: body.stock_minimo || 0,
            imagen_url: body.imagen_url || (body.imagenes && body.imagenes.length > 0 ? body.imagenes[0] : ''),
            imagenes: JSON.stringify(body.imagenes || []),
            variantes: JSON.stringify(body.variantes || []),
            activo: body.activo !== undefined ? body.activo : true,
            destacado: body.destacado || false,
            top: body.top || false,
            proximo_lanzamiento: body.proximo_lanzamiento || false,
            nuevo_lanzamiento: body.nuevo_lanzamiento || false,
            sku: body.sku,
            proveedor_nombre: body.proveedor_nombre,
            proveedor_contacto: body.proveedor_contacto,
            precio_costo: body.precio_costo,
            metadata: JSON.stringify(body.metadata || {})
        };

        const sql = `
            INSERT INTO productos (
                id, nombre, slug, descripcion, precio, precio_original, descuento_porcentaje,
                categoria_id, subcategoria_id, stock_actual, stock_minimo,
                imagen_url, imagenes, variantes, activo, destacado, top, 
                proximo_lanzamiento, nuevo_lanzamiento, sku, proveedor_nombre, 
                proveedor_contacto, precio_costo, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                slug = EXCLUDED.slug,
                descripcion = EXCLUDED.descripcion,
                precio = EXCLUDED.precio,
                precio_original = EXCLUDED.precio_original,
                descuento_porcentaje = EXCLUDED.descuento_porcentaje,
                categoria_id = EXCLUDED.categoria_id,
                subcategoria_id = EXCLUDED.subcategoria_id,
                stock_actual = EXCLUDED.stock_actual,
                stock_minimo = EXCLUDED.stock_minimo,
                imagen_url = EXCLUDED.imagen_url,
                imagenes = EXCLUDED.imagenes,
                variantes = EXCLUDED.variantes,
                activo = EXCLUDED.activo,
                destacado = EXCLUDED.destacado,
                top = EXCLUDED.top,
                proximo_lanzamiento = EXCLUDED.proximo_lanzamiento,
                nuevo_lanzamiento = EXCLUDED.nuevo_lanzamiento,
                sku = EXCLUDED.sku,
                proveedor_nombre = EXCLUDED.proveedor_nombre,
                proveedor_contacto = EXCLUDED.proveedor_contacto,
                precio_costo = EXCLUDED.precio_costo,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
        `;

        const params = [
            productData.id, productData.nombre, productData.slug, productData.descripcion,
            productData.precio, productData.precio_original, productData.descuento_porcentaje,
            productData.categoria_id, productData.subcategoria_id, productData.stock_actual,
            productData.stock_minimo, productData.imagen_url, productData.imagenes,
            productData.variantes, productData.activo, productData.destacado,
            productData.top, productData.proximo_lanzamiento, productData.nuevo_lanzamiento,
            productData.sku, productData.proveedor_nombre, productData.proveedor_contacto,
            productData.precio_costo, productData.metadata
        ];

        await db.run(sql, params);

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error('[products:POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
