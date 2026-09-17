'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface Props { title?: string }
export default function DynamicTitle({ title: override }: Props) {
  const [title, setTitle] = useState(override || 'Levit')
  const pathname = usePathname()

  useEffect(() => {
    async function loadTitle() {
      try {
        if (override) {
          setTitle(override)
          document.title = override
          return
        }
        const res = await fetch('/api/config')
        const data = await res.json()
        const raw = String(data.nombre_tienda || '').trim()
        const storeName = raw && !/berta/i.test(raw) ? raw : 'Levit'
        setTitle(storeName)
        document.title = storeName
      } catch (error) {
        console.error('Error loading title:', error)
      }
    }

    loadTitle()

    // Actualizar cuando cambie la configuración
    const handleConfigUpdate = () => loadTitle()
    window.addEventListener('config-updated', handleConfigUpdate)

    return () => {
      window.removeEventListener('config-updated', handleConfigUpdate)
    }
  }, [override, pathname])

  return null
}
