import express from 'express';
import http from 'node:http';
import crypto from 'node:crypto';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rawGet = (url, headers = {}) => new Promise((resolve, reject) => { http.get(url, { headers }, (res) => { const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })); }).on('error', reject); });
// ---------------- ORIGIN SERVER ----------------
const origin = express(); let originHits = 0; let version = 1;
origin.set('etag', 'strong');                                           // express default is a weak ETag; strong is simpler to reason about here
origin.use((req, _res, next) => { originHits++; next(); });
origin.get('/products/:id', async (req, res) => { await sleep(100); res.set('Cache-Control', 'public, max-age=0, must-revalidate').json({ id: req.params.id, name: 'Gel Pen', price_minor: 1500, version }); });
origin.get('/static/app.9f8a7c.js', (_req, res) => { res.set('Cache-Control', 'public, max-age=31536000, immutable').type('js').send('console.log("app");'.repeat(500)); });
origin.get('/feed', async (_req, res) => { await sleep(200); res.set('Cache-Control', 'public, max-age=2, stale-while-revalidate=30').json({ items: [version], generatedAt: Date.now() }); });
origin.get('/me', (_req, res) => { res.set('Cache-Control', 'private, no-store').json({ user: 'asha', cart: 3 }); });
origin.get('/lang', (req, res) => { res.set({ 'Cache-Control': 'public, max-age=60', Vary: 'Accept-Language' }).json({ greeting: req.headers['accept-language']?.startsWith('hi') ? 'नमस्ते' : 'Hello' }); });
origin.get('/search', (_req, res) => res.json({ note: 'no Cache-Control at all' }));
const originServer = await new Promise((r) => { const s = origin.listen(0, () => r(s)); }); const ORIGIN = `http://127.0.0.1:${originServer.address().port}`;

// ---------------- A MINI SHARED CACHE (what a CDN / reverse proxy does) ----------------
const store = new Map();   // key -> { status, headers, body, storedAt, etag, maxAge, swr, vary: {hdr: val} }
const parseCC = (h = '') => Object.fromEntries(h.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean).map((d) => { const [k, v] = d.split('='); return [k, v ?? true]; }));
async function fetchOrigin(url, reqHeaders, extra = {}) { return rawGet(ORIGIN + url, { ...reqHeaders, ...extra }); }
const cdn = http.createServer(async (req, res) => {
  const url = req.url; const reqHeaders = { 'accept-language': req.headers['accept-language'] ?? '' };
  const send = (entry, xcache, age) => { res.writeHead(entry.status, { ...entry.headers, 'x-cache': xcache, age: String(Math.floor(age)) }); res.end(entry.body); };
  const candidates = (store.get(url) ?? []).filter((e) => Object.entries(e.vary).every(([h, v]) => (reqHeaders[h] ?? '') === v));
  const hit = candidates[0]; const now = Date.now();
  const refreshInBackground = async (e) => { if (e.refreshing) return; e.refreshing = true; try { const r = await fetchOrigin(url, reqHeaders, e.etag ? { 'if-none-match': e.etag } : {}); if (r.status === 304) { e.storedAt = Date.now(); } else save(url, r, reqHeaders); } finally { e.refreshing = false; } };
  if (hit) {
    const age = (now - hit.storedAt) / 1000;
    if (age < hit.maxAge) return send(hit, 'HIT', age);                                              // fresh
    if (age < hit.maxAge + hit.swr) { refreshInBackground(hit); return send(hit, 'STALE (revalidating in background)', age); }   // stale-while-revalidate
    if (hit.etag) { const r = await fetchOrigin(url, reqHeaders, { 'if-none-match': hit.etag }); if (r.status === 304) { hit.storedAt = Date.now(); return send(hit, 'REVALIDATED (304 from origin, body reused)', 0); } save(url, r, reqHeaders); return send(r, 'MISS (changed)', 0); }
  }
  const r = await fetchOrigin(url, reqHeaders); save(url, r, reqHeaders); send(r, 'MISS', 0);
});
function save(url, r, reqHeaders) {
  const cc = parseCC(r.headers['cache-control']);
  if (r.status !== 200 || cc.private || cc['no-store'] || !r.headers['cache-control']) return;       // a shared cache must not store these
  const vary = {}; for (const h of (r.headers.vary ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)) vary[h] = reqHeaders[h] ?? '';
  const entry = { status: r.status, headers: r.headers, body: r.body, storedAt: Date.now(), etag: r.headers.etag, maxAge: Number(cc['s-maxage'] ?? cc['max-age'] ?? 0), swr: Number(cc['stale-while-revalidate'] ?? 0), vary };
  const list = (store.get(url) ?? []).filter((e) => JSON.stringify(e.vary) !== JSON.stringify(vary)); list.push(entry); store.set(url, list);
}
await new Promise((r) => cdn.listen(0, r)); const CDN = `http://127.0.0.1:${cdn.address().port}`;
const get = async (path, headers = {}, base = CDN) => { const t = performance.now(); const r = await rawGet(base + path, headers); const h = r.headers; return { status: r.status, x: h['x-cache'], age: h.age, cc: h['cache-control'], etag: h.etag, bytes: r.body.length, ms: performance.now() - t, body: r.body.toString() }; };
const row = (label, r) => console.log(label.padEnd(44), String(r.status).padEnd(4), String(r.x ?? '-').padEnd(40), `${r.ms.toFixed(0).padStart(4)} ms`, `${String(r.bytes).padStart(5)} B`);

