'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, DollarSign, Calendar, RefreshCcw, User, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

interface Deuda {
  id: string
  cliente_nombre: string
  cliente_apellido: string
  cliente_dni: string
  cliente_celular: string
  cliente_direccion: string
  total_deuda: number
  historial: any[]
  created_at: string
}

export default function DebtManagement() {
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // New Client Form
  const [formData, setFormData] = useState({
    cliente_nombre: '',
    cliente_apellido: '',
    cliente_dni: '',
    cliente_celular: '',
    cliente_direccion: ''
  })

  // Transaction Form (Add Debt/Payment)
  const [transactionData, setTransactionData] = useState({
    monto: '',
    descripcion: '',
    tipo: 'deuda' // 'deuda' | 'pago'
  })
  const [selectedClient, setSelectedClient] = useState<Deuda | null>(null)

  useEffect(() => {
    fetchDeudas()
  }, [])

  async function fetchDeudas() {
    try {
      const { data, error } = await supabase.from('deudas').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setDeudas(data || [])
    } catch (error) {
      console.error('Error:', error)
      // toast.error('No se pudo cargar la tabla de deudas. ¿Existe en Supabase?')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { data, error } = await supabase.from('deudas').insert([{
        ...formData,
        total_deuda: 0,
        historial: []
      }]).select().single()

      if (error) throw error
      setDeudas([data, ...deudas])
      setShowForm(false)
      setFormData({ cliente_nombre: '', cliente_apellido: '', cliente_dni: '', cliente_celular: '', cliente_direccion: '' })
      toast.success('Cliente registrado')
    } catch (error) {
      toast.error('Error al crear cliente')
    }
  }

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClient) return
    
    const amount = Number(transactionData.monto)
    if (isNaN(amount) || amount <= 0) return toast.error('Monto inválido')

    const newHistoryItem = {
      id: uuidv4(),
      tipo: transactionData.tipo,
      monto: amount,
      descripcion: transactionData.descripcion,
      fecha: new Date().toISOString()
    }

    const newTotal = transactionData.tipo === 'deuda' 
      ? selectedClient.total_deuda + amount 
      : selectedClient.total_deuda - amount

    try {
      const { error } = await supabase.from('deudas').update({
        total_deuda: newTotal,
        historial: [newHistoryItem, ...(selectedClient.historial || [])]
      }).eq('id', selectedClient.id)

      if (error) throw error

      setDeudas(deudas.map(d => d.id === selectedClient.id ? { 
        ...d, 
        total_deuda: newTotal, 
        historial: [newHistoryItem, ...(d.historial || [])] 
      } : d))

      setSelectedClient(null)
      setTransactionData({ monto: '', descripcion: '', tipo: 'deuda' })
      toast.success('Movimiento registrado')
    } catch (error) {
      toast.error('Error al actualizar saldo')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Borrar este historial de deuda permanentemente?')) return
    try {
      await supabase.from('deudas').delete().eq('id', id)
      setDeudas(deudas.filter(d => d.id !== id))
      toast.success('Eliminado')
    } catch (e) {
      toast.error('Error al eliminar')
    }
  }

  const filteredDeudas = deudas.filter(d => 
    d.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.cliente_apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.cliente_dni.includes(searchTerm)
  )

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-widest flex items-center gap-3">
             <DollarSign className="w-8 h-8 text-green-500" />
             Gestión de Deudas
          </h1>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Control de cuentas corrientes y fiados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-accent text-ink px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2">
           <Plus className="w-4 h-4" />
           Nuevo Cliente
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateClient} className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4">
           <input required placeholder="Nombre" value={formData.cliente_nombre} onChange={e => setFormData({...formData, cliente_nombre: e.target.value})} className="bg-black/20 border border-white/10 p-3 rounded-lg text-white text-sm" />
           <input placeholder="Apellido" value={formData.cliente_apellido} onChange={e => setFormData({...formData, cliente_apellido: e.target.value})} className="bg-black/20 border border-white/10 p-3 rounded-lg text-white text-sm" />
           <input placeholder="DNI" value={formData.cliente_dni} onChange={e => setFormData({...formData, cliente_dni: e.target.value})} className="bg-black/20 border border-white/10 p-3 rounded-lg text-white text-sm" />
           <input placeholder="Celular" value={formData.cliente_celular} onChange={e => setFormData({...formData, cliente_celular: e.target.value})} className="bg-black/20 border border-white/10 p-3 rounded-lg text-white text-sm" />
           <input placeholder="Dirección" value={formData.cliente_direccion} onChange={e => setFormData({...formData, cliente_direccion: e.target.value})} className="bg-black/20 border border-white/10 p-3 rounded-lg text-white text-sm col-span-1 md:col-span-2" />
           <button type="submit" className="col-span-1 md:col-span-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg uppercase text-xs tracking-widest transition-colors">Guardar Ficha</button>
        </form>
      )}

      {/* Main List */}
      <div className="space-y-4">
         <div className="bg-white/5 p-4 rounded-xl flex items-center gap-3 border border-white/5">
            <Search className="w-5 h-5 text-white/30" />
            <input 
               type="text" 
               placeholder="Buscar por nombre, apellido o DNI..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="bg-transparent outline-none text-white w-full placeholder:text-white/30 font-medium" 
            />
         </div>

         {loading ? <div className="text-center py-10 opacity-30">Cargando cuentas...</div> : (
            <div className="grid gap-4">
               {filteredDeudas.map(client => (
                 <div key={client.id} className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
                    <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 cursor-pointer" onClick={() => setExpandedId(expandedId === client.id ? null : client.id)}>
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${client.total_deuda > 0 ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                             {client.cliente_nombre.charAt(0)}
                          </div>
                          <div>
                             <h3 className="font-bold text-lg text-white">{client.cliente_nombre} {client.cliente_apellido}</h3>
                             <div className="flex items-center gap-3 text-xs text-white/40 font-mono mt-1">
                                <span>{client.cliente_celular}</span>
                                <span>•</span>
                                <span>{client.cliente_dni}</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                             <p className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-1">Saldo Actual</p>
                             <p className={`text-2xl font-black tracking-tighter ${client.total_deuda > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                ${client.total_deuda.toLocaleString()}
                             </p>
                          </div>
                          {expandedId === client.id ? <ChevronUp className="w-5 h-5 text-white/30" /> : <ChevronDown className="w-5 h-5 text-white/30" />}
                       </div>
                    </div>

                    {/* Expandable Section */}
                    {expandedId === client.id && (
                       <div className="border-t border-white/5 bg-black/20 p-6 animate-in slide-in-from-top-2">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                             {/* Data */}
                             <div className="space-y-6"> 
                                <div className="bg-white/5 p-4 rounded-xl space-y-2">
                                   <p className="text-xs text-white/50"><span className="font-bold text-white uppercase tracking-widest text-[10px] mr-2">Dirección:</span> {client.cliente_direccion || 'No registrada'}</p>
                                   <p className="text-xs text-white/50"><span className="font-bold text-white uppercase tracking-widest text-[10px] mr-2">Alta:</span> {new Date(client.created_at).toLocaleDateString()}</p>
                                </div>
                                
                                <div className="flex gap-2">
                                  <button onClick={() => { setSelectedClient(client); setTransactionData({ ...transactionData, tipo: 'deuda' }) }} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors">
                                    + Agregar Deuda
                                  </button>
                                  <button onClick={() => { setSelectedClient(client); setTransactionData({ ...transactionData, tipo: 'pago' }) }} className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors">
                                    Register Pago
                                  </button>
                                  <button onClick={() => handleDelete(client.id)} className="px-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-red-400 rounded-lg transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>

                                {selectedClient?.id === client.id && (
                                   <div className="bg-accent/10 border border-accent/20 p-4 rounded-xl mt-4 animate-in fade-in">
                                      <h4 className="font-black text-accent text-xs uppercase tracking-widest mb-3">
                                        {transactionData.tipo === 'deuda' ? 'Nueva Cuenta / Fiado' : 'Registrar Pago'}
                                      </h4>
                                      <div className="space-y-3">
                                         <input autoFocus type="number" placeholder="Monto ($)" value={transactionData.monto} onChange={e => setTransactionData({...transactionData, monto: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-white font-mono" />
                                         <input type="text" placeholder="Descripción (Producto, fecha, nota...)" value={transactionData.descripcion} onChange={e => setTransactionData({...transactionData, descripcion: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-white" />
                                         <div className="flex gap-2 justify-end">
                                            <button onClick={() => setSelectedClient(null)} className="text-xs text-white/50 hover:text-white px-3 py-2 font-bold uppercase">Cancelar</button>
                                            <button onClick={handleTransaction} className="bg-accent text-ink px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:brightness-110">Confirmar</button>
                                         </div>
                                      </div>
                                   </div>
                                )}
                             </div>

                             {/* History */}
                             <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                <h4 className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2 sticky top-0 bg-[#05060a] py-2 z-10">Historial de Movimientos</h4>
                                {client.historial && client.historial.map((h: any, idx: number) => (
                                   <div key={h.id || idx} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                                      <div>
                                         <p className="text-sm font-medium text-white">{h.descripcion || 'Sin descripción'}</p>
                                         <p className="text-[10px] text-white/40">{new Date(h.fecha).toLocaleString()}</p>
                                      </div>
                                      <span className={`font-mono font-bold ${h.tipo === 'deuda' ? 'text-red-400' : 'text-green-400'}`}>
                                         {h.tipo === 'deuda' ? '+' : '-'}${Number(h.monto).toLocaleString()}
                                      </span>
                                   </div>
                                ))}
                                {(!client.historial || client.historial.length === 0) && (
                                   <p className="text-white/20 text-sm italic text-center py-4">Sin historial registrado</p>
                                )}
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
               ))}
            </div>
         )}
      </div>
    </div>
  )
}
