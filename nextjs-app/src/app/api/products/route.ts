import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoria');
    const subcategoryId = searchParams.get('subcategoria');
    const featured = searchParams.get('destacado');
    const top = searchParams.get('top');
    const search = searchParams.get('q');
    
    // Use Admin Client directly to bypass RLS and avoid regex parsing issues
    if (supabaseAdmin) {
        let query = supabaseAdmin.from('productos').select('*');
        
        if (categoryId) query = query.eq('categoria_id', categoryId);
        if (subcategoryId) query = query.eq('subcategoria_id', subcategoryId);
        if (featured === 'true') query = query.eq('destacado', true);
        if (top === 'true') query = query.eq('top', true);
        if (search) query = query.or(`nombre.ilike.%${search}%,descripcion.ilike.%${search}%,sku.ilike.%${search}%`);
        
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Supabase Admin GET error:', error);
            throw error;
        }
        
        console.log(`[products:GET] Admin client fetched ${data?.length || 0} products`);
        
        const parsedProducts = (data || []).map((p: any) => ({
            ...p,
            activo: !!p.activo,
            destacado: !!p.destacado,
            top: !!p.top,
            imagenes: typeof p.imagenes === 'string' ? JSON.parse(p.imagenes || '[]') : (p.imagenes || []),
            variantes: typeof p.variantes === 'string' ? JSON.parse(p.variantes || '[]') : (p.variantes || []),
            dimensiones: typeof p.dimensiones === 'string' ? JSON.parse(p.dimensiones || '{}') : (p.dimensiones || {}),
            metadata: typeof p.metadata === 'string' ? JSON.parse(p.metadata || '{}') : (p.metadata || {})
        }));
        
        return NextResponse.json(parsedProducts);
    }

    // Fallback to db.all if admin client not available (local/legacy)
    let query = 'SELECT * FROM productos WHERE 1=1';
    const params: any[] = [];
    
    if (categoryId) {
        query += ' AND categoria_id = ?';
        params.push(categoryId);
    }
    
    if (subcategoryId) {
        query += ' AND subcategoria_id = ?';
        params.push(subcategoryId);
    }
    
    if (featured === 'true') {
        query += ' AND destacado = 1';
    }
    
    if (top === 'true') {
        query += ' AND top = 1';
    }
    
    if (search) {
        query += ' AND (nombre ILIKE ? OR descripcion ILIKE ? OR sku ILIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const products = await db.all(query, params);
    
    const parsedProducts = products.map((p: any) => ({
        ...p,
        activo: !!p.activo,
        destacado: !!p.destacado,
        top: !!p.top,
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
    
    // Valores comunes
    const productData = {
        id, 
        nombre: body.nombre, 
        slug: body.slug, 
        descripcion: body.descripcion, 
        precio: body.precio, 
        precio_original: body.precio_original, 
        descuento_porcentaje: body.descuento_porcentaje,
        stock_actual: body.stock_actual, 
        stock_minimo: body.stock_minimo, 
        categoria_id: body.categoria_id, 
        subcategoria_id: body.subcategoria_id, 
        imagen_url: body.imagen_url,
        imagenes: safeJson(body.imagenes), 
        variantes: safeJson(body.variantes), 
        activo: body.activo ? true : false, 
        destacado: body.destacado ? true : false, 
        top: body.top ? true : false, 
        sku: body.sku, 
        peso: body.peso, 
        dimensiones: safeObj(body.dimensiones),
        proveedor_nombre: body.proveedor_nombre, 
        proveedor_contacto: body.proveedor_contacto, 
        precio_costo: body.precio_costo, 
        metadata: safeObj(body.metadata)
    };

    console.log('[products:POST] Intentando crear producto:', { id, nombre: body.nombre });

    // Estrategia 1: DB Run (Standard)
    try {
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
            productData.id, productData.nombre, productData.slug, productData.descripcion, productData.precio, productData.precio_original, productData.descuento_porcentaje,
            productData.stock_actual, productData.stock_minimo, productData.categoria_id, productData.subcategoria_id, productData.imagen_url,
            productData.imagenes, productData.variantes, productData.activo ? 1 : 0, productData.destacado ? 1 : 0, productData.top ? 1 : 0, productData.sku, productData.peso, productData.dimensiones,
            productData.proveedor_nombre, productData.proveedor_contacto, productData.precio_costo, productData.metadata
        ]);
        
        return NextResponse.json({ ...body, id });
    } catch (e: any) {
        console.warn('[products:POST] db.run falló, intentando Admin Client:', e.message);
    }

    // Estrategia 2: Admin Client (Fuerza Bruta)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Faltan credenciales de Admin para fallback');
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // Intento A: Insertar todo
    const { error } = await admin.from('productos').insert(productData);
    
    if (!error) {
        return NextResponse.json({ ...body, id, method: 'admin_full' });
    }

    console.warn('[products:POST] Admin insert full falló:', error.message);

    // Intento B: Insertar mínimo (si falla por columnas opcionales inexistentes)
    // Excluyendo columnas que podrían no estar en todas las versiones del esquema
    const minimalData = {
        id, 
        nombre: body.nombre, 
        slug: body.slug, 
        precio: body.precio,
        activo: body.activo ? true : false,
        categoria_id: body.categoria_id,
        imagen_url: body.imagen_url
    };

    const { error: minError } = await admin.from('productos').insert(minimalData);
    
    if (!minError) {
        return NextResponse.json({ ...body, id, method: 'admin_minimal' });
    }

    // Si todo falla
    return NextResponse.json({ 
        error: 'Failed to create product', 
        details: `Todos los métodos fallaron. Último error: ${minError.message}` 
    }, { status: 500 });

  } catch (err: any) {
    console.error('Failed to create product:', err);
    return NextResponse.json({ 
        error: 'Failed to create product', 
        details: err.message || JSON.stringify(err) 
    }, { status: 500 });
  }
}