console.log('=== 1. validators: ETag and conditional requests straight to the origin ===');
const a = await get('/products/1', {}, ORIGIN); console.log('first GET        :', a.status, 'ETag', a.etag, `(${a.bytes} bytes body)`);
const b = await get('/products/1', { 'If-None-Match': a.etag }, ORIGIN); console.log('If-None-Match    :', b.status, `(${b.bytes} bytes body)  <- 304 Not Modified: the client reuses its copy`);
version = 2; const c = await get('/products/1', { 'If-None-Match': a.etag }, ORIGIN); console.log('after the data changed:', c.status, `(${c.bytes} bytes)  new ETag ${c.etag} <- validator no longer matches`); version = 1;

console.log('\n=== 2. through the shared cache ===');
originHits = 0;
row('GET /static/app.9f8a7c.js (immutable, 1 year)', await get('/static/app.9f8a7c.js'));
row('GET /static/app.9f8a7c.js again', await get('/static/app.9f8a7c.js'));
row('GET /products/1 (max-age=0, must-revalidate)', await get('/products/1'));
row('GET /products/1 again: revalidates, gets 304', await get('/products/1'));
row('GET /me (private, no-store)', await get('/me')); row('GET /me again', await get('/me'));
row('GET /search (no Cache-Control)', await get('/search')); row('GET /search again', await get('/search'));
row('GET /lang  Accept-Language: en', await get('/lang', { 'Accept-Language': 'en' }));
row('GET /lang  Accept-Language: hi (Vary)', await get('/lang', { 'Accept-Language': 'hi' }));
row('GET /lang  Accept-Language: en again', await get('/lang', { 'Accept-Language': 'en' }));
row('GET /lang  Accept-Language: hi again', await get('/lang', { 'Accept-Language': 'hi' }));
console.log('origin requests so far:', originHits);

console.log('\n=== 3. stale-while-revalidate: max-age=2, swr=30, origin takes 200 ms ===');
originHits = 0; const lat = [];
let r = await get('/feed'); row('t=0 s    first request (cold)', r);
r = await get('/feed'); row('t=0 s    second request', r);
await sleep(2300);
r = await get('/feed'); row('t=2.3 s  STALE: served instantly, refresh starts', r);
await sleep(400);
r = await get('/feed'); row('t=2.7 s  fresh again (refreshed in background)', r);
console.log('origin requests for the /feed sequence:', originHits, '(4 client requests)');
console.log('\n=== 4. hit ratio and latency for 200 requests spread over 6 products ===');
store.clear(); originHits = 0; const times = []; const results = { HIT: 0, other: 0 };
for (let i = 0; i < 200; i++) { const id = 1 + Math.floor(Math.random() ** 2 * 6); const x = await get('/lang', { 'Accept-Language': 'en' }); times.push(x.ms); (x.x === 'HIT' ? results.HIT++ : results.other++); }
console.log(`hits ${results.HIT} / ${results.HIT + results.other} | origin requests ${originHits} | median latency ${times.sort((p, q) => p - q)[100].toFixed(1)} ms`);
originServer.close(); cdn.close();
