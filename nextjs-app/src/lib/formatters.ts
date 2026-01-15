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

  const digits = String(value).replace(/[^0-9]/g, '')
  if (!digits) return 0

  return Number(digits)
}
