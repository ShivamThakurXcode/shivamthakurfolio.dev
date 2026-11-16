import { connect } from './lib.mjs';
const r = await connect(); await r.flushAll();
for (const policy of ['noeviction', 'allkeys-lru']) {
  await r.flushAll(); await r.configSet('maxmemory', '3mb'); await r.configSet('maxmemory-policy', policy);
  let ok = 0, err = null;
  for (let i = 0; i < 20000; i++) { try { await r.set('k' + i, 'x'.repeat(200)); ok++; } catch (e) { err = e.message.slice(0, 60); break; } }
  const info = await r.info('stats'); const ev = /evicted_keys:(\d+)/.exec(info)[1];
  console.log(policy.padEnd(12), 'writes accepted:', String(ok).padStart(5), '| keys in DB:', String(await r.dbSize()).padStart(5), '| evicted:', ev, err ? '| error: ' + err : '');
}
await r.configSet('maxmemory', '0'); await r.configSet('maxmemory-policy', 'noeviction'); await r.flushAll();
console.log('single-threaded: version', /redis_version:(\S+)/.exec(await r.info('server'))[1]);
await r.quit();
