import pg from 'pg';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { SignJWT } from 'jose';
import { createApp, PG } from './auth-app.mjs';

const admin = new pg.Pool({ ...PG, options: undefined });
await admin.query(`DROP SCHEMA IF EXISTS ch21 CASCADE; CREATE SCHEMA ch21;
 CREATE TABLE ch21.users (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email text NOT NULL, password_hash text NOT NULL, role text NOT NULL DEFAULT 'customer', created_at timestamptz NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX ON ch21.users (lower(email));
 CREATE TABLE ch21.refresh_tokens (token_hash text PRIMARY KEY, user_id bigint NOT NULL REFERENCES ch21.users(id), family_id uuid NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz, revoked boolean NOT NULL DEFAULT false);`);
const { app, pool, redis, JWT_SECRET } = await createApp({});
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const call = async (method, path, body, headers = {}) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, body: j, setCookie: r.headers.get('set-cookie') };
};
const show = (label, r) => console.log(label.padEnd(50), r.status, JSON.stringify(r.body).slice(0, 90));
const PW = 'S3cure-passphrase-2026';

console.log('=== registration ===');
show('register asha', await call('POST', '/register', { email: 'asha@example.com', password: PW }));
show('register asha AGAIN (no enumeration)', await call('POST', '/register', { email: 'ASHA@example.com', password: PW }));
show('register with 5-char password', await call('POST', '/register', { email: 'x@example.com', password: 'short' }));
show('register with object password (type attack)', await call('POST', '/register', { email: 'x@example.com', password: { $ne: 1 } }));
await admin.query(`UPDATE ch21.users SET role='admin' WHERE lower(email)='asha@example.com'`);
const hash = (await admin.query('SELECT password_hash FROM ch21.users')).rows[0].password_hash;
console.log('stored hash:', hash.slice(0, 40) + '...');
console.log('users in table:', (await admin.query('SELECT count(*)::int n FROM ch21.users')).rows[0].n);

console.log('\n=== cookie session ===');
const li = await call('POST', '/login/session', { email: 'asha@example.com', password: PW });
show('login', li);
console.log('Set-Cookie:', li.setCookie.replace(/sid=[^;]+/, 'sid=<256-bit random>'));
const cookie = li.setCookie.split(';')[0];
show('GET /me/session with cookie', await call('GET', '/me/session', null, { cookie }));
show('GET /me/session without cookie', await call('GET', '/me/session'));
const redisKey = (await redis.keys('sess:*'))[0];
console.log('Redis key holds only a HASH of the id:', redisKey.slice(0, 20) + '...');
show('logout', await call('POST', '/logout', null, { cookie }));
show('GET /me/session after logout (server-side revoke)', await call('GET', '/me/session', null, { cookie }));

console.log('\n=== same answer, same time: unknown user vs wrong password ===');
const a = await call('POST', '/login/token', { email: 'nobody@example.com', password: 'wrong-password-123' });
const b = await call('POST', '/login/token', { email: 'asha@example.com', password: 'wrong-password-123' });
console.log('unknown email :', a.status, JSON.stringify(a.body));
console.log('wrong password:', b.status, JSON.stringify(b.body), '(identical)');
const avg = async (email, n = 6) => {
  const xs = [];
  for (let i = 0; i < n; i++) { await redis.flushDb(); const s = performance.now(); await call('POST', '/login/token', { email, password: 'wrong-password-123' }); xs.push(performance.now() - s); }
  return xs.reduce((x, y) => x + y) / n;
};
console.log(`avg latency: unknown email ${(await avg('nobody@example.com')).toFixed(0)} ms | existing email ${(await avg('asha@example.com')).toFixed(0)} ms`);
const s0 = performance.now(); for (let i = 0; i < 5; i++) await argon2.verify(hash, 'wrong'); const realVerify = (performance.now() - s0) / 5;
console.log(`naive code (skip hashing when user unknown): unknown ~0 ms vs existing ~${realVerify.toFixed(0)} ms -> a timing oracle`);

