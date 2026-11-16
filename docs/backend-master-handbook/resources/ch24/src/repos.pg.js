export function pgProducts(db) {
  return {
    async decrementStock(id, qty) {
      const { rows: [p] } = await db.query('UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2 RETURNING id, price_minor', [id, qty]);
      return p ? { id: Number(p.id), priceMinor: p.price_minor } : null;
    },
    async stockOf(id) { return (await db.query('SELECT stock FROM products WHERE id = $1', [id])).rows[0]?.stock; },
  };
}
export function pgOrders(db) {
  return {
    async create(o) {
      await db.query('INSERT INTO orders (id, user_id, subtotal_minor, discount_minor, shipping_minor, total_minor, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [o.id, o.userId, o.subtotal, o.discount, o.shipping, o.total, o.createdAt]);
      for (const i of o.items) await db.query('INSERT INTO order_items (order_id, product_id, qty, unit_price_minor) VALUES ($1,$2,$3,$4)', [o.id, i.productId, i.qty, i.unitPriceMinor]);
      return o;
    },
    async all() { return (await db.query('SELECT * FROM orders ORDER BY created_at')).rows; },
  };
}
export function pgUow(pool) {
  return {
    async run(fn) {
      const c = await pool.connect();
      try { await c.query('BEGIN'); const out = await fn({ products: pgProducts(c), orders: pgOrders(c) }); await c.query('COMMIT'); return out; }
      catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
      finally { c.release(); }
    },
  };
}
