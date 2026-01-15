'use client'

import { useState } from 'react'
import { Search, Package, Truck, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { formatPrice } from '@/lib/formatters'

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderId.trim()) return

    setLoading(true)
    setError('')
    setOrder(null)

    try {
      // Assuming we have an endpoint for public order lookup, or we use a server action.
      // Since we don't have a specific public endpoint for this, we might need to create one 
      // or use a secure way to lookup by order number only.
      // For now, let's assume /api/orders/track exists or use a direct query if possible securely.
      // Better to create a dedicated route: /api/orders/track
      
      const res = await fetch(`/api/orders/track?id=${encodeURIComponent(orderId.trim())}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'No se encontró el pedido')
      }
      
      setOrder(data)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return { icon: <Clock className="w-8 h-8" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Pendiente de Pago' }
      case 'procesando':
        return { icon: <Package className="w-8 h-8" />, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Procesando Pedido' }
      case 'enviado':
        return { icon: <Truck className="w-8 h-8" />, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Enviado' }
      case 'completado':
      case 'entregado':
        return { icon: <CheckCircle className="w-8 h-8" />, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Entregado' }
      case 'cancelado':
        return { icon: <XCircle className="w-8 h-8" />, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Cancelado' }
      default:
        return { icon: <AlertCircle className="w-8 h-8" />, color: 'text-gray-500', bg: 'bg-gray-500/10', label: status }
    }
  }

  return (
    <div className="min-h-screen bg-[#000000FA] text-white pt-24 pb-12 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">
            Seguimiento de Pedido
          </h1>
          <p className="text-white/50 text-sm">
            Ingresá tu número de orden para ver el estado actual
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="EJ: BN-1234"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
            className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent/50 text-center font-black text-xl uppercase tracking-widest transition-all placeholder:text-white/20"
          />
          <button 
            type="submit"
            disabled={loading || !orderId}
            className="absolute right-2 top-2 bottom-2 bg-white text-black px-6 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center">
            <p className="text-red-500 font-bold">{error}</p>
          </div>
        )}

        {order && (
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 space-y-8">
              {/* Status Header */}
              <div className="text-center space-y-4">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${getStatusInfo(order.estado).bg} ${getStatusInfo(order.estado).color}`}>
                  {getStatusInfo(order.estado).icon}
                </div>
                <div>
                  <h2 className={`text-2xl font-black uppercase tracking-wide ${getStatusInfo(order.estado).color}`}>
                    {getStatusInfo(order.estado).label}
                  </h2>
                  <p className="text-white/40 text-sm mt-1">#{order.numero_orden}</p>
                </div>
              </div>

              {/* Timeline / Progress (Simplified) */}
              <div className="space-y-6 pt-6 border-t border-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Fecha de compra</span>
                  <span className="font-mono font-bold">{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                
                {/* Estimated Delivery */}
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Entrega Estimada</span>
                  <span className="font-mono font-bold text-green-400">
                    {order.estado === 'entregado' 
                        ? 'Entregado' 
                        : new Date(new Date(order.created_at).setDate(new Date(order.created_at).getDate() + 5)).toLocaleDateString()
                    }
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Total</span>
                  <span className="font-mono font-bold text-lg text-accent">
                    ${ formatPrice(order.total) }
                  </span>
                </div>
                
                {order.tracking_code && (
                    <div className="bg-white/5 p-4 rounded-xl text-center space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Código de Seguimiento</p>
                        <p className="font-mono text-xl font-bold select-all">{order.tracking_code}</p>
                        {order.tracking_url && (
                            <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-accent text-xs font-bold hover:underline block mt-2">
                                Ver en Correo
                            </a>
                        )}
                    </div>
                )}
              </div>
            </div>
            
            <div className="bg-white/5 p-6 text-center">
                <p className="text-xs text-white/40 mb-4">¿Tenés dudas sobre tu pedido?</p>
                <Link href="/contacto" className="inline-block bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                    Contactar Soporte
                </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
