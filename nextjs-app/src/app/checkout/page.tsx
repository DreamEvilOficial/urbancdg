'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import NextImage from 'next/image'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/formatters'
import { Truck, Store, MapPin, ArrowRight, ArrowLeft, ShieldCheck, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

type DeliveryMethod = 'shipping' | 'pickup'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total } = useCartStore()
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('shipping')
  const [shippingCost, setShippingCost] = useState(0)
  const [calculatingShipping, setCalculatingShipping] = useState(false)
  const [config, setConfig] = useState<any>({})
  
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', telefono: '', direccion: '', numero: '', departamento: '', barrio: '', ciudad: '', codigoPostal: '', dniCuit: ''
  })
  
  const [shippingOption, setShippingOption] = useState<'correo' | 'andreani'>('correo')

  useEffect(() => {
    if (items.length === 0) router.push('/')
  }, [items.length, router])

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        setConfig(data || {})
      } catch (error) {}
    }
    loadConfig()
    window.addEventListener('config-updated', loadConfig)
    return () => window.removeEventListener('config-updated', loadConfig)
  }, [])

  const calculateShipping = useCallback(async () => {
    setCalculatingShipping(true)
    setTimeout(() => {
      const isCaba = formData.codigoPostal.startsWith('1')
      const baseCost = shippingOption === 'correo' ? (isCaba ? 3500 : 4500) : (isCaba ? 5200 : 6500)
      setShippingCost(baseCost)
      setCalculatingShipping(false)
    }, 500)
  }, [formData.codigoPostal, shippingOption])

  useEffect(() => {
    const threshold = Number(config?.envio_gratis_umbral ?? 50000)
    const forceFree = config?.envio_gratis_forzado === true || config?.envio_gratis_forzado === 'true'
    const isFree = deliveryMethod === 'pickup' || forceFree || total() >= threshold
    if (isFree) { setShippingCost(0); return; }
    if (formData.codigoPostal.length >= 4) calculateShipping()
    else setShippingCost(0)
  }, [formData.codigoPostal, deliveryMethod, shippingOption, config, items.length, total, calculateShipping])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre || !formData.apellido || !formData.telefono || !formData.dniCuit) {
      toast.error('Completa los datos requeridos')
      return
    }
    localStorage.setItem('deliveryData', JSON.stringify({
      formData, deliveryMethod, shippingCost, shippingOption, finalTotal: total() + shippingCost
    }))
    router.push('/payment')
  }

  if (items.length === 0) return null

  return (
    <div className="min-h-screen bg-[#000000FA] text-white flex flex-col items-center">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[10%] left-[5%] w-[30%] h-[30%] bg-pink-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl w-full px-4 md:px-0 relative z-10 flex-1 pb-10 scale-[1.21] origin-top transition-transform">
        <div className="pt-8 pb-4 flex items-end justify-between">
          <div>
            <button onClick={() => router.back()} className="group flex items-center gap-2 text-gray-600 hover:text-white transition-colors text-[9px] font-black uppercase tracking-[0.2em] mb-2">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              <span>Volver</span>
            </button>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              Entrega <span className="text-pink-500">Datos</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
             <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
             <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Seguro</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl">
                <button type="button" onClick={() => setDeliveryMethod('shipping')} className={`flex items-center justify-center gap-2 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${deliveryMethod === 'shipping' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                  Envío
                </button>
                <button type="button" onClick={() => setDeliveryMethod('pickup')} className={`flex items-center justify-center gap-2 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${deliveryMethod === 'pickup' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                  Retiro
                </button>
              </div>

              <div className="space-y-3">
                <section className="bg-white/[0.03] border border-white/5 p-5 rounded-[30px]">
                  <h3 className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-4">Información Personal</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="text" placeholder="NOMBRE" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-white/30 text-xs font-bold uppercase tracking-tight" />
                    <input required type="text" placeholder="APELLIDO" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-white/30 text-xs font-bold uppercase tracking-tight" />
                    <input required type="tel" placeholder="WHATSAPP / CELULAR" className="col-span-2 w-full bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-white/30 text-xs font-bold uppercase tracking-tight" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                  </div>
                </section>

                {deliveryMethod === 'shipping' ? (
                  <section className="bg-white/[0.03] border border-white/5 p-5 rounded-[30px] animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-4">Ubicación de Envío</h3>
                    <div className="grid grid-cols-12 gap-3">
                      <input required type="text" placeholder="DOMICILIO" className="col-span-8 bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-white/30 text-xs font-bold" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
                      <input required type="text" placeholder="Nº" className="col-span-4 bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-white/30 text-xs font-bold" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} />
                      <input required type="text" placeholder="CP" className="col-span-4 bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-white/30 text-xs font-bold" value={formData.codigoPostal} onChange={e => setFormData({...formData, codigoPostal: e.target.value})} />
                      <input required type="text" placeholder="CIUDAD" className="col-span-8 bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-white/30 text-xs font-bold uppercase" value={formData.ciudad} onChange={e => setFormData({...formData, ciudad: e.target.value})} />
                    </div>
                  </section>
                ) : (
                  <div className="p-4 border border-dashed border-white/10 rounded-[25px] flex items-center gap-3">
                    <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center shrink-0"><MapPin className="w-4 h-4" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Bv Lopez 1183, CP 2144</p>
                  </div>
                )}

                <section className="bg-white/[0.03] border border-white/5 p-5 rounded-[30px]">
                  <input required type="text" placeholder="DNI / CUIL DE FACTURACIÓN" value={formData.dniCuit} onChange={e => setFormData({...formData, dniCuit: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-white/30 text-xs font-bold uppercase" />
                </section>
              </div>

              <button type="submit" className="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group">
                CONTINUAR AL PAGO <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>

          <div className="xl:col-span-5 w-full">
             <div className="bg-white text-black p-5 rounded-[30px] shadow-2xl">
                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Resumen de Compra</h3>
                <div className="space-y-2 mb-4">
                   {items.map((item, i) => (
                     <div key={i} className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black/5 rounded overflow-hidden shrink-0 relative">
                          <NextImage 
                            src={item.imagen_url || '/proximamente.png'} 
                            alt={item.nombre}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                        <div className="flex-1 truncate">
                          <p className="text-[9px] font-black uppercase truncate">{item.nombre}</p>
                          {(item.talle || item.color) && (
                            <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">
                              {[item.talle, item.color].filter(Boolean).join(' / ')}
                            </p>
                          )}
                        </div>
                        <p className="text-[10px] font-black tracking-tight">
                          ${ formatPrice(item.precio * item.cantidad) }
                        </p>
                     </div>
                   ))}
                </div>
                <div className="space-y-1.5 border-t border-black/5 pt-3">
                  <div className="flex justify-between text-[9px] font-bold uppercase opacity-40">
                    <span>Subtotal</span>
                    <span>
                      ${ formatPrice(total()) }
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold uppercase opacity-40">
                    <span>Envío</span>
                    <span className="text-green-600">
                      {calculatingShipping
                        ? '...'
                        : shippingCost === 0
                          ? 'GRATIS'
                          : (
                            <>$<span suppressHydrationWarning>
                              { formatPrice(shippingCost) }
                            </span></>
                          )}
                    </span>
                  </div>
                  <div className="flex justify-between items-end pt-1">
                    <span className="font-black uppercase tracking-tighter text-[10px]">Total</span>
                    <span className="text-3xl font-black tracking-tighter leading-none">
                      $<span suppressHydrationWarning>
                        { formatPrice(total() + shippingCost) }
                      </span>
                    </span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
