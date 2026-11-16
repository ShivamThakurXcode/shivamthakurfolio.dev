import { connect, sleep } from './lib.mjs';
const r = await connect(); await r.flushAll();
console.log('=== 1. strings, TTL, atomic counters ===');
await r.set('greeting', 'hello', { EX: 2 });
console.log('get:', await r.get('greeting'), '| ttl:', await r.ttl('greeting'), 's');
await sleep(2200); console.log('after expiry:', await r.get('greeting'));
console.log('SET NX (only if absent):', await r.set('lock:a', '1', { NX: true }), '/', await r.set('lock:a', '2', { NX: true }));
await Promise.all(Array.from({ length: 1000 }, () => r.incr('visits')));
console.log('1000 concurrent INCR ->', await r.get('visits'), '(no lost updates; compare Ch 12 JSON file: 999 left of 1000)');
console.log('type surprise: everything is a string:', typeof await r.get('visits'));

console.log('\n=== 2. data structures ===');
await r.hSet('product:1', { name: 'Notebook A5', price_minor: '12000', stock: '50' });
await r.hIncrBy('product:1', 'stock', -3);
console.log('hash:', await r.hGetAll('product:1'));
await r.lPush('queue:emails', ['e1', 'e2', 'e3']);
console.log('list as queue (RPOP = FIFO):', await r.rPop('queue:emails'), await r.rPop('queue:emails'), '| len left', await r.lLen('queue:emails'));
await r.sAdd('tags:1', ['paper', 'school']); await r.sAdd('tags:2', ['writing', 'school']);
console.log('set intersection (common tags):', await r.sInter(['tags:1', 'tags:2']), '| members', (await r.sMembers('tags:1')).sort());
await r.zAdd('best_sellers', [{ score: 150, value: 'Backpack' }, { score: 320, value: 'Gel Pen' }, { score: 90, value: 'Compass' }]);
await r.zIncrBy('best_sellers', 40, 'Compass');
console.log('sorted set top-2:', await r.zRangeWithScores('best_sellers', 0, 1, { REV: true }), '| rank of Backpack:', await r.zRevRank('best_sellers', 'Backpack'));
for (let i = 0; i < 10000; i++) await r.pfAdd('uniq:2026-11-12', 'user' + (i % 4000));
console.log('HyperLogLog distinct (true 4000):', await r.pfCount('uniq:2026-11-12'), '| memory bytes:', await r.memoryUsage('uniq:2026-11-12'));

console.log('\n=== 3. rate limiter, fixed window (INCR + EXPIRE) ===');
async function allow(key, limit, windowSec) { const n = await r.incr(key); if (n === 1) await r.expire(key, windowSec); return n <= limit; }
const res = []; for (let i = 0; i < 15; i++) res.push(await allow('rl:ip:1.2.3.4', 10, 60));
console.log('15 requests, limit 10:', res.map((x) => (x ? 'ok' : 'X')).join(' '), '| ttl', await r.ttl('rl:ip:1.2.3.4'));
console.log('bug if the process dies between INCR and EXPIRE: key never expires (we need atomicity -> Lua, below)');

console.log('\n=== 4. atomic Lua: token-bucket style sliding window with a sorted set ===');
const sliding = `
local key, now, window, limit = KEYS[1], tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
if redis.call('ZCARD', key) < limit then redis.call('ZADD', key, now, now .. '-' .. ARGV[4]); redis.call('PEXPIRE', key, window); return 1 end
return 0`;
const sha = await r.scriptLoad(sliding);
const out = []; for (let i = 0; i < 8; i++) { out.push(await r.evalSha(sha, { keys: ['rl:sw'], arguments: [String(Date.now()), '1000', '5', String(i)] })); await sleep(50); }
console.log('8 requests in 400 ms, limit 5 per 1000 ms:', out.join(' '));
await sleep(1100);
console.log('after the window slides:', await r.evalSha(sha, { keys: ['rl:sw'], arguments: [String(Date.now()), '1000', '5', 'z'] }));

console.log('\n=== 5. distributed lock: SET NX PX + safe unlock ===');
const token = 'owner-A-' + Math.random();
console.log('A acquires:', await r.set('lock:report', token, { NX: true, PX: 400 }), '| B tries:', await r.set('lock:report', 'owner-B', { NX: true, PX: 400 }));
await sleep(500);   // A is slow; lock expired
console.log('B acquires after A\'s lease expired:', await r.set('lock:report', 'owner-B', { NX: true, PX: 5000 }));
const unsafe = await r.del('lock:report');   // A finishes late and naively DELs
console.log('A does naive DEL -> deleted', unsafe, 'key (that was B\'s lock!)');
await r.set('lock:report', 'owner-B', { NX: true, PX: 5000 });
const safeUnlock = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end`;
console.log('A safe unlock with its token ->', await r.eval(safeUnlock, { keys: ['lock:report'], arguments: [token] }), '(0 = not yours, nothing deleted)');
await r.quit();
