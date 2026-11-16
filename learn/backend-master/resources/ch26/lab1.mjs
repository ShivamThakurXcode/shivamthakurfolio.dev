import http from 'node:http';
import { withTimeout, retry, sleep, OperationalError } from './resilience.mjs';

// An in-process simulated dependency (deterministic, no OS socket noise): think "payment gateway".
// It has finite capacity: above `capacity` concurrent calls it answers 503 (overload), like a real service.
export function makeSimDep({ latency = 20, capacity = 1e9 } = {}) {
  const dep = { mode: 'ok', failRate: 0.5, latency, capacity, requests: 0, active: 0, peak: 0, timeline: new Map(), t0: Date.now() };
  dep.call = async (signal) => {
    dep.requests++; dep.active++; dep.peak = Math.max(dep.peak, dep.active);
    const bucket = Math.floor((Date.now() - dep.t0) / 100); dep.timeline.set(bucket, (dep.timeline.get(bucket) ?? 0) + 1);
    try {
      if (dep.active > dep.capacity) throw new OperationalError('UPSTREAM_5XX', 'overloaded (503)', { retryable: true });
      if (dep.mode === 'hang') await new Promise((_, rej) => signal?.addEventListener('abort', () => rej(signal.reason)));
      await sleep(dep.mode === 'slow' ? 1500 : dep.latency);
      if (dep.mode === 'error' || (dep.mode === 'flaky' && Math.random() < dep.failRate)) throw new OperationalError('UPSTREAM_5XX', 'dependency returned 503', { retryable: true });
      return 'ok';
    } finally { dep.active--; }
  };
  dep.reset = () => { dep.requests = 0; dep.peak = 0; dep.timeline = new Map(); dep.t0 = Date.now(); };
  dep.busiestWindow = () => Math.max(0, ...dep.timeline.values());
  return dep;
}
export const callSim = (dep, timeoutMs = 300) => withTimeout((signal) => dep.call(signal), timeoutMs);

if (process.argv[1].endsWith('lab1.mjs')) {
  console.log('=== 1. a hung HTTP dependency: no timeout vs 300 ms timeout (real sockets) ===');
  const hung = http.createServer(() => {}); await new Promise((r) => hung.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${hung.address().port}/`;
  const noTimeout = await Promise.race([fetch(url, { headers: { connection: 'close' } }).then(() => 'answered'), sleep(3000).then(() => 'STILL WAITING after 3000 ms (it would wait forever)')]);
  console.log('without a timeout       :', noTimeout);
  let t = performance.now();
  await withTimeout((signal) => fetch(url, { signal, headers: { connection: 'close' } }), 300).catch((e) => console.log(`with a 300 ms timeout   : failed fast after ${(performance.now() - t).toFixed(0)} ms -> ${e.code ?? e.name}`));
  hung.closeAllConnections(); hung.close();

  console.log('\n=== 2. retries on a flaky dependency (50% of calls fail), 2000 requests ===');
  const dep = makeSimDep({ latency: 20 }); dep.mode = 'flaky'; dep.failRate = 0.5;
  const run = async (label, call) => { dep.reset(); let ok = 0; const N = 2000; const t0 = performance.now(); await Promise.all(Array.from({ length: N }, async () => { try { await call(); ok++; } catch {} })); console.log(`${label.padEnd(30)} success ${(100 * ok / N).toFixed(1)}%  | dependency saw ${String(dep.requests).padStart(5)} calls (${(dep.requests / N).toFixed(2)}x load) | ${(performance.now() - t0).toFixed(0)} ms`); };
  await run('no retry', () => callSim(dep));
  await run('retry x3, jittered backoff', () => retry(() => callSim(dep), { retries: 3, baseMs: 20 }));
  await run('retry x6, jittered backoff', () => retry(() => callSim(dep), { retries: 6, baseMs: 20 }));
  console.log('theory: 0.5 -> 50%; 0.5^4 fails = 6.25% -> 93.8%; 0.5^7 = 0.8% -> 99.2%.  Cost: load multiplies by ~1.9x (x3) and ~2x (x6)');

  console.log('\n=== 3. retries make an OVERLOADED dependency worse (the retry storm) ===');
  // The dependency can handle 100 concurrent calls. 300 clients arrive together; failures are retried.
  const storm = async (label, jitter, retries) => {
    const d = makeSimDep({ latency: 50, capacity: 100 });
    const N = 300; let ok = 0;
    await Promise.all(Array.from({ length: N }, async () => { try { await retry(() => callSim(d, 400), { retries, baseMs: 100, maxMs: 1600, jitter }); ok++; } catch {} }));
    console.log(`${label.padEnd(34)} succeeded ${String(ok).padStart(3)}/300 | calls to dependency ${String(d.requests).padStart(4)} | busiest 100 ms window ${String(d.busiestWindow()).padStart(3)} calls | peak concurrency ${d.peak}`);
  };
  await storm('no retries', true, 0);
  await storm('retries, backoff, NO jitter', false, 6);
  await storm('retries, backoff + full jitter', true, 6);
}
