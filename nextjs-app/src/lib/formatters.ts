export const formatPrice = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '0'
  
  const numberValue = typeof value === 'string' 
    ? toNumber(value)
    : value

  if (isNaN(numberValue)) return '0'

  return numberValue.toLocaleString('es-AR', {
    minimumFractionDigits: numberValue % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })
}

export const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value

  let str = String(value).trim()
  if (!str) return 0

  // Eliminar símbolos de moneda y espacios
  str = str.replace(/[$\s]/g, '')

  // Lógica estricta para formato Argentina (1.234,56)
  // 1. Si hay coma, es el separador decimal.
  // 2. Si hay puntos, son separadores de miles.
  
  // Si encontramos (1.234,56) o (1,50)
  if (str.includes(',')) {
    // Eliminar puntos (miles) y reemplazar coma por punto (decimal JS)
    str = str.replace(/\./g, '').replace(',', '.')
  } else {
    // Si NO hay coma, asumimos que los puntos son miles (1.234 -> 1234)
    // Excepción: Si el usuario escribe formato americano puro (1.5) sin coma...
    // Pero en AR "1.500" es mil quinientos. "1.5" es raro, pero asumiremos miles si hay punto.
    // Si el usuario quiere decimales, DEBE usar coma.
    str = str.replace(/\./g, '')
  }

  const num = Number(str)
  return isNaN(num) ? 0 : num
}
