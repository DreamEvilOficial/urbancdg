
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase Admin not configured' }, { status: 500 })
    }

    // 1. Fetch completed and shipped orders (both count as successful sales)
    const { data: orders, error } = await supabaseAdmin
      .from('ordenes')
      .select('*')
      .in('estado', ['completado', 'enviado', 'COMPLETADO', 'ENVIADO', 'Completado', 'Enviado'])
      .order('created_at', { ascending: false })

    if (error) throw error

    // 2. Process Basic Stats
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // 3. Process Revenue Over Time (Last 30 Days)
    const revenueByDate: Record<string, number> = {}
    const ordersByDate: Record<string, number> = {}

    // Initialize last 30 days with 0
    for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        revenueByDate[key] = 0
        ordersByDate[key] = 0
    }

    orders.forEach(order => {
        if (!order.created_at) return
        // created_at can be a string or Date object depending on the driver
        const dateStr = typeof order.created_at === 'string' ? order.created_at : order.created_at.toISOString()
        // Safely extract YYYY-MM-DD
        const date = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0]
        
        if (revenueByDate[date] !== undefined) {
            revenueByDate[date] += (Number(order.total) || 0)
            ordersByDate[date] += 1
        }
    })

    const chartData = Object.keys(revenueByDate).sort().map(date => ({
        date,
        revenue: revenueByDate[date],
        orders: ordersByDate[date]
    }))

    // 4. Process Top Products (Parsing items correctly)
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {}

    orders.forEach(order => {
        let items: any[] = []
        try {
            items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
        } catch (e) { items = [] }

        if (Array.isArray(items)) {
            items.forEach((item: any) => {
                const id = item.id || item.producto_id || item.nombre
                if (!id) return
                
                if (!productSales[id]) {
                    productSales[id] = { 
                        name: item.nombre || 'Producto Desconocido', 
                        quantity: 0, 
                        revenue: 0 
                    }
                }
                const qty = Number(item.cantidad) || 1
                const price = Number(item.precio) || 0
                productSales[id].quantity += qty
                productSales[id].revenue += (price * qty)
            })
        }
    })

    const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

    return NextResponse.json({
        totalOrders,
        totalRevenue,
        averageTicket,
        chartData,
        topProducts
    })

  } catch (error: any) {
    console.error('Stats API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
