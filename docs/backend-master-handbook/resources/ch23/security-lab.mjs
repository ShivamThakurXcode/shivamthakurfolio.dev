import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import dns from 'node:dns/promises';
import net from 'node:net';
import { execFile, exec } from 'node:child_process';
import { promisify } from 'node:util';
import http from 'node:http';
import crypto from 'node:crypto';
const pexec = promisify(exec), pexecFile = promisify(execFile);

// ---- an "internal" service that must never be reachable from outside ----
const internal = http.createServer((req, res) => res.end('INTERNAL-ADMIN-SECRET-42'));
await new Promise((r) => internal.listen(0, '127.0.0.1', r));
const internalPort = internal.address().port;
// ---- files: public dir + a secret outside it ----
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ch23-')); const pub = path.join(root, 'public'); fs.mkdirSync(pub);
fs.writeFileSync(path.join(pub, 'logo.txt'), 'public logo'); fs.writeFileSync(path.join(root, 'secret.txt'), 'TOP-SECRET-CONFIG');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1kb' }));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 1. XSS
app.get('/v1/search', (req, res) => res.type('html').send(`<h1>Results for ${req.query.q}</h1>`));
app.get('/v2/search', (req, res) => res.type('html').send(`<h1>Results for ${esc(req.query.q)}</h1>`));
// 2. path traversal
app.get('/v1/file', (req, res) => { try { res.send(fs.readFileSync(path.join(pub, String(req.query.f)), 'utf8')); } catch { res.status(404).send('nf'); } });
app.get('/v2/file', (req, res) => {
  const full = path.resolve(pub, String(req.query.f ?? ''));
  if (!full.startsWith(pub + path.sep)) return res.status(400).send('bad path');
  try { res.send(fs.readFileSync(full, 'utf8')); } catch { res.status(404).send('nf'); }
});
// 3. command injection
app.get('/v1/ping', async (req, res) => { try { res.send((await pexec(`echo pinging ${req.query.host}`)).stdout); } catch (e) { res.status(500).send(e.message); } });
app.get('/v2/ping', async (req, res) => {
  if (!/^[a-zA-Z0-9.-]{1,253}$/.test(String(req.query.host))) return res.status(400).send('bad host');
  res.send((await pexecFile('node', ['-e', 'console.log("pinging " + process.argv[1])', String(req.query.host)])).stdout);   // no shell; argument is data
});
// 4. SSRF
app.get('/v1/fetch', async (req, res) => { try { res.send(await (await fetch(String(req.query.url))).text()); } catch (e) { res.status(502).send('fetch failed'); } });
const isPrivate = (ip) => {
  if (net.isIPv6(ip)) return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80') || ip.startsWith('::ffff:');
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
};
const ALLOWED_HOSTS = new Set(['images.example.com']);
async function safeFetch(rawUrl) {
  const u = new URL(rawUrl);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('scheme not allowed');
  const addrs = await dns.lookup(u.hostname, { all: true });
  if (addrs.some((a) => isPrivate(a.address))) throw new Error('blocked: resolves to a private address');
  if (!ALLOWED_HOSTS.has(u.hostname)) throw new Error('blocked: host not on allow-list');
  return fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(3000) });
}
app.get('/v2/fetch', async (req, res) => { try { res.send(await (await safeFetch(String(req.query.url))).text()); } catch (e) { res.status(400).send(e.message); } });
// 5. open redirect
app.get('/v1/login-redirect', (req, res) => res.redirect(String(req.query.next)));
app.get('/v2/login-redirect', (req, res) => { const n = String(req.query.next ?? '/'); res.redirect(/^\/(?!\/|\\)[\w\-./?=&]*$/.test(n) ? n : '/'); });
// 6. CORS
app.use('/cors-bad', cors({ origin: true, credentials: true }));                    // reflects ANY origin and allows cookies
app.use('/cors-good', cors({ origin: ['https://shop.example.com'], credentials: true }));
app.get('/cors-bad/data', (req, res) => res.json({ private: 'account data' }));
app.get('/cors-good/data', (req, res) => res.json({ private: 'account data' }));
// 7. CSRF (cookie auth): Origin check + double-submit token
const SESSION = 'sess123'; const csrfToken = crypto.createHmac('sha256', 'server-secret').update(SESSION).digest('base64url');
app.post('/v1/transfer', (req, res) => (req.headers.cookie?.includes('sid=' + SESSION) ? res.json({ moved: req.body.amount }) : res.status(401).end()));
app.post('/v2/transfer', (req, res) => {
  if (!req.headers.cookie?.includes('sid=' + SESSION)) return res.status(401).end();
  const origin = req.headers.origin; if (origin && origin !== 'https://shop.example.com') return res.status(403).json({ title: 'bad origin' });
  if (req.headers['x-csrf-token'] !== csrfToken) return res.status(403).json({ title: 'bad csrf token' });
  res.json({ moved: req.body.amount });
});
// 8. prototype pollution
const naiveMerge = (t, s) => { for (const k in s) { if (s[k] && typeof s[k] === 'object') { t[k] ??= {}; naiveMerge(t[k], s[k]); } else t[k] = s[k]; } return t; };
const safeMerge = (t, s) => { for (const k of Object.keys(s)) { if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue; if (s[k] && typeof s[k] === 'object') { t[k] = Object.hasOwn(t, k) ? t[k] : {}; safeMerge(t[k], s[k]); } else t[k] = s[k]; } return t; };
app.post('/v1/settings', (req, res) => { naiveMerge({}, req.body); res.json({ ok: true }); });
// 9. helmet on a separate sub-app
const hApp = express(); hApp.use(helmet()); hApp.get('/', (_req, res) => res.send('hi')); app.use('/h', hApp);
app.use((err, _req, res, _next) => res.status(err.status ?? 500).json({ title: err.type ?? 'error' }));

