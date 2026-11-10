// Run order: node ch16-setup.mjs  then any lab. Needs: npm i pg, and the bmh-pg-test container (see Chapter 12).
import { pool, withTx, retry, sleep } from './ch16-lib.mjs';
const BUYERS = 50, STOCK = 10;
const reset = () => pool.query('UPDATE products SET stock = $1, version = 1 WHERE id = 1', [STOCK]);
const final = async () => (await pool.query('SELECT stock FROM products WHERE id = 1')).rows[0].stock;
async function run(label, buy) {
  await reset();
  const t = performance.now();
  const res = await Promise.allSettled(Array.from({ length: BUYERS }, () => buy()));
  const ok = res.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  const sorry = res.filter((r) => r.status === 'fulfilled' && r.value === false).length;
  const err = res.filter((r) => r.status === 'rejected');
  const codes = [...new Set(err.map((e) => e.reason.code ?? e.reason.message))].join(',');
  console.log(label.padEnd(34), `confirmed=${String(ok).padStart(2)} sold_out=${String(sorry).padStart(2)} errors=${err.length}${codes ? ` (${codes})` : ''}`.padEnd(52), `final_stock=${await final()}`.padEnd(15), `${(performance.now() - t).toFixed(0)} ms`);
}

// 1. naive read-modify-write in the app
await run('1 naive read-modify-write', async () => {
  const { rows: [p] } = await pool.query('SELECT stock FROM products WHERE id = 1');
  if (p.stock < 1) return false;
  await sleep(5);                                  // "business logic": payment check, etc.
  await pool.query('UPDATE products SET stock = $1 WHERE id = 1', [p.stock - 1]);
  return true;
});
// 2. atomic conditional UPDATE
await run('2 atomic UPDATE ... WHERE stock>=1', async () => {
  const r = await pool.query('UPDATE products SET stock = stock - 1 WHERE id = 1 AND stock >= 1');
  return r.rowCount === 1;
});
// 3. pessimistic: SELECT ... FOR UPDATE inside a transaction
await run('3 SELECT FOR UPDATE', () => withTx(async (c) => {
  const { rows: [p] } = await c.query('SELECT stock FROM products WHERE id = 1 FOR UPDATE');
  if (p.stock < 1) return false;
  await sleep(5);
  await c.query('UPDATE products SET stock = $1 WHERE id = 1', [p.stock - 1]);
  return true;
}));
// 4. optimistic: version check, retry on conflict
await run('4 optimistic version + retry', async () => {
  for (let i = 0; i < 200; i++) {
    const { rows: [p] } = await pool.query('SELECT stock, version FROM products WHERE id = 1');
    if (p.stock < 1) return false;
    await sleep(5);
    const r = await pool.query('UPDATE products SET stock = stock - 1, version = version + 1 WHERE id = 1 AND version = $1', [p.version]);
    if (r.rowCount === 1) return true;
  }
  throw new Error('gave up');
});
// 5. REPEATABLE READ, naive code, no retry
await run('5 REPEATABLE READ no retry', () => withTx(async (c) => {
  const { rows: [p] } = await c.query('SELECT stock FROM products WHERE id = 1');
  if (p.stock < 1) return false;
  await sleep(5);
  await c.query('UPDATE products SET stock = stock - 1 WHERE id = 1');
  return true;
}, { isolation: 'REPEATABLE READ' }));
// 6. REPEATABLE READ + retry
let retries = 0;
await run('6 REPEATABLE READ + retry', () => retry(() => withTx(async (c) => {
  const { rows: [p] } = await c.query('SELECT stock FROM products WHERE id = 1');
  if (p.stock < 1) return false;
  await sleep(5);
  await c.query('UPDATE products SET stock = stock - 1 WHERE id = 1');
  return true;
}, { isolation: 'REPEATABLE READ' }), { tries: 60, log: () => retries++ }));
console.log('   (retries performed in run 6:', retries + ')');
await pool.end();
