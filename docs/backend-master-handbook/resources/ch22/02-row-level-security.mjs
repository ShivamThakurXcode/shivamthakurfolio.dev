import pg from 'pg';
const SUPER = { host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline' };
const admin = new pg.Pool(SUPER);
await admin.query(`DROP ROLE IF EXISTS app_user`).catch(() => {});
await admin.query(`DROP OWNED BY app_user`).catch(() => {});
await admin.query(`DROP ROLE IF EXISTS app_user`);
await admin.query(`CREATE ROLE app_user LOGIN PASSWORD 'apppw' NOSUPERUSER NOBYPASSRLS;
  GRANT USAGE ON SCHEMA ch22 TO app_user; GRANT SELECT, INSERT, UPDATE ON ch22.orders TO app_user; GRANT SELECT ON ch22.users TO app_user;
  ALTER TABLE ch22.orders ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS tenant_isolation ON ch22.orders;
  CREATE POLICY tenant_isolation ON ch22.orders
    USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int);`);
const count = async (c, label) => console.log(label.padEnd(58), (await c.query('SELECT id, tenant_id FROM ch22.orders ORDER BY id')).rows.map((r) => `${r.id}(t${r.tenant_id})`).join(' ') || '(no rows)');

console.log('=== PostgreSQL row-level security ===');
await count(admin, 'superuser (bypasses RLS entirely!)');
const app = new pg.Pool({ ...SUPER, user: 'app_user', password: 'apppw', max: 1 });
await count(app, 'app_user, tenant NOT set (fails closed)');
const withTenant = async (tenant, fn) => { const c = await app.connect(); try { await c.query('BEGIN'); await c.query(`SELECT set_config('app.tenant_id', $1, true)`, [String(tenant)]); const r = await fn(c); await c.query('COMMIT'); return r; } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); } };
await withTenant(1, (c) => count(c, 'app_user, tenant 1 (set locally in the transaction)'));
await withTenant(2, (c) => count(c, 'app_user, tenant 2'));
try { await withTenant(1, (c) => c.query(`INSERT INTO ch22.orders (id, user_id, tenant_id, status, total_minor) VALUES (200, 1, 2, 'paid', 1)`)); }
catch (e) { console.log('tenant 1 inserting a row for tenant 2 ->', e.code, e.message); }
const upd = await withTenant(1, (c) => c.query(`UPDATE ch22.orders SET status = 'cancelled' WHERE id = 103`));
console.log('tenant 1 UPDATE on tenant 2 order 103 -> rowCount', upd.rowCount, '(row invisible, so nothing matched)');
const sql = await withTenant(1, (c) => c.query(`SELECT count(*)::int n FROM ch22.orders WHERE id = 103 OR 1 = 1`));
console.log('even a forgotten-WHERE / injected "OR 1=1" only sees tenant 1:', sql.rows[0].n, 'rows');

console.log('\n=== the pooled-connection leak: set_config(..., is_local = false) ===');
const leaky = new pg.Pool({ ...SUPER, user: 'app_user', password: 'apppw', max: 1 });
let c = await leaky.connect(); await c.query(`SELECT set_config('app.tenant_id', '2', false)`); c.release();      // request A (tenant 2) forgets to reset
c = await leaky.connect(); const r = await c.query('SELECT count(*)::int n, min(tenant_id) t FROM ch22.orders'); c.release();    // request B: no tenant set, same connection
console.log('request B never set a tenant but sees tenant', r.rows[0].t, 'rows:', r.rows[0].n, '<- session-level setting leaked through the pool');
await leaky.end();

console.log('\n=== the owner bypass: RLS does not apply to the table owner unless FORCEd ===');
await admin.query(`ALTER TABLE ch22.orders OWNER TO app_user`);
const owner = await app.connect(); console.log('as table OWNER, no tenant set sees', (await owner.query('SELECT count(*)::int n FROM ch22.orders')).rows[0].n, 'rows'); owner.release();
await admin.query(`ALTER TABLE ch22.orders FORCE ROW LEVEL SECURITY`);
const owner2 = await app.connect(); console.log('after FORCE ROW LEVEL SECURITY               sees', (await owner2.query('SELECT count(*)::int n FROM ch22.orders')).rows[0].n, 'rows'); owner2.release();

await app.end();
await admin.query(`ALTER TABLE ch22.orders NO FORCE ROW LEVEL SECURITY; ALTER TABLE ch22.orders OWNER TO postgres; DROP OWNED BY app_user; DROP ROLE app_user`);
await admin.end();
