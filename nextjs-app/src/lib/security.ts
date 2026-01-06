/**
 * Utilidades de Seguridad
 * Funciones para sanitización, validación y protección contra ataques comunes
 */

/**
 * Sanitiza texto para prevenir XSS
 * Elimina tags HTML y caracteres peligrosos
 */
export function sanitizeText(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Sanitiza HTML para prevenir inyección de scripts
 * Permite solo tags seguros básicos
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''
  
  // Lista blanca de tags permitidos
  const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'span']
  
  // Remover scripts y eventos
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    
  return cleaned
}

/**
 * Valida email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida teléfono (formato internacional)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{8,20}$/
  return phoneRegex.test(phone)
}

/**
 * Valida URL
 */
export function validateURL(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Sanitiza URL para prevenir inyección
 */
export function sanitizeURL(url: string): string {
  if (!url) return ''
  
  // Permitir solo http, https y mailto
  if (!/^(https?:\/\/|mailto:)/.test(url)) {
    return ''
  }
  
  // Remover javascript: y data:
  if (/^(javascript:|data:)/i.test(url)) {
    return ''
  }
  
  return url
}

/**
 * Valida y sanitiza precio
 */
export function sanitizePrice(price: string | number): number {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  
  if (isNaN(numPrice) || numPrice < 0) {
    return 0
  }
  
  // Limitar a 2 decimales
  return Math.round(numPrice * 100) / 100
}

/**
 * Valida y sanitiza stock
 */
export function sanitizeStock(stock: string | number): number {
  const numStock = typeof stock === 'string' ? parseInt(stock, 10) : stock
  
  if (isNaN(numStock) || numStock < 0) {
    return 0
  }
  
  return Math.floor(numStock)
}

/**
 * Sanitiza nombre de archivo para prevenir path traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255)
}

/**
 * Genera un token aleatorio seguro
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return token
}

/**
 * Rate limiting simple (almacenamiento en memoria)
 * Para producción, usar Redis o similar
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return { allowed: true, remaining: maxRequests - 1 }
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }
  
  record.count++
  return { allowed: true, remaining: maxRequests - record.count }
}

/**
 * Limpia el rate limit store periódicamente
 */
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, 60000)
}

/**
 * Valida estructura de objeto JSON de forma segura
 */
export function validateJSON(json: string, maxDepth: number = 10): any {
  try {
    const parsed = JSON.parse(json)
    
    // Verificar profundidad para prevenir ataques de recursión
    function checkDepth(obj: any, depth: number = 0): boolean {
      if (depth > maxDepth) return false
      
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (!checkDepth(obj[key], depth + 1)) {
            return false
          }
        }
      }
      
      return true
    }
    
    if (!checkDepth(parsed)) {
      throw new Error('JSON depth exceeded')
    }
    
    return parsed
  } catch (error) {
    return null
  }
}

/**
 * Previene timing attacks en comparación de strings
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}

/**
 * Sanitiza datos del localStorage
 */
export function sanitizeLocalStorage(key: string): any {
  try {
    const data = localStorage.getItem(key)
    if (!data) return null
    
    const parsed = validateJSON(data)
    return parsed
  } catch (error) {
    console.error('Error sanitizing localStorage:', error)
    return null
  }
}

/**
 * Guarda datos en localStorage de forma segura
 */
export function secureLocalStorageSet(key: string, value: any): boolean {
  try {
    // Validar tamaño para prevenir ataques de storage
    const stringified = JSON.stringify(value)
    if (stringified.length > 5 * 1024 * 1024) { // 5MB limit
      console.error('Data too large for localStorage')
      return false
    }
    
    localStorage.setItem(key, stringified)
    return true
  } catch (error) {
    console.error('Error saving to localStorage:', error)
    return false
  }
}
