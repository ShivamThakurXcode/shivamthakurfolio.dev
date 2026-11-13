import pg from 'pg'; import knexLib from 'knex'; import { Kysely, PostgresDialect } from 'kysely';
import { drizzle } from 'drizzle-orm/node-postgres'; import { pgTable, bigint, text, integer } from 'drizzle-orm/pg-core'; import { eq } from 'drizzle-orm';
import { conn } from './conn.mjs';
const N = 3000;
const pool = new pg.Pool({ ...conn, max: 1 });
const knex = knexLib({ client: 'pg', connection: conn, pool: { min: 1, max: 1 } });
const kysely = new Kysely({ dialect: new PostgresDialect({ pool: new pg.Pool({ ...conn, max: 1 }) }) });
const products = pgTable('products', { id: bigint({ mode: 'number' }).primaryKey(), name: text().notNull(), priceMinor: integer('price_minor').notNull() });
const drz = drizzle(new pg.Pool({ ...conn, max: 1 }));
const cases = {
  'raw pg':  (i) => pool.query('select id, name, price_minor from products where id = $1', [1 + (i % 8)]),
  'knex':    (i) => knex('products').select('id', 'name', 'price_minor').where('id', 1 + (i % 8)).first(),
  'kysely':  (i) => kysely.selectFrom('products').select(['id', 'name', 'price_minor']).where('id', '=', 1 + (i % 8)).executeTakeFirst(),
  'drizzle': (i) => drz.select({ id: products.id, name: products.name, p: products.priceMinor }).from(products).where(eq(products.id, 1 + (i % 8))),
};
for (let round = 1; round <= 2; round++) {
  for (const [name, fn] of Object.entries(cases)) {
    for (let i = 0; i < 200; i++) await fn(i);          // warm up
    const t = performance.now();
    for (let i = 0; i < N; i++) await fn(i);
    const ms = performance.now() - t;
    if (round === 2) console.log(name.padEnd(8), `${(ms / N * 1000).toFixed(0).padStart(5)} µs/query   (${N} sequential queries, 1 connection)`);
  }
}
await pool.end(); await knex.destroy(); await kysely.destroy(); await drz.$client.end();
