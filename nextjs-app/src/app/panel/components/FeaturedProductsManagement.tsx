'use client'

import { useState, useEffect } from 'react'
import { Search, Star, TrendingUp, Sparkles, Clock } from 'lucide-react'
import { Producto } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function FeaturedProductsManagement() {
  const [products, setProducts] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data || [])
    } catch (error) {
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  async function toggleField(id: string, field: string, currentValue: boolean) {
    try {
      // Optimistic update
      setProducts(products.map(p => p.id === id ? { ...p, [field]: !currentValue } : p))
      
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentValue })
      })
      
      if (!res.ok) throw new Error('Error al actualizar')
      toast.success('Actualizado correctamente')
    } catch (error) {
      // Revert optimistic update
      setProducts(products.map(p => p.id === id ? { ...p, [field]: currentValue } : p))
      toast.error('Error al actualizar')
    }
  }

  const filteredProducts = products.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) return <div className="text-white p-8">Cargando productos...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-black uppercase text-white tracking-widest">Categorización</h1>
            <p className="text-white/50 text-xs">Gestiona etiquetas y visibilidad de productos</p>
        </div>
        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
           <input 
             type="text" 
             placeholder="Buscar producto..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
           />
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-white font-black uppercase tracking-wider text-[10px]">
                <tr>
                <th className="p-4">Producto</th>
                <th className="p-4 text-center">Destacado</th>
                <th className="p-4 text-center">Top</th>
                <th className="p-4 text-center">Nuevo</th>
                <th className="p-4 text-center">Próximamente</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {filteredProducts.map(product => {
                    // Check logic for fallback image to match ProductCard logic roughly
                    const img = product.imagen_url || (product.imagenes && product.imagenes.length > 0 ? product.imagenes[0] : '/proximamente.png')
                    
                    return (
                    <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                                <img src={img} className="w-full h-full object-cover" alt="" onError={(e) => (e.currentTarget.src = '/proximamente.png')} />
                            </div>
                            <div>
                                <div className="font-bold text-white text-xs uppercase line-clamp-1">{product.nombre}</div>
                                <div className="text-[10px] opacity-50 font-mono">{product.sku || 'SIN SKU'}</div>
                            </div>
                        </div>
                        </td>
                        <td className="p-4 text-center">
                        <button 
                            onClick={() => toggleField(product.id, 'destacado', !!product.destacado)} 
                            className={`p-2 rounded-lg transition-all active:scale-95 ${product.destacado ? 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_15px_-5px_rgba(250,204,21,0.5)]' : 'text-white/20 hover:text-white/50 hover:bg-white/5'}`}
                            title="Alternar Destacado"
                        >
                            <Star className="w-5 h-5" fill={product.destacado ? "currentColor" : "none"} />
                        </button>
                        </td>
                        <td className="p-4 text-center">
                        <button 
                            onClick={() => toggleField(product.id, 'top', !!product.top)} 
                            className={`p-2 rounded-lg transition-all active:scale-95 ${product.top ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_15px_-5px_rgba(168,85,247,0.5)]' : 'text-white/20 hover:text-white/50 hover:bg-white/5'}`}
                            title="Alternar Top Product"
                        >
                            <TrendingUp className="w-5 h-5" />
                        </button>
                        </td>
                        <td className="p-4 text-center">
                        <button 
                            onClick={() => toggleField(product.id, 'nuevo_lanzamiento', !!(product as any).nuevo_lanzamiento)} 
                            className={`p-2 rounded-lg transition-all active:scale-95 ${(product as any).nuevo_lanzamiento ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_-5px_rgba(74,222,128,0.5)]' : 'text-white/20 hover:text-white/50 hover:bg-white/5'}`}
                            title="Alternar Nuevo Lanzamiento"
                        >
                            <Sparkles className="w-5 h-5" />
                        </button>
                        </td>
                        <td className="p-4 text-center">
                        <button 
                            onClick={() => toggleField(product.id, 'proximo_lanzamiento', !!(product as any).proximo_lanzamiento)} 
                            className={`p-2 rounded-lg transition-all active:scale-95 ${(product as any).proximo_lanzamiento ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_15px_-5px_rgba(96,165,250,0.5)]' : 'text-white/20 hover:text-white/50 hover:bg-white/5'}`}
                            title="Alternar Próximamente"
                        >
                            <Clock className="w-5 h-5" />
                        </button>
                        </td>
                    </tr>
                )})}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}
