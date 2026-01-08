'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Send } from 'lucide-react'
import toast from 'react-hot-toast'

interface TransferPaymentProps {
  orderTotal: number
  orderItems: any[]
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
}

export default function TransferPayment({ orderTotal, orderItems, orderNumber, customer, onClose }: TransferPaymentProps) {
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
        mensaje_transferencia: 'Gracias por tu compra. Confirmaremos tu pedido al recibir el pago.'
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Modal no se cierra al hacer click en el fondo
    // if (e.target === e.currentTarget) {
    //   onClose()
    // }
  }

  if (!mounted || loading) {
    return (
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-secondary">Cargando datos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-2xl font-bold">Error</h2>
            <button onClick={onClose} className="close-btn">✕</button>
          </div>
          <div className="modal-body">
            <p className="text-center text-secondary">
              No se pudo cargar la configuración de pago.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', zoom: 0.85 }}>
        <div className="modal-header" style={{ padding: '1rem' }}>
          <h2 className="text-xl font-bold text-white">💳 Pago por Transferencia</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="modal-body" style={{ padding: '1rem' }}>
          {/* Resumen del pedido */}
          <div className="mb-3 p-3 rounded-lg" style={{ background: 'var(--glass-bg)' }}>
            <h3 className="font-bold mb-2 text-white text-sm">📦 Resumen del Pedido</h3>
            <div className="space-y-2 mb-2">
              {orderItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Image 
                    src={item.imagen_url || '/placeholder.png'} 
                    alt={item.nombre}
                    width={48}
                    height={48}
                    className="object-cover rounded-md"
                    unoptimized
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{item.nombre}</p>
                    <div className="flex gap-2 text-xs text-gray-300">
                      {item.talle && <span>Talle: {item.talle}</span>}
                      {item.color && <span>Color: {item.color}</span>}
                    </div>
                    <p className="text-xs text-gray-400">x{item.cantidad}</p>
                  </div>
                  <span className="font-semibold text-white text-sm">${(item.precio * item.cantidad).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <div className="flex justify-between font-bold">
                <span className="text-white">Total:</span>
                <span className="text-white">$<span suppressHydrationWarning>{orderTotal.toLocaleString()}</span></span>
              </div>
            </div>
          </div>

          {/* Datos bancarios */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm mb-2">💰 Datos para Transferencia</h3>

            {/* CVU */}
            {config.cvu && (
              <div className="p-2 rounded-lg" style={{ background: 'var(--glass-bg)' }}>
                <label className="text-xs font-semibold text-white block mb-1">CVU</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config.cvu}
                    readOnly
                    className="form-input flex-1 font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(config.cvu, 'cvu')}
                    className="icon-btn"
                    title="Copiar CVU"
                  >
                    {copied.cvu ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Alias */}
            {config.alias && (
              <div className="p-2 rounded-lg" style={{ background: 'var(--glass-bg)' }}>
                <label className="text-xs font-semibold text-white block mb-1">Alias</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config.alias}
                    readOnly
                    className="form-input flex-1"
                  />
                  <button
                    onClick={() => copyToClipboard(config.alias, 'alias')}
                    className="icon-btn"
                    title="Copiar Alias"
                  >
                    {copied.alias ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Titular */}
            {config.titular && (
              <div className="p-2 rounded-lg" style={{ background: 'var(--glass-bg)' }}>
                <label className="text-xs font-semibold text-white block mb-1">Titular</label>
                <input
                  type="text"
                  value={config.titular}
                  readOnly
                  className="form-input w-full"
                />
              </div>
            )}

            {/* Banco */}
            {config.banco && (
              <div className="p-2 rounded-lg" style={{ background: 'var(--glass-bg)' }}>
                <label className="text-xs font-semibold text-white block mb-1">Banco</label>
                <input
                  type="text"
                  value={config.banco}
                  readOnly
                  className="form-input w-full"
                />
              </div>
            )}
          </div>

          {/* Instrucciones */}
          <div className="mt-3 p-2 rounded-lg bg-blue-500/10">
            <h4 className="font-bold mb-1 text-blue-300 text-xs">📝 Instrucciones</h4>
            <ol className="text-xs space-y-0.5 text-blue-200">
              <li>1. Realiza la transferencia por el monto total</li>
              <li>2. Guarda el comprobante de pago</li>
              <li>3. Haz clic en &ldquo;Enviar Comprobante&rdquo; para contactarnos</li>
              <li>4. Adjunta el comprobante en WhatsApp con tu orden de compra</li>
            </ol>
          </div>

          {/* Botón de WhatsApp */}
          <button
            onClick={handleSendWhatsApp}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition shadow-lg bg-[#25D366] hover:bg-[#20BA5A] text-black"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Enviar Comprobante por WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
