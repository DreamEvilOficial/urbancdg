
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase Admin not configured' }, { status: 500 })
    }

    // 1. Fetch completed orders
    const { data: orders, error } = await supabaseAdmin
      .from('ordenes')
      .select('*')
      .eq('estado', 'completado')
      .order('created_at', { ascending: false })

    if (error) throw error

    // 2. Process Basic Stats
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // 3. Process Revenue Over Time (Last 30 Days)
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)

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
        const date = order.created_at.split('T')[0]
        if (revenueByDate[date] !== undefined) {
            revenueByDate[date] += (order.total || 0)
            ordersByDate[date] += 1
        }
    })

    const chartData = Object.keys(revenueByDate).sort().map(date => ({
        date,
        revenue: revenueByDate[date],
        orders: ordersByDate[date]
    }))

    // 4. Process Top Products (Parsing JSON items)
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {}

    orders.forEach(order => {
        if (Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
                const id = item.id || item.nombre // Fallback to name if ID missing
                if (!productSales[id]) {
                    productSales[id] = { 
                        name: item.nombre, 
                        quantity: 0, 
                        revenue: 0 
                    }
                }
                productSales[id].quantity += (item.cantidad || 1)
                productSales[id].revenue += ((item.precio || 0) * (item.cantidad || 1))
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
