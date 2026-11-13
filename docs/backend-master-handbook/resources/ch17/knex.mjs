import knexLib from 'knex';
import { conn } from './conn.mjs';
const knex = knexLib({ client: 'pg', connection: conn, pool: { min: 0, max: 5 } });
let log = [];
knex.on('query', (q) => log.push(q.sql + (q.bindings?.length ? '   -- ' + JSON.stringify(q.bindings) : '')));
const show = (title) => { console.log(`\n## ${title}`); log.forEach((l, i) => console.log(`  [${i + 1}] ${l}`)); log = []; };

// A. join + aggregate
const A = await knex('orders as o').join('order_items as oi', 'oi.order_id', 'o.id').where('o.user_id', 1)
  .groupBy('o.id').select('o.id', 'o.status').sum({ total: knex.raw('oi.quantity * oi.unit_price_minor') }).orderBy('o.id', 'desc').limit(3);
console.log(A); show('Knex A: orders of user 1 with totals');

// B. N+1 vs eager (manual in a query builder)
const orders = await knex('orders').where({ user_id: 1 }).select('id');
for (const o of orders) await knex('order_items').where({ order_id: o.id });
show(`Knex B1: N+1 loop (${orders.length} orders)`);
const items = await knex('order_items as oi').join('products as p', 'p.id', 'oi.product_id').whereIn('oi.order_id', orders.map((o) => o.id)).select('oi.order_id', 'p.name', 'oi.quantity');
console.log(items.length, 'items'); show('Knex B2: one batched query');

// C. dynamic filters
const f = { category: 3, maxPrice: 40000, sort: 'price_minor', dir: 'desc' };
const rows = await knex('products').modify((q) => { if (f.category) q.where('category_id', f.category); if (f.maxPrice != null) q.where('price_minor', '<=', f.maxPrice); }).orderBy(f.sort, f.dir).select('id', 'name', 'price_minor');
console.log(rows); show('Knex C: dynamic filters');

// D. transaction with deliberate rollback
try {
  await knex.transaction(async (trx) => {
    const upd = await trx('products').where('id', 1).andWhere('stock', '>=', 2).decrement('stock', 2);
    const [o] = await trx('orders').insert({ user_id: 1, status: 'paid', created_at: new Date() }).returning('id');
    await trx('order_items').insert({ order_id: o.id, product_id: 1, quantity: 2, unit_price_minor: 100 });
    console.log('updated rows', upd, 'new order', o);
    throw new Error('demo: force rollback');
  });
} catch (e) { console.log(e.message); }
show('Knex D: transaction (rolled back)');
console.log('orders after rollback:', (await knex('orders').count({ n: '*' }))[0]);

// E. injection: raw with bindings vs interpolated
const evil = "1 OR 1=1";
console.log('binding  :', (await knex.raw('select count(*)::int n from users where id = ?', [evil]).catch((e) => ({ rows: [e.message.split('\n')[0]] }))).rows);
console.log('interpolated:', (await knex.raw(`select count(*)::int n from users where id = ${evil}`)).rows, '<- every row matched');
show('Knex E: raw');
await knex.destroy();
