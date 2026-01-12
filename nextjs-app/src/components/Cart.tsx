'use client'

import { useCartStore } from '@/store/cartStore'
import { X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { productosAPI } from '@/lib/supabase'

interface CartProps {
  onClose: () => void
}

export default function Cart({ onClose }: CartProps) {
  const { items, removeItem, updateQuantity, total, clearCart, addItem } = useCartStore()
  const router = useRouter()
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    // Cargar productos sugeridos (ej: destacados o random)
    const loadSuggested = async () => {
      try {
        const destacados = await productosAPI.obtenerDestacados()
        // Filtrar los que ya están en el carrito
        const filtered = destacados.filter(p => !items.find(i => i.id === String(p.id))).slice(0, 3)
        setSuggestedProducts(filtered)
      } catch (error) {
        console.error('Error loading suggestions:', error)
      }
    }
    loadSuggested()
  }, [items])

  const handleCheckout = () => {
    router.push('/checkout')
    onClose()
  }

  const handleClearCart = () => {
    clearCart()
    window.dispatchEvent(new Event('cartUpdated'))
  }

  const handleUpdateQuantity = (id: string, quantity: number) => {
    updateQuantity(id, quantity)
    window.dispatchEvent(new Event('cartUpdated'))
  }

  const handleRemoveItem = (id: string) => {
    removeItem(id)
    window.dispatchEvent(new Event('cartUpdated'))
  }

  const handleAddSuggested = (product: any) => {
    addItem({
      id: String(product.id),
      nombre: product.nombre,
      precio: product.precio,
      cantidad: 1,
      imagen_url: product.imagen_url || (product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : '/proximamente.png')
    })
    document.dispatchEvent(new Event('cartUpdated'))
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4" onClick={handleOverlayClick}>
      {/* Overlay Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      
      <div 
        className="relative w-full md:max-w-[460px] bg-[#07080d]/85 border-t md:border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          height: items.length === 0 ? 'auto' : 'auto',
          maxHeight: '85vh'
        }}
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#07080d]/70">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Tu Bolsa</h2>
            {items.length > 0 && (
              <span className="bg-accent/15 text-accent text-xs font-black px-2 py-0.5 rounded-full border border-accent/20">
                {items.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                <Trash2 className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-lg font-bold text-white mb-2">Carrito vacío</p>
              <button 
                onClick={onClose} 
                className="px-8 py-2 bg-accent text-ink rounded-xl font-black hover:brightness-95 transition-colors text-sm uppercase tracking-widest"
              >
                Seguir mirando
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-2 rounded-2xl items-center group hover:bg-white/[0.03] transition-colors"
                >
                  <div className="relative w-20 h-24 bg-white/5 rounded-xl overflow-hidden shrink-0 group">
                    <img 
                      src={item.imagen_url && item.imagen_url !== '' ? item.imagen_url : '/proximamente.png'} 
                      alt={item.nombre} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                         const target = e.target as HTMLImageElement;
                         target.src = '/proximamente.png';
                      }} 
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 mb-1 group-hover:text-accent transition-colors">
                      {item.nombre}
                    </h3>
                    
                    {(item.talle || item.color) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                        {item.talle && (
                          <span className="text-[10px] font-bold text-white/55 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 uppercase">
                            Talle: {item.talle}
                          </span>
                        )}
                        {item.color && (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: String(item.color) }}
                            />
                            {!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(item.color)) && (
                              <span className="text-[10px] text-white/55 font-medium capitalize">{String(item.color)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-white font-black text-sm">${item.precio.toLocaleString()}</p>
                      
                      <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.cantidad - 1)}
                          className="p-1.5 hover:text-accent transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-white">{item.cantidad}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.cantidad + 1)}
                          className="p-1.5 hover:text-accent transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2.5 text-white/35 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Suggested Products Section - Horizontal Scroll */}
          {items.length > 0 && suggestedProducts.length > 0 && (
            <div className="mt-2 py-6 bg-white/[0.02] border-t border-white/10">
              <div className="px-6 flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-white/45 uppercase tracking-[0.35em] flex items-center gap-2">
                  <span className="text-accent">+</span> Completa el fit
                </h3>
              </div>
              
              <div className="flex gap-4 overflow-x-auto px-6 pb-2 custom-scrollbar no-scrollbar scroll-smooth">
                {suggestedProducts.map((prod) => (
                  <div 
                    key={prod.id} 
                    className="flex-shrink-0 w-32 group cursor-pointer"
                    onClick={() => handleAddSuggested(prod)}
                  >
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-2 border border-white/10 group-hover:border-accent/30 transition-colors">
                      <img 
                        src={prod.imagen_url || prod.imagenes?.[0] || '/proximamente.png'} 
                        alt={prod.nombre} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/proximamente.png';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <p className="text-[11px] font-bold text-white truncate px-1">{prod.nombre}</p>
                    <p className="text-[10px] text-accent font-black px-1">${prod.precio.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed Bottom */}
        {items.length > 0 && (
          <div className="p-6 border-t border-white/10 bg-[#07080d]/70 flex-shrink-0">
            <div className="flex justify-between items-end mb-6">
              <span className="text-white/55 text-sm font-medium">Subtotal</span>
              <span className="text-3xl font-black text-white tracking-tighter">$<span suppressHydrationWarning>{total().toLocaleString()}</span></span>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleCheckout}
                className="w-full h-14 flex items-center justify-center gap-3 bg-accent text-ink rounded-2xl font-black text-lg hover:brightness-95 transition-all shadow-xl active:scale-[0.98]"
              >
                <span>Ir al Checkout</span>
                <ArrowRight className="w-6 h-6" />
              </button>
              
              <button
                onClick={handleClearCart}
                className="w-full py-2 text-[11px] text-white/35 hover:text-red-500 font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                Vaciar carrito
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
