import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isAdmin = searchParams.get('admin') === 'true';
    const categoryId = searchParams.get('categoria');
    const subcategoryId = searchParams.get('subcategoria');
    const featured = searchParams.get('destacado');
    const top = searchParams.get('top');
    const search = searchParams.get('q');
    
    console.log(`[products:GET] Request received. AdminParam: ${isAdmin}, HasAdminClient: ${!!supabaseAdmin}`);
    
    // Si tenemos supabaseAdmin, lo usamos siempre para el panel o si se solicita admin
    if (supabaseAdmin) {
        console.log('[products:GET] Fetching with Supabase Admin (bypassing RLS)');
        let query = supabaseAdmin.from('productos').select('*');
        
        if (categoryId) query = query.eq('categoria_id', categoryId);
        if (subcategoryId) query = query.eq('subcategoria_id', subcategoryId);
        if (featured === 'true') query = query.eq('destacado', true);
        if (top === 'true') query = query.eq('top', true);
        if (search) query = query.or(`nombre.ilike.%${search}%,descripcion.ilike.%${search}%,sku.ilike.%${search}%`);
        
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) {
            console.error('[products:GET] Supabase Admin error:', error);
            throw error;
        }
        
        console.log(`[products:GET] Success. Found ${data?.length || 0} products`);
        
        const parsedProducts = (data || []).map((p: any) => {
            const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata || '{}') : (p.metadata || {});
            return {
                ...p,
                activo: p.activo === true || p.activo === 1,
                destacado: p.destacado === true || p.destacado === 1,
                top: p.top === true || p.top === 1,
                // Fallbacks desde metadata
                imagen_url: p.imagen_url || meta.imagen_url || '',
                sku: p.sku || meta.sku || '',
                descuento_porcentaje: p.descuento_porcentaje || meta.descuento_porcentaje || 0,
                proximo_lanzamiento: p.proximo_lanzamiento || meta.proximo_lanzamiento || false,
                nuevo_lanzamiento: p.nuevo_lanzamiento || meta.nuevo_lanzamiento || false,
                // Parseo de JSONs
                imagenes: typeof p.imagenes === 'string' ? JSON.parse(p.imagenes || '[]') : (p.imagenes || []),
                variantes: typeof p.variantes === 'string' ? JSON.parse(p.variantes || '[]') : (p.variantes || []),
                dimensiones: typeof p.dimensiones === 'string' ? JSON.parse(p.dimensiones || '{}') : (p.dimensiones || meta.dimensiones || {}),
                metadata: meta
            };
        });
        
        return NextResponse.json(parsedProducts);
    }

    console.log('[products:GET] Falling back to db.all (No Admin Client)');
    const products = await db.all('SELECT * FROM productos ORDER BY created_at DESC');
    
    console.log(`[products:GET] Fallback success. Found ${products?.length || 0} products`);
    
    const parsedProducts = products.map((p: any) => ({
        ...p,
        activo: p.activo === true || p.activo === 1 || p.activo === '1',
        destacado: p.destacado === true || p.destacado === 1 || p.destacado === '1',
        top: p.top === true || p.top === 1 || p.top === '1',
        imagenes: typeof p.imagenes === 'string' ? JSON.parse(p.imagenes || '[]') : (p.imagenes || []),
        variantes: typeof p.variantes === 'string' ? JSON.parse(p.variantes || '[]') : (p.variantes || []),
        dimensiones: typeof p.dimensiones === 'string' ? JSON.parse(p.dimensiones || '{}') : (p.dimensiones || {}),
        metadata: typeof p.metadata === 'string' ? JSON.parse(p.metadata || '{}') : (p.metadata || {})
    }));
    
    return NextResponse.json(parsedProducts);
  } catch (err) {
    console.error('Error fetching products:', err);
    return NextResponse.json({ error: 'Error fetching products' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = body.id || uuidv4();
    
    // Prepare values
    const safeJson = (val: any) => JSON.stringify(val || []);
    const safeObj = (val: any) => JSON.stringify(val || {});
    
    // Valores comunes - Simplificamos al máximo para evitar errores de columnas inexistentes
    // Movemos campos dudosos a metadata
    const productData = {
        id, 
        nombre: body.nombre, 
        slug: body.slug, 
        descripcion: body.descripcion, 
        precio: body.precio, 
        precio_original: body.precio_original, 
        stock_actual: body.stock_actual, 
        categoria_id: body.categoria_id, 
        subcategoria_id: body.subcategoria_id, 
        // imagen_url: body.imagen_url, // SE ELIMINA POR ERROR EN DB
        imagenes: safeJson(body.imagenes), 
        variantes: safeJson(body.variantes), 
        activo: body.activo ? true : false, 
        destacado: body.destacado ? true : false, 
        top: body.top ? true : false, 
        metadata: JSON.stringify({
            ...(body.metadata || {}),
            imagen_url: body.imagen_url,
            sku: body.sku,
            peso: body.peso,
            dimensiones: body.dimensiones,
            stock_minimo: body.stock_minimo,
            precio_costo: body.precio_costo,
            proveedor_nombre: body.proveedor_nombre,
            proveedor_contacto: body.proveedor_contacto,
            descuento_porcentaje: body.descuento_porcentaje,
            proximo_lanzamiento: body.proximo_lanzamiento,
            nuevo_lanzamiento: body.nuevo_lanzamiento
        }),
        created_at: new Date().toISOString()
    };

    console.log('[products:POST] Intentando crear producto:', { id, nombre: body.nombre });

    // Estrategia Principal: Usar supabaseAdmin directamente
    // Esto es mucho más fiable que db.run para objetos complejos con JSON
    if (supabaseAdmin) {
        try {
            const { error } = await supabaseAdmin.from('productos').insert(productData);
            
            if (error) {
                console.error('[products:POST] Error de Supabase Admin:', error);
                
                // Si falla por columnas inexistentes, intentamos con datos mínimos
                console.warn('[products:POST] Reintentando con datos mínimos...');
                const minimalData = {
                    id, 
                    nombre: body.nombre, 
                    slug: body.slug, 
                    precio: body.precio,
                    activo: body.activo ? true : false,
                    categoria_id: body.categoria_id,
                    imagen_url: body.imagen_url
                };
                
                const { error: minError } = await supabaseAdmin.from('productos').insert(minimalData);
                if (minError) throw minError;
                
                return NextResponse.json({ ...body, id, method: 'admin_minimal' });
            }
            
            return NextResponse.json({ ...body, id, method: 'admin_direct' });
        } catch (adminErr: any) {
            console.error('[products:POST] Falló Admin Direct:', adminErr.message);
            // Si falla admin, dejamos que intente db.run como último recurso (aunque db.run es más probable que falle)
        }
    }

    // Estrategia Fallback: DB Run (Legacy/SQL)
    try {
        await db.run(`
            INSERT INTO productos (
                id, nombre, slug, descripcion, precio, precio_original,
                stock_actual, categoria_id, subcategoria_id,
                imagenes, variantes, activo, destacado, top, metadata
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?, ?, ?
            )
        `, [
            productData.id, productData.nombre, productData.slug, productData.descripcion, productData.precio, productData.precio_original,
            productData.stock_actual, productData.categoria_id, productData.subcategoria_id,
            productData.imagenes, productData.variantes, productData.activo ? 1 : 0, productData.destacado ? 1 : 0, productData.top ? 1 : 0, productData.metadata
        ]);
        
        return NextResponse.json({ ...body, id, method: 'db_run' });
    } catch (e: any) {
        console.error('[products:POST] Todos los métodos de inserción fallaron:', e.message);
        return NextResponse.json({ 
            error: 'Failed to create product', 
            details: e.message 
        }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Failed to create product:', err);
    return NextResponse.json({ 
        error: 'Failed to create product', 
        details: err.message || JSON.stringify(err) 
    }, { status: 500 });
  }
}
