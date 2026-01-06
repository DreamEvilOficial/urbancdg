'use client'

import { useEffect, useState } from 'react'

export default function Hero() {
  const [heroBannerUrl, setHeroBannerUrl] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config')
        const config = await res.json()
        if (config.hero_banner_url) {
          setHeroBannerUrl(config.hero_banner_url)
        }
      } catch (error) {
        console.error('Error loading config:', error)
      }
    }
    
    loadConfig()
    window.addEventListener('config-updated', loadConfig)
    
    return () => {
      window.removeEventListener('config-updated', loadConfig)
    }
  }, [])

  if (!mounted || !heroBannerUrl) return null

  return (
    <div className="w-full">
      <img 
        src={heroBannerUrl} 
        alt="Banner principal" 
        className="w-full h-auto object-cover"
      />
    </div>
  )
}
