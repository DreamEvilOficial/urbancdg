'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Send, Instagram } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { useCartStore } from '@/store/cartStore'

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
    // Bloquear scroll del body cuando el modal está abierto
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
      // Silently fail
    }
  }

  const handleSendWhatsApp = () => {
    if (!config) return

    const orderDetails = orderItems.map(item => {
      const attrs = [item.talle ? `Talle: ${item.talle}` : null, item.color ? `Color: ${item.color}` : null]
        .filter(Boolean)
        .join(' ')
      return `• ${item.nombre} ${attrs ? '(' + attrs + ')' : ''} x${item.cantidad} - $${(item.precio * item.cantidad).toLocaleString()}`
    }).join('\n')

    const nombre = customer?.nombre || ''
    const apellido = customer?.apellido || ''
    const message = `
🛍️ *Nueva Orden de Compra*
${orderNumber ? `# ${orderNumber}\n` : ''}
👤 Cliente: ${[nombre, apellido].filter(Boolean).join(' ') || 'N/D'}

📦 *Productos:*
${orderDetails}

💰 *Total: $${orderTotal.toLocaleString()}*

📋 Adjunto comprobante de transferencia y orden de compra

${config.mensaje_transferencia || ''}
    `.trim()

    const whatsappUrl = `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleSendInstagram = () => {
    if (!config) return
    const username = (config.instagram || 'urban.cdg').replace('@', '')
    window.open(`https://instagram.com/${username}`, '_blank')
  }

  const handleFinish = () => {
    // Limpiar carrito y redirigir
    const cartStore = (window as any).cartStore || useCartStore.getState()
    if (cartStore && cartStore.clearCart) {
      cartStore.clearCart()
    }
    onClose()
    window.location.href = `/success?orden=${orderId || orderNumber || ''}`
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                Pago por <span className="text-pink-500">Transferencia</span>
              </h2>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Orden #{orderNumber}</p>
            </div>
            <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">✕</button>
          </div>

          <div className="space-y-6">
            {/* Datos bancarios */}
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

            {/* Total */}
            <div className="bg-white text-black p-6 rounded-3xl flex items-center justify-between shadow-2xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Monto a transferir</p>
                <p className="text-3xl font-black tracking-tighter">${orderTotal.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Descuento aplicado</p>
                <p className="text-xs font-black text-green-600">10% OFF EXTRA</p>
              </div>
            </div>

            {/* Acciones */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleSendWhatsApp}
                className="w-full bg-[#25D366] text-black py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#25D366]/20"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                ENVIAR COMPROBANTE
              </button>
              
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
