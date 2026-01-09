import { useState } from 'react'
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react'
import { Producto } from '@/lib/supabase'
import NextImage from 'next/image'

interface ProductListProps {
  productos: Producto[]
  categorias: any[]
  onEdit: (producto: Producto) => void
  onDelete: (id: string) => void
  onNew: () => void
}

export default function ProductList({ productos, categorias, onEdit, onDelete, onNew }: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [stockFilter, setStockFilter] = useState('todos') // todos, bajo, agotado
  const [statusFilter, setStatusFilter] = useState('todos') // todos, activos, inactivos

  const filteredProducts = (productos || []).filter(p => {
    if (!p || !p.nombre) return false;
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'todos' || p.categoria_id === categoryFilter
    
    let matchesStock = true
    if (stockFilter === 'bajo') matchesStock = (p.stock_actual || 0) > 0 && (p.stock_actual || 0) < 5
    if (stockFilter === 'agotado') matchesStock = (p.stock_actual || 0) <= 0
    
    let matchesStatus = true
    if (statusFilter === 'activos') matchesStatus = !!p.activo
    if (statusFilter === 'inactivos') matchesStatus = !p.activo

    return matchesSearch && matchesCategory && matchesStock && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="font-display text-3xl tracking-[0.08em] uppercase text-white">
          Productos <span className="text-white/40 text-base font-sans font-black tracking-[0.25em]">({productos.length})</span>
        </h1>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-5 py-3 bg-accent text-ink rounded-2xl transition shadow-[0_18px_50px_-30px_rgba(183,255,42,0.6)] hover:brightness-95 active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.28em]">Nuevo Producto</span>
        </button>
      </div>

      {/* Filtros Avanzados */}
      <div className="bg-[#06070c]/70 backdrop-blur-2xl p-6 rounded-[28px] shadow-[0_30px_100px_-70px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/45 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm font-bold focus:border-accent/40 transition outline-none"
            />
          </div>
          <button
            onClick={() => {
              setSearchTerm('')
              setCategoryFilter('todos')
              setStockFilter('todos')
              setStatusFilter('todos')
            }}
            className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.35em] text-white/45 hover:text-white transition"
          >
            Limpiar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-white/45 tracking-[0.35em] px-1">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs font-bold outline-none cursor-pointer focus:border-accent/40 transition appearance-none"
            >
              <option value="todos">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-white/45 tracking-[0.35em] px-1">Nivel de Stock</label>
            <div className="flex gap-2">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'bajo', label: 'Bajo Stock' },
                { id: 'agotado', label: 'Sin Stock' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setStockFilter(opt.id)}
                  className={`flex-1 py-3 px-2 rounded-2xl text-[9px] font-black uppercase tracking-tighter border transition-all ${
                    stockFilter === opt.id ? 'bg-white text-black border-white' : 'bg-white/[0.02] text-white/55 border-white/10 hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-white/45 tracking-[0.35em] px-1">Estado</label>
            <div className="flex gap-2">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'activos', label: 'En Venta' },
                { id: 'inactivos', label: 'Pausados' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setStatusFilter(opt.id)}
                  className={`flex-1 py-3 px-2 rounded-2xl text-[9px] font-black uppercase tracking-tighter border transition-all ${
                    statusFilter === opt.id ? 'bg-white text-black border-white' : 'bg-white/[0.02] text-white/55 border-white/10 hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Premium */}
      <div className="bg-[#06070c]/70 backdrop-blur-2xl rounded-[34px] border border-white/10 shadow-[0_30px_120px_-80px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/[0.03]">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-white/45 uppercase tracking-[0.35em]">Producto</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-white/45 uppercase tracking-[0.35em]">Tipo</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-white/45 uppercase tracking-[0.35em]">Precio Venta</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-white/45 uppercase tracking-[0.35em]">Disponibilidad</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-white/45 uppercase tracking-[0.35em]">Estado</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-white/45 uppercase tracking-[0.35em]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((producto) => (
                  <tr key={producto.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl overflow-hidden shadow-sm border border-white/10 flex-shrink-0 bg-white/[0.02] relative">
                          <NextImage 
                            className="h-full w-full object-cover transition group-hover:scale-110" 
                            src={producto.imagen_url || '/placeholder.png'} 
                            alt={producto.nombre} 
                            fill
                            sizes="56px"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white transition">{producto.nombre}</div>
                          <div className="text-[10px] font-black text-white/45 uppercase tracking-[0.35em]">{producto.sku || 'SIN-REF'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.32em] rounded-full bg-white/[0.03] text-white/60 border border-white/10">
                        {categorias.find(c => c.id === producto.categoria_id)?.nombre || 'General'}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white">${producto.precio.toLocaleString()}</span>
                        {producto.precio_original && (
                          <span className="text-[10px] text-white/35 line-through font-bold">${producto.precio_original.toLocaleString()}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      {producto.stock_actual <= 0 ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Agotado</span>
                          <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="w-0 h-full bg-red-500" />
                          </div>
                        </div>
                      ) : producto.stock_actual < 10 ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-black text-orange-500">{producto.stock_actual}</span>
                             <span className="text-[8px] font-black text-orange-400 uppercase">Bajo Stock</span>
                          </div>
                          <div className="w-20 h-1 bg-orange-500/15 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${(producto.stock_actual / 10) * 100}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-black text-emerald-400">{producto.stock_actual} unid.</span>
                          <div className="w-20 h-1 bg-emerald-500/15 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-emerald-500" />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        {producto.activo ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">En Venta</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span className="text-[9px] font-black uppercase text-white/45 tracking-widest">Pausado</span>
                          </div>
                        )}
                        {producto.destacado && (
                          <span className="w-fit px-2 py-0.5 text-[8px] font-black bg-accent text-ink rounded-full uppercase tracking-[0.3em]">Destacado</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <button 
                          onClick={() => onEdit(producto)}
                          className="w-10 h-10 flex items-center justify-center bg-white/[0.02] border border-white/10 rounded-xl text-white/55 hover:text-white hover:border-white/20 transition-all"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(producto.id)}
                          className="w-10 h-10 flex items-center justify-center bg-white/[0.02] border border-white/10 rounded-xl text-white/55 hover:text-red-300 hover:border-red-400/40 transition-all font-bold"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center border border-white/10">
                        <Filter className="w-8 h-8 text-white/15" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">No se encontraron productos</p>
                        <p className="text-[10px] font-black text-white/45 uppercase tracking-[0.35em] mt-1">Intenta ajustando los filtros de búsqueda</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
