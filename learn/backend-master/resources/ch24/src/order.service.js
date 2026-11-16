import { orderTotal } from './pricing.js';
import { DomainError } from './errors.js';
// `uow.run(fn)` gives fn the repositories bound to ONE transaction: all-or-nothing (Ch 16).
export function makeOrderService({ uow, clock = () => new Date(), newId = () => crypto.randomUUID() }) {
  return {
    async create({ userId, items, coupon = null }) {
      if (!items?.length) throw new DomainError('EMPTY_ORDER');
      return uow.run(async ({ products, orders }) => {
        const priced = [];
        for (const { productId, qty } of [...items].sort((a, b) => a.productId - b.productId)) {
          const p = await products.decrementStock(productId, qty);
          if (!p) throw new DomainError('OUT_OF_STOCK', `product ${productId}`);
          priced.push({ productId, qty, unitPriceMinor: p.priceMinor });
        }
        return orders.create({ id: newId(), userId, items: priced, ...orderTotal({ items: priced, coupon }), createdAt: clock() });
      });
    },
  };
}
