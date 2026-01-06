import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Tag, Eye, EyeOff, Save, Plus, Trash2, Edit2, X } from 'lucide-react'

interface FiltroEspecial {
  id: string
  nombre: string
  clave: string
  activo: boolean
  icono: string
  imagen_url?: string
  orden: number
}

export default function SpecialFiltersManagement() {
  const [filtros, setFiltros] = useState<FiltroEspecial[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  const [formData, setFormData] = useState<Partial<FiltroEspecial>>({
    nombre: '',
    clave: '',
    icono: '',
    imagen_url: '',
    activo: true,
    orden: 0
  })

  useEffect(() => {
    cargarFiltros()
  }, [])

  async function cargarFiltros() {
    try {
      const res = await fetch('/api/filters')
      const data = await res.json()
      setFiltros(data || [])
    } catch (error) {
      console.error('Error loading filters:', error)
      toast.error('Error al cargar filtros')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (isCreating) {
        const res = await fetch('/api/filters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        if (!res.ok) throw new Error('Error al crear')
        toast.success('Filtro creado')
      } else if (editingId) {
        const res = await fetch('/api/filters', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, id: editingId })
        })
        if (!res.ok) throw new Error('Error al actualizar')
        toast.success('Filtro actualizado')
      }
      
      setIsCreating(false)
      setEditingId(null)
      setFormData({ nombre: '', clave: '', imagen_url: '', activo: true, orden: 0 })
      cargarFiltros()
      window.dispatchEvent(new Event('filtros-updated'))
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  async function eliminarFiltro(id: string) {
    if (!confirm('¿Estás seguro de eliminar este filtro?')) return
    try {
      const res = await fetch(`/api/filters?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      
      toast.success('Filtro eliminado')
      cargarFiltros()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  const startEdit = (filtro: FiltroEspecial) => {
    setEditingId(filtro.id)
    setFormData(filtro)
    setIsCreating(false)
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Filtros Especiales</h1>
        <button
          onClick={() => { setIsCreating(true); setEditingId(null); setFormData({ nombre: '', clave: '', imagen_url: '', activo: true, orden: filtros.length }); }}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition font-bold"
        >
          <Plus className="w-4 h-4" /> Nuevo Filtro
        </button>
      </div>

      {(isCreating || editingId) && (
        <form onSubmit={handleSubmit} className="bg-[#06070c]/70 backdrop-blur-md border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white">{isCreating ? 'Crear Nuevo Filtro' : 'Editar Filtro'}</h3>
            <button type="button" onClick={() => { setIsCreating(false); setEditingId(null); }} className="text-white/60 hover:text-white"><X /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre (ej: HOT SALE)"
              value={formData.nombre}
              onChange={e => setFormData({...formData, nombre: e.target.value})}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              required
            />
            <input
              type="text"
              placeholder="Clave (ej: hot_sale)"
              value={formData.clave}
              onChange={e => setFormData({...formData, clave: e.target.value})}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              required
            />
            <input
              type="text"
              placeholder="Icono (emoji/texto, ej: 🔥 SALE)"
              value={formData.icono}
              onChange={e => setFormData({...formData, icono: e.target.value})}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
            <input
              type="text"
              placeholder="URL de GIF o Imagen"
              value={formData.imagen_url}
              onChange={e => setFormData({...formData, imagen_url: e.target.value})}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
            <input
              type="number"
              placeholder="Orden"
              value={formData.orden}
              onChange={e => setFormData({...formData, orden: parseInt(e.target.value)})}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
          </div>
          <button type="submit" className="w-full bg-white text-black font-bold py-2 rounded-lg hover:bg-gray-200 transition">
            <Save className="w-4 h-4 inline mr-2" /> Guardar Filtro
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtros.map(filtro => (
          <div key={filtro.id} className={`bg-white/5 rounded-xl shadow-lg border p-6 backdrop-blur-sm ${filtro.activo ? 'border-green-500/30' : 'border-white/10'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                  {filtro.imagen_url ? (
                    <img src={filtro.imagen_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl">{filtro.icono || '🏷️'}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white">{filtro.nombre}</h3>
                  <code className="text-xs bg-white/10 text-white/60 px-1 rounded">/{filtro.clave}</code>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(filtro)} className="p-1 hover:bg-white/10 rounded text-white/80 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => eliminarFiltro(filtro.id)} className="p-1 hover:bg-red-500/20 text-red-400 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
