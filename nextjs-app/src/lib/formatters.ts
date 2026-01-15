export const formatPrice = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '0'
  
  const numberValue = typeof value === 'string' 
    ? Number(value.replace(/\./g, '').replace(/,/g, '.')) 
    : value

  if (isNaN(numberValue)) return '0'

  return numberValue.toLocaleString('es-AR', {
    minimumFractionDigits: numberValue % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })
}

export const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // Si contiene comas, es formato es-AR con decimales (1.234,56)
    if (value.includes(',')) {
      const n = Number(value.replace(/\./g, '').replace(/,/g, '.'))
      return Number.isNaN(n) ? 0 : n
    }
    
    // Si tiene múltiples puntos, es formato es-AR de miles (1.234.567)
    if ((value.match(/\./g) || []).length > 1) {
      const n = Number(value.replace(/\./g, ''))
      return Number.isNaN(n) ? 0 : n
    }

    // Si tiene un solo punto
    if (value.includes('.')) {
      // Si termina en .XXX, asumimos que es separador de miles (ej: 250.000)
      // Esta es la convención común en Argentina para precios enteros
      if (/\.\d{3}$/.test(value)) {
        const n = Number(value.replace(/\./g, ''))
        return Number.isNaN(n) ? 0 : n
      }
      
      // Si no termina en .XXX, asumimos que es punto decimal estándar (ej: 250000.00 o 10.5)
      const n = Number(value)
      return Number.isNaN(n) ? 0 : n
    }

    // Si no tiene puntos ni comas
    const n = Number(value)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}
