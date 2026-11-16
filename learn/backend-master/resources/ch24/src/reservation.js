// A cart reservation holds stock for 15 minutes, then releases it.
export const HOLD_MS = 15 * 60 * 1000;
export function makeReservations({ release, now = () => Date.now() }) {
  const held = new Map();
  return {
    hold(cartId) { const t = setTimeout(() => { held.delete(cartId); release(cartId); }, HOLD_MS); held.set(cartId, { t, until: now() + HOLD_MS }); },
    isHeld: (cartId) => held.has(cartId),
    remainingMs: (cartId) => Math.max(0, (held.get(cartId)?.until ?? 0) - now()),
  };
}
