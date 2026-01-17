'use client'

import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/store/cartStore'

interface TransferPaymentProps {
  orderTotal: number
  orderItems?: any[]
  orderId?: string
  orderNumber?: string
  customer?: { nombre?: string; apellido?: string }
  onClose: () => void
}

export default function TransferPayment({ orderId, orderNumber, onClose }: TransferPaymentProps) {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<any>(null)
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({})
  const [remainingTime, setRemainingTime] = useState<string>('Loading...')
  const [uniqueAmount, setUniqueAmount] = useState<number | null>(null)
  const [expiration, setExpiration] = useState<Date | null>(null)
  const [checking, setChecking] = useState(false)

  // 1. Initialize Transfer
  useEffect(() => {
    async function initTransfer() {
      if (!orderId) {
          // If no orderId (maybe preview mode?), just show loading or error
          return
      }
      try {
        const res = await fetch('/api/transfer/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId })
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Error iniciando transferencia')
        }
        const data = await res.json()
        setConfig(data)
        setUniqueAmount(Number(data.amount))
        setExpiration(new Date(data.expiration))
        setLoading(false)
      } catch (error: any) {
        console.error(error)
        toast.error('Error al generar datos de transferencia')
        // onClose() // Don't close immediately, let user see error or try again?
      }
    }
    initTransfer()
  }, [orderId])

  // 2. Poll for payment
  useEffect(() => {
    if (!orderId || !uniqueAmount) return

    const checkPayment = async () => {
        try {
            const res = await fetch('/api/transfer/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            })
            const data = await res.json()
            if (data.paid) {
                toast.success('¡Pago recibido!')
                handleSuccess()
            }
        } catch (e) {
            // silent fail
        }
    }

    const interval = setInterval(checkPayment, 5000)
    return () => clearInterval(interval)
  }, [orderId, uniqueAmount])

  // 3. Timer
  useEffect(() => {
    if (!expiration) return
    const update = () => {
        const now = new Date().getTime()
        const exp = expiration.getTime()
        const diff = exp - now
        
        if (diff <= 0) {
            setRemainingTime('EXPIRADO')
            clearInterval(interval)
            cancelTransfer()
        } else {
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)
            setRemainingTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
        }
    }
    const interval = setInterval(update, 1000)
    update()
    return () => clearInterval(interval)
  }, [expiration])

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied({ ...copied, [field]: true })
      toast.success(`${field.toUpperCase()} copiado`)
      setTimeout(() => {
        setCopied({ ...copied, [field]: false })
      }, 2000)
    } catch (error) {}
  }

  const cancelTransfer = useCallback(async () => {
    if (!orderId) return onClose()
    const toastId = toast.loading('Cancelando pedido...')
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar el pedido')
      
      localStorage.removeItem('paymentOrder')
      toast.success('Pedido cancelado', { id: toastId })
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('Error al cancelar', { id: toastId })
      onClose()
    }
  }, [orderId, onClose])

  const handleSuccess = () => {
    const cartStore = (window as any).cartStore || useCartStore.getState()
    if (cartStore && cartStore.clearCart) cartStore.clearCart()
    
    // Clear storage
    try {
        window.localStorage.removeItem('paymentOrder')
        window.localStorage.removeItem('deliveryData')
    } catch {}

    window.location.href = `/success?orden=${orderId || orderNumber || ''}`
  }
  
  const manualCheck = async () => {
    setChecking(true)
    try {
        const res = await fetch('/api/transfer/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        })
        const data = await res.json()
    if (data.paid) {
      toast.success('¡Pago confirmado!')
      handleSuccess()
    } else {
      let msg = data.message || 'Pago no detectado aún'
      if (data.status === 'error' && data.details?.message) {
        msg = `${data.message}: ${data.details.message}`
      }
      toast(msg, { icon: data.status === 'error' ? '❌' : '⏳' })
    }
  } catch (err: any) {
    console.error('Check error:', err)
    toast.error('Error al verificar: Por favor intenta de nuevo en unos momentos.')
  } finally {
    setChecking(false)
  }
}

  const cancelTransaction = () => {
     cancelTransfer();
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="glass-card flex flex-col items-center gap-4 p-8">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            <p className="text-white text-xs font-bold uppercase tracking-widest">Generando datos de transferencia...</p>
        </div>
      </div>
    )
  }

  if (!config) {
      return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
       <div className="glass-card w-full max-w-[500px] relative overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 pb-2 text-center">
             <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
                <span className="text-3xl font-black text-blue-400">i</span>
             </div>
             <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight">¡Transferencia Pendiente!</h2>
             <p className="text-gray-400 text-xs font-bold mt-2 leading-relaxed">
                Por favor, realiza tu transferencia bancaria al siguiente CBU para completar tu compra:
             </p>
          </div>

          <div className="px-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
             {/* CBU Box */}
             <div className="bg-white rounded-2xl p-4 text-center shadow-xl border border-blue-500/30 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-1">CBU</p>
                <div 
                    onClick={() => copyToClipboard(config.cbu, 'CBU')}
                    className="text-lg md:text-2xl font-black text-gray-900 tracking-wider cursor-pointer hover:scale-105 transition-transform select-all break-all"
                >
                    {config.cbu}
                </div>
                <p className="text-gray-500 text-[10px] font-bold mt-1 uppercase">{config.titular}</p>
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy className="w-4 h-4 text-gray-400" />
                </div>
             </div>

             {/* Amount Box */}
             <div className="bg-[#E8F5E9] rounded-2xl p-4 text-center shadow-xl border border-green-500/30 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500 px-4"></div>
                <p className="text-green-700 text-[10px] font-black uppercase tracking-[0.2em] mb-1">MONTO EXACTO:</p>
                <div 
                    onClick={() => copyToClipboard(String(uniqueAmount), 'Monto')}
                    className="text-3xl font-black text-green-600 tracking-tighter cursor-pointer hover:scale-105 transition-transform"
                >
                    ${ uniqueAmount?.toLocaleString('es-AR', { minimumFractionDigits: 2 }) } ARS
                </div>
             </div>

             <div className="text-center">
                <p className="text-gray-500 text-xs font-bold">
                    Quedan <span className="text-red-500 font-black text-base mx-1">{remainingTime}</span> minutos para completar la transferencia.
                </p>
             </div>
             
             <div className="border-t border-dashed border-white/10 my-4"></div>

             {/* Important Warning */}
             <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-left">
                <AlertTriangle className="w-10 h-10 text-red-500 shrink-0" />
                <div>
                    <h4 className="text-red-500 font-black uppercase text-xs mb-1">¡IMPORTANTE!</h4>
                    <p className="text-gray-300 text-[10px] font-bold leading-relaxed">
                        Para que el pedido se active automáticamente, debes enviar 
                        el <span className="text-white underline">monto exacto</span>, con los centavos incluidos.
                        Si no coincide, la compra no se procesará.
                    </p>
                </div>
             </div>
          </div>

          <div className="p-6 bg-black/20 mt-auto space-y-3">
             <div className="flex justify-center mb-2 h-5">
                 <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
             </div>
             <button 
                onClick={manualCheck}
                disabled={checking}
                className="w-full bg-white text-black py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
             >
                {checking ? 'Verificando...' : 'Ya transferí'}
             </button>
             <button 
                onClick={cancelTransaction}
                className="w-full text-white/30 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
             >
                Cancelar Transacción
             </button>
          </div>
       </div>
    </div>
  )
}
