import { formatPrice, toNumber } from '../src/lib/formatters'

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error(`❌ ${message}`)
    process.exit(1)
  } else {
    console.log(`✅ ${message}`)
  }
}

console.log('Testing formatters...')

assert(formatPrice(250000) === '250.000', `formatPrice(250000) -> 250.000`)
assert(formatPrice(1000) === '1.000', `formatPrice(1000) -> 1.000`)
assert(formatPrice('250000') === '250.000', `formatPrice('250000') -> 250.000`)
assert(formatPrice(250.5) === '250,50', `formatPrice(250.5) -> 250,50`)
assert(formatPrice(250.12) === '250,12', `formatPrice(250.12) -> 250,12`)

assert(toNumber('250.000') === 250000, `toNumber('250.000') -> 250000`)
assert(toNumber('1.000') === 1000, `toNumber('1.000') -> 1000`)
assert(toNumber('250000') === 250000, `toNumber('250000') -> 250000`)
assert(toNumber('1000') === 1000, `toNumber('1000') -> 1000`)
assert(toNumber('2.000') === 2000, `toNumber('2.000') -> 2000`)

console.log('All tests passed!')
