'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Instagram } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/formatters'

interface TransferPaymentProps {
  orderTotal: number
  orderItems: any[]
  orderId?: string
  orderNumber?: string
  customer?: { nombre?: string; apellido?: string }
  onClose: () => void
}

interface PaymentConfig {
  cvu: string
  alias: string
  titular: string
  banco: string
  whatsapp: string
  mensaje_transferencia: string
  instagram?: string
}

export default function TransferPayment({ orderTotal, orderItems, orderId, orderNumber, customer, onClose }: TransferPaymentProps) {
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    cargarConfiguracion()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  async function cargarConfiguracion() {
    try {
      const res = await fetch('/api/config')
      const tiendaConfig = await res.json()
      
      setConfig({
        cvu: tiendaConfig.cvu || '',
        alias: tiendaConfig.alias || '',
        titular: tiendaConfig.titular_cuenta || tiendaConfig.nombre_tienda || 'Tienda',
        banco: tiendaConfig.banco || 'Mercado Pago',
        whatsapp: tiendaConfig.whatsapp_comprobante || tiendaConfig.whatsapp || tiendaConfig.telefono || '',
        mensaje_transferencia: 'Gracias por tu compra. Confirmaremos tu pedido al recibir el pago.',
        instagram: tiendaConfig.instagram || '@urban.cdg'
      })
    } catch (error) {
      console.error('Error al cargar configuración:', error)
      toast.error('Error al cargar datos de transferencia')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied({ ...copied, [field]: true })
      setTimeout(() => {
        setCopied({ ...copied, [field]: false })
      }, 2000)
    } catch (error) {
    }
  }

  const handleFinish = () => {
    const cartStore = (window as any).cartStore || useCartStore.getState()
    if (cartStore && cartStore.clearCart) {
      cartStore.clearCart()
    }
    onClose()
    window.location.href = `/success?orden=${orderId || orderNumber || ''}`
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (loading || !config) {
    return (
      <div className="modal-overlay">
        <div className="modal-content glass-card flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Cargando datos...</p>
          </div>
        </div>
      </div>
    )
  }

  const instagramHandle = (config.instagram || '@urban.cdg').toUpperCase()

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={handleOverlayClick}>
      <div className="glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                Pago por <span className="text-pink-500">Transferencia</span>
              </h2>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">#{orderNumber}</p>
            </div>
            <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">✕</button>
          </div>

          <div className="space-y-6">
            <div className="grid gap-3">
              {[
                { label: 'Alias', value: config.alias, copyable: true },
                { label: 'CVU', value: config.cvu, copyable: true },
                { label: 'Titular', value: config.titular },
                { label: 'Banco', value: config.banco },
              ].map((item, i) => item.value && (
                <div key={i} className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">{item.label}</p>
                    <p className="font-bold text-white tracking-wide">{item.value}</p>
                  </div>
                  {item.copyable && (
                    <button 
                      onClick={() => copyToClipboard(item.value, item.label.toLowerCase())}
                      className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white text-white hover:text-black transition-all"
                    >
                      {copied[item.label.toLowerCase()] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white text-black p-6 rounded-3xl flex items-center justify-between shadow-2xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Monto a transferir</p>
                <p className="text-3xl font-black tracking-tighter">
                  ${ formatPrice(orderTotal) }
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Descuento aplicado</p>
                <p className="text-xs font-black text-green-600">10% OFF EXTRA</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="w-full bg-[#25D366]/10 text-white/70 py-4 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 border border-[#25D366]/30">
                <Instagram className="w-5 h-5 text-pink-500" />
                <span>ENVIAR COMPROBANTE AL INSTAGRAM {instagramHandle}</span>
              </div>
              
              <button
                onClick={handleFinish}
                className="w-full bg-white/5 text-white/50 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all"
              >
                YA REALICÉ EL PAGO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
