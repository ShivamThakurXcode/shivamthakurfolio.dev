import http from 'node:http';
import crypto from 'node:crypto';
import v8 from 'node:v8';
import fs from 'node:fs';
import { monitorEventLoopDelay } from 'node:perf_hooks';
const mode = process.argv[2];
const mb = (n) => (n / 1e6).toFixed(1);

if (mode === 'lag') {
  // A handler that does CPU work synchronously, and a /ping route that should be instant.
  const handlers = {
    '/hash': (res) => { crypto.pbkdf2Sync('pw', 'salt', 400000, 64, 'sha512'); res.end('hashed'); },              // blocks the loop
    '/hash-async': (res) => crypto.pbkdf2('pw', 'salt', 400000, 64, 'sha512', () => res.end('hashed')),          // runs on the thread pool (Ch 5)
    '/ping': (res) => res.end('pong'),
  };
  const server = http.createServer((req, res) => handlers[req.url](res));
  await new Promise((r) => server.listen(0, r)); const base = `http://127.0.0.1:${server.address().port}`;
  const ping = async () => { const t = performance.now(); await fetch(base + '/ping', { headers: { connection: 'close' } }); return performance.now() - t; };
  for (const route of ['/hash', '/hash-async']) {
    const h = monitorEventLoopDelay({ resolution: 10 }); h.enable();
    const busy = fetch(base + route, { headers: { connection: 'close' } });
    await new Promise((r) => setTimeout(r, 30));
    const pings = []; for (let i = 0; i < 5; i++) pings.push(await ping());
    await busy; h.disable();
    console.log(`${route.padEnd(12)} while a hash runs: /ping latency ${pings.map((p) => p.toFixed(0)).join(', ')} ms | event-loop delay p99 ${(h.percentile(99) / 1e6).toFixed(0)} ms, max ${(h.max / 1e6).toFixed(0)} ms`);
  }
  server.close();
}

if (mode === 'leak') {
  const caches = { 'unbounded Map (the leak)': new Map(), 'bounded Map + TTL/LRU eviction': new Map() };
  const MAX = 5000;
  const lines = [];
  global.gc?.();
  for (const [name, cache] of Object.entries(caches)) {
    global.gc?.(); const base = process.memoryUsage().heapUsed; const samples = [];
    for (let req = 1; req <= 100000; req++) {
      const key = 'session:' + req;                                       // every request adds a NEW key (e.g. a cache keyed by request/user-agent/URL)
      cache.set(key, { id: req, payload: 'x'.repeat(200), created: Date.now() });
      if (name.startsWith('bounded') && cache.size > MAX) cache.delete(cache.keys().next().value);   // evict oldest (Map keeps insertion order)
      if (req % 25000 === 0) { global.gc?.(); samples.push(`${(process.memoryUsage().heapUsed - base) / 1e6 > 0 ? '+' : ''}${mb(process.memoryUsage().heapUsed - base)} MB`); }
    }
    lines.push(`${name.padEnd(34)} entries=${String(cache.size).padStart(6)} | heap growth after 25k/50k/75k/100k requests: ${samples.join(', ')}`);
    cache.clear();
  }
  console.log(lines.join('\n'));
  const keep = []; for (let i = 0; i < 100000; i++) keep.push({ i, s: 'y'.repeat(100) });
  const file = v8.writeHeapSnapshot('lab.heapsnapshot');
  console.log('heap snapshot written:', file, mb(fs.statSync(file).size), 'MB (open in Chrome DevTools > Memory to find what retains memory)');
  fs.unlinkSync(file);
  console.log('v8 heap limit:', mb(v8.getHeapStatistics().heap_size_limit), 'MB');
}

if (mode === 'cpu') {
  // A realistic "slow endpoint": builds a report with an accidentally quadratic step and heavy JSON work.
  const rows = Array.from({ length: 3000 }, (_, i) => ({ id: i, name: 'product ' + i, tags: ['a', 'b', 'c'], price: i * 3.5 }));
  const dedupe = (xs) => xs.filter((x, i) => xs.findIndex((y) => y.id === x.id) === i);          // O(n^2)
  const render = (xs) => xs.map((x) => JSON.stringify(x)).join('\n');
  const hashAll = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const t = performance.now();
  for (let i = 0; i < 40; i++) hashAll(render(dedupe(rows)));
  console.log('report built 40 times in', (performance.now() - t).toFixed(0), 'ms');
}
