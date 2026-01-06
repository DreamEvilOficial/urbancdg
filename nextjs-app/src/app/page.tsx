'use client'

import { useEffect, useState } from 'react'
import { productosAPI, type Producto } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import TopProducts from '@/components/TopProducts'
import Reviews from '@/components/Reviews'
import BannerSlider from '@/components/BannerSlider'

export default function Home() {
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'URBAN'
    cargarContenido()
  }, [])

  async function cargarContenido() {
    try {
      // 1. Cargar secciones configuradas
      const resSections = await fetch('/api/sections')
      const sectionsData = await resSections.json()

      if (!sectionsData || sectionsData.length === 0) {
        // FALLBACK: Si no hay secciones, mostrar todos los productos recientes
        const resProds = await fetch('/api/products?limit=12')
        const allProds = await resProds.json()
        
        if (allProds && allProds.length > 0) {
             setSections([{
                 id: 'fallback-all',
                 titulo: 'COLECCIÓN',
                 subtitulo: 'Explora todos nuestros productos',
                 tipo: 'manual',
                 productos: allProds
             }])
        } else {
             setSections([])
        }
        return
      }

      const needsAllProducts = sectionsData.some((s: any) =>
        s?.tipo === 'filtro' && ['nuevos', 'descuentos', 'proximamente'].includes(String(s?.referencia_id || ''))
      )
      const allProducts = needsAllProducts ? await productosAPI.obtenerTodos() : []

      // 2. Cargar productos para cada sección en paralelo
      const sectionsWithProducts = await Promise.all(
        sectionsData.map(async (section: any) => {
          let req
          if (section.tipo === 'filtro') {
            if (section.referencia_id === 'destacados') req = productosAPI.obtenerDestacados()
            else if (section.referencia_id === 'nuevos') {
              req = Promise.resolve(
                allProducts
                  .slice()
                  .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                  .slice(0, 4)
              )
            } else if (section.referencia_id === 'descuentos') {
              req = Promise.resolve(
                allProducts
                  .filter((p) => (p.descuento_porcentaje || 0) > 0 || ((p.precio_original || 0) > p.precio))
                  .slice(0, 8)
              )
            } else if (section.referencia_id === 'proximamente') {
              req = Promise.resolve(
                allProducts
                  .filter((p) => (p as any).proximo_lanzamiento === true)
                  .slice(0, 4)
              )
            }
          } else if (section.tipo === 'categoria') {
            req = productosAPI.obtenerPorCategoria(section.referencia_id)
          }

          const productos = req ? await req : []
          return { ...section, productos: productos.slice(0, 8) }
        })
      )

      setSections(sectionsWithProducts)
    } catch (error) {
      console.error('Error al cargar contenido:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent relative z-10">
      <BannerSlider />

      <div className="relative z-20 -mt-10 md:-mt-16">
        <div className="pointer-events-none absolute inset-x-0 -top-10 md:-top-16 h-16 bg-gradient-to-b from-transparent to-[#05060a]" />
        <div className="bg-[#06070c]/70 backdrop-blur-2xl border-t border-white/10 rounded-t-[42px] md:rounded-t-[64px] shadow-[0_-20px_80px_-30px_rgba(0,0,0,0.7)]">
          <TopProducts />

          {loading ? (
            <div className="py-20 text-center text-white">Cargando contenido...</div>
          ) : (
            sections.map((section) => (
              <section key={section.id} className="reveal max-w-7xl mx-auto px-2 md:px-4 py-8 md:py-16">
                <div className="text-center mb-8 md:mb-12">
                  <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight flex items-center justify-center gap-1 md:gap-3 px-2 uppercase">
                    {section.gif_url && (
                      <img src={section.gif_url} alt="" className="w-8 h-8 md:w-16 md:h-16 flex-shrink-0 object-contain" />
                    )}
                    <span className="text-center">{section.titulo}</span>
                    {section.gif_url && (
                      <img src={section.gif_url} alt="" className="w-8 h-8 md:w-16 md:h-16 flex-shrink-0 object-contain" />
                    )}
                  </h2>
                  <div className="w-24 h-1 bg-white mx-auto"></div>
                  {section.subtitulo && <p className="text-gray-400 mt-4">{section.subtitulo}</p>}
                </div>
                
                {section.productos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6 w-full px-1 md:px-0">
                    {section.productos.map((producto: Producto, idx: number) => (
                      <div key={producto.id} className={`reveal reveal-delay-${(idx % 5) + 1}`}>
                        <ProductCard producto={producto} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400">Próximamente más ingresos en esta sección.</p>
                )}
              </section>
            ))
          )}

          <Reviews />
        </div>
      </div>
    </div>
  )
}
