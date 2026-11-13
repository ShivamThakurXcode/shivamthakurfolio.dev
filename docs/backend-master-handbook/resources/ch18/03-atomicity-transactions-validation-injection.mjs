import { MongoClient, ObjectId } from 'mongodb';
const client = new MongoClient('mongodb://127.0.0.1:54330/?directConnection=true', { maxPoolSize: 30 });
await client.connect();
const db = client.db('conc'); await db.dropDatabase();
const p = db.collection('products');

console.log('=== 1. single-document atomicity: 50 buyers, stock 10 ===');
async function race(label, buy) {
  await p.deleteMany({}); await p.insertOne({ _id: 1, stock: 10 });
  const res = await Promise.all(Array.from({ length: 50 }, buy));
  console.log(label.padEnd(28), 'confirmed =', res.filter(Boolean).length, ' final stock =', (await p.findOne({ _id: 1 })).stock);
}
await race('naive read-then-write', async () => { const d = await p.findOne({ _id: 1 }); if (d.stock < 1) return false; await new Promise((r) => setTimeout(r, 5)); await p.updateOne({ _id: 1 }, { $set: { stock: d.stock - 1 } }); return true; });
await race('atomic $inc with filter', async () => (await p.updateOne({ _id: 1, stock: { $gte: 1 } }, { $inc: { stock: -1 } })).modifiedCount === 1);

console.log('\n=== 2. multi-document transaction (needs a replica set) ===');
const accts = db.collection('accounts'); await accts.insertMany([{ _id: 'A', balance: 100 }, { _id: 'B', balance: 100 }]);
async function transfer(from, to, amt, failAfterDebit = false) {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const r = await accts.updateOne({ _id: from, balance: { $gte: amt } }, { $inc: { balance: -amt } }, { session });
      if (r.modifiedCount !== 1) throw new Error('insufficient funds');
      if (failAfterDebit) throw new Error('crash between debit and credit');
      await accts.updateOne({ _id: to }, { $inc: { balance: amt } }, { session });
    });
    return 'committed';
  } catch (e) { return 'aborted: ' + e.message; } finally { await session.endSession(); }
}
console.log('transfer 30 A->B     :', await transfer('A', 'B', 30));
console.log('crash mid-transfer   :', await transfer('A', 'B', 30, true));
console.log('overdraft 500        :', await transfer('A', 'B', 500));
console.log('balances:', await accts.find().toArray().then((d) => d.map((x) => `${x._id}=${x.balance}`).join(' ')), '(total must be 200)');
const standalone = 'standalone servers reject transactions: "Transaction numbers are only allowed on a replica set member or mongos" (documented; not run)';

console.log('\n=== 3. schema validation ($jsonSchema) ===');
await db.createCollection('items', { validator: { $jsonSchema: { bsonType: 'object', required: ['name', 'price_minor'], properties: {
  name: { bsonType: 'string', minLength: 1 }, price_minor: { bsonType: 'int', minimum: 0 }, stock: { bsonType: 'int', minimum: 0 } }, additionalProperties: true } }, validationAction: 'error' });
const items = db.collection('items');
await items.insertOne({ name: 'ok', price_minor: 100, stock: 5 }); console.log('valid doc inserted');
for (const bad of [{ name: 'x', price_minor: -5 }, { name: 'x' }, { name: 'x', price_minor: 1.5 }, { name: 'x', price_minor: '100' }]) {
  try { await items.insertOne(bad); console.log('inserted?!', JSON.stringify(bad)); } catch (e) { console.log('rejected', JSON.stringify(bad).padEnd(34), '->', e.codeName, e.code); }
}
console.log('note: JS numbers 100 arrived as int32 here; 1.5 is a double -> rejected; price_minor:100 as double would also fail');

console.log('\n=== 4. NoSQL (operator) injection on login ===');
const users = db.collection('users'); await users.insertOne({ email: 'admin@shopline.dev', password: 'S3cret!' });
const login = (body) => users.findOne({ email: body.email, password: body.password });
console.log('honest wrong password :', await login({ email: 'admin@shopline.dev', password: 'nope' }));
console.log('attack {"$ne": null}  :', !!(await login(JSON.parse('{"email":"admin@shopline.dev","password":{"$ne":null}}'))), '<- logged in without knowing the password');
const safe = (body) => { if (typeof body.email !== 'string' || typeof body.password !== 'string') throw new Error('invalid types'); return login(body); };
try { await safe(JSON.parse('{"email":"admin@shopline.dev","password":{"$ne":null}}')); } catch (e) { console.log('with type check       :', e.message); }

console.log('\n=== 5. unbounded array growth ===');
const posts = db.collection('posts'); await posts.insertOne({ _id: 'p1', comments: [] });
let n = 0; const t = performance.now();
try { for (let i = 0; i < 200; i++) { await posts.updateOne({ _id: 'p1' }, { $push: { comments: { text: 'x'.repeat(100000), i } } }); n++; } } catch (e) { console.log('failed at push #' + (n + 1) + ':', e.codeName ?? e.message.slice(0, 90)); }
console.log('comments stored before hitting the 16 MB document limit:', n);
await client.close();
