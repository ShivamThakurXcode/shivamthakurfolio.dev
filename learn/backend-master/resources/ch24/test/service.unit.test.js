import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { makeOrderService } from '../src/order.service.js';
import { memoryUow } from '../src/repos.memory.js';
import { SEED } from '../support/helpers.js';

const fixedClock = () => new Date('2026-11-13T10:00:00Z');
const ids = () => { let n = 0; return () => `order-${++n}`; };

describe('order service with in-memory fakes (fast, no I/O)', () => {
  const build = () => { const uow = memoryUow(SEED); return { products: uow.products, orders: uow.orders, svc: makeOrderService({ uow, clock: fixedClock, newId: ids() }) }; };
  test('creates an order with snapshot prices and correct totals', async () => {
    const { svc } = build();
    const o = await svc.create({ userId: 1, items: [{ productId: 2, qty: 10 }, { productId: 1, qty: 1 }] });
    assert.equal(o.id, 'order-1'); assert.equal(o.createdAt.toISOString(), '2026-11-13T10:00:00.000Z');
    assert.deepEqual(o.items.map((i) => i.productId), [1, 2]);          // sorted: deadlock-free lock order (Ch 16)
    assert.equal(o.subtotal, 27000); assert.equal(o.shipping, 4000); assert.equal(o.total, 31000);
  });
  test('rejects an empty order', async () => { await assert.rejects(build().svc.create({ userId: 1, items: [] }), { code: 'EMPTY_ORDER' }); });
  test('out of stock -> DomainError and no order stored', async () => {
    const { svc, orders } = build();
    await assert.rejects(svc.create({ userId: 1, items: [{ productId: 3, qty: 2 }] }), { code: 'OUT_OF_STOCK' });
    assert.equal((await orders.all()).length, 0);
  });
});

describe('the same service with a MOCK repository (interaction testing)', () => {
  test('calls decrementStock with the right arguments', async () => {
    const products = { decrementStock: mock.fn(async () => ({ id: 1, priceMinor: 12000 })) };
    const orders = { create: mock.fn(async (o) => o) };
    const svc = makeOrderService({ uow: { run: (fn) => fn({ products, orders }) }, clock: fixedClock, newId: ids() });
    await svc.create({ userId: 1, items: [{ productId: 1, qty: 2 }] });
    assert.equal(products.decrementStock.mock.callCount(), 1);
    assert.deepEqual(products.decrementStock.mock.calls[0].arguments, [1, 2]);
    assert.equal(orders.create.mock.callCount(), 1);
  });
});
