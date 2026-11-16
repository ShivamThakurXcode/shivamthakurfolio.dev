export const FREE_SHIPPING_FROM_MINOR = 50000;
export function orderTotal({ items, coupon = null, shippingMinor = 4000 }) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPriceMinor, 0);
  let discount = 0;
  if (coupon?.type === 'percent') discount = Math.round((subtotal * coupon.value) / 100);
  if (coupon?.type === 'fixed') discount = Math.min(coupon.value, subtotal);      // a coupon can never make the goods cost less than 0
  const shipping = subtotal >= FREE_SHIPPING_FROM_MINOR ? 0 : shippingMinor;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}
