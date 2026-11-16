export function memoryProducts(seed) {
  const m = new Map(seed.map((p) => [p.id, { ...p }]));
  return {
    async decrementStock(id, qty) { const p = m.get(id); if (!p || p.stock < qty) return null; p.stock -= qty; return { id, priceMinor: p.priceMinor }; },
    async stockOf(id) { return m.get(id)?.stock; },
    async setStock(id, s) { const p = m.get(id); if (p) p.stock = s; },
  };
}
export function memoryOrders() {
  const list = [];
  return { async create(o) { list.push(o); return o; }, async all() { return list; } };
}
export function memoryUow(seed) {
  const products = memoryProducts(seed), orders = memoryOrders();
  return {
    products, orders,
    async run(fn) {                                   // snapshot, run, restore on failure: mimics ROLLBACK
      const snap = await Promise.all(seed.map(async (p) => [p.id, await products.stockOf(p.id)])); const n = (await orders.all()).length;
      try { return await fn({ products, orders }); }
      catch (e) { for (const [id, stock] of snap) await products.setStock?.(id, stock); (await orders.all()).length = n; throw e; }
    },
  };
}
