import { MongoClient } from 'mongodb';
const client = new MongoClient('mongodb://127.0.0.1:54330/?directConnection=true');
await client.connect();
const db = client.db('perf'); await db.dropDatabase();
const orders = db.collection('orders');
const N = 200000, USERS = 20000;
const statuses = ['delivered', 'shipped', 'paid', 'pending', 'cancelled'];
const prod = ['Notebook', 'Pen', 'Backpack', 'Eraser', 'Compass', 'Ruler', 'Stapler', 'Folder'];
let t = performance.now();
for (let b = 0; b < N; b += 10000) {
  const docs = [];
  for (let i = b; i < b + 10000; i++) {
    const nItems = 1 + (i % 4);
    docs.push({ userId: 1 + (i * 7919) % USERS, status: statuses[i % 100 < 80 ? 0 : i % 100 < 88 ? 1 : i % 100 < 94 ? 2 : i % 100 < 99 ? 3 : 4],
      createdAt: new Date(Date.UTC(2025, 0, 1) + i * 157000),
      items: Array.from({ length: nItems }, (_, k) => ({ sku: prod[(i + k) % 8], qty: 1 + (i + k) % 3, price: 500 + ((i + k) % 8) * 700 })) });
  }
  await orders.insertMany(docs);
}
console.log(`inserted ${N} orders in ${((performance.now() - t) / 1000).toFixed(1)} s`);
const stats = await db.command({ collStats: 'orders' });
console.log('collection size:', (stats.size / 1e6).toFixed(1), 'MB, avg doc', Math.round(stats.avgObjSize), 'bytes');

const exp = async (label, cursorFn) => {
  const e = await cursorFn().explain('executionStats');
  const s = e.executionStats; const stage = JSON.stringify(e.queryPlanner.winningPlan).match(/"stage":"(\w+)"/g).map((x) => x.slice(9, -1)).join('>');
  console.log(label.padEnd(46), `plan=${stage.padEnd(22)} docsExamined=${String(s.totalDocsExamined).padStart(7)} keysExamined=${String(s.totalKeysExamined).padStart(6)} returned=${String(s.nReturned).padStart(5)} ${String(s.executionTimeMillis).padStart(4)} ms`);
};
console.log('\n=== indexes: explain("executionStats") ===');
await exp('userId = 1234 (no index)', () => orders.find({ userId: 1234 }));
await orders.createIndex({ userId: 1, createdAt: -1 });
await exp('userId = 1234 (index userId,createdAt)', () => orders.find({ userId: 1234 }));
await exp('latest 5 of user (sort via index)', () => orders.find({ userId: 1234 }).sort({ createdAt: -1 }).limit(5));
await exp('status = cancelled (no index)', () => orders.find({ status: 'cancelled' }));
await exp('only createdAt range (index not usable first)', () => orders.find({ createdAt: { $gte: new Date('2025-06-15'), $lt: new Date('2025-06-16') } }));
await orders.createIndex({ createdAt: 1 });
await exp('createdAt range (own index)', () => orders.find({ createdAt: { $gte: new Date('2025-06-15'), $lt: new Date('2025-06-16') } }));
await orders.createIndex({ createdAt: 1 }, { name: 'pending_by_date', partialFilterExpression: { status: 'pending' } }).catch((e) => console.log('same keys, 2nd index:', e.codeName));
await orders.createIndex({ createdAt: 1, _k: 1 }, { name: 'pending_idx', partialFilterExpression: { status: 'pending' } });
console.log('index sizes (KB):', Object.fromEntries(Object.entries((await db.command({ collStats: 'orders' })).indexSizes).map(([k, v]) => [k, Math.round(v / 1024)])));
await exp('covered query: userId -> project only indexed', () => orders.find({ userId: 1234 }, { projection: { _id: 0, userId: 1, createdAt: 1 } }));
await exp('deep skip(150000) sort createdAt', () => orders.find().sort({ createdAt: 1 }).skip(150000).limit(20));

console.log('\n=== aggregation: revenue by month and top skus ===');
const agg = await orders.aggregate([
  { $match: { status: { $ne: 'cancelled' } } },
  { $unwind: '$items' },
  { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue_minor: { $sum: { $multiply: ['$items.qty', '$items.price'] } }, orders: { $addToSet: '$_id' } } },
  { $project: { revenue_minor: 1, orders: { $size: '$orders' } } },
  { $sort: { _id: 1 } },
], { allowDiskUse: true }).toArray();
console.log(agg.slice(0, 4), '... months:', agg.length);
const top = await orders.aggregate([{ $unwind: '$items' }, { $group: { _id: '$items.sku', units: { $sum: '$items.qty' } } }, { $sort: { units: -1 } }, { $limit: 3 }]).toArray();
console.log('top skus:', top);

console.log('\n=== TTL index (auto-expire sessions) ===');
const sessions = db.collection('sessions');
await sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 1 });
await sessions.insertOne({ token: 'abc', createdAt: new Date(Date.now() - 5000) });
console.log('count right after insert:', await sessions.countDocuments());
await new Promise((r) => setTimeout(r, 65000));
console.log('count after TTL monitor (runs every 60s):', await sessions.countDocuments());
await client.close();
