import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../src/app.js';
import { makeOrderService } from '../src/order.service.js';
import { pgUow } from '../src/repos.pg.js';
import { testDb, SEED, seedPg } from '../support/helpers.js';

describe('POST /orders (real HTTP, real PostgreSQL)', () => {
  let db, server, base;
  before(async () => {
    db = await testDb('api');
    const svc = makeOrderService({ uow: pgUow(db.pool) });
    server = await new Promise((r) => { const s = makeApp(svc).listen(0, () => r(s)); });
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => { server.close(); await db.close(); });
  beforeEach(async () => { await db.pool.query('TRUNCATE order_items, orders, products CASCADE'); await seedPg(db.pool); });
  const post = (body) => fetch(base + '/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  test('201 and the stored totals match', async () => {
    const r = await post({ userId: 1, items: [{ productId: 1, qty: 2 }] });
    assert.equal(r.status, 201);
    const { id, total } = await r.json();
    assert.equal(total, 24000 + 4000);
    const { rows: [o] } = await db.pool.query('SELECT total_minor FROM orders WHERE id = $1', [id]);
    assert.equal(o.total_minor, total);
  });
  test('400 on a malformed body', async () => { assert.equal((await post({ userId: 'x', items: 5 })).status, 400); });
  test('409 when out of stock, and nothing is persisted', async () => {
    const r = await post({ userId: 1, items: [{ productId: 3, qty: 2 }] });
    assert.equal(r.status, 409);
    assert.equal((await db.pool.query('SELECT count(*)::int n FROM orders')).rows[0].n, 0);
  });
  test('a failed multi-item order restores the stock of the other items (transaction)', async () => {
    await post({ userId: 1, items: [{ productId: 1, qty: 1 }, { productId: 3, qty: 5 }] });      // product 1 ok, product 3 out of stock
    const { rows: [p1] } = await db.pool.query('SELECT stock FROM products WHERE id = 1');
    assert.equal(p1.stock, 5, 'stock for product 1 should be restored when the order fails');
  });
  test('concurrent buyers never oversell the last backpack', async () => {
    const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => post({ userId: i + 1, items: [{ productId: 3, qty: 1 }] })));
    assert.deepEqual(rs.map((r) => r.status).sort(), [201, ...Array(9).fill(409)]);
  });
});
