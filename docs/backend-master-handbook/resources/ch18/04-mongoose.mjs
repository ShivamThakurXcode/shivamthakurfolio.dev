import mongoose from 'mongoose';
const { Schema } = mongoose;
await mongoose.connect('mongodb://127.0.0.1:54330/mongoose_demo?directConnection=true');
await mongoose.connection.dropDatabase();
const User = mongoose.model('User', new Schema({ email: { type: String, required: true, unique: true, lowercase: true, trim: true }, name: { type: String, required: true } }, { timestamps: true }));
const Product = mongoose.model('Product', new Schema({ name: { type: String, required: true }, price_minor: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: 'must be an integer' } }, stock: { type: Number, default: 0, min: 0 } }));
const Order = mongoose.model('Order', new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, status: { type: String, enum: ['pending', 'paid', 'shipped'], default: 'pending' },
  items: [{ product: { type: Schema.Types.ObjectId, ref: 'Product' }, name: String, qty: { type: Number, min: 1 }, unit_price_minor: Number }] }, { timestamps: true }));
await User.init(); await Order.init();

console.log('=== validation happens in Mongoose (app), not in the database ===');
for (const bad of [{ email: 'A@X.COM' }, { email: 'a@x.com', name: 'A' }]) { try { const u = await User.create(bad); console.log('created, email normalised ->', u.email); } catch (e) { console.log('ValidationError:', Object.keys(e.errors).join(','), '-', e.errors.name?.message); } }
try { await Product.create({ name: 'Pen', price_minor: 12.5 }); } catch (e) { console.log('ValidationError:', e.errors.price_minor.message); }
try { await User.create({ email: 'a@x.com', name: 'Dup' }); } catch (e) { console.log('duplicate ->', e.code, '(from the unique INDEX, in the database)'); }
console.log('bypass: collection.insertOne skips Mongoose validation ->', (await Product.collection.insertOne({ name: 'Raw', price_minor: -1 })).acknowledged, '(negative price stored!)');

const asha = await User.findOne({ email: 'a@x.com' });
const pens = await Product.create([{ name: 'Gel Pen', price_minor: 1500, stock: 10 }, { name: 'Notebook', price_minor: 12000, stock: 5 }]);
for (let i = 0; i < 5; i++) await Order.create({ user: asha._id, status: 'paid', items: pens.map((p) => ({ product: p._id, name: p.name, qty: 1 + i, unit_price_minor: p.price_minor })) });

console.log('\n=== populate = extra queries (N+1 awareness) ===');
mongoose.set('debug', (coll, method, ...args) => console.log('   mongo>', coll + '.' + method, JSON.stringify(args[0]).slice(0, 110)));
console.log('-- find + populate("user") + populate("items.product"):');
const withPop = await Order.find({ user: asha._id }).populate('user', 'name').populate('items.product', 'name').lean();
console.log('   first item product name via populate:', withPop[0].items[0].product.name, '| orders:', withPop.length);
console.log('-- find only (embedded snapshot is enough):');
const plain = await Order.find({ user: asha._id }).select('status items.name items.qty').lean();
console.log('   ', plain[0].items.map((i) => i.name + ' x' + i.qty).join(', '));
mongoose.set('debug', false);

console.log('\n=== lean() vs hydrated documents ===');
const t1 = performance.now(); for (let i = 0; i < 300; i++) await Order.find({ user: asha._id });
const t2 = performance.now(); for (let i = 0; i < 300; i++) await Order.find({ user: asha._id }).lean();
const t3 = performance.now();
console.log(`300 finds x 5 docs: hydrated ${(t2 - t1).toFixed(0)} ms vs lean ${(t3 - t2).toFixed(0)} ms`);

console.log('\n=== atomic update in Mongoose ===');
const r = await Product.updateOne({ _id: pens[0]._id, stock: { $gte: 3 } }, { $inc: { stock: -3 } });
console.log('modified:', r.modifiedCount, '-> stock', (await Product.findById(pens[0]._id).lean()).stock);
await mongoose.disconnect();
