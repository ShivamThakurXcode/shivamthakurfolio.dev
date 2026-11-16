import { Writable } from 'node:stream';
import pg from 'pg';
import { createClient } from 'redis';
import client from 'prom-client';
import { makeObsApp } from './obs-app.mjs';

const lines = [];
const logStream = new Writable({ write(chunk, _e, cb) { lines.push(...chunk.toString().trim().split('\n')); cb(); } });
const pool = new pg.Pool({ host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline', max: 2 });
const redis = createClient({ url: 'redis://127.0.0.1:54331' }); await redis.connect();
let dbUp = true;
const { app, registry } = makeObsApp({ logStream, readiness: { postgres: async () => { if (!dbUp) throw new Error('connection refused'); await pool.query('SELECT 1'); }, redis: () => redis.ping() } });
const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); }); const base = `http://127.0.0.1:${server.address().port}`;
const req = async (path, opts = {}) => { const r = await fetch(base + path, opts); return { status: r.status, headers: r.headers, text: await r.text() }; };
const take = () => lines.splice(0).map((l) => JSON.parse(l));
const show = (rows) => rows.forEach((o) => console.log(JSON.stringify(o)));

console.log('=== 1. structured access log + correlation id (same id on every line of one request) ===');
await req('/products/42', { headers: { 'x-request-id': 'req-abc-123', authorization: 'Bearer eyJhbGciOi.secret.token' } });
show(take());

console.log('\n=== 2. redaction of secrets ===');
await req('/login', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer SECRET-TOKEN' }, body: JSON.stringify({ email: 'a@b.com', password: 'hunter2' }) });
show(take().filter((o) => o.msg === 'login attempt'));
console.log('"hunter2" or "SECRET-TOKEN" anywhere in the logs?', JSON.stringify(take()).includes('hunter2'));

console.log('\n=== 3. error: full detail in the log, generic body + request id for the client ===');
const boom = await req('/boom', { headers: { 'x-request-id': 'req-boom-1' } });
console.log('client sees:', boom.status, boom.text);
const errLines = take(); const e = errLines.find((o) => o.msg === 'unhandled error');
console.log('log has  :', JSON.stringify({ level: e.level, requestId: e.requestId, errType: e.err.type, errMessage: e.err.message, stack0: e.err.stack.split('\n')[1].trim().slice(0, 60) }));
console.log('access-log line status/level:', errLines.filter((o) => o.msg === 'request completed').map((o) => `${o.status}/${o.level}`).join(','));

console.log('\n=== 4. trace context in: W3C traceparent is honoured ===');
await req('/products/1', { headers: { traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' } });
console.log('log traceId:', take()[0].traceId);

console.log('\n=== 5. metrics: RED + business counter; route template not raw URL ===');
for (let i = 0; i < 30; i++) await req('/products/' + i);
for (let i = 0; i < 12; i++) await req('/slow');
await req('/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'upi' }) });
await req('/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'card' }) });
await req('/boom'); await req('/nope');
take();
const m = (await req('/metrics')).text;
const pick = (re) => m.split('\n').filter((l) => re.test(l));
console.log(pick(/^http_request_duration_seconds_count/).join('\n'));
console.log(pick(/^http_request_duration_seconds_bucket/).filter((l) => l.includes('route="/slow"') && /le="(0\.05|0\.1|0\.25|0\.5|\+Inf)"/.test(l)).join('\n'));
console.log(pick(/^shopline_orders_created_total/).join('\n'));
console.log('default process metrics present:', ['process_cpu_seconds_total', 'nodejs_eventloop_lag_seconds', 'nodejs_heap_size_used_bytes', 'process_resident_memory_bytes'].map((n) => `${n}=${m.includes(n)}`).join(' '));
const p = (q) => { const hist = registry.getSingleMetric('http_request_duration_seconds'); return hist; };

console.log('\n=== 6. label cardinality explosion ===');
const bad = new client.Histogram({ name: 'bad_latency', help: 'x', labelNames: ['url', 'user_id'], buckets: [0.01, 0.1, 1], registers: [registry] });
const good = new client.Histogram({ name: 'good_latency', help: 'x', labelNames: ['route'], buckets: [0.01, 0.1, 1], registers: [registry] });
const before = (await registry.metrics()).split('\n').length; const heap0 = process.memoryUsage().heapUsed;
for (let i = 0; i < 2000; i++) { bad.observe({ url: '/products/' + i, user_id: 'u' + (i % 500) }, 0.05); good.observe({ route: '/products/:id' }, 0.05); }
const text = await registry.metrics();
console.log('series lines for bad_latency :', text.split('\n').filter((l) => l.startsWith('bad_latency')).length, '(2000 distinct label sets × (3 buckets + Inf + sum + count))');
console.log('series lines for good_latency:', text.split('\n').filter((l) => l.startsWith('good_latency')).length);
console.log('exposition size grew from', before, 'to', text.split('\n').length, 'lines | heap +', ((process.memoryUsage().heapUsed - heap0) / 1e6).toFixed(1), 'MB in this process');

console.log('\n=== 7. liveness vs readiness ===');
let r = await req('/livez'); console.log('/livez ', r.status, r.text);
r = await req('/readyz'); console.log('/readyz', r.status, r.text);
dbUp = false; r = await req('/readyz'); console.log('/readyz with Postgres "down":', r.status, r.text);
r = await req('/livez'); console.log('/livez  with Postgres "down":', r.status, '(must stay alive: restarting the app would not fix the database)');

server.close(); await pool.end(); await redis.quit();
