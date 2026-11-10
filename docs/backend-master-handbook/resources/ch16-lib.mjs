import pg from 'pg';
export const cfg = { host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline', options: '-c search_path=ch16' };
export const pool = new pg.Pool({ ...cfg, max: 20 });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function client() { const c = new pg.Client(cfg); await c.connect(); return c; }
export async function withTx(fn, { isolation } = {}) {
  const c = await pool.connect();
  try {
    await c.query(isolation ? `BEGIN ISOLATION LEVEL ${isolation}` : 'BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
  finally { c.release(); }
}
export async function retry(fn, { tries = 6, log } = {}) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (!['40001', '40P01'].includes(e.code) || i >= tries) throw e;
      log?.(e.code); await sleep(10 * 2 ** i * Math.random());
    }
  }
}
