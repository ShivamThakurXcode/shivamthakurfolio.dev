import express from 'express';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import pg from 'pg';
import { createClient } from 'redis';

export const PG = { host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline', options: '-c search_path=ch21' };
const ARGON = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? crypto.randomBytes(32).toString('hex'));
const ISS = 'https://api.shopline.dev', AUD = 'shopline-web';
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

export async function createApp({ pool, redis, limits = { login: 5 } } = {}) {
  pool ??= new pg.Pool(PG);
  redis ??= createClient({ url: 'redis://127.0.0.1:54331' }).on('error', () => {});
  if (!redis.isOpen) await redis.connect();
  const DUMMY_HASH = await argon2.hash('dummy-password-for-timing', ARGON);   // verified when the user doesn't exist
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  // ---- rate limit failed logins per (ip + email), atomic INCR+EXPIRE via Lua
  const incr = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n`;
  const tooMany = async (key) => Number(await redis.eval(incr, { keys: [key], arguments: ['60'] })) > limits.login;

  async function checkCredentials(email, password) {
    const { rows: [u] } = await pool.query('SELECT id, email, password_hash, role FROM users WHERE lower(email) = lower($1)', [email]);
    const ok = await argon2.verify(u?.password_hash ?? DUMMY_HASH, password);   // ALWAYS do the slow work
    if (!u || !ok) return null;
    if (argon2.needsRehash(u.password_hash, ARGON)) await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [u.id, await argon2.hash(password, ARGON)]);
    return u;
  }
  const bad = (res) => res.status(401).json({ type: 'about:blank', title: 'Invalid credentials', status: 401 });   // same answer for every failure

  app.post('/register', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || password.length > 128)
      return res.status(400).json({ title: 'email must be valid; password 12-128 chars' });
    try {
      await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, await argon2.hash(password, ARGON)]);
    } catch (e) { if (e.code !== '23505') throw e; }                   // do NOT reveal "already registered"
    res.status(202).json({ message: 'If this email is new, the account was created.' });
  });

  // ---- cookie sessions (server-side state in Redis)
  const SESSION_TTL = 3600;
  app.post('/login/session', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ title: 'bad input' });
    if (await tooMany(`rl:login:${req.ip}:${email.toLowerCase()}`)) return res.status(429).set('Retry-After', '60').json({ title: 'Too many attempts' });
    const u = await checkCredentials(email, password);
    if (!u) return bad(res);
    const sid = newToken();                                           // NEW id at every login => no session fixation
    await redis.set(`sess:${sha256(sid)}`, JSON.stringify({ uid: u.id, role: u.role }), { EX: SESSION_TTL });
    res.cookie('sid', sid, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: SESSION_TTL * 1000, path: '/' });
    res.json({ ok: true });
  });
  const sessionAuth = async (req, res, next) => {
    const sid = /(?:^|;\s*)sid=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
    const s = sid && await redis.get(`sess:${sha256(sid)}`);
    if (!s) return res.status(401).json({ title: 'Not authenticated' });
    req.user = JSON.parse(s); req.sid = sid; next();
  };
  app.get('/me/session', sessionAuth, (req, res) => res.json({ via: 'session', ...req.user }));
  app.post('/logout', sessionAuth, async (req, res) => { await redis.del(`sess:${sha256(req.sid)}`); res.clearCookie('sid', { path: '/' }).json({ ok: true }); });

  // ---- JWT access token + rotating refresh token
  const accessToken = (u) => new SignJWT({ role: u.role }).setProtectedHeader({ alg: 'HS256' }).setSubject(String(u.id)).setIssuer(ISS).setAudience(AUD)
    .setIssuedAt().setExpirationTime('10m').setJti(crypto.randomUUID()).sign(JWT_SECRET);
  async function issueRefresh(userId, familyId = crypto.randomUUID()) {
    const token = newToken();
    await pool.query(`INSERT INTO refresh_tokens (token_hash, user_id, family_id, expires_at) VALUES ($1, $2, $3, now() + interval '30 days')`, [sha256(token), userId, familyId]);
    return token;
  }
  app.post('/login/token', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ title: 'bad input' });
    if (await tooMany(`rl:login:${req.ip}:${email.toLowerCase()}`)) return res.status(429).set('Retry-After', '60').json({ title: 'Too many attempts' });
    const u = await checkCredentials(email, password);
    if (!u) return bad(res);
    res.json({ access_token: await accessToken(u), token_type: 'Bearer', expires_in: 600, refresh_token: await issueRefresh(u.id) });
  });
  app.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body ?? {};
    if (typeof refresh_token !== 'string') return res.status(400).json({ title: 'bad input' });
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const { rows: [t] } = await c.query('SELECT * FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE', [sha256(refresh_token)]);
      if (!t || t.expires_at < new Date()) { await c.query('ROLLBACK'); return bad(res); }
      if (t.used_at) {                                                // REUSE DETECTED: a stolen token is being replayed
        await c.query('UPDATE refresh_tokens SET revoked = true WHERE family_id = $1', [t.family_id]);
        await c.query('COMMIT'); return res.status(401).json({ title: 'Refresh token reuse detected; session family revoked' });
      }
      if (t.revoked) { await c.query('ROLLBACK'); return bad(res); }
      await c.query('UPDATE refresh_tokens SET used_at = now() WHERE token_hash = $1', [t.token_hash]);
      const next = newToken();
      await c.query(`INSERT INTO refresh_tokens (token_hash, user_id, family_id, expires_at) VALUES ($1,$2,$3, now() + interval '30 days')`, [sha256(next), t.user_id, t.family_id]);
      const { rows: [u] } = await c.query('SELECT id, role FROM users WHERE id = $1', [t.user_id]);
      await c.query('COMMIT');
      res.json({ access_token: await accessToken(u), token_type: 'Bearer', expires_in: 600, refresh_token: next });
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
  });
  const bearer = async (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) return res.status(401).json({ title: 'Missing bearer token' });
    try {
      const { payload } = await jwtVerify(m[1], JWT_SECRET, { algorithms: ['HS256'], issuer: ISS, audience: AUD });   // pin alg, iss, aud; exp checked automatically
      req.user = { uid: Number(payload.sub), role: payload.role }; next();
    } catch (e) { res.status(401).json({ title: 'Invalid token', reason: e.code ?? e.name }); }
  };
  app.get('/me/token', bearer, (req, res) => res.json({ via: 'jwt', ...req.user }));
  app.get('/admin/stats', bearer, (req, res) => (req.user.role === 'admin' ? res.json({ secret: 'stats' }) : res.status(403).json({ title: 'Forbidden' })));

  app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ title: 'Internal error' }); });
  return { app, pool, redis, JWT_SECRET };
}