const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); }); const base = `http://127.0.0.1:${server.address().port}`;
const get = async (p, h = {}) => { const r = await fetch(base + p, { headers: h, redirect: 'manual' }); return { status: r.status, body: (await r.text()).slice(0, 100).replace(/\n/g, ' '), headers: r.headers }; };
const line = (l, r) => console.log(l.padEnd(46), String(r.status).padEnd(4), r.body);
const q = encodeURIComponent;

console.log('=== 1. XSS: output encoding ===');
const payload = '<script>alert(document.cookie)</script>';
line('v1 (raw interpolation)', await get('/v1/search?q=' + q(payload)));
line('v2 (HTML-escaped)', await get('/v2/search?q=' + q(payload)));

console.log('\n=== 2. path traversal ===');
line('v1 /v1/file?f=logo.txt', await get('/v1/file?f=logo.txt'));
line('v1 /v1/file?f=../secret.txt', await get('/v1/file?f=' + q('../secret.txt')));
line('v2 /v2/file?f=../secret.txt', await get('/v2/file?f=' + q('../secret.txt')));
line('v2 /v2/file?f=logo.txt', await get('/v2/file?f=logo.txt'));
line('v2 sibling dir trick f=../public-evil/x', await get('/v2/file?f=' + q('../public-evil/x')));

console.log('\n=== 3. command injection ===');
line('v1 host="x; echo INJECTED"', await get('/v1/ping?host=' + q('x; echo INJECTED')));
line('v2 same payload', await get('/v2/ping?host=' + q('x; echo INJECTED')));
line('v2 host="example.com"', await get('/v2/ping?host=example.com'));

console.log('\n=== 4. SSRF ===');
const targets = [`http://127.0.0.1:${internalPort}/`, `http://localhost:${internalPort}/`, `http://2130706433:${internalPort}/`, `http://[::1]:${internalPort}/`, 'file:///etc/hosts'];
for (const t of targets) line('v1 fetch ' + t.slice(0, 34), await get('/v1/fetch?url=' + q(t)));
for (const t of targets.slice(0, 4)) line('v2 fetch ' + t.slice(0, 34), await get('/v2/fetch?url=' + q(t)));
line('v2 fetch http://example.org/ (not allow-listed)', await get('/v2/fetch?url=' + q('http://example.org/')));

