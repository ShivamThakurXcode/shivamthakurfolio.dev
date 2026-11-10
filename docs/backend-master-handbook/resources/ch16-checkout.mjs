import { pool, withTx, retry } from './ch16-lib.mjs';

export class OutOfStock extends Error { constructor(productId) { super(`out of stock: ${productId}`); this.code = 'OUT_OF_STOCK'; this.productId = productId; } }

// Place an order: all-or-nothing. Items are processed in product-id order (deadlock-free), stock decremented atomically.
export function placeOrder({ userId, items, idempotencyKey }) {
  return retry(() => withTx(async (c) => {
    const dup = await c.query('SELECT id FROM orders WHERE idempotency_key = $1', [idempotencyKey]);
    if (dup.rowCount) return { orderId: dup.rows[0].id, replayed: true };
    const sorted = [...items].sort((a, b) => a.productId - b.productId);
    let total = 0; const priced = [];
    for (const { productId, quantity } of sorted) {
      const { rows: [p] } = await c.query(
        'UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2 RETURNING price_minor', [productId, quantity]);
      if (!p) throw new OutOfStock(productId);
      total += p.price_minor * quantity; priced.push({ productId, quantity, price: p.price_minor });
    }
    const { rows: [o] } = await c.query(
      'INSERT INTO orders (user_id, status, total_minor, idempotency_key) VALUES ($1, $2, $3, $4) RETURNING id', [userId, 'paid', total, idempotencyKey]);
    await c.query('INSERT INTO order_items (order_id, product_id, quantity, unit_price_minor) SELECT $1, * FROM unnest($2::int[], $3::int[], $4::int[])',
      [o.id, priced.map((i) => i.productId), priced.map((i) => i.quantity), priced.map((i) => i.price)]);
    return { orderId: o.id, total, replayed: false };
  }), { tries: 8 });
}

if (process.argv[1].endsWith('ch16-checkout.mjs')) {
  await pool.query(`DROP TABLE IF EXISTS order_items, orders, products CASCADE;
    CREATE TABLE products (id int PRIMARY KEY, price_minor int NOT NULL, stock int NOT NULL CHECK (stock >= 0));
    CREATE TABLE orders (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id int, status text, total_minor int, idempotency_key text UNIQUE);
    CREATE TABLE order_items (order_id bigint REFERENCES orders(id), product_id int REFERENCES products(id), quantity int, unit_price_minor int, PRIMARY KEY (order_id, product_id));
    INSERT INTO products VALUES (1, 8000, 5), (2, 2500, 100), (3, 59900, 3);`);
  // 20 shoppers, each wants 1x product 3 (only 3 in stock) + 2x product 2; item order differs per shopper
  const jobs = Array.from({ length: 20 }, (_, i) => placeOrder({
    userId: i, idempotencyKey: `k${i}`,
    items: i % 2 ? [{ productId: 3, quantity: 1 }, { productId: 2, quantity: 2 }] : [{ productId: 2, quantity: 2 }, { productId: 3, quantity: 1 }] }));
  const rs = await Promise.allSettled(jobs);
  console.log('orders placed:', rs.filter((r) => r.status === 'fulfilled').length, ' out of stock:', rs.filter((r) => r.reason?.code === 'OUT_OF_STOCK').length, ' other errors:', rs.filter((r) => r.status === 'rejected' && r.reason.code !== 'OUT_OF_STOCK').length);
  console.log((await pool.query('SELECT id, stock FROM products ORDER BY id')).rows);
  console.log('orders rows:', (await pool.query('SELECT count(*)::int n FROM orders')).rows[0].n, ' order_items rows:', (await pool.query('SELECT count(*)::int n FROM order_items')).rows[0].n);
  console.log('stock of product 2 consumed by failed attempts (should be 0 extra):', 100 - (await pool.query('SELECT stock FROM products WHERE id=2')).rows[0].stock, 'expected', 3 * 2);
  // replay the same idempotency key
  const again = await placeOrder({ userId: 99, idempotencyKey: 'k1', items: [{ productId: 2, quantity: 2 }] }).catch((e) => e.code);
  console.log('replay of k1 ->', again);
  await pool.end();
}
