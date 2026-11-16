import pg from 'pg';
const BASE = { host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline' };
export async function testDb(name) {
  const schema = `t24_${name}`;
  const boot = new pg.Client(BASE); await boot.connect();
  await boot.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema};
    CREATE TABLE ${schema}.products (id bigint PRIMARY KEY, name text NOT NULL, price_minor int NOT NULL CHECK (price_minor >= 0), stock int NOT NULL CHECK (stock >= 0));
    CREATE TABLE ${schema}.orders (id uuid PRIMARY KEY, user_id int NOT NULL, subtotal_minor int NOT NULL, discount_minor int NOT NULL, shipping_minor int NOT NULL, total_minor int NOT NULL CHECK (total_minor >= 0), created_at timestamptz NOT NULL);
    CREATE TABLE ${schema}.order_items (order_id uuid NOT NULL REFERENCES ${schema}.orders(id), product_id bigint NOT NULL REFERENCES ${schema}.products(id), qty int NOT NULL CHECK (qty > 0), unit_price_minor int NOT NULL, PRIMARY KEY (order_id, product_id));`);
  await boot.end();
  const pool = new pg.Pool({ ...BASE, options: `-c search_path=${schema}`, max: 5 });
  return {
    pool,
    async begin() { const c = await pool.connect(); await c.query('BEGIN'); return c; },          // test isolation: roll back after each test
    async rollback(c) { await c.query('ROLLBACK'); c.release(); },
    async close() { await pool.end(); const c = new pg.Client(BASE); await c.connect(); await c.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await c.end(); },
  };
}
export const SEED = [{ id: 1, name: 'Notebook A5', priceMinor: 12000, stock: 5 }, { id: 2, name: 'Gel Pen', priceMinor: 1500, stock: 100 }, { id: 3, name: 'Backpack', priceMinor: 59900, stock: 1 }];
export const seedPg = (c) => Promise.all(SEED.map((p) => c.query('INSERT INTO products VALUES ($1,$2,$3,$4)', [p.id, p.name, p.priceMinor, p.stock])));
