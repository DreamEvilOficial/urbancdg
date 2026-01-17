import { describe, it, expect } from 'vitest'

function isRecentlyUnlocked(desbloqueadoDesde: string | null | undefined, now: Date, daysWindow: number) {
  if (!desbloqueadoDesde) return false
  const unlockedDate = new Date(desbloqueadoDesde)
  const diff = now.getTime() - unlockedDate.getTime()
  if (diff < 0) return false
  const dayMs = 24 * 60 * 60 * 1000
  return diff <= daysWindow * dayMs
}

describe('unlock logic', () => {
  it('returns false when no date is provided', () => {
    const now = new Date()
    expect(isRecentlyUnlocked(null, now, 7)).toBe(false)
    expect(isRecentlyUnlocked(undefined, now, 7)).toBe(false)
  })

  it('returns true when within window', () => {
    const now = new Date('2024-01-08T00:00:00Z')
    const unlocked = '2024-01-05T00:00:00Z'
    expect(isRecentlyUnlocked(unlocked, now, 7)).toBe(true)
  })

  it('returns false when outside window', () => {
    const now = new Date('2024-01-20T00:00:00Z')
    const unlocked = '2024-01-01T00:00:00Z'
    expect(isRecentlyUnlocked(unlocked, now, 7)).toBe(false)
  })

  it('returns false when date is in the future', () => {
    const now = new Date('2024-01-01T00:00:00Z')
    const unlocked = '2024-01-05T00:00:00Z'
    expect(isRecentlyUnlocked(unlocked, now, 7)).toBe(false)
  })
})
