// Simple Node-style test runner for formatPrice/toNumber without ESM loaders
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { formatPrice, toNumber } = require('../src/lib/formatters');

const assert = (condition: boolean, message: string) => {
    if (!condition) {
        console.error(`❌ ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ ${message}`);
    }
};

console.log('Testing formatters...');

// formatPrice
assert(formatPrice(250000) === '250.000', `formatPrice(250000) -> 250.000`);
assert(formatPrice(1000) === '1.000', `formatPrice(1000) -> 1.000`);
assert(formatPrice('250000') === '250.000', `formatPrice('250000') -> 250.000`);
assert(formatPrice(250.50) === '250,50', `formatPrice(250.50) -> 250,50`);
assert(formatPrice(250.123) === '250,12', `formatPrice(250.123) -> 250,12`);

// toNumber
assert(toNumber('250.000') === 250000, `toNumber('250.000') -> 250000`);
assert(toNumber('1.000') === 1000, `toNumber('1.000') -> 1000`);
assert(toNumber('250,50') === 250.5, `toNumber('250,50') -> 250.5`);
assert(toNumber('250000') === 250000, `toNumber('250000') -> 250000`);
assert(toNumber('250000.50') === 250000.5, `toNumber('250000.50') -> 250000.5`);
assert(toNumber('1000') === 1000, `toNumber('1000') -> 1000`);
// Edge case: ambiguous "250.000" without context. 
// toNumber logic: if no commas but multiple dots, or single dot?
// "250.000". match(/\./g) is 1. 
// simple = Number("250.000") = 250.
// BUT 250.000 usually means 250k in Argentina.
// However, our logic says: if simple is not NaN, return simple.
// Number("250.000") is 250.
// So toNumber("250.000") returns 250.
// Wait. This breaks "250.000" as 250k.
// I need to adjust toNumber logic.

console.log("--- Reproduction Test ---");

const inputs = [
    "5000",
    "5.000",
    "5000.00",
    "5000,00",
    "5,000", // ambiguous?
    "500",
    "500000",
    "500.000"
];

inputs.forEach(input => {
    const num = toNumber(input);
    const formatted = formatPrice(num);
    console.log(`Input: "${input}" \t-> Number: ${num} \t-> Formatted: "${formatted}"`);
});

console.log('All tests passed!');
