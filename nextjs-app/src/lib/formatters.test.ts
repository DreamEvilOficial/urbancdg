import { describe, it, expect } from 'vitest'
import { formatPrice, toNumber } from './formatters'

describe('formatters', () => {
  describe('formatPrice', () => {
    it('formats number to currency string with thousands separator', () => {
      expect(formatPrice(250000)).toBe('250.000')
      expect(formatPrice(1000)).toBe('1.000')
      expect(formatPrice(1234567)).toBe('1.234.567')
    })

    it('formats decimals correctly', () => {
      expect(formatPrice(250.5)).toBe('250,50')
      expect(formatPrice(250.123)).toBe('250,12')
    })

    it('handles strings gracefully', () => {
      expect(formatPrice('250000')).toBe('250.000')
      expect(formatPrice('250.000')).toBe('250.000')
    })
  })

  describe('toNumber', () => {
    it('converts formatted string to number', () => {
      expect(toNumber('250.000')).toBe(250000)
      expect(toNumber('1.000')).toBe(1000)
      expect(toNumber('1.234.567')).toBe(1234567)
    })

    it('converts decimal formatted string to number', () => {
      expect(toNumber('250,50')).toBe(250.5)
      expect(toNumber('250,5')).toBe(250.5)
      expect(toNumber('1.000,50')).toBe(1000.5)
    })

    it('converts raw string to number', () => {
      expect(toNumber('250000')).toBe(250000)
      expect(toNumber('250000.50')).toBe(250000.5)
      expect(toNumber('1000')).toBe(1000)
    })
  })
})
