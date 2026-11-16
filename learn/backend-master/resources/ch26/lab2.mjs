import { CircuitBreaker, Bulkhead, withFallback, sleep, OperationalError } from './resilience.mjs';
import { makeSimDep, callSim } from './lab1.mjs';

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

console.log('=== 1. circuit breaker: dependency hangs for 2 s, then recovers (caller timeout 300 ms, 1 request / 50 ms for 5 s) ===');
async function scenario(useBreaker) {
  const dep = makeSimDep({ latency: 20 }); dep.mode = 'hang';
  const cb = new CircuitBreaker({ failureThreshold: 5, windowMs: 5000, openMs: 500, name: 'inventory' });
  const t0 = Date.now(); setTimeout(() => { dep.mode = 'ok'; }, 2000);
  const lat = [], outcome = { ok: 0, TIMEOUT: 0, CIRCUIT_OPEN: 0 };
  const calls = [];
  for (let i = 0; i < 100; i++) {
    calls.push((async () => {
      const s = performance.now();
      try { await (useBreaker ? cb.exec(() => callSim(dep, 300)) : callSim(dep, 300)); outcome.ok++; } catch (e) { outcome[e.code] = (outcome[e.code] ?? 0) + 1; }
      lat.push(performance.now() - s);
    })());
    await sleep(50);
  }
  await Promise.all(calls);
  return { dep, cb, lat, outcome };
}
for (const useBreaker of [false, true]) {
  const r = await scenario(useBreaker);
  console.log(`${useBreaker ? 'WITH breaker   ' : 'no breaker     '} calls that reached the dependency: ${String(r.dep.requests).padStart(3)} | outcomes ${JSON.stringify(r.outcome)} | caller latency p50 ${pct(r.lat, 0.5).toFixed(0)} ms, p95 ${pct(r.lat, 0.95).toFixed(0)} ms${useBreaker ? ' | transitions: ' + r.cb.events.join(', ') : ''}`);
}

console.log('\n=== 2. bulkhead: a slow dependency must not starve unrelated work (shared pool of 10 connections) ===');
class Pool { constructor(n) { this.free = n; this.q = []; } async use(fn) { if (this.free > 0) this.free--; else await new Promise((r) => this.q.push(r)); /* slot handed off directly */ try { return await fn(); } finally { if (this.q.length) this.q.shift()(); else this.free++; } } }
async function bulk(useBulkhead) {
  const pool = new Pool(10); const slowBH = new Bulkhead({ maxConcurrent: 3, maxQueue: 0 });
  const slowCall = () => pool.use(() => sleep(1500));                       // each slow-dependency call holds a connection for 1.5 s
  const fastCall = () => pool.use(() => sleep(20));
  const slowResults = { ok: 0, rejected: 0 };
  const slows = Array.from({ length: 60 }, async () => { try { await (useBulkhead ? slowBH.exec(slowCall) : slowCall()); slowResults.ok++; } catch { slowResults.rejected++; } });
  await sleep(50);
  const fastLat = []; const fasts = Array.from({ length: 30 }, async () => { const s = performance.now(); await fastCall(); fastLat.push(performance.now() - s); });
  await Promise.all([...slows, ...fasts]);
  return { fastLat, slowResults };
}
for (const useBulkhead of [false, true]) {
  const r = await bulk(useBulkhead);
  console.log(`${useBulkhead ? 'WITH bulkhead (3 slots) ' : 'no bulkhead             '} FAST endpoint latency p50 ${pct(r.fastLat, 0.5).toFixed(0).padStart(5)} ms  p95 ${pct(r.fastLat, 0.95).toFixed(0).padStart(5)} ms | slow-dependency calls: ${r.slowResults.ok} served, ${r.slowResults.rejected} rejected fast`);
}

console.log('\n=== 3. fallback / graceful degradation ===');
const dep = makeSimDep({ latency: 20 }); dep.mode = 'error';
const cache = { recommendations: ['Gel Pen', 'Notebook A5', 'Backpack'], at: Date.now() };
const recommend = () => withFallback(() => callSim(dep, 300).then(() => ['personalised list']), (e) => { return { degraded: true, reason: e.code, items: cache.recommendations }; });
console.log('recommendation service down ->', JSON.stringify(await recommend()));
dep.mode = 'ok'; console.log('recommendation service up   ->', JSON.stringify(await recommend()));
