'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { type Producto } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import DynamicTitle from '@/components/DynamicTitle'
import Image from 'next/image'
import { SlidersHorizontal, X, Tag } from 'lucide-react'

function ProductosContent() {
  const [allProductos, setAllProductos] = useState<Producto[]>([])
  const [allCategorias, setAllCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaNombre, setCategoriaNombre] = useState('')
  const [subcategoriaNombre, setSubcategoriaNombre] = useState('')
  const searchParams = useSearchParams()
  
  const categoriaSlug = searchParams.get('categoria_slug') || searchParams.get('categoria')
  const subcategoriaSlug = searchParams.get('subcategoria_slug') || searchParams.get('subcategoria')
  const filter = searchParams.get('filter')
  const searchQuery = searchParams.get('q') || ''

  // Filter States
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [onlyOffers, setOnlyOffers] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Derived available filter options
  const availableOptions = useMemo(() => {
    const sizes = new Set<string>()
    const colors = new Set<string>()
    let min = Infinity
    let max = 0

    allProductos.forEach((p: any) => {
      const vars = p.variantes || []
      vars.forEach((v: any) => {
        if (v.talle) sizes.add(String(v.talle))
        if (v.color) colors.add(String(v.color.toLowerCase()))
      })
      if (p.precio < min) min = p.precio
      if (p.precio > max) max = p.precio
    })

    return {
      sizes: Array.from(sizes).sort(),
      colors: Array.from(colors).sort(),
      absMin: min === Infinity ? 0 : min,
      absMax: max
    }
  }, [allProductos])

  // Initial Load
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        // Load products
        const resProd = await fetch('/api/products')
        const dataProd = await resProd.json()
        setAllProductos(dataProd || [])

        // Load all categories for search mapping
        const resAllCats = await fetch('/api/categories')
        const dataAllCats = resAllCats.ok ? await resAllCats.json() : []
        setAllCategorias(dataAllCats)

        if (categoriaSlug) {
           setCategoriaNombre('') 
           setSubcategoriaNombre('') 
           
           const cat = dataAllCats.find((c: any) => c.slug === categoriaSlug)
           
           if (cat) {
             setCategoriaNombre(cat.nombre)
             if (subcategoriaSlug && cat.subcategorias) {
               const sub = (cat.subcategorias as any[]).find(s => s.slug === subcategoriaSlug)
               if (sub) setSubcategoriaNombre(sub.nombre)
             }
           }
        }
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    load()
  }, [categoriaSlug, subcategoriaSlug, filter])

  // Computation of filtered products
  const productosFiltrados = useMemo(() => {
    let result = [...allProductos]

    // 1. Category/Subcategory filtering
    if (categoriaSlug) {
      // Simplistic check. Ideally backend filters.
    }

    // 2. Special URL Filters
    if (filter === 'descuentos') {
      result = result.filter(p => (p as any).descuento_activo && ((p.descuento_porcentaje || 0) > 0 || (p.precio_original && p.precio_original > p.precio)))
    } else if (filter === 'nuevos') {
      result = result.filter(p => {
        if (!(p as any).nuevo_lanzamiento) return false
        // Check date if present (<= 30 days since launch)
        if ((p as any).fecha_lanzamiento) {
           const launchDate = new Date((p as any).fecha_lanzamiento)
           const now = new Date()
           const diffTime = Math.abs(now.getTime() - launchDate.getTime())
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
           if (launchDate > now) return false // It's upcoming
           return diffDays <= 30
        }
        return true
      })
    } else if (filter === 'proximamente') {
      result = result.filter(p => ((p as any).proximo_lanzamiento || (p as any).proximamente))
    }

    // 3. User UI Filters
    if (onlyOffers) result = result.filter(p => (p.precio_original && p.precio_original > p.precio))
    if (priceRange.min) result = result.filter(p => p.precio >= Number(priceRange.min))
    if (priceRange.max) result = result.filter(p => p.precio <= Number(priceRange.max))
    
    if (selectedSizes.length > 0) {
      result = result.filter((p: any) => {
        const vars = p.variantes || []
        return vars.some((v: any) => selectedSizes.includes(String(v.talle)))
      })
    }

    if (selectedColors.length > 0) {
      result = result.filter((p: any) => {
        const vars = p.variantes || []
        return vars.some((v: any) => selectedColors.includes(String(v.color).toLowerCase()))
      })
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => {
        const cat = allCategorias.find(c => c.id === p.categoria_id)
        const catName = cat ? cat.nombre.toLowerCase() : ''
        
        let subcatName = ''
        if (cat && cat.subcategorias && p.subcategoria_id) {
             const sub = cat.subcategorias.find((s: any) => s.id === p.subcategoria_id)
             if (sub) subcatName = sub.nombre.toLowerCase()
        }

        return p.nombre.toLowerCase().includes(q) || catName.includes(q) || subcatName.includes(q)
      })
    }

    return result
  }, [allProductos, filter, onlyOffers, priceRange, selectedSizes, selectedColors, searchQuery, categoriaSlug, allCategorias])

  // Title Logic
  const getTitleInfo = () => {
    if (searchQuery) {
      return { text: `BÚSQUEDA: "${searchQuery.toUpperCase()}"`, element: `BÚSQUEDA: "${searchQuery.toUpperCase()}"` }
    }

    if (filter === 'descuentos') {
      return {
        text: 'DESCUENTOS',
        element: (
          <span className="flex items-center gap-3 md:gap-5">
            DESCUENTOS
            <Image src="/discount-icon.gif" alt="Descuento" width={60} height={60} className="w-10 h-10 md:w-16 md:h-16 -mt-2 object-contain" unoptimized />
          </span>
        )
      }
    }
    
    if (filter === 'nuevos') {
      return {
        text: 'NUEVOS INGRESOS',
        element: (
          <span className="flex items-center gap-3 md:gap-5">
            NUEVOS INGRESOS
            <Image src="/new-label.gif" alt="Nuevo" width={60} height={60} className="w-10 h-10 md:w-16 md:h-16 -mt-2 object-contain" unoptimized />
          </span>
        )
      }
    }

    if (filter === 'proximamente') {
      return {
        text: 'PRÓXIMAMENTE',
        element: (
          <span className="flex items-center gap-3 md:gap-5">
            PRÓXIMAMENTE
            <Image src="/fire.gif" alt="Próximamente" width={60} height={60} className="w-10 h-10 md:w-16 md:h-16 -mt-2 object-contain" unoptimized />
          </span>
        )
      }
    }

    // Generic filter fallback
    if (filter) {
      const text = filter.replace(/-/g, ' ').toUpperCase()
      return { text, element: text }
    }

    const text = (subcategoriaNombre || categoriaNombre || (categoriaSlug ? categoriaSlug.replace(/-/g, ' ') : 'COLECCIÓN')).toUpperCase()
    return { text, element: text }
  }

  const { text: titleText, element: titleElement } = getTitleInfo()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filter, categoriaSlug, subcategoriaSlug, searchQuery])

  return (
    <div className="min-h-screen bg-[#06070c] text-white relative z-10 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/5 rounded-full blur-[150px]" />
      </div>

      <DynamicTitle title={`${titleText} / Urban Indumentaria`} />
      
      <div className="max-w-[1400px] mx-auto px-4 md:px-10 pt-16 pb-20 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 border-b border-white/5 pb-10">
           <div>
             <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none">{titleElement}</h1>
             <div className="text-[10px] font-black text-white/45 uppercase tracking-[0.4em] mt-4 flex items-center gap-3">
               <div className="w-8 h-[1px] bg-white/10" /> EXPLORANDO {productosFiltrados.length} ARTÍCULOS
             </div>
           </div>
           
           <button 
             onClick={() => setShowMobileFilters(true)}
             className="md:hidden flex items-center justify-center gap-2 bg-accent text-ink py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-95"
           >
             <SlidersHorizontal className="w-4 h-4" /> Filtros
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Desktop Sidebar - Liquid Glass */}
          <aside className="hidden md:block lg:col-span-3 space-y-8">
            <div className="sticky top-10 space-y-8">
              
              {/* Reset All */}
              {(selectedSizes.length > 0 || selectedColors.length > 0 || onlyOffers || priceRange.min || priceRange.max) && (
                <button 
                  onClick={() => { setSelectedSizes([]); setSelectedColors([]); setPriceRange({min:'', max:''}); setOnlyOffers(false); }}
                  className="flex items-center gap-2 text-[10px] font-black text-pink-500 uppercase tracking-widest hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> REINICIAR FILTROS
                </button>
              )}

              {/* Price Filter */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center justify-between">
                   Precio <span>$</span>
                 </h4>
                 <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="number" placeholder="MÍN" value={priceRange.min}
                      onChange={e => setPriceRange({...priceRange, min: e.target.value})}
                      className="bg-white/5 border border-white/5 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-white/20"
                    />
                    <input 
                      type="number" placeholder="MÁX" value={priceRange.max}
                      onChange={e => setPriceRange({...priceRange, max: e.target.value})}
                      className="bg-white/5 border border-white/5 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-white/20"
                    />
                 </div>
              </div>

              {/* Toggle Offers */}
              <button 
                onClick={() => setOnlyOffers(!onlyOffers)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  onlyOffers ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 hover:border-white/20'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">Solo en Ofertas</span>
                <Tag className={`w-4 h-4 ${onlyOffers ? 'text-black' : 'text-pink-500'}`} />
              </button>

              {/* Sizes */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Talle</h4>
                 <div className="flex flex-wrap gap-2">
                    {availableOptions.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                          selectedSizes.includes(size) ? 'bg-white text-black shadow-lg shadow-white/5' : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/20'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Colors */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Color</h4>
                 <div className="flex flex-wrap gap-3">
                    {availableOptions.colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color])}
                        className={`w-8 h-8 rounded-full border-2 p-0.5 transition-all ${
                          selectedColors.includes(color) ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-white/5 opacity-40 hover:opacity-100'
                        }`}
                      >
                         <div className="w-full h-full rounded-full" style={{ backgroundColor: color }} />
                      </button>
                    ))}
                 </div>
              </div>

            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-9">
            {loading ? (
              <div className="flex justify-center py-40 opacity-20"><div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>
            ) : productosFiltrados.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-6">
                {productosFiltrados.map((p) => (
                  <ProductCard key={p.id} producto={p} />
                ))}
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center bg-white/[0.02] rounded-[40px] border border-dashed border-white/5 p-10">
                 <SlidersHorizontal className="w-10 h-10 text-gray-800 mb-6" />
                 <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest text-center">
                   No hay resultados con estos filtros.<br/>Intentá con otros parámetros.
                 </p>
              </div>
            )}
          </main>

        </div>
      </div>

      {/* Mobile Filter Drawer Overlay */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-300">
           <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Filtros</h2>
              <button onClick={() => setShowMobileFilters(false)} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center"><X /></button>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-8 pb-20">
              {/* Similar content as sidebar but optimized for touch */}
              <div className="space-y-4">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Precio</p>
                 <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="MÍN" value={priceRange.min} onChange={e => setPriceRange({...priceRange, min: e.target.value})} className="bg-white/5 p-5 rounded-2xl outline-none" />
                    <input type="number" placeholder="MÁX" value={priceRange.max} onChange={e => setPriceRange({...priceRange, max: e.target.value})} className="bg-white/5 p-5 rounded-2xl outline-none" />
                 </div>
              </div>

              <div className="space-y-4">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Talles</p>
                 <div className="grid grid-cols-3 gap-3">
                   {availableOptions.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])}
                        className={`py-4 rounded-2xl text-xs font-black uppercase transition-all ${
                          selectedSizes.includes(size) ? 'bg-white text-black' : 'bg-white/5 text-gray-500'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                 </div>
              </div>
              
              {/* Reset Mobile */}
              <button 
                onClick={() => { setSelectedSizes([]); setSelectedColors([]); setPriceRange({min:'', max:''}); setOnlyOffers(false); setShowMobileFilters(false); }}
                className="w-full bg-pink-500 text-black py-5 rounded-3xl font-black uppercase text-xs tracking-widest"
              >
                Limpiar Filtros
              </button>
           </div>

           <button 
             onClick={() => setShowMobileFilters(false)}
             className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase text-xs tracking-[0.3em]"
           >
             Ver {productosFiltrados.length} Resultados
           </button>
        </div>
      )}

    </div>
  )
}

export default function ProductosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div></div>}>
      <ProductosContent />
    </Suspense>
  )
}
