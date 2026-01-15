export const formatPrice = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '0'
  
  const numberValue = typeof value === 'string' 
    ? Number(value.replace(/\./g, '').replace(/,/g, '.')) 
    : value

  if (isNaN(numberValue)) return '0'

  return numberValue.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

export const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value.replace(/\./g, '').replace(/,/g, '.'))
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}
