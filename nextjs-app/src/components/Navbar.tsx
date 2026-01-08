'use client'

import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { ShoppingCart, ChevronDown, ChevronRight, Home, MessageCircle, Music2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Cart from './Cart'
import MusicPanel from './MusicPanel'
import { motion, AnimatePresence } from 'framer-motion'
import { CategoryIcon } from './IconSelector'

export default function Navbar() {
  const items = useCartStore((state) => state.items)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [nombreTienda, setNombreTienda] = useState('Urban Indumentaria')
  const [categorias, setCategorias] = useState<Array<{id: string, nombre: string, slug: string, icono?: string, subcategorias?: Array<{id: string, nombre: string, slug: string}>}>>([])
  const [showProductsMenu, setShowProductsMenu] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showMusic, setShowMusic] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [mensajes, setMensajes] = useState<string[]>(['🔥 EN TRANSFERENCIA - MYSTERY BOXES CON 70% OFF', 'HASTA 6 CUOTAS SIN INTERÉS', '10% EN TRANSFERENCIAS'])
  const [hideNavbar, setHideNavbar] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [filtrosEspeciales, setFiltrosEspeciales] = useState<Array<{id: string, nombre: string, clave: string, icono: string, activo: boolean, imagen_url?: string}>>([])
  
  const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0)

  // Prefetch automático de páginas principales
  useEffect(() => {
    if (mounted) {
      router.prefetch('/')
      router.prefetch('/productos')
      router.prefetch('/cart')
      router.prefetch('/contacto')
    }
  }, [mounted, router])

  useEffect(() => {
    setMounted(true)
    
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        
        if (data) {
          const config: any = {}
          // Determine if data is array (new api) or object
          if (Array.isArray(data)) {
             data.forEach((item: any) => {
                try {
                  config[item.clave] = JSON.parse(item.valor)
                } catch {
                  config[item.clave] = item.valor
                }
             })
          } else {
             // Fallback if structure differs
             Object.assign(config, data)
          }
          
          if (config.logo_url) setLogoUrl(config.logo_url)
          if (config.nombre_tienda) setNombreTienda(config.nombre_tienda)
          
          // Actualizar mensajes del banner
          const nuevosMensajes = []
          if (config.anuncio_1) nuevosMensajes.push(config.anuncio_1)
          if (config.anuncio_2) nuevosMensajes.push(config.anuncio_2)
          if (config.anuncio_3) nuevosMensajes.push(config.anuncio_3)
          
          if (nuevosMensajes.length > 0) {
            setMensajes(nuevosMensajes)
          }
        }
      } catch (error) {
        console.error('Error loading config:', error)
      }
    }
    
    loadConfig()

    // Listen for config updates (local and cross-tab)
    window.addEventListener('config-updated', loadConfig)
    window.addEventListener('storage', (e) => {
      if (e.key === 'config-updated') loadConfig()
    })
    
    // Cargar categorías desde API local
    const loadCategorias = async () => {
      try {
        const res = await fetch('/api/categories')
        const data = await res.json()
        
        if (data) {
          // data from /api/categories already includes subcategories nested
          setCategorias(data)
        }
      } catch (error) {
        console.error('Error loading categorias:', error)
      }
    }
    
    loadCategorias()
    
    // Cargar filtros especiales desde API local
    const loadFiltros = async () => {
      try {
        const res = await fetch('/api/filters')
        const data = await res.json()
        
        if (Array.isArray(data)) {
            // Filter active ones if the API returns all (API currently returns all, so we filter here if needed or update API)
            // The API returns all, let's filter helper
            const activeFilters = data.filter((f: any) => f.activo)
            setFiltrosEspeciales(activeFilters)
        } else {
             setFiltrosEspeciales([])
        }
      } catch (error) {
        console.error('Error loading filtros:', error)
        setFiltrosEspeciales([])
      }
    }
    
    loadFiltros()
    
    window.addEventListener('config-updated', loadConfig)
    window.addEventListener('categorias-updated', loadCategorias)
    window.addEventListener('filtros-updated', loadFiltros)

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'filtros-updated') {
        loadFiltros()
      } else if (e.key === 'categorias-updated') {
        loadCategorias()
      } else if (e.key === 'config-updated') {
        loadConfig()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('config-updated', loadConfig)
      window.removeEventListener('categorias-updated', loadCategorias)
      window.removeEventListener('filtros-updated', loadFiltros)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Cerrar menú al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProductsMenu(false)
        setExpandedCategory(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Ocultar/mostrar navbar en scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down y pasó los 100px
        setHideNavbar(true)
      } else {
        // Scrolling up
        setHideNavbar(false)
      }
      
      setLastScrollY(currentScrollY)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <>
      <div className={`sticky top-0 z-[1000000] transition-transform duration-300 ${hideNavbar ? '-translate-y-full' : 'translate-y-0'}`}>
        {/* AnnouncementSlider integrado - Scroll continuo */}
        {mensajes.length > 0 && (
          <div className="bg-black text-white py-4 overflow-hidden relative w-full border-b border-gray-800">
            <div className="announcement-scroll">
              <div className="announcement-content">
                {mensajes.map((mensaje, index) => (
                  <span key={`msg-1-${index}`} className="announcement-item text-[11px] font-medium uppercase tracking-[0.2em]">
                    {mensaje}
                  </span>
                ))}
                {/* Duplicar para loop infinito */}
                {mensajes.map((mensaje, index) => (
                  <span key={`msg-2-${index}`} className="announcement-item text-[11px] font-medium uppercase tracking-[0.2em]">
                    {mensaje}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navbar */}
        <nav className="bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Logo centrado */}
            <div className="flex justify-center items-center py-7 border-b border-gray-800">
              <Link href="/" prefetch={true} className="flex flex-col items-center gap-1">
                {logoUrl ? (
                  <img src={logoUrl} alt={nombreTienda} className="h-[62px] md:h-[80px] object-contain" />
                ) : (
                  <div className="text-center">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl md:text-4xl font-bold tracking-[0.3em] text-white">URBAN</span>
                    </div>
                    <span className="text-[11px] md:text-sm font-light tracking-[0.3em] text-gray-400 uppercase">Streetwear • Urban • Fits</span>
                  </div>
                )}
              </Link>
            </div>
            
            {/* Menú de navegación - Desktop */}
            <div className="hidden md:flex items-center justify-center gap-10 py-5 relative">
              {/* Inicio */}
              <Link 
                href="/" 
                className="flex items-center gap-2 text-white text-sm font-medium hover:text-gray-300 transition uppercase tracking-wider"
              >
                <Home className="w-4 h-4" />
                Inicio
              </Link>
            
            {/* Menú desplegable de Productos */}
            <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowProductsMenu(!showProductsMenu)}
                  className="flex items-center gap-1 text-white text-sm font-medium hover:text-gray-300 transition uppercase tracking-wider"
                >
                  Productos
                  <ChevronDown className={`w-4 h-4 transition-transform ${showProductsMenu ? 'rotate-180' : ''}`} />
                </button>
              
              <AnimatePresence>
                {showProductsMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black border border-gray-800 rounded-2xl shadow-xl p-4 min-w-[560px] z-[999999]"
                  >
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/50 mb-3 text-center">Categorías</div>
                        <div className="space-y-1">
                          <Link 
                            href="/productos"
                            prefetch={true}
                            onClick={() => setShowProductsMenu(false)}
                            className="block px-4 py-2 rounded-lg bg-white text-black text-sm font-bold uppercase tracking-wider text-center"
                          >
                            Todos los Productos
                          </Link>
                          {categorias.map((cat) => (
                            <div key={cat.id}>
                              <Link 
                                href={`/productos?categoria=${cat.slug}`}
                                prefetch={true}
                                onClick={() => setShowProductsMenu(false)}
                                className="block px-4 py-2 rounded-lg text-white/90 hover:bg-gray-800 text-sm font-medium uppercase tracking-wider text-center"
                              >
                                {cat.nombre}
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/50 mb-3 text-center">Filtros</div>
                        <div className="space-y-1">
                          {filtrosEspeciales.map((filtro) => (
                            <Link
                              key={filtro.id}
                              href={`/productos?filter=${filtro.clave}`}
                              onClick={() => setShowProductsMenu(false)}
                              className="block px-4 py-2 rounded-lg text-white/90 hover:bg-gray-800 text-sm font-medium uppercase tracking-wider text-center"
                            >
                              {filtro.nombre}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
              {/* Filtros especiales */}
              {filtrosEspeciales.map((filtro) => {
                let iconElement = null
                // Priorizar icono configurado en Admin
                if (filtro.imagen_url) {
                  iconElement = <img src={filtro.imagen_url} alt={filtro.nombre} className="w-4 h-4" />
                } else if (filtro.icono) {
                  iconElement = <span className="text-sm">{filtro.icono}</span>
                } else if (filtro.clave === 'descuentos') {
                  iconElement = <img src="/Discount Icon.gif" alt="Descuento" className="w-4 h-4" />
                } else if (filtro.clave === 'nuevos') {
                  iconElement = <img src="/New label.gif" alt="Nuevo" className="w-4 h-4" />
                } else if (filtro.clave === 'proximamente') {
                  iconElement = <img src="/Fire.gif" alt="Próximamente" className="w-4 h-4" />
                } else {
                  iconElement = <span className="text-sm">🏷️</span>
                }
                
                return (
                  <Link 
                    key={filtro.id}
                    href={`/productos?filter=${filtro.clave}`} 
                    className="flex items-center gap-2 text-white text-sm font-medium hover:text-gray-300 transition uppercase tracking-wider"
                  >
                    {iconElement}
                    {filtro.nombre}
                  </Link>
                )
              })}
            
              
              {/* Carrito con badge verde */}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 hover:bg-gray-800 rounded-full transition ml-4"
              >
                <ShoppingCart className="w-5 h-5 text-white" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#B7FF2A] text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setShowMusic(!showMusic)}
                className="relative p-2 hover:bg-gray-800 rounded-full transition"
              >
                <Music2 className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Botón hamburguesa móvil */}
            <div className="flex md:hidden items-center justify-between py-3">
              <button
                aria-label="Abrir menú"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 border border-gray-800 rounded-lg text-white hover:bg-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm.75 4.5a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                aria-label="Abrir música"
                onClick={() => setShowMusic(!showMusic)}
                className="p-2 ml-2 border border-gray-800 rounded-lg text-white hover:bg-gray-800"
              >
                <Music2 className="w-5 h-5" />
              </button>
            </div>
            
            {/* Panel de menú móvil */}
            {showMobileMenu && (
              <div className="md:hidden bg-black border border-gray-800 rounded-xl p-3 space-y-2">
                <Link href="/" prefetch={true} onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 text-white text-sm rounded hover:bg-gray-800">Inicio</Link>
                <Link href="/productos" prefetch={true} onClick={() => setShowMobileMenu(false)} className="block px-3 py-2 text-white text-sm rounded hover:bg-gray-800">Todos los Productos</Link>
                <div className="border-t border-gray-800 my-1" />
                {categorias.map((cat) => (
                  <div key={cat.id}>
                    <Link
                      href={`/productos?categoria=${cat.slug}`}
                      onClick={() => setShowMobileMenu(false)}
                      className="block px-3 py-2 text-white text-sm rounded hover:bg-gray-800"
                    >
                      {cat.nombre}
                    </Link>
                    {cat.subcategorias && cat.subcategorias.length > 0 && (
                      <div className="pl-3">
                        {cat.subcategorias.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/productos?categoria=${cat.slug}&subcategoria=${sub.slug}`}
                            onClick={() => setShowMobileMenu(false)}
                            className="block px-3 py-2 text-gray-300 text-sm rounded hover:bg-gray-800 hover:text-white"
                          >
                            {sub.nombre}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {filtrosEspeciales.length > 0 && <div className="border-t border-gray-800 my-1" />}
                {filtrosEspeciales.map((filtro) => {
                  let iconElement = null
                  if (filtro.clave === 'descuentos') {
                    iconElement = <Image src="/Discount Icon.gif" alt="Descuento" width={20} height={20} className="w-5 h-5" unoptimized />
                  } else if (filtro.clave === 'nuevos') {
                    iconElement = <Image src="/New label.gif" alt="Nuevo" width={20} height={20} className="w-5 h-5" unoptimized />
                  } else if (filtro.clave === 'proximamente') {
                    iconElement = <Image src="/Fire.gif" alt="Próximamente" width={20} height={20} className="w-5 h-5" unoptimized />
                  } else {
                    iconElement = <span className="text-base">{filtro.icono}</span>
                  }

                  return (
                    <Link
                      key={filtro.id}
                      href={`/productos?filter=${filtro.clave}`}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-white text-sm rounded hover:bg-gray-800"
                    >
                      {iconElement}
                      <span className="text-sm font-medium uppercase tracking-wide">{filtro.nombre}</span>
                    </Link>
                  )
                })}
              </div>
            )}
      </div>
    </nav>
  </div>

  {showCart && <Cart onClose={() => setShowCart(false)} />}
  <MusicPanel open={showMusic} onClose={() => setShowMusic(false)} />
</>
  )
}
