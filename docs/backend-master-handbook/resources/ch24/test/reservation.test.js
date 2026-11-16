import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { makeReservations, HOLD_MS } from '../src/reservation.js';

test('a reservation is released after 15 minutes (fake timers: runs in milliseconds)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const released = [];
  const r = makeReservations({ release: (id) => released.push(id), now: () => Date.now() });
  r.hold('cart-1');
  assert.equal(r.isHeld('cart-1'), true);
  t.mock.timers.tick(HOLD_MS - 1);
  assert.deepEqual(released, [], 'not released one ms early');
  assert.equal(r.remainingMs('cart-1'), 1);
  t.mock.timers.tick(1);
  assert.deepEqual(released, ['cart-1']);
  assert.equal(r.isHeld('cart-1'), false);
});
