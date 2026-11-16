import pg from 'pg';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = { host: '127.0.0.1', user: 'postgres', password: 'bmhtest', database: 'shopline' };
const primary = new pg.Pool({ ...BASE, port: 54329, max: 10 });
const replica = new pg.Pool({ ...BASE, port: 54360, max: 10 });
const pq = (s, p) => primary.query(s, p), rq = (s, p) => replica.query(s, p);
await pq(`DROP SCHEMA IF EXISTS ch29 CASCADE; CREATE SCHEMA ch29; CREATE TABLE ch29.carts (id int PRIMARY KEY, items int NOT NULL, updated_at timestamptz DEFAULT now()); INSERT INTO ch29.carts VALUES (1, 0);
  CREATE TABLE ch29.big (id bigserial PRIMARY KEY, payload text)`);
for (let i = 0; i < 50; i++) { if ((await rq(`SELECT to_regclass('ch29.carts') t`)).rows[0].t) break; await sleep(100); }
console.log('replica role:', (await rq('SELECT pg_is_in_recovery() r')).rows[0].r ? 'standby (read-only, streaming from the primary)' : 'NOT a standby');
try { await rq(`INSERT INTO ch29.carts VALUES (99, 1)`); } catch (e) { console.log('writing to the replica ->', e.code, e.message); }

console.log('\n=== 1. replication lag when idle: write on the primary, poll the replica until it appears ===');
const lags = [];
for (let i = 1; i <= 30; i++) {
  await pq('UPDATE ch29.carts SET items = $1 WHERE id = 1', [i]); const t = performance.now();
  while ((await rq('SELECT items FROM ch29.carts WHERE id = 1')).rows[0].items !== i) await sleep(1);
  lags.push(performance.now() - t);
}
lags.sort((a, b) => a - b);
console.log(`30 writes: time until visible on the replica  median ${lags[15].toFixed(1)} ms  p95 ${lags[28].toFixed(1)} ms  max ${lags[29].toFixed(1)} ms  (includes the polling round trip)`);

console.log('\n=== 2. read-your-writes violation: add to cart, then immediately read from a replica ===');
let stale = 0; const N = 200;
for (let i = 1; i <= N; i++) { const v = 1000 + i; await pq('UPDATE ch29.carts SET items = $1 WHERE id = 1', [v]); const seen = (await rq('SELECT items FROM ch29.carts WHERE id = 1')).rows[0].items; if (seen !== v) stale++; }
console.log(`${N} write-then-read pairs on an IDLE system: replica returned the OLD value ${stale} times (${(100 * stale / N).toFixed(1)}%)`);

console.log('\n=== 3. lag under write load: 200k rows inserted on the primary while we watch the replica ===');
const writer = (async () => { for (let b = 0; b < 40; b++) await pq(`INSERT INTO ch29.big (payload) SELECT repeat('x', 400) FROM generate_series(1, 5000)`); })();
const samples = []; let running = true; writer.then(() => { running = false; });
while (running) { const r = (await rq(`SELECT extract(epoch FROM now() - pg_last_xact_replay_timestamp()) * 1000 AS ms, pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) AS replay_backlog_bytes`)).rows[0]; samples.push({ ms: Number(r.ms), b: Number(r.replay_backlog_bytes) }); await sleep(200); }
await writer; await sleep(500);
const worst = samples.reduce((a, s) => (s.ms > a.ms ? s : a), samples[0]);
console.log(`during the write burst: replica was up to ${worst.ms.toFixed(0)} ms behind (replay backlog ${(Math.max(...samples.map((s) => s.b)) / 1e6).toFixed(1)} MB); rows now on primary ${(await pq('SELECT count(*)::int n FROM ch29.big')).rows[0].n}, on replica ${(await rq('SELECT count(*)::int n FROM ch29.big')).rows[0].n}`);

console.log('\n=== 4. the fixes: (a) read from the primary after a write, (b) wait for the replica to reach the write\'s LSN ===');
let staleB = 0;
for (let i = 1; i <= N; i++) {
  const v = 5000 + i; await pq('UPDATE ch29.carts SET items = $1 WHERE id = 1', [v]);
  const lsn = (await pq('SELECT pg_current_wal_lsn() l')).rows[0].l;                                                                    // the position of our write
  for (let k = 0; k < 500; k++) { if ((await rq('SELECT pg_wal_lsn_diff(pg_last_wal_replay_lsn(), $1) >= 0 AS caught_up', [lsn])).rows[0].caught_up) break; await sleep(2); }   // wait until replica replayed it
  if ((await rq('SELECT items FROM ch29.carts WHERE id = 1')).rows[0].items !== v) staleB++;
}
console.log(`(b) wait-for-LSN: ${N} write-then-read pairs, stale reads: ${staleB}`);
const t1 = performance.now(); for (let i = 1; i <= 50; i++) { await pq('UPDATE ch29.carts SET items = $1 WHERE id = 1', [i]); await pq('SELECT items FROM ch29.carts WHERE id = 1'); } const primaryOnly = (performance.now() - t1) / 50;
console.log(`(a) read-your-writes from the primary: stale reads 0 by construction (cost: that read adds load to the primary; ${primaryOnly.toFixed(1)} ms per write+read pair)`);

console.log('\n=== 5. read scaling: 100 concurrent readers of an expensive aggregate, primary only vs spread over primary + replica ===');
const heavy = 'SELECT status, count(*)::int n FROM ch15.orders GROUP BY status';
async function readers(label, pools) { const t = performance.now(); let i = 0; await Promise.all(Array.from({ length: 16 }, async () => { for (let k = 0; k < 4; k++) await pools[i++ % pools.length].query(heavy); })); console.log(`${label.padEnd(34)} 64 heavy queries took ${((performance.now() - t) / 1000).toFixed(1)} s`); }
await readers('all reads on the primary', [primary]); await readers('reads split primary + replica', [primary, replica]); await readers('all reads on the replica', [replica]);
await primary.end(); await replica.end();
