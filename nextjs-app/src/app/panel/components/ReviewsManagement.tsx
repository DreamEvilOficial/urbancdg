'use client'

import { useState, useEffect } from 'react'
import { Star, Trash2, CheckCircle, XCircle, MessageSquare, FileText, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReviewsManagement() {
  // Reviews management component
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, avg: 0, pending: 0 })

  useEffect(() => {
    fetchReviews()
  }, [])

  async function fetchReviews() {
    try {
      const res = await fetch('/api/reviews?limit=all')
      if (!res.ok) throw new Error('Error al cargar reseñas')
      const data = await res.json()
      setReviews(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error fetching reviews:', error)
      toast.error('Error al cargar reseñas')
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(data: any[]) {
    const total = data.length
    const sum = data.reduce((acc, r) => acc + r.calificacion, 0)
    const avg = total > 0 ? (sum / total).toFixed(1) : '0.0'
    const pending = data.filter(r => !r.aprobado).length
    setStats({ total, avg: Number(avg), pending })
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta reseña permanentemente?')) return
    try {
      const res = await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      
      const newReviews = reviews.filter(r => r.id !== id)
      setReviews(newReviews)
      calculateStats(newReviews)
      toast.success('Reseña eliminada')
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  async function toggleApproval(id: string, currentStatus: boolean) {
    try {
      const res = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, aprobado: !currentStatus })
      })
      if (!res.ok) throw new Error('Error al actualizar')
      
      const newReviews = reviews.map(r => r.id === id ? { ...r, aprobado: !currentStatus } : r)
      setReviews(newReviews)
      calculateStats(newReviews)
      toast.success(currentStatus ? 'Reseña despublicada' : 'Reseña aprobada y publicada')
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/20 border-t-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-6 h-6 text-accent" />
                <h1 className="text-2xl font-black uppercase text-white tracking-widest">Gestión de Reseñas</h1>
            </div>
            <p className="text-xs text-white/50 uppercase tracking-wider">Modera y verifica las opiniones de tus clientes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Total</p>
                <p className="text-2xl font-black text-white">{stats.total}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Promedio</p>
                <div className="flex items-center gap-2">
                    <p className="text-2xl font-black text-yellow-500">{stats.avg}</p>
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
            </div>
            <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Pendientes</p>
                <p className={`text-2xl font-black ${stats.pending > 0 ? 'text-accent' : 'text-green-500'}`}>{stats.pending}</p>
            </div>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-white font-black uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-6">Producto</th>
                <th className="p-6">Cliente</th>
                <th className="p-6">Calificación</th>
                <th className="p-6">Comentario</th>
                <th className="p-6">Verificación</th>
                <th className="p-6 text-right">Estado</th>
                <th className="p-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      {review.producto_imagen ? (
                        <img src={review.producto_imagen} alt="" className="w-12 h-12 rounded-xl object-cover bg-white/5" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                            <span className="text-[8px]">NO IMG</span>
                        </div>
                      )}
                      <div>
                          <span className="block font-bold text-white text-xs uppercase mb-1">{review.producto_nombre || 'Producto Eliminado'}</span>
                          <span className="text-[10px] text-white/40 block">ID: {review.producto_id?.slice(0,8)}...</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-xs uppercase">{review.cliente_nombre || review.usuario_nombre || 'Anónimo'}</span>
                      <span className="text-[10px] opacity-50 mb-1">{review.cliente_email || review.usuario_email || '-'}</span>
                      <span className="text-[10px] text-white/30 font-mono">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= (review.calificacion || review.rating) ? 'fill-yellow-500 text-yellow-500' : 'text-white/10'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="p-6 max-w-xs">
                    <p className="text-xs italic opacity-80 line-clamp-3 leading-relaxed">&ldquo;{review.comentario}&rdquo;</p>
                  </td>
                  <td className="p-6">
                    <div className="space-y-2">
                        {review.verificado ? (
                            <div className="flex items-center gap-2 text-green-400">
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Compra Verificada</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-white/30">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">No Verificado</span>
                            </div>
                        )}
                        
                        {review.numero_orden && (
                            <div className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-1 rounded inline-block">
                                #{review.numero_orden}
                            </div>
                        )}

                        {review.comprobante_url && (
                            <a 
                                href={review.comprobante_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-[10px] font-bold text-accent hover:underline mt-1"
                            >
                                <FileText className="w-3 h-3" />
                                Ver Comprobante <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        review.aprobado 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    }`}>
                        {review.aprobado ? 'Publicado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => toggleApproval(review.id, review.aprobado)} 
                            className={`p-2 rounded-xl transition-all ${
                                review.aprobado 
                                ? 'hover:bg-yellow-500/20 text-yellow-500' 
                                : 'hover:bg-green-500/20 text-green-500 bg-white/5'
                            }`}
                            title={review.aprobado ? "Despublicar" : "Aprobar y Publicar"}
                        >
                            {review.aprobado ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button 
                            onClick={() => handleDelete(review.id)} 
                            className="p-2 hover:bg-red-500/20 rounded-xl text-white/30 hover:text-red-500 transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30">
                        <MessageSquare className="w-12 h-12 mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">No hay reseñas registradas</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