console.log('\n=== 5. open redirect ===');
for (const n of ['/orders', '//evil.com', 'https://evil.com', '/\\evil.com']) { const a = await get('/v1/login-redirect?next=' + q(n)); const b = await get('/v2/login-redirect?next=' + q(n)); console.log(`next=${n.padEnd(18)} v1 -> ${a.headers.get('location')?.padEnd(18)} v2 -> ${b.headers.get('location')}`); }

console.log('\n=== 6. CORS ===');
for (const route of ['/cors-bad/data', '/cors-good/data']) for (const origin of ['https://evil.example', 'https://shop.example.com']) {
  const r = await get(route, { Origin: origin });
  console.log(route.padEnd(18), 'Origin:', origin.padEnd(26), '-> ACAO:', String(r.headers.get('access-control-allow-origin')).padEnd(28), 'credentials:', r.headers.get('access-control-allow-credentials'));
}

console.log('\n=== 7. CSRF on a cookie-authenticated endpoint ===');
const post = async (p, h) => { const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'sid=' + SESSION, ...h }, body: JSON.stringify({ amount: 5000 }) }); return { status: r.status, body: (await r.text()).slice(0, 60) }; };
line('v1 forged cross-site request (Origin evil)', await post('/v1/transfer', { Origin: 'https://evil.example' }));
line('v2 same forged request', await post('/v2/transfer', { Origin: 'https://evil.example' }));
line('v2 forged, spoofed good Origin but no token', await post('/v2/transfer', { Origin: 'https://shop.example.com' }));
line('v2 legit: origin + X-CSRF-Token', await post('/v2/transfer', { Origin: 'https://shop.example.com', 'X-CSRF-Token': csrfToken }));

console.log('\n=== 8. prototype pollution ===');
const evil = JSON.parse('{"__proto__": {"isAdmin": true}}');
console.log('before: ({}).isAdmin =', ({}).isAdmin);
naiveMerge({}, evil);
console.log('after naiveMerge(JSON.parse(\'{"__proto__":{"isAdmin":true}}\')): ({}).isAdmin =', ({}).isAdmin, '<- EVERY object now has isAdmin');
delete Object.prototype.isAdmin; safeMerge({}, evil);
console.log('after safeMerge: ({}).isAdmin =', ({}).isAdmin);

console.log('\n=== 10. body-size limit and JSON errors ===');
const big = await fetch(base + '/v1/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(5000) }) });
console.log('5 KB body vs 1 KB limit ->', big.status, JSON.stringify(await big.json()));
const badJson = await fetch(base + '/v1/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
console.log('malformed JSON ->', badJson.status);

console.log('\n=== 11. security headers: express default vs helmet ===');
const plain = await get('/v2/search?q=x'); const hh = await get('/h/');
console.log('without helmet:', ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy'].map((h) => `${h}=${plain.headers.get(h) ? 'set' : 'MISSING'}`).join(' '));
console.log('with helmet   :'); for (const h of ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'cross-origin-opener-policy', 'x-powered-by']) console.log('  ', h.padEnd(28), hh.headers.get(h)?.slice(0, 80) ?? '(absent)');

console.log('\n=== 12. ReDoS: catastrophic backtracking blocks the WHOLE server ===');
for (const n of [20, 24, 26, 28]) { const str = 'a'.repeat(n) + '!'; const t = performance.now(); /^(a+)+$/.test(str); console.log(`/^(a+)+$/ on ${n} a's + "!" ->`.padEnd(34), `${(performance.now() - t).toFixed(1)} ms`); }
const tSafe = performance.now(); /^a+$/.test('a'.repeat(30) + '!'); console.log('safe equivalent /^a+$/ on a 31-char input ->', (performance.now() - tSafe).toFixed(3), 'ms');
const victim = new Promise((resolve) => { const st = performance.now(); http.get(base + '/v2/search?q=hello', { agent: false }, (r) => { r.resume(); r.on('end', () => resolve(performance.now() - st)); }); });
const t1 = performance.now(); /^(a+)+$/.test('a'.repeat(28) + '!'); const blocked = performance.now() - t1;
console.log(`an innocent request sent just before a 28-char evil input took ${(await victim).toFixed(0)} ms (the evil regex held the event loop for ${blocked.toFixed(0)} ms)`);

server.close(); internal.close(); fs.rmSync(root, { recursive: true, force: true });
