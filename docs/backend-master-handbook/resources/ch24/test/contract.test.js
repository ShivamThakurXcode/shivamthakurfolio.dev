import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { memoryProducts } from '../src/repos.memory.js';
import { pgProducts } from '../src/repos.pg.js';
import { testDb, SEED, seedPg } from '../support/helpers.js';

// ONE contract, run against EVERY implementation of the repository (Ch 11): the in-memory fake must behave like the real thing.
function productRepoContract(label, setup) {
  describe(`products repo contract: ${label}`, () => {
    let repo, teardown;
    beforeEach(async () => { ({ repo, teardown } = await setup()); });
    afterEach(async () => { await teardown(); });
    test('decrementStock returns the price and reduces stock', async () => {
      assert.deepEqual(await repo.decrementStock(1, 2), { id: 1, priceMinor: 12000 });
      assert.equal(await repo.stockOf(1), 3);
    });
    test('refuses to go below zero and leaves stock untouched', async () => {
      assert.equal(await repo.decrementStock(3, 2), null);
      assert.equal(await repo.stockOf(3), 1);
    });
    test('can take exactly the remaining stock (boundary)', async () => {
      assert.ok(await repo.decrementStock(3, 1));
      assert.equal(await repo.stockOf(3), 0);
      assert.equal(await repo.decrementStock(3, 1), null);
    });
    test('unknown product -> null', async () => { assert.equal(await repo.decrementStock(999, 1), null); });
  });
}
productRepoContract('in-memory fake', async () => ({ repo: memoryProducts(SEED), teardown: async () => {} }));
let db;
before(async () => { db = await testDb('contract'); });
after(async () => { await db.close(); });
productRepoContract('PostgreSQL (real database, transaction rolled back after each test)', async () => {
  const c = await db.begin(); await seedPg(c);
  return { repo: pgProducts(c), teardown: () => db.rollback(c) };
});
