/// <reference types="node" />
import { strict as assert } from 'assert'
import { toNumber, formatPrice } from './formatters'

function testToNumber() {
  assert.equal(toNumber('5000'), 5000)
  assert.equal(toNumber('5.000'), 5000)
  assert.equal(toNumber('50.000'), 50000)
  assert.equal(toNumber('500.000'), 500000)
  assert.equal(toNumber('5.000,50'), 5000.5)
  assert.equal(toNumber('5,50'), 5.5)
  assert.equal(toNumber(5000), 5000)
}

function testFormatPrice() {
  assert.equal(formatPrice(5000), '5.000')
  assert.equal(formatPrice(50000), '50.000')
  assert.equal(formatPrice(500000), '500.000')
  assert.equal(formatPrice(5000.5), '5.000,5')
  assert.equal(formatPrice('5000'), '5.000')
  assert.equal(formatPrice('5.000'), '5.000')
}

function run() {
  testToNumber()
  testFormatPrice()
  console.log('✔ formatters.test.ts: todas las pruebas pasaron')
}

run()
