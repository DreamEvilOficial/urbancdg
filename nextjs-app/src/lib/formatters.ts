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
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value

  const str = String(value).replace(/[$\s]/g, '').trim()
  if (!str) return 0

  // Si tiene coma, asumo formato 1.234,56
  if (str.includes(',')) {
    const clean = str.replace(/\./g, '').replace(/,/g, '.')
    const num = Number(clean)
    return isNaN(num) ? 0 : num
  }

  // Si tiene puntos
  if (str.includes('.')) {
    const dotCount = (str.match(/\./g) || []).length
    const endsInThree = /\.\d{3}$/.test(str)

    // Si tiene más de un punto o termina en .XXX, asumo miles (20.000 -> 20000)
    if (dotCount > 1 || endsInThree) {
      const clean = str.replace(/\./g, '')
      const num = Number(clean)
      return isNaN(num) ? 0 : num
    }
  }

  // Formato estándar
  const num = Number(str)
  return isNaN(num) ? 0 : num
}
