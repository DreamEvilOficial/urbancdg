'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Star, Trash2, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReviewsManagement() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReviews()
  }, [])

  async function fetchReviews() {
    try {
      const { data, error } = await supabase
        .from('resenas')
        .select('*, productos(nombre, imagen_url)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setReviews(data || [])
    } catch (error) {
      console.error('Error fetching reviews:', error)
      // toast.error('Error al cargar reseñas')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta reseña?')) return
    try {
      const { error } = await supabase.from('resenas').delete().eq('id', id)
      if (error) throw error
      setReviews(reviews.filter(r => r.id !== id))
      toast.success('Reseña eliminada')
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  async function toggleVerified(id: string, current: boolean) {
    try {
      const { error } = await supabase.from('resenas').update({ verificada: !current }).eq('id', id)
      if (error) throw error
      setReviews(reviews.map(r => r.id === id ? { ...r, verificada: !current } : r))
      toast.success('Estado actualizado')
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  if (loading) return <div className="p-10 text-center">Cargando reseñas...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-black uppercase text-white tracking-widest">Gestión de Reseñas</h1>
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-white font-black uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Usuario / Fecha</th>
                <th className="p-4">Email</th>
                <th className="p-4">Calificación</th>
                <th className="p-4">Comentario</th>
                <th className="p-4 text-center">Verificada</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {review.productos?.imagen_url && (
                        <img src={review.productos.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/5" />
                      )}
                      <span className="font-bold text-white text-xs uppercase">{review.productos?.nombre || 'Producto Eliminado'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-xs">{review.usuario_nombre}</span>
                      <span className="text-[10px] opacity-50">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="p-4">
                     <span className="text-[10px] text-white/60 font-mono">{review.usuario_email || '-'}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-white/10'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="p-4 max-w-xs">
                    <p className="truncate text-xs italic opacity-80">&ldquo;{review.comentario}&rdquo;</p>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleVerified(review.id, review.verificada)} className="hover:scale-110 transition-transform">
                      {review.verificada ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-white/20 mx-auto" />}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(review.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-white/50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center opacity-30 uppercase text-xs font-black tracking-widest">
                    No hay reseñas registradas
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
