import express from 'express';
import pg from 'pg';
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const SUPER = { host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline' };
const admin = new pg.Pool(SUPER);
await admin.query(`DROP SCHEMA IF EXISTS ch22 CASCADE; CREATE SCHEMA ch22;
 CREATE TABLE ch22.users (id int PRIMARY KEY, name text, email text, role text NOT NULL DEFAULT 'customer', tenant_id int NOT NULL DEFAULT 1);
 CREATE TABLE ch22.orders (id int PRIMARY KEY, user_id int NOT NULL REFERENCES ch22.users(id), tenant_id int NOT NULL DEFAULT 1, status text NOT NULL, total_minor int NOT NULL, shipping_address text);
 INSERT INTO ch22.users VALUES (1,'Asha','asha@a.com','customer',1),(2,'Ravi','ravi@a.com','customer',1),(3,'Meera','meera@b.com','customer',2),(4,'Root','root@a.com','admin',1),(5,'Sam','sam@a.com','support',1);
 INSERT INTO ch22.orders VALUES (101,1,1,'paid',31500,'12 MG Road, Pune'),(102,2,1,'paid',99900,'7 Nehru St, Delhi'),(103,3,2,'shipped',5000,'9 Park Ave, Mumbai'),(104,1,1,'pending',1500,'12 MG Road, Pune');`);
const pool = new pg.Pool({ ...SUPER, options: '-c search_path=ch22' });
const KEY = crypto.randomBytes(32);
const tokenFor = (u) => new SignJWT({ role: u.role, tenant: u.tenant_id }).setProtectedHeader({ alg: 'HS256' }).setSubject(String(u.id)).setExpirationTime('10m').sign(KEY);
const authn = async (req, res, next) => {
  try { const { payload } = await jwtVerify((req.headers.authorization ?? '').slice(7), KEY, { algorithms: ['HS256'] }); req.user = { id: Number(payload.sub), role: payload.role, tenant: payload.tenant }; next(); }
  catch { res.status(401).json({ title: 'unauthenticated' }); }
};
const app = express(); app.use(express.json());

// ---------- 1. BOLA / IDOR ----------
app.get('/v1/orders/:id', authn, async (req, res) => {                  // VULNERABLE: authenticated, but whose order?
  const { rows: [o] } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  o ? res.json(o) : res.status(404).json({ title: 'not found' });
});
app.get('/v2/orders/:id', authn, async (req, res) => {                  // FIXED: ownership is part of the query
  const { rows: [o] } = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND tenant_id = $3', [req.params.id, req.user.id, req.user.tenant]);
  o ? res.json(o) : res.status(404).json({ title: 'not found' });      // 404, not 403: don't confirm the id exists
});
// ---------- 2. function-level authorization ----------
app.get('/v1/admin/users', authn, async (req, res) => res.json((await pool.query('SELECT id, email, role FROM users')).rows));     // VULNERABLE: forgot the role check
const requireRole = (...roles) => (req, res, next) => (roles.includes(req.user.role) ? next() : res.status(403).json({ title: 'forbidden' }));
app.get('/v2/admin/users', authn, requireRole('admin'), async (req, res) => res.json((await pool.query('SELECT id, email, role FROM users WHERE tenant_id = $1', [req.user.tenant])).rows));
// ---------- 3. mass assignment ----------
app.patch('/v1/me', authn, async (req, res) => {                        // VULNERABLE: client controls which columns are updated
  const cols = Object.keys(req.body); const vals = Object.values(req.body);
  const { rows: [u] } = await pool.query(`UPDATE users SET ${cols.map((c, i) => `"${c}" = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING id, name, role`, [req.user.id, ...vals]);
  res.json(u);
});
const EDITABLE = ['name', 'email'];
app.patch('/v2/me', authn, async (req, res) => {                        // FIXED: allow-list of editable fields
  const body = Object.fromEntries(Object.entries(req.body).filter(([k, v]) => EDITABLE.includes(k) && typeof v === 'string'));
  if (!Object.keys(body).length) return res.status(400).json({ title: 'nothing editable supplied' });
  const cols = Object.keys(body);
  const { rows: [u] } = await pool.query(`UPDATE users SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING id, name, role`, [req.user.id, ...Object.values(body)]);
  res.json(u);
});
// ---------- 4. policy function (one place, default deny) ----------
const POLICY = {
  'order:read':   (u, o) => o.tenant_id === u.tenant && (o.user_id === u.id || ['admin', 'support'].includes(u.role)),
  'order:cancel': (u, o) => o.tenant_id === u.tenant && o.status === 'pending' && (o.user_id === u.id || u.role === 'admin'),
  'order:refund': (u, o) => o.tenant_id === u.tenant && u.role === 'admin',
};
const can = (u, action, resource) => (POLICY[action]?.(u, resource) ?? false);
app.post('/v3/orders/:id/:action', authn, async (req, res) => {
  const { rows: [o] } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  const action = `order:${req.params.action}`;
  if (!o || !can(req.user, 'order:read', o)) return res.status(404).json({ title: 'not found' });     // can't even see it
  if (!can(req.user, action, o)) return res.status(403).json({ title: 'forbidden', action });
  res.json({ ok: true, action, order: o.id });
});
const server = app.listen(0); const base = `http://127.0.0.1:${server.address().port}`;
const U = Object.fromEntries((await pool.query('SELECT * FROM users')).rows.map((u) => [u.name, u]));
const tk = Object.fromEntries(await Promise.all(Object.entries(U).map(async ([n, u]) => [n, await tokenFor(u)])));
const call = async (who, method, path, body) => { const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tk[who] }, body: body && JSON.stringify(body) }); const t = await r.text(); return { status: r.status, body: t.slice(0, 110) }; };
const line = (l, r) => console.log(l.padEnd(52), r.status, r.body);

console.log('=== 1. BOLA / IDOR: Asha (user 1) asks for Ravi\'s order 102 and Meera\'s order 103 (another tenant) ===');
line('v1 (no ownership check)  GET /v1/orders/102', await call('Asha', 'GET', '/v1/orders/102'));
line('v1                       GET /v1/orders/103', await call('Asha', 'GET', '/v1/orders/103'));
line('v2 (scoped query)        GET /v2/orders/102', await call('Asha', 'GET', '/v2/orders/102'));
line('v2                       GET /v2/orders/103', await call('Asha', 'GET', '/v2/orders/103'));
line('v2 her own order         GET /v2/orders/101', await call('Asha', 'GET', '/v2/orders/101'));
let leaked = 0; for (let id = 100; id < 110; id++) { const r = await call('Asha', 'GET', '/v1/orders/' + id); if (r.status === 200) leaked++; }
console.log('enumerating ids 100..109 on v1 leaked', leaked, 'of 4 orders in the table (sequential ids make this trivial)');

console.log('\n=== 2. function-level: a customer calls the admin list ===');
line('v1 (forgot the role check) Asha GET /v1/admin/users', await call('Asha', 'GET', '/v1/admin/users'));
line('v2 Asha GET /v2/admin/users', await call('Asha', 'GET', '/v2/admin/users'));
line('v2 Root GET /v2/admin/users (own tenant only)', await call('Root', 'GET', '/v2/admin/users'));

console.log('\n=== 3. mass assignment: PATCH /me {"name":"Asha K","role":"admin"} ===');
line('v1 (spreads body into UPDATE)', await call('Ravi', 'PATCH', '/v1/me', { name: 'Ravi K', role: 'admin' }));
console.log('   Ravi is now:', (await pool.query('SELECT role FROM users WHERE id = 2')).rows[0].role, '<- privilege escalation by adding one JSON field');
await pool.query(`UPDATE users SET role='customer' WHERE id = 2`);
line('v2 (allow-list)', await call('Ravi', 'PATCH', '/v2/me', { name: 'Ravi K', role: 'admin' }));
console.log('   Ravi is now:', (await pool.query('SELECT role FROM users WHERE id = 2')).rows[0].role);
line('v1 column-name injection {"role\\" = \'admin\', \\"name":"x"}', await call('Ravi', 'PATCH', '/v1/me', { 'name" = \'x\', "role': 'admin' }).catch((e) => ({ status: 'err', body: e.message })));

console.log('\n=== 4. central policy: can(user, action, resource), default deny ===');
line('Asha cancels her pending order 104', await call('Asha', 'POST', '/v3/orders/104/cancel'));
line('Asha cancels her PAID order 101', await call('Asha', 'POST', '/v3/orders/101/cancel'));
line('Asha refunds her own order 101 (admin only)', await call('Asha', 'POST', '/v3/orders/101/refund'));
line('Sam (support) reads Asha\'s order 101', await call('Sam', 'POST', '/v3/orders/101/read'));
line('Sam (support) refunds order 101', await call('Sam', 'POST', '/v3/orders/101/refund'));
line('Root (admin) refunds order 101', await call('Root', 'POST', '/v3/orders/101/refund'));
line('Root (tenant 1) touches Meera\'s order 103', await call('Root', 'POST', '/v3/orders/103/refund'));
line('unknown action "delete" (not in policy)', await call('Root', 'POST', '/v3/orders/101/delete'));
console.log('anonymous call ->', (await fetch(base + '/v2/orders/101')).status);

server.close(); await pool.end(); await admin.end();
