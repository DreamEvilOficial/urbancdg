
'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/formatters'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { DollarSign, ShoppingBag, TrendingUp, Package, Calendar } from 'lucide-react'

export default function StatsDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats')
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-10 text-center text-white/50 animate-pulse">Cargando estadísticas...</div>

  if (!data) return <div className="p-10 text-center text-white/50">No hay datos disponibles</div>

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
            Estadísticas <span className="text-accent">Nube</span>
          </h2>
          <p className="text-white/40 text-xs font-mono mt-1">Reporte de rendimiento en tiempo real</p>
        </div>
        <button 
            onClick={fetchStats}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        >
            Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[24px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="w-12 h-12 text-accent" />
            </div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Ventas Totales</p>
            <p className="text-3xl font-black text-white tracking-tighter">
                ${formatPrice(data.totalRevenue)}
            </p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[24px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShoppingBag className="w-12 h-12 text-blue-400" />
            </div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Órdenes Completadas</p>
            <p className="text-3xl font-black text-white tracking-tighter">
                {data.totalOrders}
            </p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[24px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-12 h-12 text-green-400" />
            </div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Ticket Promedio</p>
            <p className="text-3xl font-black text-white tracking-tighter">
                ${formatPrice(data.averageTicket)}
            </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Chart */}
         <div className="lg:col-span-2 bg-white/[0.03] border border-white/10 p-6 rounded-[30px]">
            <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-4 h-4 text-white/40" />
                <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.2em]">Ingresos (Últimos 30 días)</h3>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#b7ff2a" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#b7ff2a" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke="#ffffff40" 
                            fontSize={10} 
                            tickFormatter={(str) => {
                                const d = new Date(str);
                                return `${d.getDate()}/${d.getMonth()+1}`;
                            }}
                            tickMargin={10}
                        />
                        <YAxis 
                            stroke="#ffffff40" 
                            fontSize={10} 
                            tickFormatter={(val) => `$${val/1000}k`}
                            tickMargin={10}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                            labelStyle={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}
                            formatter={(value: any) => [`$${formatPrice(value)}`, 'Ventas']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#b7ff2a" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorRevenue)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
         </div>

         {/* Top Products */}
         <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[30px]">
            <div className="flex items-center gap-2 mb-6">
                <Package className="w-4 h-4 text-white/40" />
                <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.2em]">Top Productos</h3>
            </div>
            <div className="space-y-4">
                {data.topProducts.map((product: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 group">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs text-white/30 group-hover:bg-accent group-hover:text-black transition-colors">
                            {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{product.name}</p>
                            <p className="text-[10px] text-white/40">{product.quantity} vendidos</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs font-black text-accent">${formatPrice(product.revenue)}</p>
                        </div>
                    </div>
                ))}
                {data.topProducts.length === 0 && (
                    <p className="text-center text-xs text-white/20 py-10">Sin datos aún</p>
                )}
            </div>
         </div>
      </div>
    </div>
  )
}
