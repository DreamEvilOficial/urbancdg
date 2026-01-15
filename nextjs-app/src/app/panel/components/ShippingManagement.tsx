
'use client'

import { useState } from 'react'
import { Truck, RotateCcw } from 'lucide-react'
import { paqarService } from '@/services/paqarService'
import toast from 'react-hot-toast'

export default function ShippingManagement() {
  const [loading, setLoading] = useState(false)
  const [senderData, setSenderData] = useState({
      nombre: 'Urban CDG Official',
      calle: 'Av. Corrientes',
      numero: '1234',
      localidad: 'CABA',
      provincia: 'CABA',
      cp: '1000'
  })
  
  const [testOrder, setTestOrder] = useState({
      cliente_nombre: 'Cliente Prueba',
      cliente_email: 'cliente@test.com',
      direccion_envio: 'Calle Falsa 123',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      codigo_postal: '2000',
      total: 10000
  })

  const [lastLabel, setLastLabel] = useState<any>(null)

  const handleTestGeneration = async () => {
      setLoading(true)
      try {
          // In a real scenario, we might want to update the service config with senderData
          // For now, paqarService mock uses hardcoded/mock data, but let's pretend we pass customizable sender
          const label = await paqarService.createShipment({
              ...testOrder,
              senderOverride: senderData 
          })
          setLastLabel(label)
          toast.success('Etiqueta de prueba generada con éxito')
      } catch (error) {
          toast.error('Error generando etiqueta')
      } finally {
          setLoading(false)
      }
  }

  const printLabel = () => {
      if (!lastLabel) return
      const printWindow = window.open('', '_blank')
      if (printWindow) {
          printWindow.document.write(paqarService.generateLabelHtml(lastLabel))
          printWindow.document.close()
      }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
          <Truck className="w-8 h-8 text-blue-500" />
          Gestión de <span className="text-blue-500">Envíos</span>
        </h2>
        <p className="text-white/40 text-xs font-mono mt-1">Configuración y pruebas de Correo Argentino (Paq.ar)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sender Configuration */}
          <section className="bg-white/[0.03] border border-white/10 p-6 rounded-[30px]">
              <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.2em] mb-6">Datos del Remitente (Origen)</h3>
              <div className="space-y-4">
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase">Nombre / Empresa</label>
                      <input 
                        type="text" 
                        value={senderData.nombre}
                        onChange={e => setSenderData({...senderData, nombre: e.target.value})}
                        className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-white/40 uppercase">Calle</label>
                          <input 
                            type="text" 
                            value={senderData.calle}
                            onChange={e => setSenderData({...senderData, calle: e.target.value})}
                            className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-white/40 uppercase">Altura</label>
                          <input 
                            type="text" 
                            value={senderData.numero}
                            onChange={e => setSenderData({...senderData, numero: e.target.value})}
                            className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
                          />
                      </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-white/40 uppercase">CP</label>
                          <input 
                            type="text" 
                            value={senderData.cp}
                            onChange={e => setSenderData({...senderData, cp: e.target.value})}
                            className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
                          />
                      </div>
                      <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-white/40 uppercase">Localidad</label>
                          <input 
                            type="text" 
                            value={senderData.localidad}
                            onChange={e => setSenderData({...senderData, localidad: e.target.value})}
                            className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-colors"
                          />
                      </div>
                  </div>
              </div>
          </section>

          {/* Test Label Generation */}
          <section className="bg-white/[0.03] border border-white/10 p-6 rounded-[30px]">
              <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.2em] mb-6">Prueba de Generación</h3>
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mb-6">
                  <p className="text-xs text-blue-200">
                      Esta sección permite verificar la conexión con la API de Paq.ar y previsualizar el diseño de la etiqueta.
                  </p>
              </div>

              <button 
                  onClick={handleTestGeneration}
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 mb-4"
              >
                  {loading ? 'Generando...' : 'Generar Etiqueta de Prueba'}
              </button>

              {lastLabel && (
                  <div className="bg-white p-4 rounded-xl text-black animate-in fade-in slide-in-from-top-2">
                       <div className="flex justify-between items-center border-b border-black/10 pb-2 mb-2">
                            <span className="font-bold text-blue-800 italic">Correo Argentino</span>
                            <span className="font-mono text-xs">{lastLabel.trackingNumber}</span>
                       </div>
                       <div className="text-xs space-y-1 mb-4">
                           <p><strong>Destino:</strong> {lastLabel.receiver.localidad}</p>
                           <p><strong>Remitente:</strong> {senderData.nombre}</p>
                       </div>
                       <button 
                         onClick={printLabel}
                         className="w-full py-2 border-2 border-black hover:bg-black hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                       >
                           Imprimir PDF
                       </button>
                  </div>
              )}
          </section>
      </div>
    </div>
  )
}
