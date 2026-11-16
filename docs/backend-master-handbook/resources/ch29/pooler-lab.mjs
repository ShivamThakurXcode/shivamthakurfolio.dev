import pg from 'pg';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = { host: '127.0.0.1', user: 'postgres', password: 'bmhtest', database: 'shopline' };
const DIRECT = { ...BASE, port: 54329 }, VIA = { ...BASE, port: 54370 };
const admin = new pg.Client(DIRECT); await admin.connect();
const backends = async () => (await admin.query(`SELECT count(*)::int n FROM pg_stat_activity WHERE datname='shopline' AND pid <> pg_backend_pid() AND backend_type='client backend'`)).rows[0].n;

console.log(`PostgreSQL max_connections = ${(await admin.query('SHOW max_connections')).rows[0].max_connections} (each connection is a whole OS process, roughly 5-10 MB)`);
async function openMany(cfg, n) {
  const clients = []; let ok = 0, refused = 0, firstErr = '';
  await Promise.all(Array.from({ length: n }, async () => { const c = new pg.Client(cfg); c.on('error', () => {}); try { await c.connect(); await c.query('SELECT 1'); clients.push(c); ok++; } catch (e) { refused++; firstErr ||= e.message; } }));
  return { clients, ok, refused, firstErr };
}
console.log('\n=== 1. 300 application connections: direct vs through PgBouncer (transaction pooling, pool size 10) ===');
let r = await openMany(DIRECT, 300);
console.log(`direct to PostgreSQL : ${r.ok} connected, ${r.refused} REFUSED  ("${r.firstErr}")`);
await Promise.all(r.clients.map((c) => c.end())); await sleep(500);
r = await openMany(VIA, 300);
const pbBackends = await backends();
console.log(`through PgBouncer    : ${r.ok} connected, ${r.refused} refused | real PostgreSQL backends in use right now: ${pbBackends}`);
console.log('300 clients each run a query at the same time:');
const t0 = performance.now(); await Promise.all(r.clients.map((c) => c.query('SELECT count(*) FROM ch15.users'))); console.log(`  all 300 answered in ${(performance.now() - t0).toFixed(0)} ms using ${await backends()} PostgreSQL backends`);
await Promise.all(r.clients.map((c) => c.end())); await sleep(500);

console.log('\n=== 2. throughput: 200 concurrent workers, 25 short transactions each ===');
async function workload(label, cfg, poolMax) {
  const pool = new pg.Pool({ ...cfg, max: poolMax }); pool.on('error', () => {}); let errors = 0; const lat = [];
  const t = performance.now();
  await Promise.all(Array.from({ length: 200 }, async () => { for (let i = 0; i < 25; i++) { const s = performance.now(); try { await pool.query('SELECT id FROM ch15.users WHERE id = $1', [1 + Math.floor(Math.random() * 50000)]); lat.push(performance.now() - s); } catch { errors++; } } }));
  const secs = (performance.now() - t) / 1000; const peak = await backends(); await pool.end(); lat.sort((a, b) => a - b);
  console.log(`${label.padEnd(44)} ${Math.round(5000 / secs).toString().padStart(5)} tx/s | p50 ${lat[Math.floor(lat.length / 2)]?.toFixed(0)} ms p99 ${lat[Math.floor(lat.length * 0.99)]?.toFixed(0)} ms | errors ${errors}`);
}
await workload('direct, app pool of 20 connections', DIRECT, 20);
await workload('direct, app pool of 90 connections', DIRECT, 90);
await workload('via PgBouncer, app pool of 200 (pool_size 10)', VIA, 200);

console.log('\n=== 3. the price of transaction pooling: SESSION state leaks between clients ===');
const A = new pg.Client(VIA), B = new pg.Client(VIA); await A.connect(); await B.connect();
const pidA = (await A.query('SELECT pg_backend_pid() p')).rows[0].p; const pidB = (await B.query('SELECT pg_backend_pid() p')).rows[0].p;
console.log(`client A's query ran on backend ${pidA}; client B's query ran on backend ${pidB}  ${pidA === pidB ? '(the SAME server connection, reused between two different clients)' : '(different backends this time; the pooler may hand out any of its 10)'}`);
let leaked = 0, tries = 0;
for (let i = 0; i < 40; i++) { await A.query(`SET app.tenant_id = 'tenant-A'`); const v = (await B.query(`SELECT current_setting('app.tenant_id', true) v`)).rows[0].v; tries++; if (v === 'tenant-A') leaked++; await A.query('RESET app.tenant_id'); }
console.log(`A runs "SET app.tenant_id = 'tenant-A'" (session level); B then reads it: B SAW tenant-A in ${leaked} of ${tries} tries  <- a Chapter 22 RLS bug if you use session-level SET`);
let safe = 0; for (let i = 0; i < 40; i++) { await A.query('BEGIN'); await A.query(`SELECT set_config('app.tenant_id', 'tenant-A', true)`); await A.query('COMMIT'); const v = (await B.query(`SELECT current_setting('app.tenant_id', true) v`)).rows[0].v; if (v === 'tenant-A') safe++; }
console.log(`with transaction-local set_config(..., true): B saw tenant-A in ${safe} of 40 tries  <- safe`);
await A.end(); await B.end(); await admin.end();
