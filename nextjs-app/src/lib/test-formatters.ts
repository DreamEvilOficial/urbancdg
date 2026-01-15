import { toNumber, formatPrice } from './formatters.js';

const cases = [
  "50000",
  "50.000",
  "50,000",
  "50.000,00",
  "60000",
  "60.000",
  "1000",
  "1.000",
  "10.000",
  "1.500,50",
  "1,50"
];

console.log("Testing toNumber:");
cases.forEach(c => {
  console.log(`Input: "${c}" -> Output: ${toNumber(c)}`);
});

const formataCases = [50000, 60000, 1000, 10000, 1500.5];
console.log("\nTesting formatPrice:");
formataCases.forEach(c => {
  console.log(`Input: ${c} -> Output: "${formatPrice(c)}"`);
});
