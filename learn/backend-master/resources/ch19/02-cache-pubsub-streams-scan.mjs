import { connect, sleep } from './lib.mjs';
const r = await connect(); await r.flushAll();

console.log('=== 1. cache-aside + the stampede ===');
let dbCalls = 0;
const slowDb = async (id) => { dbCalls++; await sleep(200); return { id, name: 'Product ' + id, price_minor: 12000 }; };
async function getProductNaive(id) {
  const key = 'cache:product:' + id;
  const hit = await r.get(key); if (hit) return JSON.parse(hit);
  const row = await slowDb(id);
  await r.set(key, JSON.stringify(row), { EX: 30 });
  return row;
}
let t = performance.now(); await getProductNaive(1); const miss = performance.now() - t;
t = performance.now(); await getProductNaive(1); const hit = performance.now() - t;
console.log(`miss ${miss.toFixed(0)} ms (DB) vs hit ${hit.toFixed(1)} ms (Redis)`);
await r.flushAll(); dbCalls = 0;
await Promise.all(Array.from({ length: 50 }, () => getProductNaive(2)));
console.log('50 concurrent requests for a cold key -> DB calls:', dbCalls, '  <- cache stampede');

// single-flight per process + a Redis lock across processes
const inflight = new Map();
function getProductSingleFlight(id) {
  const key = 'cache:product:' + id;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    const hit = await r.get(key); if (hit) return JSON.parse(hit);
    const row = await slowDb(id);
    await r.set(key, JSON.stringify(row), { EX: 30 });
    return row;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p); return p;
}
await r.flushAll(); dbCalls = 0;
await Promise.all(Array.from({ length: 50 }, () => getProductSingleFlight(3)));
console.log('with in-process single-flight -> DB calls:', dbCalls);
// cross-process: lock with NX, others wait & re-check
async function getProductLocked(id) {
  const key = 'cache:product:' + id, lock = 'lock:' + key;
  for (let i = 0; i < 50; i++) {
    const hit = await r.get(key); if (hit) return JSON.parse(hit);
    if (await r.set(lock, '1', { NX: true, PX: 2000 })) {
      try { const row = await slowDb(id); await r.set(key, JSON.stringify(row), { EX: 30 }); return row; } finally { await r.del(lock); }
    }
    await sleep(25);
  }
  throw new Error('timeout');
}
await r.flushAll(); dbCalls = 0;
await Promise.all(Array.from({ length: 50 }, () => getProductLocked(4)));
console.log('with Redis lock (works across servers) -> DB calls:', dbCalls);

console.log('\n=== 2. TTL jitter avoids synchronized expiry ===');
const ttls = Array.from({ length: 5 }, () => 300 + Math.floor(Math.random() * 60));
console.log('base 300 s + random 0-60 s ->', ttls.join(', '));

console.log('\n=== 3. pub/sub is fire-and-forget; streams persist ===');
const sub = await connect(); const got = [];
await sub.subscribe('orders:new', (m) => got.push(m));
await r.publish('orders:new', 'order-1');
await sleep(100);
console.log('online subscriber received:', got);
const lateSub = await connect(); const late = [];
await r.publish('orders:new', 'order-2 (nobody subscribed yet)');
await lateSub.subscribe('orders:new', (m) => late.push(m)); await sleep(100);
console.log('subscriber that joined after publish received:', late, '<- pub/sub does not store messages');
await r.xAdd('stream:orders', '*', { orderId: '1' }); await r.xAdd('stream:orders', '*', { orderId: '2' }); await r.xAdd('stream:orders', '*', { orderId: '3' });
try { await r.xGroupCreate('stream:orders', 'workers', '0'); } catch {}
const batch1 = await r.xReadGroup('workers', 'w1', { key: 'stream:orders', id: '>' }, { COUNT: 2 });
console.log('worker w1 reads 2:', batch1[0].messages.map((m) => m.message.orderId));
console.log('pending (delivered, not acked):', (await r.xPending('stream:orders', 'workers')).pending);
await r.xAck('stream:orders', 'workers', batch1[0].messages.map((m) => m.id));
const batch2 = await r.xReadGroup('workers', 'w2', { key: 'stream:orders', id: '>' }, { COUNT: 5 });
console.log('worker w2 reads the rest:', batch2[0].messages.map((m) => m.message.orderId), '| pending now:', (await r.xPending('stream:orders', 'workers')).pending);
await sub.quit(); await lateSub.quit();

console.log('\n=== 4. KEYS * vs SCAN with 200k keys ===');
const pipe = r.multi(); for (let i = 0; i < 200000; i++) pipe.set('bulk:' + i, 'x'); await pipe.exec();
console.log('dbSize:', await r.dbSize());
t = performance.now(); const all = await r.keys('bulk:*'); console.log(`KEYS bulk:* -> ${all.length} keys in ${(performance.now() - t).toFixed(0)} ms (blocks the whole server meanwhile)`);
const probe = connect(); const pr = await probe; let worst = 0; let stop = false;
const pinger = (async () => { while (!stop) { const s = performance.now(); await pr.ping(); worst = Math.max(worst, performance.now() - s); await sleep(1); } })();
t = performance.now(); await r.keys('bulk:*'); await sleep(5); stop = true; await pinger;
console.log(`while KEYS ran, another client's PING waited up to ${worst.toFixed(0)} ms`);
let n = 0, cursor = '0'; t = performance.now();
do { const res = await r.scan(cursor, { MATCH: 'bulk:*', COUNT: 1000 }); cursor = res.cursor; n += res.keys.length; } while (cursor !== '0' && cursor !== 0);
console.log(`SCAN in pages of ~1000 -> ${n} keys in ${(performance.now() - t).toFixed(0)} ms (non-blocking, may return duplicates in general)`);
await pr.quit(); await r.flushAll(); await r.quit();
