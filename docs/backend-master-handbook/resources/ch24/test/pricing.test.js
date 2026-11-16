import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { orderTotal } from '../src/pricing.js';

describe('orderTotal: examples', () => {
  const cases = [
    ['no coupon, below free-shipping threshold', { items: [{ qty: 2, unitPriceMinor: 8000 }] }, { subtotal: 16000, discount: 0, shipping: 4000, total: 20000 }],
    ['10% coupon rounds to nearest minor unit', { items: [{ qty: 1, unitPriceMinor: 1999 }], coupon: { type: 'percent', value: 10 } }, { subtotal: 1999, discount: 200, shipping: 4000, total: 5799 }],
    ['fixed coupon', { items: [{ qty: 1, unitPriceMinor: 30000 }], coupon: { type: 'fixed', value: 5000 } }, { subtotal: 30000, discount: 5000, shipping: 4000, total: 29000 }],
    ['free shipping exactly at the threshold (boundary)', { items: [{ qty: 1, unitPriceMinor: 50000 }] }, { subtotal: 50000, discount: 0, shipping: 0, total: 50000 }],
    ['one minor unit below the threshold', { items: [{ qty: 1, unitPriceMinor: 49999 }] }, { subtotal: 49999, discount: 0, shipping: 4000, total: 53999 }],
  ];
  for (const [name, input, expected] of cases) test(name, () => assert.deepEqual(orderTotal(input), expected));
});

describe('orderTotal: properties (fast-check generates hundreds of inputs)', () => {
  const item = fc.record({ qty: fc.integer({ min: 1, max: 20 }), unitPriceMinor: fc.integer({ min: 0, max: 200000 }) });
  const coupon = fc.option(fc.oneof(
    fc.record({ type: fc.constant('percent'), value: fc.integer({ min: 0, max: 100 }) }),
    fc.record({ type: fc.constant('fixed'), value: fc.integer({ min: 0, max: 500000 }) })), { nil: null });
  const order = fc.record({ items: fc.array(item, { minLength: 1, maxLength: 6 }), coupon });

  test('the total is never negative', () => fc.assert(fc.property(order, (o) => orderTotal(o).total >= 0)));
  test('the discount never exceeds the subtotal', () => fc.assert(fc.property(order, (o) => { const r = orderTotal(o); return r.discount <= r.subtotal; })));
  test('every amount is an integer (no floating-point money)', () => fc.assert(fc.property(order, (o) => Object.values(orderTotal(o)).every(Number.isInteger))));
});
