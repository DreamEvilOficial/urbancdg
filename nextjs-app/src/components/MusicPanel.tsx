'use client'

import { useEffect, useRef, useState } from 'react'

type Track = { url: string; title?: string }

function getYouTubeId(url: string) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const parts = u.pathname.split('/')
      const idx = parts.findIndex((p) => p === 'embed')
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
    }
  } catch {}
  const m = url.match(/(?:v=|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : ''
}

export default function MusicPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        let parsed: Track[] = []
        if (Array.isArray(data.music_tracks)) parsed = data.music_tracks
        else if (typeof data.music_tracks === 'string') {
          try {
            const tmp = JSON.parse(data.music_tracks)
            if (Array.isArray(tmp)) parsed = tmp
          } catch {}
        }
        setTracks(parsed.filter((t) => t && typeof t.url === 'string' && t.url.trim().length > 0))
      } catch {}
    }
    load()
    window.addEventListener('config-updated', load)
    return () => window.removeEventListener('config-updated', load)
  }, [])

  useEffect(() => {
    const id = getYouTubeId(tracks[currentIndex]?.url || '')
    if (!id || !iframeRef.current) return
    if (!initialized) setInitialized(true)
  }, [tracks, currentIndex])

  useEffect(() => {
    if (!initialized) return
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
      '*',
    )
  }, [initialized])

  useEffect(() => {
    if (!iframeRef.current) return
    const v = muted ? 0 : volume
    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }),
      '*',
    )
  }, [volume, muted])

  useEffect(() => {
    const handler = () => {
      setMuted(false)
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
        '*',
      )
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [10] }),
        '*',
      )
      document.removeEventListener('pointerdown', handler)
    }
    document.addEventListener('pointerdown', handler, { once: true })
    return () => document.removeEventListener('pointerdown', handler)
  }, [initialized])

  function play() {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
      '*',
    )
  }
  function pause() {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
      '*',
    )
  }
  function next() {
    if (tracks.length === 0) return
    setCurrentIndex((p) => (p + 1) % tracks.length)
  }
  function prev() {
    if (tracks.length === 0) return
    setCurrentIndex((p) => (p - 1 + tracks.length) % tracks.length)
  }
  function toggleMute() {
    setMuted((m) => !m)
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: muted ? 'unMute' : 'mute', args: [] }),
      '*',
    )
  }

  const currentId = getYouTubeId(tracks[currentIndex]?.url || '')
  const src = currentId
    ? `https://www.youtube.com/embed/${currentId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
        typeof window !== 'undefined' ? window.location.origin : '',
      )}`
    : ''

  return (
    <div
      className={`fixed bottom-6 right-6 z-[1000001] transition-opacity ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className={`${compact ? 'w-[260px]' : 'w-[320px]'} rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/60">
            {tracks[currentIndex]?.title || 'Música'}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCompact(!compact)} className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/10">
              {compact ? 'Expandir' : 'Compactar'}
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white text-sm">✕</button>
          </div>
        </div>
        {!compact && (
          <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
            {src && <iframe ref={iframeRef} src={src} allow="autoplay" className="w-full h-full" />}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button onClick={prev} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs">Prev</button>
          <button onClick={play} className="px-3 py-2 rounded-lg bg-white text-black text-xs">Play</button>
          <button onClick={pause} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs">Pause</button>
          <button onClick={next} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs">Next</button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={toggleMute} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs">
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        {tracks.length > 1 && (
          <div className="mt-3">
            <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">Lista</div>
            <div className="space-y-1">
              {tracks.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs ${
                    i === currentIndex ? 'bg-white text-black' : 'bg-white/5 text-white'
                  }`}
                >
                  {t.title || t.url}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
