import { DuckDBInstance } from '@duckdb/node-api';
import pg from 'pg';
const inst = await DuckDBInstance.create(':memory:'); const db = await inst.connect();
const run = async (sql) => (await db.runAndReadAll(sql)).getRowObjectsJson();
const time = async (label, fn) => { const t = performance.now(); const out = await fn(); console.log(label.padEnd(44), `${(performance.now() - t).toFixed(0).padStart(6)} ms`, JSON.stringify(out).slice(0, 110)); };
const Q = `SELECT status, count(*) n, avg(total_minor)::int avg_total, sum(total_minor) revenue FROM %s GROUP BY status ORDER BY n DESC`;
await time('DuckDB: query the CSV directly', () => run(Q.replace('%s', "read_csv('orders.csv')")));
await run("COPY (SELECT * FROM read_csv('orders.csv')) TO 'orders.parquet' (FORMAT parquet)");
await run("CREATE TABLE o AS SELECT * FROM read_csv('orders.csv')");
await time('DuckDB: in-memory table (columnar)', () => run(Q.replace('%s', 'o')));
await time('DuckDB: query the Parquet file', () => run(Q.replace('%s', "read_parquet('orders.parquet')")));
await time('DuckDB: monthly revenue (date_trunc)', () => run("SELECT date_trunc('month', created_at)::date m, sum(total_minor) FROM o GROUP BY 1 ORDER BY 1 LIMIT 3"));
const pool = new pg.Pool({ host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline', max: 1 });
await pool.query('SET max_parallel_workers_per_gather = 0');
const c = await pool.connect(); await c.query('SET max_parallel_workers_per_gather = 0');
for (let i = 0; i < 2; i++) { const t = performance.now(); const r = await c.query("SELECT status, count(*) n, avg(total_minor)::int avg_total, sum(total_minor) revenue FROM ch15.orders GROUP BY status ORDER BY n DESC"); if (i) console.log('PostgreSQL (row store, 1 worker)'.padEnd(44), `${(performance.now() - t).toFixed(0).padStart(6)} ms`, JSON.stringify(r.rows).slice(0, 110)); }
c.release(); await pool.end();
