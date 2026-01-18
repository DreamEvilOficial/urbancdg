'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export default function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date()
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        })
      } else {
        setIsExpired(true)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  if (isExpired) {
    return (
      <div className="text-center">
        <span className="text-green-500 font-black text-lg tracking-widest">¡DISPONIBLE!</span>
      </div>
    )
  }

  return (
    <div className="w-full text-center">
      <div className="flex items-center justify-center gap-2 mb-2 text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">
        <Clock className="w-3 h-3" /> Lanzamiento en
      </div>
      <div className="grid grid-cols-4 gap-1">
        {[
          { label: 'DÍAS', value: timeLeft.days },
          { label: 'HRS', value: timeLeft.hours },
          { label: 'MIN', value: timeLeft.minutes },
          { label: 'SEG', value: timeLeft.seconds }
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center bg-white/5 rounded-lg p-1.5 border border-white/5">
            <span className="text-lg md:text-xl font-black text-white leading-none">
              {String(item.value).padStart(2, '0')}
            </span>
            <span className="text-[8px] font-bold text-white/40 mt-1">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
