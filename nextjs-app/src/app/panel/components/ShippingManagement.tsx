
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import ShippingLabelGenerator from './ShippingLabelGenerator'

interface SenderData {
  nombre: string
  dni: string
  calle: string
  numero: string
  localidad: string
  provincia: string
  cp: string
}

export default function ShippingManagement() {
  const [senderData, setSenderData] = useState<SenderData>({
    nombre: 'Urban CDG Official',
    dni: '',
    calle: 'Av. Corrientes',
    numero: '1234',
    localidad: 'CABA',
    provincia: 'CABA',
    cp: '1000'
  })
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const lastSavedRef = useRef<SenderData | null>(null)

  const [orders, setOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'enviado' | 'completado' | 'cancelado'>('todos')
  
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(50000)

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        if (data) {
          if (data.shipping_sender) {
            setSenderData(data.shipping_sender as SenderData)
            lastSavedRef.current = data.shipping_sender as SenderData
          }
          if (data.shipping_rules) {
            setFreeShippingEnabled(data.shipping_rules.enabled)
            setFreeShippingThreshold(data.shipping_rules.threshold)
          } else {
             // Fallback to legacy top-level keys if shipping_rules doesn't exist yet
             if (data.envio_gratis_umbral) setFreeShippingThreshold(Number(data.envio_gratis_umbral))
             if (data.envio_gratis_forzado !== undefined) setFreeShippingEnabled(data.envio_gratis_forzado === true || data.envio_gratis_forzado === 'true')
          }
        }
      } catch (error) {}
    }
    loadData()
  }, [])

  const isSenderValid = () => {
    const required = [senderData.nombre, senderData.calle, senderData.numero, senderData.localidad, senderData.provincia, senderData.cp]
    if (required.some(v => !String(v || '').trim())) {
      return false
    }
    const cp = senderData.cp.trim()
    if (!/^\d{4,8}$/.test(cp)) {
      return false
    }
    return true
  }

  const saveSenderData = async (opts: { auto?: boolean } = {}) => {
    if (!isSenderValid()) {
      if (!opts.auto) {
        toast.error('Completá todos los datos obligatorios del remitente')
      }
      return
    }

    if (lastSavedRef.current && JSON.stringify(lastSavedRef.current) === JSON.stringify(senderData)) {
      return
    }

    if (!opts.auto) {
      setSaving(true)
    }
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'shipping_sender', valor: senderData })
      })
      const data = await res.json()
      if (!res.ok || !data || data.error) {
        throw new Error(data?.error || 'Error al guardar remitente')
      }
      lastSavedRef.current = senderData
      const now = new Date()
      setLastSavedAt(now)
      if (opts.auto) {
        toast.success('Cambios del remitente guardados automáticamente')
      } else {
        toast.success('Datos del remitente guardados')
      }
    } catch (error: any) {
      console.error('Error saving sender data', error)
      if (!opts.auto) {
        toast.error(error.message || 'No se pudo guardar el remitente')
      }
    } finally {
      if (!opts.auto) {
        setSaving(false)
      }
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      saveSenderData({ auto: true })
    }, 120000)
    return () => clearInterval(interval)
  }, [senderData])

  useEffect(() => {
    const loadOrders = async () => {
      setOrdersLoading(true)
      try {
        const res = await fetch('/api/orders')
        const data = await res.json()
        setOrders(Array.isArray(data) ? data : [])
      } catch (error) {
        toast.error('Error al cargar ventas')
      } finally {
        setOrdersLoading(false)
      }
    }
    loadOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    return orders.filter((orden) => {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        !term ||
        orden.numero_orden?.toLowerCase().includes(term) ||
        orden.cliente_nombre?.toLowerCase().includes(term) ||
        orden.cliente_email?.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'todos' || orden.estado === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

  const handleLabelGenerated = async (code: string) => {
    if (!selectedOrder) return
    try {
      const trackingUrl = `https://www.correoargentino.com.ar/formularios/e-commerce?tracking=${encodeURIComponent(code)}`
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedOrder.id, tracking_code: code, tracking_url: trackingUrl })
      })
      if (!res.ok) {
        throw new Error('Error al guardar seguimiento en la orden')
      }
      toast.success('Etiqueta generada y seguimiento guardado en la orden')
    } catch (error: any) {
      toast.error(error.message || 'Etiqueta generada pero no se pudo guardar el seguimiento')
    }
  }

  const saveShippingRules = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clave: 'shipping_rules', 
          valor: { 
            enabled: freeShippingEnabled, 
            threshold: Number(freeShippingThreshold) 
          } 
        })
      })
      
      if (!res.ok) throw new Error('Error al guardar reglas')
      
      toast.success('Reglas de envío actualizadas')
      
      // Notify other components
      window.dispatchEvent(new Event('config-updated'))
    } catch (error) {
      toast.error('Error al guardar reglas de envío')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
          <Truck className="w-8 h-8 text-blue-500" />
          Gestión de <span className="text-blue-500">Envíos</span>
        </h2>
        <p className="text-white/40 text-xs font-mono mt-1">Configuración del remitente y generación de etiquetas Correo Argentino</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white/[0.03] border border-white/10 p-6 rounded-[30px] space-y-6">
          <div>
            <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.2em] mb-6">Reglas de Envío</h3>
            <div className="bg-black/20 border border-white/10 p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-white uppercase tracking-wider">Forzar Envío Gratis</label>
                <div 
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${freeShippingEnabled ? 'bg-blue-500' : 'bg-white/10'}`}
                  onClick={() => setFreeShippingEnabled(!freeShippingEnabled)}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${freeShippingEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">Umbral Envío Gratis (ARS)</label>
                <input
                  type="number"
                  value={freeShippingThreshold}
                  onChange={e => setFreeShippingThreshold(Number(e.target.value))}
                  className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="50000"
                />
                <p className="text-[9px] text-white/30 uppercase tracking-widest">Compras iguales o superiores obtienen envío sin costo</p>
              </div>

              <button
                onClick={saveShippingRules}
                disabled={saving}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                Actualizar Reglas
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.2em] mb-6">Datos del Remitente (Origen)</h3>
            <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase">Nombre / Empresa</label>
              <input
                type="text"
                value={senderData.nombre}
                onChange={e => setSenderData({ ...senderData, nombre: e.target.value })}
                className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase">DNI / CUIT</label>
              <input
                type="text"
                value={senderData.dni}
                onChange={e => setSenderData({ ...senderData, dni: e.target.value })}
                className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">Calle</label>
                <input
                  type="text"
                  value={senderData.calle}
                  onChange={e => setSenderData({ ...senderData, calle: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">Altura</label>
                <input
                  type="text"
                  value={senderData.numero}
                  onChange={e => setSenderData({ ...senderData, numero: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">CP</label>
                <input
                  type="text"
                  value={senderData.cp}
                  onChange={e => setSenderData({ ...senderData, cp: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase">Localidad</label>
                <input
                  type="text"
                  value={senderData.localidad}
                  onChange={e => setSenderData({ ...senderData, localidad: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase">Provincia</label>
              <input
                type="text"
                value={senderData.provincia}
                onChange={e => setSenderData({ ...senderData, provincia: e.target.value })}
                className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                onClick={() => saveSenderData()}
                disabled={saving}
                className="inline-flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              {lastSavedAt && (
                <p className="text-[10px] text-white/40 font-mono">
                  Guardado a las {lastSavedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            </div>
          </div>
        </section>

        <section className="bg-white/[0.03] border border-white/10 p-6 rounded-[30px]">
          <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.2em] mb-4">Ventas y Etiquetas</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Buscar por orden o cliente"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="md:col-span-2 w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-[10px] font-black text-white outline-none focus:border-blue-500/50 transition-colors uppercase tracking-[0.2em]"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="enviado">Enviado</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl max-h-72 overflow-y-auto space-y-1 p-2">
              {ordersLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-white/15 border-t-white rounded-full animate-spin" />
                </div>
              )}
              {!ordersLoading && filteredOrders.length === 0 && (
                <p className="text-[11px] text-white/40 text-center py-6">No hay ventas que coincidan con el filtro</p>
              )}
              {!ordersLoading &&
                filteredOrders.map((orden) => (
                  <button
                    key={orden.id}
                    onClick={() => setSelectedOrder(orden)}
                    className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs ${
                      selectedOrder?.id === orden.id ? 'bg-white/15 border border-white/30' : 'bg-white/[0.02] hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-black tracking-[0.18em] uppercase text-white/80">{orden.numero_orden}</span>
                      <span className="text-[10px] text-white/50">{orden.cliente_nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-white/40 uppercase block mb-0.5">{orden.estado}</span>
                      <span className="font-mono text-xs font-bold">${orden.total}</span>
                    </div>
                  </button>
                ))}
            </div>

            {selectedOrder && (
              <div className="mt-4 space-y-3">
                <div className="text-[11px] text-white/50">
                  <p className="font-bold uppercase tracking-[0.18em] mb-1">Destino seleccionado</p>
                  <p>{selectedOrder.cliente_nombre}</p>
                  <p className="text-white/60 text-[10px]">
                    {selectedOrder.direccion_envio || 'Sin dirección registrada'}
                  </p>
                </div>
                <ShippingLabelGenerator order={selectedOrder} onLabelGenerated={handleLabelGenerated} senderOverride={senderData} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
