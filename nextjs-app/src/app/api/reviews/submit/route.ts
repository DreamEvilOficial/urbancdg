import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sanitizeInput, sanitizeRichText } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const { productoId, numeroOrden, nombre, email, comentario, rating } = await req.json()
    
    if (!productoId || !rating) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    if (!numeroOrden) {
        return NextResponse.json({ error: 'El número de orden es obligatorio para verificar tu compra.' }, { status: 400 })
    }
    
    const cleanRating = Number(rating)
    if (!Number.isFinite(cleanRating) || cleanRating < 1 || cleanRating > 5) {
      return NextResponse.json({ error: 'Calificación inválida' }, { status: 400 })
    }
    
    // Sanitización de seguridad
    const text = sanitizeRichText(String(comentario || ''));
    const cleanNombre = sanitizeInput(String(nombre || 'Cliente'));
    const cleanEmail = sanitizeInput(String(email || ''));
    const cleanOrden = sanitizeInput(String(numeroOrden));

    if (text.length > 500) { 
      return NextResponse.json({ error: 'Comentario demasiado largo' }, { status: 400 })
    }

    // Verificar si el producto existe
    const { data: product, error: productError } = await supabase
      .from('productos')
      .select('id')
      .eq('id', productoId)
      .single();
      
    if (productError || !product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Verificar orden
    let verificado = false;
    
    // 1. Buscar la orden por numero_orden
    const { data: order, error: orderError } = await supabase
      .from('ordenes')
      .select('id')
      .eq('numero_orden', numeroOrden)
      .single();
    
    if (orderError || !order) {
        return NextResponse.json({ error: 'Número de orden no encontrado. Por favor verificá que esté escrito correctamente.' }, { status: 404 })
    }

    // 2. Verificar que el producto esté en la orden
    const { data: item, error: itemError } = await supabase
      .from('orden_items')
      .select('id')
      .eq('orden_id', order.id)
      .eq('producto_id', productoId)
      .maybeSingle();

    if (!item) {
        return NextResponse.json({ error: 'Este producto no figura en la orden indicada.' }, { status: 400 })
    }

    verificado = true;
    const aprobado = verificado; // Auto-aprobar si verificado

    const { error: insertError } = await supabase
      .from('resenas')
      .insert({
        producto_id: productoId,
        cliente_nombre: cleanNombre,
        cliente_email: cleanEmail || null,
        calificacion: cleanRating,
        comentario: text,
        numero_orden: cleanOrden,
        verificado,
        aprobado
      });

    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      message: '¡Reseña enviada con éxito! Será publicada en breve.' 
    });
  } catch (e: any) {
    console.error('reviews/submit error', e)
    return NextResponse.json({ error: 'Error interno: ' + e.message }, { status: 500 })
  }
}
