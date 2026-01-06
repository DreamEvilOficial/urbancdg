import { NextRequest, NextResponse } from 'next/server'
import { supabase as db } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const producto = searchParams.get('producto')
  if (!producto) return NextResponse.json({ reviews: [], average: 0 })

  try {
    const { data, error } = await db
      .from('resenas')
      .select('id, usuario_nombre, comentario, rating, created_at')
      .eq('producto_id', producto)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error

    const reviews: Array<{ rating?: number }> = (data || []) as Array<{ rating?: number }>
    const average = reviews.length ? reviews.reduce((s: number, r: { rating?: number }) => s + (r.rating || 0), 0) / reviews.length : 0
    return NextResponse.json({ reviews, average })
  } catch (e) {
    console.error('reviews/list error', e)
    return NextResponse.json({ reviews: [], average: 0 })
  }
}