console.log('\n=== brute-force limiter (5 / minute / ip+email) ===');
await redis.flushDb();
const codes = [];
for (let i = 0; i < 8; i++) codes.push((await call('POST', '/login/token', { email: 'asha@example.com', password: 'guess' + i })).status);
console.log('8 wrong guesses ->', codes.join(' '));
console.log('CORRECT password while limited ->', (await call('POST', '/login/token', { email: 'asha@example.com', password: PW })).status);
await redis.flushDb();

console.log('\n=== JWT access token ===');
const tok = await call('POST', '/login/token', { email: 'asha@example.com', password: PW });
const [h, p, s] = tok.body.access_token.split('.');
console.log('header :', Buffer.from(h, 'base64url').toString());
console.log('payload:', Buffer.from(p, 'base64url').toString());
const AT = tok.body.access_token;
show('GET /me/token valid', await call('GET', '/me/token', null, { authorization: 'Bearer ' + AT }));
const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url')), role: 'admin', sub: '999' })).toString('base64url');
show('tampered payload, original signature', await call('GET', '/me/token', null, { authorization: `Bearer ${h}.${forged}.${s}` }));
const none = (pl) => Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify(pl)).toString('base64url') + '.';
const claims = { sub: '1', role: 'admin', iss: 'https://api.shopline.dev', aud: 'shopline-web', exp: Math.floor(Date.now() / 1000) + 600 };
show('alg:none token claiming admin', await call('GET', '/admin/stats', null, { authorization: 'Bearer ' + none(claims) }));
const mk = (o) => new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setSubject('1').setIssuer(o.iss ?? 'https://api.shopline.dev').setAudience(o.aud ?? 'shopline-web').setIssuedAt().setExpirationTime(o.exp ?? '10m').sign(o.key ?? JWT_SECRET);
show('expired token', await call('GET', '/me/token', null, { authorization: 'Bearer ' + await mk({ exp: Math.floor(Date.now() / 1000) - 10 }) }));
show('wrong audience', await call('GET', '/me/token', null, { authorization: 'Bearer ' + await mk({ aud: 'other-service' }) }));
show('signed with a different secret', await call('GET', '/me/token', null, { authorization: 'Bearer ' + await mk({ key: crypto.randomBytes(32) }) }));
function naiveVerify(token) {
  const [hh, pp, ss] = token.split('.');
  const header = JSON.parse(Buffer.from(hh, 'base64url'));
  if (header.alg === 'none') return JSON.parse(Buffer.from(pp, 'base64url'));
  const expect = crypto.createHmac('sha256', JWT_SECRET).update(hh + '.' + pp).digest('base64url');
  if (expect !== ss) throw new Error('bad signature');
  return JSON.parse(Buffer.from(pp, 'base64url'));
}
console.log('NAIVE verifier given the alg:none token ->', JSON.stringify(naiveVerify(none({ sub: '1', role: 'admin' }))), '<- ACCEPTED');

console.log('\n=== refresh-token rotation and reuse detection ===');
const r0 = tok.body.refresh_token;
const r1 = await call('POST', '/refresh', { refresh_token: r0 });
console.log('use refresh #0 ->', r1.status, '(new access + new refresh issued)');
const r2 = await call('POST', '/refresh', { refresh_token: r1.body.refresh_token });
console.log('use refresh #1 ->', r2.status);
show('REPLAY of old refresh #0 (a stolen copy)', await call('POST', '/refresh', { refresh_token: r0 }));
show('legit holder of #2 now locked out (family revoked)', await call('POST', '/refresh', { refresh_token: r2.body.refresh_token }));
const fresh = (await call('POST', '/login/token', { email: 'asha@example.com', password: PW })).body.refresh_token;
const both = await Promise.all([call('POST', '/refresh', { refresh_token: fresh }), call('POST', '/refresh', { refresh_token: fresh })]);
console.log('two simultaneous refreshes of one token ->', both.map((x) => x.status).join(' '), '(row lock: exactly one wins)');
console.log('DB stores only hashes:', (await admin.query('SELECT token_hash FROM ch21.refresh_tokens LIMIT 1')).rows[0].token_hash.slice(0, 16) + '...');

server.close(); await pool.end(); await redis.quit(); await admin.end();
