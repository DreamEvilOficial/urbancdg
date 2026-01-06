'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Shield, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [attempts, setAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)

  // Protección anti-fuerza bruta local simple
  useEffect(() => {
    if (attempts >= 5) {
      setIsLocked(true)
      toast.error('Demasiados intentos. Espera un momento.')
      const timer = setTimeout(() => {
        setAttempts(0)
        setIsLocked(false)
      }, 30000) // 30 segundos de bloqueo
      return () => clearTimeout(timer)
    }
  }, [attempts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocked || loading) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Acceso concedido')
        router.push('/admin')
      } else {
        setAttempts(prev => prev + 1)
        toast.error(data.error || 'Credenciales incorrectas')
      }
    } catch (error) {
      toast.error('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-white selection:text-black">
      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[25%] -right-[10%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Card Minimalista */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
          {/* Línea de brillo superior */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-transform group-hover:scale-110 duration-500">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Acceso Privado</h1>
            <p className="text-gray-500 text-sm mt-2">URBAN • Gestión de Tienda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Usuario</label>
              <div className="relative group/input">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within/input:text-white transition-colors" />
                <input
                  type="text"
                  placeholder="Usuario"
                  className="w-full bg-white/5 border border-white/5 text-white pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all text-sm"
                  required
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  disabled={isLocked || loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within/input:text-white transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/5 text-white pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all text-sm"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLocked || loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLocked || loading}
              className="w-full mt-4 bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar al Panel
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {isLocked && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-pulse">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-[11px] text-red-500 font-medium">Acceso bloqueado temporalmente por seguridad.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 flex justify-center items-center gap-6 px-4">
          <div className="flex items-center gap-2 text-[10px] text-gray-600 font-medium uppercase tracking-[0.2em]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)] animate-pulse" />
            Servidor Seguro
          </div>
        </div>
      </div>
    </div>
  )
}
