import { useState, useEffect } from 'react'
import { X, Upload, Plus, Trash2 } from 'lucide-react'
import { Producto, supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import NextImage from 'next/image'

interface ProductFormProps {
  producto?: Producto | null
  categorias: any[]
  etiquetas: any[]
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}

export default function ProductForm({ producto, categorias, etiquetas, onSave, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    precio_original: '',
    descuento_porcentaje: '',
    categoria_id: '',
    subcategoria_id: '',
    destacado: false,
    top: false,
    proximo_lanzamiento: false,
    nuevo_lanzamiento: false,
    imagen_url: '',
    imagenes: [] as string[],
    variantes: [] as Array<{talle: string, color: string, color_nombre: string, stock: number}>,
    sku: '',
    proveedor_nombre: '',
    proveedor_contacto: '',
    precio_costo: ''
  })

  useEffect(() => {
    if (producto) {
      setFormData({
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        precio: producto.precio?.toString() || '',
        precio_original: producto.precio_original?.toString() || '',
        descuento_porcentaje: producto.descuento_porcentaje?.toString() || '',
        categoria_id: producto.categoria_id || '',
        subcategoria_id: producto.subcategoria_id || '',
        destacado: producto.destacado || false,
        top: producto.top || false,
        proximo_lanzamiento: (producto as any).proximo_lanzamiento || false,
        nuevo_lanzamiento: (producto as any).nuevo_lanzamiento || false,
        imagen_url: producto.imagen_url || '',
        imagenes: producto.imagenes || [],
        variantes: (producto.variantes || []).map(v => ({
             ...v,
             color_nombre: v.color_nombre || v.color, // Fallback
             stock: v.stock || 0
        })),
        sku: (producto as any).sku || '',
        proveedor_nombre: producto.proveedor_nombre || '',
        proveedor_contacto: producto.proveedor_contacto || '',
        precio_costo: producto.precio_costo?.toString() || ''
      })
    }
  }, [producto])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', file)
      uploadData.append('folder', 'productos')

      const res = await fetch('/api/upload-image', { method: 'POST', body: uploadData })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Error al subir imagen')
      }
      
      const { url } = await res.json()
      
      const nuevasImagenes = [...formData.imagenes, url]
      setFormData({ 
        ...formData, 
        imagen_url: formData.imagen_url || url,
        imagenes: nuevasImagenes 
      })
      toast.success('Imagen subida correctamente')
    } catch (error: any) {
      console.error('Error uploading:', error)
      toast.error(error.message || 'Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Error al guardar producto')
    } finally {
      setLoading(false)
    }
  }

  // Variante form state
  const [newVariant, setNewVariant] = useState({ talle: '', color: '#000000', color_nombre: '', stock: '' })
  const [showVariantForm, setShowVariantForm] = useState(false)

  const commonColors = [
    { name: 'Negro', hex: '#000000' },
    { name: 'Blanco', hex: '#FFFFFF' },
    { name: 'Gris', hex: '#808080' },
    { name: 'Gris Melange', hex: '#BEBEBE' },
    { name: 'Azul Marino', hex: '#000080' },
    { name: 'Azul Francia', hex: '#0000FF' },
    { name: 'Rojo', hex: '#FF0000' },
    { name: 'Bordeaux', hex: '#800000' },
    { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Camel', hex: '#C19A6B' },
    { name: 'Marrón', hex: '#8B4513' },
    { name: 'Rosa', hex: '#FFC0CB' },
    { name: 'Fucsia', hex: '#FF00FF' },
    { name: 'Verde', hex: '#008000' },
    { name: 'Verde Militar', hex: '#4B5320' },
    { name: 'Amarillo', hex: '#FFFF00' },
    { name: 'Lila', hex: '#C8A2C8' }
  ]

  function addVariant() {
    if (!newVariant.talle || !newVariant.color || !newVariant.stock) {
      toast.error('Completa talle, color y stock')
      return
    }
    setFormData({
      ...formData,
      variantes: [...formData.variantes, { 
        talle: newVariant.talle, 
        color: newVariant.color, 
        color_nombre: newVariant.color_nombre || newVariant.color,
        stock: parseInt(newVariant.stock) 
      }]
    })
    setNewVariant({ talle: '', color: '#000000', color_nombre: '', stock: '' })
  }

  return (
    <div className="bg-black min-h-screen text-white">
      {/* Header Fijo */}
      <div className="sticky top-0 z-50 bg-[#06070c] border-b border-white/10 px-8 py-5 flex justify-between items-center shadow-sm shadow-black/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center font-bold">
            {producto ? 'EP' : 'NP'}
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Panel de Control</h2>
            <h1 className="text-xl font-bold text-white leading-tight">
              {producto ? 'Editando Producto' : 'Nuevo Producto / Registro'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
          >
            Atrás
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-2.5 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2 shadow-xl shadow-white/5"
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/20 border-t-black" /> : 'Guardar Producto'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-10">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Columna Izquierda: Info Principal */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Sección 1: Datos Básicos */}
            <div className="bg-[#06070c] rounded-[32px] p-8 border border-white/10 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Información General</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Nombre Comercial</label>
                  <input 
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    className="w-full bg-[#111] border border-white/5 p-4 rounded-2xl text-sm font-bold placeholder:text-white/20 focus:bg-black focus:border-white text-white transition-all outline-none"
                    required
                    placeholder="Ej: Campera Puffer 'North' Black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Código SKU</label>
                  <input 
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                    className="w-full bg-[#111] border border-white/5 p-4 rounded-2xl text-sm font-bold placeholder:text-white/20 focus:bg-black focus:border-white text-white transition-all outline-none"
                    placeholder="ELEG-PUFF-001"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Categoría</label>
                  <select
                    value={formData.categoria_id}
                    onChange={e => setFormData({...formData, categoria_id: e.target.value})}
                    className="w-full bg-[#111] border border-white/5 p-4 rounded-2xl text-sm font-bold focus:bg-black focus:border-white text-white transition-all outline-none"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Descripción del Producto</label>
                <textarea 
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full bg-[#111] border border-white/5 p-4 rounded-2xl text-sm font-bold placeholder:text-white/20 focus:bg-black focus:border-white text-white transition-all outline-none min-h-[120px]"
                  placeholder="Detalla materiales, calce y cuidados..."
                />
              </div>
            </div>

            {/* Nueva Sección: Proveedor y Costos */}
            <div className="bg-[#06070c] rounded-[32px] p-8 border border-white/10 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Proveedor y Análisis de Costos</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Nombre del Proveedor</label>
                  <input 
                    value={formData.proveedor_nombre}
                    onChange={e => setFormData({...formData, proveedor_nombre: e.target.value})}
                    className="w-full bg-[#111] border border-white/5 p-4 rounded-2xl text-sm font-bold focus:bg-black focus:border-white text-white transition-all outline-none"
                    placeholder="Ej: Textil Avellaneda"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Contacto / Redes</label>
                  <input 
                    value={formData.proveedor_contacto}
                    onChange={e => setFormData({...formData, proveedor_contacto: e.target.value})}
                    className="w-full bg-[#111] border border-white/5 p-4 rounded-2xl text-sm font-bold focus:bg-black focus:border-white text-white transition-all outline-none"
                    placeholder="WhatsApp, IG o Teléfono"
                  />
                </div>
              </div>

              <div className="p-6 bg-[#111] rounded-3xl border border-white/5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Costo de Compra (Unitario)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                      <input 
                        type="number"
                        value={formData.precio_costo}
                        onChange={e => setFormData({...formData, precio_costo: e.target.value})}
                        className="w-full bg-[#06070c] border border-transparent pl-8 pr-4 py-4 rounded-2xl text-sm font-bold focus:border-white text-white transition-all outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-end gap-2">
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Ganancia Estimada</label>
                    <div className="flex items-center gap-4">
                      {formData.precio && formData.precio_costo && Number(formData.precio_costo) > 0 ? (
                        <>
                          <div className="flex-1 bg-white text-black p-4 rounded-2xl flex flex-col">
                            <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Utilidad Neta</span>
                            <span className="text-lg font-black tracking-tight">
                              ${(Number(formData.precio) - Number(formData.precio_costo)).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex-1 bg-emerald-500 text-white p-4 rounded-2xl flex flex-col">
                            <span className="text-[8px] font-black uppercase text-gray-300 tracking-widest">Margen</span>
                            <span className="text-lg font-black tracking-tight">
                              {Math.round(((Number(formData.precio) - Number(formData.precio_costo)) / Number(formData.precio_costo)) * 100)}%
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 bg-white/5 p-4 rounded-2xl text-[10px] font-black uppercase text-gray-400 text-center tracking-widest">
                          Ingresa costo y precio para calcular
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Precios */}
            <div className="bg-[#06070c] rounded-[32px] p-8 border border-white/10 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Configuración de Precios</h3>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Precio Final</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                    <input 
                      type="number"
                      value={formData.precio}
                      onChange={e => {
                        const newPrecio = e.target.value
                        setFormData({...formData, precio: newPrecio})
                        if (formData.precio_original && Number(formData.precio_original) > 0) {
                          const descuento = Math.round(((Number(formData.precio_original) - Number(newPrecio)) / Number(formData.precio_original)) * 100)
                          setFormData(prev => ({...prev, precio: newPrecio, descuento_porcentaje: descuento.toString()}))
                        }
                      }}
                      className="w-full bg-[#111] border border-white/5 pl-8 pr-4 py-4 rounded-2xl text-sm font-bold focus:bg-black focus:border-white text-white transition-all outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">P. Original</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                    <input 
                      type="number"
                      value={formData.precio_original}
                      onChange={e => {
                        const newPrecioOriginal = e.target.value
                        setFormData({...formData, precio_original: newPrecioOriginal})
                        if (formData.precio && Number(formData.precio) > 0) {
                          const descuento = Math.round(((Number(newPrecioOriginal) - Number(formData.precio)) / Number(newPrecioOriginal)) * 100)
                          setFormData(prev => ({...prev, precio_original: newPrecioOriginal, descuento_porcentaje: descuento.toString()}))
                        }
                      }}
                      className="w-full bg-[#111] border border-white/5 pl-8 pr-4 py-4 rounded-2xl text-sm font-bold focus:bg-black focus:border-white text-white transition-all outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Descuento</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={formData.descuento_porcentaje}
                      readOnly
                      className="w-full bg-white/5 border border-transparent px-4 py-4 rounded-2xl text-sm font-black text-emerald-400 outline-none cursor-not-allowed"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-black">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Variantes y Stock */}
            <div className="bg-[#06070c] rounded-[32px] p-8 border border-white/10 shadow-sm space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Stock y Variantes</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVariantForm(!showVariantForm)}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-gray-200 transition"
                >
                  {showVariantForm ? 'Cerrar' : 'Agregar variante'}
                </button>
              </div>

              {showVariantForm && (
                <div className="bg-[#111] rounded-[24px] p-6 border border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    
                    {/* Talle */}
                    <div className="lg:col-span-2">
                      <label className="block text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2 px-1">Talle</label>
                      <select
                        value={newVariant.talle}
                        onChange={e => setNewVariant({...newVariant, talle: e.target.value})}
                        className="w-full h-10 bg-[#06070c] border border-white/10 px-3 rounded-xl text-[11px] font-bold outline-none focus:border-white text-white transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Elegir...</option>
                        {['UNI', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44', '46'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Nombre Color */}
                    <div className="lg:col-span-4">
                      <label className="block text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2 px-1">Nombre Comercial Color</label>
                      <input 
                        type="text"
                        value={newVariant.color_nombre}
                        onChange={e => setNewVariant({...newVariant, color_nombre: e.target.value})}
                        className="w-full h-10 bg-[#06070c] border border-white/10 px-4 rounded-xl text-[11px] font-bold placeholder:text-white/20 text-white outline-none focus:border-white transition-all"
                        placeholder="Ej: Negro Carbon, Azul Noche..."
                      />
                    </div>

                    {/* Selector HEX */}
                    <div className="lg:col-span-3">
                      <label className="block text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2 px-1">Color HEX</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            type="text"
                            value={newVariant.color}
                            onChange={e => setNewVariant({...newVariant, color: e.target.value.toUpperCase()})}
                            className="w-full h-10 bg-[#06070c] border border-white/10 pl-10 pr-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-white transition-all"
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: newVariant.color }} />
                        </div>
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-[#06070c] flex-shrink-0">
                          <input 
                            type="color"
                            value={newVariant.color}
                            onChange={e => setNewVariant({...newVariant, color: e.target.value.toUpperCase()})}
                            className="absolute -inset-2 w-[150%] h-[150%] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="lg:col-span-2">
                      <label className="block text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2 px-1">Unidades</label>
                      <input 
                        type="number"
                        value={newVariant.stock}
                        onChange={e => setNewVariant({...newVariant, stock: e.target.value})}
                        className="w-full h-10 bg-[#06070c] border border-white/10 px-4 rounded-xl text-sm font-black text-white outline-none focus:border-white transition-all"
                        placeholder="0"
                      />
                    </div>

                    {/* Botón Add */}
                    <div className="lg:col-span-1">
                      <button
                        type="button"
                        onClick={() => { addVariant(); setShowVariantForm(false); }}
                        className="w-full h-10 bg-white text-black rounded-xl flex items-center justify-center hover:bg-gray-200 transition shadow-xl shadow-white/5 active:scale-95"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Biblioteca de Colores */}
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm">🎨</span>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Atajos de Colores Rápidos</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {commonColors.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setNewVariant({ ...newVariant, color: c.hex.toUpperCase(), color_nombre: c.name })}
                          className={`group relative h-8 px-3 rounded-lg border flex items-center gap-2 transition-all ${
                            newVariant.color.toUpperCase() === c.hex.toUpperCase() 
                              ? 'bg-white border-white text-black' 
                              : 'bg-[#06070c] border-white/10 hover:border-white/30 text-white'
                          }`}
                        >
                          <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} />
                          <span className="text-[9px] font-black uppercase tracking-tight">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Variantes en Inventario - Grid Mejorado */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-[10px] font-black uppercase text-gray-300 tracking-[0.3em]">Variantes en Inventario</h4>
                  <div className="h-px flex-1 mx-6 bg-white/5" />
                  <span className="text-[9px] font-black text-gray-400 uppercase bg-white/5 px-3 py-1 rounded-full">{formData.variantes.length} Variantes</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {formData.variantes.map((v, idx) => (
                    <div key={idx} className="bg-[#06070c] border border-white/10 p-5 rounded-[24px] flex items-center gap-4 hover:border-white transition-all group">
                      <div className="w-12 h-12 rounded-2xl bg-[#111] flex flex-col items-center justify-center border border-white/5 group-hover:bg-white group-hover:text-black transition-colors">
                        <span className="text-[7px] font-black uppercase opacity-40">Talle</span>
                        <span className="text-xs font-black">{v.talle}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: v.color }} />
                          <span className="text-[10px] font-black uppercase truncate tracking-tight text-white">{v.color_nombre}</span>
                        </div>
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none">{v.color}</span>
                      </div>
                      <div className="w-16">
                        <label className="block text-[7px] font-black text-gray-500 uppercase tracking-widest mb-1 text-center">Unid.</label>
                        <input 
                          type="number"
                          value={v.stock}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value)
                            const newVars = [...formData.variantes]
                            newVars[idx] = { ...newVars[idx], stock: val }
                            setFormData({ ...formData, variantes: newVars })
                          }}
                          className="w-full h-8 bg-[#111] rounded-lg text-center text-xs font-black outline-none focus:ring-1 focus:ring-white text-white transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newVars = formData.variantes.filter((_, i) => i !== idx)
                          setFormData({...formData, variantes: newVars})
                        }}
                        className="w-8 h-8 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {formData.variantes.length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-[32px]">
                      <div className="text-2xl mb-3 opacity-20 grayscale">🧥</div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Carga talles y colores para este producto</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Multimedia y Config */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Sección Multimedia */}
            <div className="bg-[#06070c] rounded-[32px] p-8 border border-white/10 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Galería de Imágenes</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {formData.imagenes.map((img, idx) => (
                  <div key={idx} className="relative group aspect-[3/4] rounded-2xl overflow-hidden border border-white/10">
                    <NextImage 
                      src={img} 
                      alt={`Imagen producto ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newImgs = formData.imagenes.filter((_, i) => i !== idx)
                          setFormData({
                            ...formData,
                            imagenes: newImgs,
                            imagen_url: idx === 0 && newImgs.length > 0 ? newImgs[0] : (newImgs.length > 0 ? formData.imagen_url : '')
                          })
                        }}
                        className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {idx === 0 && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-white text-black text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg">PORTADA</div>
                    )}
                  </div>
                ))}
                
                <label className="aspect-[3/4] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-white hover:bg-white/5 transition group">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-[#111] rounded-full flex items-center justify-center mb-2 group-hover:bg-white transition-colors">
                        <Upload className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
                      </div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white">Subir</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            {/* Sección Configuración */}
            <div className="bg-[#06070c] rounded-[32px] p-8 border border-white/10 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Visibilidad y Badges</h3>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'destacado', label: 'Destacado en Inicio', icon: '⭐' },
                  { id: 'top', label: 'Producto TOP👑', icon: '' },
                  { id: 'nuevo_lanzamiento', label: 'Nuevo Lanzamiento', icon: '✨' },
                  { id: 'proximo_lanzamiento', label: 'Preventa / Próximamente', icon: '🔒' }
                ].map((opt) => (
                  <label 
                    key={opt.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      (formData as any)[opt.id] ? 'bg-white border-white text-black' : 'bg-[#111] border-transparent hover:border-white/20 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{opt.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={(formData as any)[opt.id]}
                      onChange={e => setFormData({...formData, [opt.id]: e.target.checked})}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded-full border ${ (formData as any)[opt.id] ? 'bg-black border-black' : 'border-white/20'} flex items-center justify-center transition-colors`}>
                      {(formData as any)[opt.id] && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
