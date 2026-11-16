import { spawnSync } from 'node:child_process';
import { retry, withTimeout, CircuitBreaker, sleep, OperationalError } from './resilience.mjs';

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

console.log('=== 1. what happens to the PROCESS on unhandled errors (Node 22) ===');
const run = (code) => { const r = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8', timeout: 10000 }); return { exit: r.status, out: r.stdout.trim().split('\n').join(' | '), err: (r.stderr.match(/^\w*Error: .*$/m) ?? [''])[0].slice(0, 70) }; };
let r = run(`Promise.reject(new Error('forgot to await')); setTimeout(() => console.log('still running'), 200);`);
console.log('unhandled promise rejection       -> exit code', r.exit, '| stdout:', JSON.stringify(r.out), '| stderr:', r.err);
r = run(`setTimeout(() => { throw new Error('thrown in a timer'); }, 10); setTimeout(() => console.log('still running'), 200);`);
console.log('uncaught exception in a callback  -> exit code', r.exit, '| stdout:', JSON.stringify(r.out), '| stderr:', r.err);
r = run(`process.on('uncaughtException', (e) => { console.log('logged:', e.message); process.exit(1); }); setTimeout(() => { throw new Error('boom'); }, 10);`);
console.log('handler that logs then exits      -> exit code', r.exit, '| stdout:', JSON.stringify(r.out), ' (supervisor restarts a clean process)');
r = run(`let balance = 100; process.on('uncaughtException', (e) => console.log('swallowed:', e.message));
  async function transfer() { balance -= 50; await new Promise(r => setTimeout(r, 10)); throw new Error('credit step failed'); /* money left account, never arrived */ }
  transfer(); setTimeout(() => console.log('process kept running with balance =', balance, '(corrupt state)'), 100);`);
console.log('handler that SWALLOWS the error   -> exit code', r.exit, '| stdout:', JSON.stringify(r.out.slice(0, 70)));

console.log('\n=== 2. chaos test of a checkout: payment gateway (30% 503s, charges even when the reply times out) + inventory outage ===');
function makeGateway() {
  const g = { calls: 0, charges: new Map(), chargedTotal: 0 };
  g.charge = async ({ orderId, idemKey }) => {
    g.calls++;
    const r = Math.random();
    if (r < 0.15) throw new OperationalError('UPSTREAM_5XX', 'gateway 503', { retryable: true });                     // rejected before charging
    if (idemKey && g.charges.has(idemKey)) { await sleep(10); return g.charges.get(idemKey); }                          // idempotent replay
    const charge = { chargeId: `ch_${g.chargedTotal + 1}`, orderId }; g.chargedTotal++; if (idemKey) g.charges.set(idemKey, charge);   // money moves HERE
    if (r < 0.30) { await sleep(1000); }                                                                                // ...then the response is lost / slow
    else await sleep(20 + Math.random() * 30);
    return charge;
  };
  return g;
}
async function simulate(label, mkCheckout) {
  const gateway = makeGateway(); let inventoryDown = false;
  const inventory = async () => { await sleep(10); if (inventoryDown) throw new OperationalError('UPSTREAM_5XX', 'inventory down', { retryable: true }); return true; };
  const checkout = mkCheckout({ gateway, inventory });
  setTimeout(() => { inventoryDown = true; }, 800); setTimeout(() => { inventoryDown = false; }, 2000);
  const N = 300, lat = []; let ok = 0, degraded = 0, failed = 0;
  await Promise.all(Array.from({ length: N }, async (_, i) => { await sleep((i / N) * 2800); const s = performance.now(); try { const res = await checkout(i); res.degraded ? degraded++ : ok++; } catch { failed++; } lat.push(performance.now() - s); }));
  const orders = ok + degraded;
  console.log(`${label.padEnd(34)} completed ${String(orders).padStart(3)}/${N} (${degraded} degraded) failed ${String(failed).padStart(3)} | latency p50 ${pct(lat, 0.5).toFixed(0)} ms p99 ${pct(lat, 0.99).toFixed(0)} ms | gateway calls ${String(gateway.calls).padStart(3)} | CHARGES ${gateway.chargedTotal} for ${orders} completed orders${gateway.chargedTotal > orders ? `  <- ${gateway.chargedTotal - orders} extra charge(s)` : ''}`);
}
await simulate('naive (no timeouts, no retries)', ({ gateway, inventory }) => async (id) => { await inventory(); await gateway.charge({ orderId: id }); return {}; });
await simulate('retries, NO idempotency key', ({ gateway, inventory }) => async (id) => {
  await retry(() => withTimeout(() => inventory(), 300), { retries: 3, baseMs: 30 });
  await retry(() => withTimeout(() => gateway.charge({ orderId: id }), 300), { retries: 3, baseMs: 30 }); return {};
});
await simulate('resilient (timeouts+retries+key+breaker)', ({ gateway, inventory }) => {
  const cb = new CircuitBreaker({ failureThreshold: 5, windowMs: 2000, openMs: 400, name: 'inventory' });
  return async (id) => {
    let degraded = false;
    try { await cb.exec(() => retry(() => withTimeout(() => inventory(), 300), { retries: 2, baseMs: 30 })); }
    catch { degraded = true; }                                                                                          // inventory unavailable: accept the order as "pending stock confirmation"
    await retry(() => withTimeout(() => gateway.charge({ orderId: id, idemKey: `order-${id}` }), 300), { retries: 4, baseMs: 30 });
    return { degraded };
  };
});
