// WARNING: part 5 takes ~2 minutes: every deadlock is only detected after deadlock_timeout (1 s). That slowness is the lesson.
import { pool, client, sleep, withTx, retry } from './ch16-lib.mjs';
await pool.query(`DROP TABLE IF EXISTS jobs, wallets CASCADE;
 CREATE TABLE jobs (id serial PRIMARY KEY, status text NOT NULL DEFAULT 'queued', worker text);
 INSERT INTO jobs (status) SELECT 'queued' FROM generate_series(1,12);
 CREATE TABLE wallets (id int PRIMARY KEY, balance int NOT NULL CHECK (balance >= 0));
 INSERT INTO wallets VALUES (1,1000),(2,1000);`);

console.log('=== 1. job queue: 3 workers, FOR UPDATE SKIP LOCKED ===');
async function worker(name) {
  const mine = [];
  for (;;) {
    const got = await withTx(async (c) => {
      const { rows } = await c.query(`SELECT id FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 2 FOR UPDATE SKIP LOCKED`);
      if (!rows.length) return [];
      await sleep(20);                                           // pretend to work
      await c.query(`UPDATE jobs SET status = 'done', worker = $1 WHERE id = ANY($2)`, [name, rows.map((r) => r.id)]);
      return rows.map((r) => r.id);
    });
    if (!got.length) break;
    mine.push(...got);
  }
  return [name, mine];
}
const results = await Promise.all(['w1', 'w2', 'w3'].map(worker));
for (const [n, ids] of results) console.log(n, ids.join(','));
const all = results.flatMap(([, ids]) => ids);
console.log('jobs processed:', all.length, ' unique:', new Set(all).size, ' still queued:', (await pool.query(`SELECT count(*)::int n FROM jobs WHERE status='queued'`)).rows[0].n);

console.log('\n=== 2. NOWAIT and lock_timeout ===');
const A = await client(), B = await client();
await A.query('BEGIN'); await A.query('SELECT * FROM wallets WHERE id = 1 FOR UPDATE');
await B.query('BEGIN');
try { await B.query('SELECT * FROM wallets WHERE id = 1 FOR UPDATE NOWAIT'); } catch (e) { console.log('NOWAIT ->', e.code, e.message); }
await B.query('ROLLBACK'); await B.query('BEGIN'); await B.query(`SET LOCAL lock_timeout = '300ms'`);
const t = performance.now();
try { await B.query('UPDATE wallets SET balance = balance + 1 WHERE id = 1'); } catch (e) { console.log(`lock_timeout -> ${e.code} after ${(performance.now() - t).toFixed(0)} ms: ${e.message}`); }
await B.query('ROLLBACK'); await A.query('ROLLBACK');

console.log('\n=== 3. deadlock: opposite lock order ===');
async function transfer(c, from, to, amt, delay = 0) {
  await c.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amt, from]);
  await sleep(delay);
  await c.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amt, to]);
}
await A.query('BEGIN'); await B.query('BEGIN');
const out = await Promise.allSettled([
  transfer(A, 1, 2, 10, 100).then(() => A.query('COMMIT')),
  transfer(B, 2, 1, 20, 100).then(() => B.query('COMMIT')),
]);
for (const r of out) console.log(r.status, r.status === 'rejected' ? `${r.reason.code}: ${r.reason.message}` : '');
console.log(`   detail: ${out.find((r) => r.status === 'rejected')?.reason.detail?.split('\n')[0]}`);
await A.query('ROLLBACK').catch(() => {}); await B.query('ROLLBACK').catch(() => {});

console.log('\n=== 4. the fix: lock in a consistent order (lowest id first) ===');
await pool.query('UPDATE wallets SET balance = 1000');
async function safeTransfer(from, to, amt) {
  return withTx(async (c) => {
    const [first, second] = [from, to].sort((a, b) => a - b);
    await c.query('SELECT 1 FROM wallets WHERE id IN ($1,$2) ORDER BY id FOR UPDATE', [first, second]);
    const { rows: [w] } = await c.query('SELECT balance FROM wallets WHERE id = $1', [from]);
    if (w.balance < amt) return false;
    await c.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amt, from]);
    await c.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amt, to]);
    return true;
  });
}
const jobs = Array.from({ length: 200 }, (_, i) => (i % 2 ? safeTransfer(1, 2, 5) : safeTransfer(2, 1, 5)));
const rs = await Promise.allSettled(jobs);
console.log('200 opposing transfers: fulfilled', rs.filter((r) => r.status === 'fulfilled').length, 'rejected', rs.filter((r) => r.status === 'rejected').length);
console.log('total money:', (await pool.query('SELECT sum(balance)::int AS s FROM wallets')).rows[0].s, '(must be 2000)');

console.log('\n=== 5. 30 transfers WITHOUT ordering: deadlocks happen; retry fixes them ===');
await pool.query('UPDATE wallets SET balance = 1000');
let dl = 0;
const naive = (from, to, amt) => retry(() => withTx(async (c) => {
  await c.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amt, from]);
  await sleep(2);
  await c.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amt, to]);
}), { tries: 30, log: () => dl++ });
const rs2 = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => (i % 2 ? naive(1, 2, 5) : naive(2, 1, 5))));
console.log('fulfilled', rs2.filter((r) => r.status === 'fulfilled').length, ' rejected', rs2.filter((r) => r.status === 'rejected').length, ' deadlock/serialization retries:', dl);
console.log('total money:', (await pool.query('SELECT sum(balance)::int AS s FROM wallets')).rows[0].s);
await A.end(); await B.end(); await pool.end();
