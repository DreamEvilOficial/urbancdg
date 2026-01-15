
'use client'

import { useState } from 'react'
import { andreaniService, AndreaniLabelData } from '@/services/andreaniService'
import toast from 'react-hot-toast'
import { Printer, Download, Package, Truck, AlertCircle, FileText } from 'lucide-react'

interface ShippingLabelGeneratorProps {
  order: any
  onLabelGenerated?: (trackingNumber: string) => void
}

export default function ShippingLabelGenerator({ order, onLabelGenerated }: ShippingLabelGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [labelData, setLabelData] = useState<AndreaniLabelData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Validate Address (Mock)
      const zip = order.codigo_postal || '0000'
      const isValid = await andreaniService.validateAddress(order.direccion_envio || '', zip)
      
      if (!isValid) {
        throw new Error('La dirección o código postal no son válidos para Andreani.')
      }

      // 2. Generate Label Data
      const data = await andreaniService.generateLabel(order)
      setLabelData(data)
      toast.success('Etiqueta generada correctamente')
      
      if (onLabelGenerated) {
        onLabelGenerated(data.trackingNumber)
      }

    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow && labelData) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Etiqueta Andreani - ${labelData.trackingNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .label-container { 
                border: 2px solid #000; 
                width: 400px; 
                height: 600px; 
                padding: 20px; 
                display: flex; 
                flex-direction: column; 
                justify-content: space-between;
              }
              .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
              .logo { font-weight: bold; font-size: 24px; }
              .section { margin-bottom: 15px; }
              .label { font-size: 10px; text-transform: uppercase; color: #666; }
              .value { font-size: 14px; font-weight: bold; }
              .big-value { font-size: 18px; font-weight: bold; }
              .barcode { text-align: center; margin-top: 20px; }
              .barcode-bars { height: 50px; background: repeating-linear-gradient(to right, #000, #000 2px, #fff 2px, #fff 4px); width: 80%; margin: 0 auto; }
              .footer { border-top: 2px solid #000; padding-top: 10px; font-size: 10px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="label-container">
              <div class="header">
                <div class="logo">Andreani</div>
                <div class="value">ESTANDAR</div>
              </div>
              
              <div class="section">
                <div class="label">Destinatario</div>
                <div class="big-value">${labelData.receiver.name}</div>
                <div class="value">${labelData.receiver.address}</div>
                <div class="value">${labelData.receiver.city}, CP: ${labelData.receiver.zip}</div>
                <div class="value">Tel: ${labelData.receiver.phone || '-'}</div>
              </div>

              <div class="section">
                <div class="label">Remitente</div>
                <div class="value">${labelData.sender.name}</div>
                <div class="value">${labelData.sender.address}</div>
                <div class="value">${labelData.sender.city}, CP: ${labelData.sender.zip}</div>
              </div>

              <div class="section">
                <div class="label">Detalle Paquete</div>
                <div class="value">${labelData.package.description}</div>
                <div class="value">Peso: ${labelData.package.weight} kg</div>
              </div>

              <div class="barcode">
                <div class="barcode-bars"></div>
                <div class="value">${labelData.trackingNumber}</div>
              </div>
              
              <div class="footer">
                Generado por Urban CDG System - ${new Date().toLocaleDateString()}
              </div>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[24px] mt-6">
      <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.32em] mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4" /> Etiqueta de Envío
      </h3>

      {!labelData ? (
        <div className="space-y-4">
            <p className="text-xs text-white/60 leading-relaxed">
                Genera una etiqueta de envío estandarizada para Andreani con los datos del cliente.
            </p>
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                    <p className="text-xs text-red-300">{error}</p>
                </div>
            )}
            <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3 bg-accent text-ink hover:bg-accent/90 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                    <>
                        <Truck className="w-4 h-4" /> Generar Etiqueta Andreani
                    </>
                )}
            </button>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-4 rounded-xl text-black">
                <div className="border-2 border-black p-3 flex flex-col gap-2 opacity-80 select-none pointer-events-none scale-[0.98]">
                    <div className="flex justify-between items-center border-b border-black pb-2">
                        <span className="font-bold text-lg">Andreani</span>
                        <span className="font-mono text-xs">{labelData.trackingNumber}</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase text-gray-500">Destinatario</p>
                        <p className="font-bold text-sm">{labelData.receiver.name}</p>
                        <p className="text-xs">{labelData.receiver.address}</p>
                    </div>
                    <div className="h-8 bg-black/10 mt-2 flex items-center justify-center text-[10px] tracking-widest font-mono">
                        ||| ||||| || |||| |||
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={handlePrint}
                    className="py-3 bg-white text-black hover:bg-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                    <Printer className="w-4 h-4" /> Imprimir
                </button>
                 <button 
                    onClick={handlePrint} // Uses same print logic which allows save as PDF
                    className="py-3 bg-white/[0.05] text-white hover:bg-white/[0.1] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                    <Download className="w-4 h-4" /> PDF
                </button>
            </div>
            
             <button 
                onClick={() => setLabelData(null)}
                className="w-full py-2 text-white/30 hover:text-white/50 text-[10px] uppercase tracking-widest transition-colors"
            >
                Generar Nueva
            </button>
        </div>
      )}
    </div>
  )
}
