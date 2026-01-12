// Logic to test
function calculateDiscountPercentage(originalPrice, finalPrice) {
  if (!originalPrice || originalPrice <= 0) return 0
  if (finalPrice < 0) return 0
  if (originalPrice <= finalPrice) return 0
  
  const discount = ((originalPrice - finalPrice) / originalPrice) * 100
  return Number(discount.toFixed(2))
}

function validatePrices(originalPrice, finalPrice) {
  if (finalPrice < 0) return { valid: false, error: 'El precio final no puede ser negativo' }
  if (originalPrice < 0) return { valid: false, error: 'El precio original no puede ser negativo' }
  if (originalPrice > 0 && finalPrice >= originalPrice) {
    return { valid: false, error: 'El precio original debe ser mayor al precio final para aplicar descuento' }
  }
  return { valid: true }
}

// Tests
console.log('Running Discount System Logic Verification...\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    passed++;
  } catch (e) {
    console.error(`❌ FAIL: ${description}`);
    console.error(e.message);
    failed++;
  }
}

// 1. Test Calculation Logic
test('Calculates discount correctly for standard values', () => {
  const result = calculateDiscountPercentage(100, 80);
  if (result !== 20.00) throw new Error(`Expected 20.00, got ${result}`);
});

test('Calculates discount correctly with decimals', () => {
  const result = calculateDiscountPercentage(100, 75.50);
  if (result !== 24.50) throw new Error(`Expected 24.50, got ${result}`);
});

test('Rounds to 2 decimal places', () => {
  const result = calculateDiscountPercentage(300, 200);
  if (result !== 33.33) throw new Error(`Expected 33.33, got ${result}`);
});

test('Returns 0 if original price is 0', () => {
  const result = calculateDiscountPercentage(0, 100);
  if (result !== 0) throw new Error(`Expected 0, got ${result}`);
});

test('Returns 0 if final price >= original price', () => {
  const result = calculateDiscountPercentage(100, 120);
  if (result !== 0) throw new Error(`Expected 0, got ${result}`);
});

// 2. Test Validation Logic
test('Validates valid price pair', () => {
  const { valid } = validatePrices(100, 80);
  if (!valid) throw new Error('Should be valid');
});

test('Invalidates negative prices', () => {
  const { valid } = validatePrices(100, -10);
  if (valid) throw new Error('Should invalidate negative final price');
});

test('Invalidates when final price > original price', () => {
  const { valid } = validatePrices(100, 150);
  if (valid) throw new Error('Should invalidate when final price is higher');
});

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);

if (failed > 0) process.exit(1);
