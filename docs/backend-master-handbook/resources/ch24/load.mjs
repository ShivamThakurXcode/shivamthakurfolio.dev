import autocannon from 'autocannon';
import pg from 'pg';
import { makeApp } from './src/app.js';
import { makeOrderService } from './src/order.service.js';
import { pgUow } from './src/repos.pg.js';
import { testDb } from './support/helpers.js';

const db = await testDb('load');
await db.pool.query(`INSERT INTO products VALUES (2, 'Gel Pen', 1500, 100000000)`);
for (const poolMax of [2, 20]) {
  const pool = new pg.Pool({ host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline', options: '-c search_path=t24_load', max: poolMax });
  const server = await new Promise((r) => { const s = makeApp(makeOrderService({ uow: pgUow(pool) })).listen(0, () => r(s)); });
  const url = `http://127.0.0.1:${server.address().port}/orders`;
  const r = await autocannon({ url, method: 'POST', connections: 50, duration: 6, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: 1, items: [{ productId: 2, qty: 1 }] }) });
  console.log(`pool max=${String(poolMax).padEnd(2)} | 50 concurrent clients, 6 s | ${Math.round(r.requests.average)} req/s | latency p50 ${r.latency.p50} ms  p97.5 ${r.latency.p97_5} ms  p99 ${r.latency.p99} ms  max ${r.latency.max} ms | 2xx ${r['2xx']}  non-2xx ${r.non2xx}  errors ${r.errors}`);
  server.close(); await pool.end();
}
console.log('orders created:', (await db.pool.query('SELECT count(*)::int n FROM orders')).rows[0].n, '| stock consumed:', 100000000 - (await db.pool.query('SELECT stock FROM products WHERE id=2')).rows[0].stock, '(must be equal: nothing lost or double-counted)');
await db.close();
