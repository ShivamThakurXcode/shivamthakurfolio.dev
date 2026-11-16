import pg from 'pg';
import { createClient } from 'redis';
import { LRUCache } from 'lru-cache';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pool = new pg.Pool({ host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline', max: 5 });
const redis = createClient({ url: 'redis://127.0.0.1:54331' }); await redis.connect(); await redis.flushAll();
const sub = redis.duplicate(); await sub.connect();
await pool.query(`DROP SCHEMA IF EXISTS ch27 CASCADE; CREATE SCHEMA ch27; CREATE TABLE ch27.products (id int PRIMARY KEY, name text, price_minor int, version int NOT NULL DEFAULT 1);
  INSERT INTO ch27.products VALUES (1,'Gel Pen',1500,1),(2,'Notebook',12000,1);`);
const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

console.log('=== 1. what a cache hit is worth: an expensive aggregate over 1,000,000 orders ===');
const heavy = async () => (await pool.query('SELECT status, count(*)::int n, sum(total_minor)::bigint revenue FROM ch15.orders GROUP BY status ORDER BY n DESC')).rows;
await heavy();
const miss = [], hit = [];
for (let i = 0; i < 5; i++) { const t = performance.now(); const rows = await heavy(); miss.push(performance.now() - t); await redis.set('report:revenue', JSON.stringify(rows), { EX: 60 }); }
for (let i = 0; i < 200; i++) { const t = performance.now(); JSON.parse(await redis.get('report:revenue')); hit.push(performance.now() - t); }
console.log(`database (cache miss) median ${med(miss).toFixed(0)} ms | Redis (cache hit) median ${med(hit).toFixed(2)} ms | speed-up ≈ ${(med(miss) / med(hit)).toFixed(0)}x`);

console.log('\n=== 2. three places to cache: process memory vs Redis vs the database (primary-key lookup) ===');
const lru = new LRUCache({ max: 1000, ttl: 60000 }); lru.set('product:1', { id: 1, name: 'Gel Pen' }); await redis.set('product:1', JSON.stringify({ id: 1, name: 'Gel Pen' }));
const N = 2000;
let t = performance.now(); for (let i = 0; i < 200000; i++) lru.get('product:1'); const inproc = (performance.now() - t) / 200000 * 1e6;
t = performance.now(); for (let i = 0; i < N; i++) JSON.parse(await redis.get('product:1')); const viaRedis = (performance.now() - t) / N * 1000;
t = performance.now(); for (let i = 0; i < N; i++) await pool.query('SELECT * FROM ch27.products WHERE id = 1'); const viaPg = (performance.now() - t) / N * 1000;
console.log(`in-process LRU ${inproc.toFixed(0)} ns/op | Redis GET ${viaRedis.toFixed(0)} µs/op | PostgreSQL PK lookup ${viaPg.toFixed(0)} µs/op`);

console.log('\n=== 3. the classic stale-cache race (cache-aside + invalidate on write) ===');
const key = 'product:2'; await redis.del(key);
const readDb = async (id) => (await pool.query('SELECT * FROM ch27.products WHERE id = $1', [id])).rows[0];
// Reader A misses, reads the OLD row, then gets delayed (GC pause, slow network) ...
const readerA = (async () => { const row = await readDb(2); await sleep(150); await redis.set(key, JSON.stringify(row), { EX: 300 }); return row; })();
// ... meanwhile writer B updates the database and invalidates the cache
await sleep(30);
await pool.query('UPDATE ch27.products SET price_minor = 9900, version = version + 1 WHERE id = 2'); await redis.del(key);
await readerA;
const cached = JSON.parse(await redis.get(key)); const truth = await readDb(2);
console.log(`database says price ${truth.price_minor}, cache says ${cached.price_minor}  ${cached.price_minor !== truth.price_minor ? '<- STALE until the TTL (300 s) expires, even though we invalidated on write' : ''}`);

console.log('\n--- fix: version-stamped keys. Writers bump a version; readers write only under the version they READ at the start ---');
await pool.query('UPDATE ch27.products SET price_minor = 12000, version = 1 WHERE id = 2'); await redis.flushAll(); await redis.set('ver:product:2', '1');
async function getProduct(id, { delayAfterRead = 0 } = {}) {
  const ver = await redis.get(`ver:product:${id}`);                                 // 1. learn the current version FIRST
  const k = `product:${id}:v${ver}`; const hitv = await redis.get(k); if (hitv) return JSON.parse(hitv);
  const row = await readDb(id); if (delayAfterRead) await sleep(delayAfterRead);
  await redis.set(k, JSON.stringify(row), { EX: 300 }); return row;                // 2. a delayed writer fills the OLD version's key
}
async function updatePrice(id, price) { await pool.query('UPDATE ch27.products SET price_minor = $2, version = version + 1 WHERE id = $1', [id, price]); await redis.incr(`ver:product:${id}`); }
const slowReader = getProduct(2, { delayAfterRead: 150 });
await sleep(30); await updatePrice(2, 9900);
await slowReader;
const fresh = await getProduct(2);
console.log(`after the same race: a new reader gets price ${fresh.price_minor} (database: ${(await readDb(2)).price_minor}); the stale value sits under key product:2:v1, which nobody reads any more`);

console.log('\n=== 4. in-process caches on 2 instances: incoherence, then pub/sub invalidation ===');
const inst = ['A', 'B'].map((name) => ({ name, cache: new Map() }));
for (const i of inst) i.cache.set('product:1', { name: 'Gel Pen', price_minor: 1500 });
const stale = () => inst.map((i) => `${i.name}=${i.cache.get('product:1')?.price_minor ?? 'miss'}`).join(' ');
await pool.query('UPDATE ch27.products SET price_minor = 1800 WHERE id = 1');
inst[0].cache.delete('product:1');                                              // instance A handled the write, invalidates ITS cache
console.log('after a write handled by instance A (no broadcast):', stale(), ' <- B still serves 1500 (stale until its TTL)');
await sub.subscribe('invalidate', (msg) => { for (const i of inst) i.cache.delete(msg); });
inst[1].cache.set('product:1', { name: 'Gel Pen', price_minor: 1500 }); inst[0].cache.set('product:1', { name: 'Gel Pen', price_minor: 1500 });
const t0 = performance.now(); await redis.publish('invalidate', 'product:1'); while (inst[1].cache.has('product:1')) await sleep(0);
console.log(`after publishing an invalidation on a Redis channel: ${stale()}  (propagated in ${(performance.now() - t0).toFixed(1)} ms; pub/sub is fire-and-forget, so keep a short TTL as a safety net)`);

console.log('\n=== 5. cache penetration: requests for ids that do not exist ===');
const dbHits = { n: 0 };
const lookup = async (id, negativeCaching) => {
  const k = `p:${id}`; const c = await redis.get(k); if (c !== null) return c === 'NULL' ? null : JSON.parse(c);
  dbHits.n++; const r = (await pool.query('SELECT * FROM ch27.products WHERE id = $1', [id])).rows[0] ?? null;
  if (r) await redis.set(k, JSON.stringify(r), { EX: 60 }); else if (negativeCaching) await redis.set(k, 'NULL', { EX: 30 });   // cache the "not found" briefly
  return r;
};
for (const neg of [false, true]) { await redis.flushAll(); dbHits.n = 0; for (let i = 0; i < 3000; i++) await lookup(900000 + (i % 30), neg); console.log(`${neg ? 'with' : 'without'} negative caching: 3000 requests for 30 missing ids -> ${dbHits.n} database queries`); }

await sub.quit(); await redis.quit(); await pool.query('DROP SCHEMA ch27 CASCADE'); await pool.end();
