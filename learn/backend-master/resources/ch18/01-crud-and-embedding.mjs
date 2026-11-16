import { MongoClient, ObjectId, Decimal128 } from 'mongodb';
const client = new MongoClient('mongodb://127.0.0.1:54330/?directConnection=true');
await client.connect();
const db = client.db('shopline');
await db.dropDatabase();

console.log('=== 1. documents and BSON types ===');
const products = db.collection('products');
const r = await products.insertMany([
  { name: 'Notebook A5', price_minor: 12000, stock: 50, tags: ['paper', 'school'], attrs: { pages: 200, ruled: true }, createdAt: new Date('2026-08-01T10:00:00Z') },
  { name: 'Gel Pen', price_minor: 1500, stock: 200, tags: ['writing', 'school'], attrs: { color: 'blue' }, createdAt: new Date() },
  { name: 'Backpack', price_minor: 59900, stock: 20, tags: ['travel', 'school'], attrs: { litres: 25 }, createdAt: new Date() },
]);
console.log('insertedIds:', Object.values(r.insertedIds).map(String));
const one = await products.findOne({ name: 'Gel Pen' });
console.log('_id is ObjectId:', one._id instanceof ObjectId, '| timestamp embedded in id:', one._id.getTimestamp().toISOString().slice(0, 10), '| createdAt is Date:', one.createdAt instanceof Date);
console.log('flexible schema: attrs differ per product ->', (await products.find({}, { projection: { _id: 0, name: 1, attrs: 1 } }).toArray()).map((d) => JSON.stringify(d.attrs)).join(' | '));

console.log('\n=== 2. queries: operators, arrays, nested fields ===');
console.log('tags has school AND price<20000:', (await products.find({ tags: 'school', price_minor: { $lt: 20000 } }).project({ name: 1, _id: 0 }).toArray()).map((d) => d.name));
console.log('nested attrs.ruled:', (await products.find({ 'attrs.ruled': true }).project({ name: 1, _id: 0 }).toArray()).map((d) => d.name));
console.log('$in on array field:', (await products.countDocuments({ tags: { $in: ['travel', 'writing'] } })));
console.log('misspelled field silently matches nothing:', await products.countDocuments({ pricee_minor: { $lt: 20000 } }));

console.log('\n=== 3. update operators ===');
const up = await products.updateOne({ name: 'Gel Pen' }, { $inc: { stock: -5 }, $push: { tags: 'blue' }, $set: { 'attrs.refill': true } });
console.log('matched', up.matchedCount, 'modified', up.modifiedCount, '->', await products.findOne({ name: 'Gel Pen' }, { projection: { _id: 0, stock: 1, tags: 1, attrs: 1 } }));
const upsert = await products.updateOne({ name: 'Eraser' }, { $setOnInsert: { price_minor: 500, stock: 0 } }, { upsert: true });
console.log('upsert created:', upsert.upsertedCount, '/ second time:', (await products.updateOne({ name: 'Eraser' }, { $setOnInsert: { price_minor: 500, stock: 0 } }, { upsert: true })).upsertedCount);
const dp = await products.findOneAndUpdate({ name: 'Backpack' }, { $inc: { stock: -1 } }, { returnDocument: 'after' });
console.log('findOneAndUpdate returns new doc, stock =', dp.stock);

console.log('\n=== 4. the ShopLine order as ONE document (embedding) ===');
const users = db.collection('users'), orders = db.collection('orders');
const asha = (await users.insertOne({ email: 'asha@example.com', name: 'Asha', country: 'IN' })).insertedId;
const nb = await products.findOne({ name: 'Notebook A5' }), pen = await products.findOne({ name: 'Gel Pen' });
await orders.insertOne({
  userId: asha, status: 'paid', createdAt: new Date('2026-08-05T10:00:00Z'),
  shippingAddress: { line1: '12 MG Road', city: 'Pune', country: 'IN' },       // snapshot, like Ch 14
  items: [ { productId: nb._id, name: nb.name, qty: 2, unit_price_minor: nb.price_minor },     // snapshot of name + price
           { productId: pen._id, name: pen.name, qty: 5, unit_price_minor: pen.price_minor } ],
});
await products.updateOne({ _id: nb._id }, { $set: { price_minor: 13500, name: 'Notebook A5 (2027)' } });
const o = await orders.findOne({ userId: asha });
console.log('order read = ONE query, items inside:', o.items.map((i) => `${i.qty} x ${i.name} @ ${i.unit_price_minor}`));
console.log('product renamed/re-priced later -> order still shows the sale-time snapshot (as it should)');
console.log('total computed from the same doc:', o.items.reduce((s, i) => s + i.qty * i.unit_price_minor, 0));

console.log('\n=== 5. NO foreign keys: dangling references are possible ===');
await orders.insertOne({ userId: new ObjectId(), status: 'paid', createdAt: new Date(), items: [] });
console.log('order for a user that does not exist inserted fine; orders:', await orders.countDocuments());
await client.close();
