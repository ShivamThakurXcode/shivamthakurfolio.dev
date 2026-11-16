import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// A tiny hand-rolled mutation tester: change one operator at a time and see whether the suite notices.
const mutants = [
  ['pricing.js', 'subtotal >= FREE_SHIPPING_FROM_MINOR', 'subtotal > FREE_SHIPPING_FROM_MINOR', '>= becomes > (off-by-one at the free-shipping boundary)'],
  ['pricing.js', 'subtotal - discount + shipping', 'subtotal - discount - shipping', 'shipping subtracted instead of added'],
  ['pricing.js', 'Math.min(coupon.value, subtotal)', 'coupon.value', 'remove the cap on fixed coupons (the earlier real bug)'],
  ['pricing.js', 'Math.round((subtotal * coupon.value) / 100)', 'Math.floor((subtotal * coupon.value) / 100)', 'round -> floor'],
  ['pricing.js', "coupon?.type === 'percent'", "coupon?.type === 'percentage'", 'wrong coupon type string'],
  ['order.service.js', '.sort((a, b) => a.productId - b.productId)', '', 'stop sorting items (lock-order / deadlock rule)'],
  ['order.service.js', "throw new DomainError('OUT_OF_STOCK'", "throw new DomainError('OUT_OF_STOCKK'", 'typo in the error code'],
];
const run = (files) => spawnSync(process.execPath, ['--test', ...files], { encoding: 'utf8', timeout: 90000 }).status === 0;
const suites = {
  'examples only (5 tests)': ['test/examples-only.test.js'],
  'full suite (25 tests)': ['test/pricing.test.js', 'test/service.unit.test.js', 'test/contract.test.js', 'test/api.test.js'],
};
// build the weaker suite: the 5 example cases without properties
const full = fs.readFileSync('test/pricing.test.js', 'utf8');
fs.writeFileSync('test/examples-only.test.js', full.replace(/describe\('orderTotal: properties[\s\S]*$/, ''));

console.log('mutant'.padEnd(66), Object.keys(suites).map((s) => s.padEnd(26)).join(''));
const tally = Object.fromEntries(Object.keys(suites).map((k) => [k, 0]));
for (const [file, from, to, label] of mutants) {
  const path = `src/${file}`; const original = fs.readFileSync(path, 'utf8');
  if (!original.includes(from)) { console.log('MISSING PATTERN:', label); continue; }
  fs.writeFileSync(path, original.replace(from, to));
  const cells = [];
  try { for (const [name, files] of Object.entries(suites)) { const passed = run(files); if (!passed) tally[name]++; cells.push((passed ? 'SURVIVED (bad)' : 'killed').padEnd(26)); } }
  finally { fs.writeFileSync(path, original); }
  console.log(label.padEnd(66), cells.join(''));
}
console.log('mutation score:'.padEnd(66), Object.entries(tally).map(([k, v]) => `${v}/${mutants.length}`.padEnd(26)).join(''));
fs.unlinkSync('test/examples-only.test.js');
