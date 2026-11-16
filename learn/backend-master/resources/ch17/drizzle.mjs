import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, bigint, integer, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations, eq, and, lte, desc, sql, inArray } from 'drizzle-orm';
import pg from 'pg';
import { conn } from './conn.mjs';

const users = pgTable('users', { id: bigint({ mode: 'number' }).primaryKey(), name: text().notNull() });
const products = pgTable('products', { id: bigint({ mode: 'number' }).primaryKey(), name: text().notNull(), priceMinor: integer('price_minor').notNull(), stock: integer().notNull(), categoryId: integer('category_id').notNull(), active: boolean().notNull() });
const orders = pgTable('orders', { id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(), userId: bigint('user_id', { mode: 'number' }).notNull(), status: text().notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull() });
const orderItems = pgTable('order_items', { orderId: bigint('order_id', { mode: 'number' }).notNull(), productId: bigint('product_id', { mode: 'number' }).notNull(), quantity: integer().notNull(), unitPriceMinor: integer('unit_price_minor').notNull() });
const ordersRel = relations(orders, ({ many }) => ({ items: many(orderItems) }));
const itemsRel = relations(orderItems, ({ one }) => ({ order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }), product: one(products, { fields: [orderItems.productId], references: [products.id] }) }));

const lines = [];
const db = drizzle(new pg.Pool({ ...conn, max: 5 }), {
  schema: { users, products, orders, orderItems, ordersRel, itemsRel },
  logger: { logQuery: (q, p) => lines.push(q + (p.length ? '   -- ' + JSON.stringify(p) : '')) },
});
const show = (t) => { console.log(`\n## ${t}`); lines.forEach((l, i) => console.log(`  [${i + 1}] ${l}`)); lines.length = 0; };

const A = await db.select({ id: orders.id, status: orders.status, total: sql`sum(${orderItems.quantity} * ${orderItems.unitPriceMinor})`.mapWith(Number) })
  .from(orders).innerJoin(orderItems, eq(orderItems.orderId, orders.id)).where(eq(orders.userId, 1)).groupBy(orders.id).orderBy(desc(orders.id)).limit(3);
console.log(A); show('Drizzle A: orders with totals');

const rel = await db.query.orders.findMany({ where: eq(orders.userId, 1), with: { items: { columns: { quantity: true } } }, orderBy: orders.id, limit: 2 });
console.log(JSON.stringify(rel)); show('Drizzle B: relational query (eager loading) — look at the SQL');

const f = { category: 3, maxPrice: 40000 };
const conds = [f.category && eq(products.categoryId, f.category), f.maxPrice != null && lte(products.priceMinor, f.maxPrice)].filter(Boolean);
console.log(await db.select({ id: products.id, name: products.name }).from(products).where(and(...conds)).orderBy(desc(products.priceMinor))); show('Drizzle C: dynamic filters');

try {
  await db.transaction(async (tx) => {
    const r = await tx.update(products).set({ stock: sql`${products.stock} - 2` }).where(and(eq(products.id, 1), sql`${products.stock} >= 2`)).returning({ id: products.id, stock: products.stock });
    console.log('after decrement (inside tx):', r);
    tx.rollback();
  });
} catch (e) { console.log(e.constructor.name + ':', e.message); }
show('Drizzle D: transaction rolled back');
console.log('stock of product 1 now:', (await db.select({ stock: products.stock }).from(products).where(eq(products.id, 1)))[0]);
console.log('review (1,1):', (await db.execute(sql`select rating, body from reviews where product_id=1 and user_id=1`)).rows);
await db.$client.end();
