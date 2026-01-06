'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { type Producto } from '@/lib/supabase'
import { useCartStore } from '@/store/cartStore'
import { ShoppingBag, ShoppingCart, Bookmark } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import VariantModal from './VariantModal'
// import { motion } from 'framer-motion'

interface Etiqueta {
  id: string
  nombre: string
  tipo: string
  color: string
  icono: string
}

interface ProductCardProps {
  producto: Producto & {
    etiquetas?: Etiqueta[]
    isTopProduct?: boolean
  }
}

function ProductCard({ producto }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)
  const [showModal, setShowModal] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Verificar si está guardado en localStorage al montar
  React.useEffect(() => {
    const saved = localStorage.getItem('savedProducts')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.includes(producto.id)) setIsSaved(true)
    }
  }, [producto.id])

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const saved = localStorage.getItem('savedProducts')
    let parsed: string[] = saved ? JSON.parse(saved) : []
    
    if (isSaved) {
      parsed = parsed.filter(id => id !== producto.id)
      toast.success('Producto removido de guardados', { icon: '🗑️' })
    } else {
      parsed.push(String(producto.id))
      toast.success('Producto guardado', { icon: '🔖' })
    }
    
    localStorage.setItem('savedProducts', JSON.stringify(parsed))
    setIsSaved(!isSaved)
    window.dispatchEvent(new Event('savedProductsUpdated'))
  }

  // Verificar si es próximo lanzamiento
  const isProximoLanzamiento = (producto as any).proximo_lanzamiento || false
  
  // Verificar si es producto TOP
  const isTopProduct = (producto as any).isTopProduct || false

  // Variantes del producto (o array vacío si no hay)
  const variantes = producto.variantes || []
  const hasVariants = variantes.length > 0

  // Obtener talles únicos disponibles
  const availableSizes = useMemo(() => {
    if (!hasVariants) return []
    return Array.from(new Set(variantes.map(v => v.talle))).filter(Boolean)
  }, [variantes])

  // Obtener todos los colores únicos
  const allColors = useMemo(() => {
    if (!hasVariants) return []
    return Array.from(new Set(variantes.map(v => v.color))).filter(Boolean)
  }, [variantes])


  const productId = useMemo(() => String(producto.id), [producto.id])
  const productName = producto.nombre
  const productPrice = producto.precio
  const productImage = producto.imagen_url
  const productOriginalPrice = producto.precio_original
  const productDiscount = producto.descuento_porcentaje ?? 0
  const productHref = useMemo(() => `/productos/${producto.slug || producto.id}`, [producto.slug, producto.id])

  const hasDiscount = productDiscount > 0

  const formattedPrice = useMemo(() => productPrice.toLocaleString(), [productPrice])
  const formattedOriginalPrice = useMemo(
    () => (productOriginalPrice ? productOriginalPrice.toLocaleString() : null),
    [productOriginalPrice]
  )
  const transferPriceValue = useMemo(() => productPrice * 0.9, [productPrice])
  const transferPrice = useMemo(
    () => transferPriceValue.toLocaleString(undefined, {
      minimumFractionDigits: transferPriceValue % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }),
    [transferPriceValue]
  )

  const handleAddToCart = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    if (hasVariants) {
      setShowModal(true)
      return
    }

    addItem({
      id: productId,
      nombre: productName,
      precio: productPrice,
      cantidad: 1,
      imagen_url: productImage
    })
    toast.success(`✅ ${productName} agregado al carrito`)
    window.dispatchEvent(new Event('cartUpdated'))
  }, [hasVariants, addItem, productId, productName, productPrice, productImage])

  const handleVariantConfirm = useCallback(
    (talle: string, color: string) => {
      addItem({
        id: productId,
        nombre: productName,
        precio: productPrice,
        cantidad: 1,
        imagen_url: productImage,
        talle,
        color
      })
      toast.success(`✅ ${productName} (${talle}, ${color}) agregado al carrito`)
      window.dispatchEvent(new Event('cartUpdated'))
    },
    [addItem, productId, productName, productPrice, productImage]
  )

  // Verificar etiquetas
  const hasHotSale = producto.etiquetas?.some(e => e.tipo === 'hot_sale')
  const has2x1 = producto.etiquetas?.some(e => e.tipo === '2x1')

  // Determinar stock actual
  const currentStock = useMemo(() => {
    if (!hasVariants) return producto.stock_actual
    return variantes.reduce((acc, v) => acc + v.stock, 0)
  }, [producto.stock_actual, hasVariants, variantes])

  const upcomingContent = (
    <div className="flex flex-col flex-grow">
      <div className="space-y-2 md:space-y-4 flex-grow">
        <div className="bg-gradient-to-r from-yellow-600/30 to-amber-600/30 border border-yellow-500/40 rounded-lg p-2 md:p-4 text-center">
          <div className="text-2xl md:text-4xl mb-1 md:mb-2">🔒</div>
          <p className="text-yellow-400 font-bold text-sm md:text-lg mb-0.5 md:mb-1">PRÓXIMAMENTE</p>
          <p className="text-gray-300 text-xs md:text-sm">Este producto estará disponible pronto</p>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="w-full bg-gray-800 text-gray-500 py-2 md:py-3 rounded-lg font-bold text-xs md:text-sm cursor-not-allowed border border-gray-700 mt-4"
      >
        🔔 Próximamente
      </button>
    </div>
  )

  const pricingContainerClass = 'p-1 md:p-3 bg-black'

  const regularContent = (
    <div className="flex flex-col flex-grow">
      {hasVariants && (
        <div className="mb-2 md:mb-1 text-xs md:text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            {availableSizes.length > 0 && (
              <span><span className="font-medium">Talles:</span> {availableSizes.slice(0, 3).join(', ')}{availableSizes.length > 3 ? '...' : ''}</span>
            )}
            {allColors.length > 0 && availableSizes.length > 0 && <span>•</span>}
            {allColors.length > 0 && (
              <div className="flex items-center gap-1">
                {allColors.slice(0, 3).map((color, idx) => (
                  <div
                    key={idx}
                    className="w-3 h-3 rounded-full border border-gray-600"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                {allColors.length > 3 && <span className="text-gray-500">+{allColors.length - 3}</span>}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:gap-2 flex-grow">
        <div className={`flex flex-col gap-2 flex-grow ${pricingContainerClass}`}>
          <div className="flex flex-col gap-1 flex-grow">
            {/* El precio original ahora se muestra al lado del precio actual en el div de abajo */}
            
            <div className="flex items-baseline gap-2 mb-1">
              <p className="text-xl md:text-2xl font-bold text-white">
                $ {formattedPrice}
              </p>
              {formattedOriginalPrice && hasDiscount ? (
                <p className="text-sm md:text-base font-medium text-gray-500 line-through">
                  $ {formattedOriginalPrice}
                </p>
              ) : (
                <div className="h-[1.5em]" /> /* Espacio reservado para mantener la alineación */
              )}
            </div>

            {/* Precio con transferencia */}
            <div className="flex flex-wrap items-center gap-1.5 text-gray-400 text-xs md:text-sm mt-1">
              <span className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] md:text-xs font-semibold text-gray-300 border border-gray-700">
                TRANSF.
              </span>
              <span className="font-medium text-white/90">
                $ {transferPrice}
              </span>
            </div>

          </div>

          {/* Cuotas y botón comprar en una fila horizontal */}
          <div className="flex flex-col gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1 text-gray-400 text-[10px] md:text-xs whitespace-nowrap">
              <span className="opacity-80">6 cuotas sin interés de</span>
              <span className="font-bold text-white/90 underline decoration-gray-700 underline-offset-2">
                ${(productPrice / 6).toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={currentStock <= 0}
                className="flex-1 bg-accent text-ink py-2 md:py-3 rounded-lg font-black text-sm md:text-base flex items-center justify-center gap-2 hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                {currentStock <= 0 ? 'Sin Stock' : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    COMPRAR
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleSave}
                className={`w-12 flex items-center justify-center rounded-lg border transition-colors ${isSaved ? 'bg-white text-black border-white' : 'bg-transparent border-white/20 text-white hover:bg-white/10'}`}
              >
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {has2x1 && (
          <div className="flex items-center gap-2 text-blue-400 text-xs md:text-sm">
            <span aria-hidden>🎁</span>
            <span>Llevá 2 y pagá 1</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={`bg-black border rounded-xl md:rounded-2xl overflow-hidden group transition w-full relative flex flex-col h-full ${
      isTopProduct 
        ? 'border-yellow-400 hover:border-yellow-300 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40' 
        : hasHotSale 
        ? 'hot-product border-gray-800 hover:border-gray-600' 
        : 'border-gray-800 hover:border-gray-600'
    }`}>
      {/* Badge de Descuento arriba a la izquierda */}
      {hasDiscount && !isProximoLanzamiento && (
        <div className="absolute top-3 left-3 z-30 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full shadow-lg border border-red-400/30 animate-pulse">
          {productDiscount}% OFF
        </div>
      )}
      {/* Badge TOP dorado (ajustado para no solapar con el descuento) */}
      {isTopProduct && (
        <div className={`absolute ${hasDiscount ? 'top-10' : 'top-3'} left-3 z-20 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg animate-pulse`}>
          ⭐ TOP
        </div>
      )}
      
      {/* Etiquetas/Badges */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        {producto.etiquetas?.map((etiqueta) => (
          <div
            key={etiqueta.id}
            className={`product-badge ${etiqueta.tipo === 'hot_sale' ? 'hot-badge' : etiqueta.tipo === '2x1' ? 'promo-badge' : 'default-badge'}`}
            style={{ 
              background: etiqueta.tipo === 'hot_sale' 
                ? 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)'
                : etiqueta.tipo === '2x1'
                ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                : etiqueta.color
            }}
          >
            {etiqueta.icono} {etiqueta.nombre}
          </div>
        ))}
      </div>

      {/* Efecto dorado para productos TOP */}
      {isTopProduct && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-yellow-600/5" />
        </div>
      )}
      
      {/* Fire Effect para HOT SALE */}
      {hasHotSale && <div className="fire-effect"></div>}

      {/* Product Image */}
      <Link 
        href={productHref} 
        className="block relative w-full h-48 md:h-64 lg:h-72 bg-white/[0.03] overflow-hidden"
      >
        {producto.imagen_url ? (
          <>
            <Image
              src={producto.imagen_url}
              alt={productName}
              fill
              sizes="(min-width: 1280px) 18rem, (min-width: 1024px) 22vw, (min-width: 768px) 30vw, 45vw"
              className={`object-cover transition duration-300 ${isProximoLanzamiento ? '' : 'group-hover:scale-105'}`}
            />
            {isProximoLanzamiento && (
              <>
                <div className="absolute inset-0 z-10">
                  <Image
                    src="/proximamente.png"
                    alt="Próximamente"
                    fill
                    className="object-cover opacity-80 mix-blend-multiply"
                  />
                </div>
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <div className="text-7xl animate-pulse drop-shadow-2xl filter brightness-110">🔒</div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            📦
          </div>
        )}
      </Link>
      
      {/* Product Info */}
      <div className="p-3 md:p-6 bg-black flex flex-col flex-grow">
        <Link href={productHref} className="block mb-2 group/title">
          <h3 className={`font-bold text-white transition-colors group-hover/title:text-accent leading-tight break-words line-clamp-2 min-h-[2.5rem] md:min-h-[3.5rem] ${
            producto.nombre.length > 25 
              ? 'text-[13px] md:text-base' 
              : 'text-[14px] md:text-lg'
          }`}>
            {producto.nombre}
          </h3>
        </Link>
        
        <div className="mt-auto">
          {isProximoLanzamiento ? upcomingContent : regularContent}
        </div>
      </div>

      {/* Variant Selection Modal */}
      <VariantModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleVariantConfirm}
        variantes={variantes}
        productName={producto.nombre}
      />
    </div>
  )
}

ProductCard.displayName = 'ProductCard'

export default React.memo(ProductCard)
