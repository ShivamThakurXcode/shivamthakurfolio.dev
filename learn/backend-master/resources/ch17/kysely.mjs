import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import { conn } from './conn.mjs';
let log = [];
const db = new Kysely({
  dialect: new PostgresDialect({ pool: new pg.Pool({ ...conn, max: 5 }) }),
  log: (e) => { if (e.level === 'query') log.push(e.query.sql + (e.query.parameters.length ? '   -- ' + JSON.stringify(e.query.parameters) : '')); },
});
const show = (t) => { console.log(`\n## ${t}`); log.forEach((l, i) => console.log(`  [${i + 1}] ${l}`)); log = []; };

const A = await db.selectFrom('orders as o').innerJoin('order_items as oi', 'oi.order_id', 'o.id')
  .where('o.user_id', '=', 1).groupBy('o.id')
  .select(['o.id', 'o.status', sql`sum(oi.quantity * oi.unit_price_minor)`.as('total')]).orderBy('o.id', 'desc').limit(3).execute();
console.log(A); show('Kysely A: orders with totals');

// nested result in ONE query using Postgres JSON aggregation helpers
import { jsonArrayFrom } from 'kysely/helpers/postgres';
const nested = await db.selectFrom('orders as o').where('o.user_id', '=', 1).select(['o.id', 'o.status'])
  .select((eb) => jsonArrayFrom(eb.selectFrom('order_items as oi').innerJoin('products as p', 'p.id', 'oi.product_id')
    .select(['p.name', 'oi.quantity']).whereRef('oi.order_id', '=', 'o.id')).as('items'))
  .orderBy('o.id').execute();
console.log(JSON.stringify(nested[0])); show('Kysely B: nested orders+items in ONE query (json_agg subquery)');

// dynamic filters, composable
let q = db.selectFrom('products').select(['id', 'name', 'price_minor']);
const f = { category: 3, maxPrice: 40000 };
if (f.category) q = q.where('category_id', '=', f.category);
if (f.maxPrice != null) q = q.where('price_minor', '<=', f.maxPrice);
console.log(await q.orderBy('price_minor', 'desc').execute()); show('Kysely C: dynamic filters');

// ON CONFLICT upsert
await db.transaction().execute(async (trx) => {
  const r = await trx.insertInto('reviews').values({ product_id: 1, user_id: 1, rating: 2, body: 'upsert test' })
    .onConflict((oc) => oc.columns(['product_id', 'user_id']).doUpdateSet({ rating: 2, body: 'upsert test' })).returningAll().executeTakeFirst();
  console.log('upsert ->', r.rating, r.body);
  await sql`ROLLBACK`.execute(trx).catch(() => {});
});
show('Kysely D: upsert in a transaction');
await db.destroy();
