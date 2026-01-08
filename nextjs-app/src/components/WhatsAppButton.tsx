'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'

export default function WhatsAppButton() {
  const [phone, setPhone] = useState('')

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        // Supongamos que el número está en 'mensaje_whatsapp_phone' o similar
        // Si no existe, usamos uno por defecto o buscamos en 'mensaje_whatsapp'
        setPhone('5491112345678') // Reemplazar con lógica real de config si existe
      } catch (error) {
        console.error('Error fetching WhatsApp config:', error)
      }
    }
    fetchConfig()
  }, [])

  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg shadow-black/40 hover:scale-110 transition-transform duration-300 group ring-1 ring-white/10"
      aria-label="Contactar por WhatsApp"
    >
      <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 group-hover:hidden"></div>
      <Image src="/whatsapp.png" alt="WhatsApp" width={32} height={32} className="object-contain" unoptimized />
    </a>
  )
}
