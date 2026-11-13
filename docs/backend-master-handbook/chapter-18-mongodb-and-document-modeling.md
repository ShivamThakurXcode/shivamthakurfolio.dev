# The Backend Master Handbook

### From Absolute Beginner to Production-Grade Engineer

---

# Chapter 18: MongoDB and Document Modeling — When Documents Beat Tables (and When They Don't)

---

## 18.0 Why This Chapter Matters

PostgreSQL is the book's default database, and for most business applications it is the right one. But **MongoDB** is one of the most widely deployed databases in the world, you will meet it in jobs and in existing systems, and it genuinely is the better tool for some problems. It is also routinely **misused**, usually by developers who were told "it's schemaless, so you don't have to design anything."

That claim is the single most expensive myth in this chapter. MongoDB doesn't remove schema design; it moves it from the database into your head and your code. You still must decide what the data looks like, what's unique, what's related, and how it will be queried, and now *nothing but you* enforces it.

In this chapter we use a real **MongoDB 8.0.12** (single-node replica set in Docker) to learn:

- The **document model**: BSON, `_id`/`ObjectId`, flexible fields, nested data.
- **Embedding vs referencing**, the central design decision, and how ShopLine's order becomes a single document.
- **Indexes** and `explain()`: measured on 200,000 orders.
- The **aggregation pipeline** (MongoDB's `GROUP BY`/`JOIN`).
- **Atomicity**: single-document operations, and **multi-document transactions** (which require a replica set).
- **Schema validation** (`$jsonSchema`) and **Mongoose**.
- **NoSQL injection**, and other classic traps (16 MB documents, unbounded arrays, no foreign keys).
- A **decision guide**: MongoDB vs PostgreSQL.

### ⚠️ What was and wasn't run

Everything marked as output was executed against MongoDB **8.0.12** with the Node driver **mongodb 7.8.0** and **Mongoose 9.12.1**. **Not run:** sharding, change streams, Atlas Search/Vector Search, time-series collections, and replica-set failover, which are described briefly from documentation and clearly marked. I ran a *single-node* replica set (the minimum for transactions), not a production topology.

### 💡 Did You Know?

The name "MongoDB" comes from *hu**mongo**us*, as in enormous data. The company (originally 10gen) built it in 2007 for web-scale applications. And the 12 bytes of an `ObjectId` contain a **creation timestamp**: our first test printed the date straight out of the id (`2026-11-12`) without storing a `createdAt` field.

---

## 18.1 The Document Model

A MongoDB **database** holds **collections** (like tables) of **documents** (like rows) stored as **BSON**, a binary superset of JSON.

| PostgreSQL | MongoDB |
|---|---|
| database | database |
| table | collection |
| row | document |
| column | field |
| primary key | `_id` (auto-added `ObjectId` if you don't supply one) |
| `JOIN` | embedding, or `$lookup` in aggregation |
| `CREATE INDEX` | `createIndex` |
| schema enforced by DB | **optional** validation |

### BSON gives you more types than JSON

`ObjectId`, `Date` (a real timestamp), `Decimal128` (exact decimals for money), `Int32`, `Int64`, `Double`, binary data. Inserting three products:

```js
const r = await products.insertMany([
  { name: 'Notebook A5', price_minor: 12000, stock: 50, tags: ['paper', 'school'], attrs: { pages: 200, ruled: true }, createdAt: new Date('2026-08-01T10:00:00Z') },
  { name: 'Gel Pen',     price_minor: 1500,  stock: 200, tags: ['writing', 'school'], attrs: { color: 'blue' }, createdAt: new Date() },
  { name: 'Backpack',    price_minor: 59900, stock: 20, tags: ['travel', 'school'], attrs: { litres: 25 }, createdAt: new Date() },
]);
```
```
insertedIds: [ '6af5b099ecc2310930d3acf6', '6af5b099ecc2310930d3acf7', '6af5b099ecc2310930d3acf8' ]
_id is ObjectId: true | timestamp embedded in id: 2026-11-12 | createdAt is Date: true
flexible schema: attrs differ per product -> {"pages":200,"ruled":true} | {"color":"blue"} | {"litres":25}
```

The `attrs` field has **different shapes per document**. This flexibility is MongoDB's best feature *for the right data* (product catalogues where a notebook has `pages` and a backpack has `litres`: the problem Chapter 14 solved awkwardly with `jsonb` or EAV tables).

### 🧠 Memory Trick

**"Rows in tables" → "Documents in collections."** A document is a *self-contained object you usually read and write as a whole*. If you find yourself constantly stitching ten collections together, you're thinking relationally in a document database.

### ✅ Common Mistake: money and the number type

JavaScript numbers are doubles. Use **integer minor units** (as in Chapter 14) or `Decimal128`, never floating-point prices. The Node driver stores whole JS numbers like `12000` as 32-bit ints and `1.5` as a double. That matters in §18.8 (validation).

---

## 18.2 Queries and Updates

```js
await products.find({ tags: 'school', price_minor: { $lt: 20000 } })     // array contains + comparison
await products.find({ 'attrs.ruled': true })                              // dot notation for nested fields
await products.countDocuments({ tags: { $in: ['travel', 'writing'] } })
```
```
tags has school AND price<20000: [ 'Notebook A5', 'Gel Pen' ]
nested attrs.ruled: [ 'Notebook A5' ]
$in on array field: 2
misspelled field silently matches nothing: 0
```

That last line is the first schemaless trap: `pricee_minor` (a typo) is **not an error**. There's no schema to say that field doesn't exist; the query simply matches nothing. In SQL the same typo is an immediate error.

### Update operators change *parts* of a document, atomically

```js
await products.updateOne({ name: 'Gel Pen' },
  { $inc: { stock: -5 }, $push: { tags: 'blue' }, $set: { 'attrs.refill': true } });
```
```
matched 1 modified 1 -> { stock: 195, tags: [ 'writing', 'school', 'blue' ], attrs: { color: 'blue', refill: true } }
```

`$set`, `$inc`, `$push`, `$pull`, `$addToSet`, `$unset`, `$min/$max`, `$setOnInsert` modify fields **inside the database**, with no read-modify-write in your code. The upsert pattern:

```js
await products.updateOne({ name: 'Eraser' }, { $setOnInsert: { price_minor: 500, stock: 0 } }, { upsert: true });
// first call:  upsertedCount 1      second call: upsertedCount 0
```

`findOneAndUpdate(..., { returnDocument: 'after' })` returns the updated document in one round trip.

---

## 18.3 Modeling: Embed or Reference? (The Central Decision)

In SQL you normalize first and join later. In MongoDB you **model for your queries**: "What will I read together? What changes together?" The two tools:

- **Embed**: put related data *inside* the document (an order contains its line items).
- **Reference**: store the `_id` of another document and look it up (an order stores `userId`).

### The ShopLine order as one document

In Chapter 14 an order needed `orders` + `order_items` + snapshot columns, and Chapter 16's checkout wrote across several tables in one transaction. In MongoDB, the natural unit is **one document**:

```js
await orders.insertOne({
  userId: asha,                                   // REFERENCE (users live on their own)
  status: 'paid', createdAt: new Date('2026-08-05T10:00:00Z'),
  shippingAddress: { line1: '12 MG Road', city: 'Pune', country: 'IN' },   // EMBEDDED snapshot
  items: [                                                                  // EMBEDDED array of line items
    { productId: nb._id,  name: nb.name,  qty: 2, unit_price_minor: nb.price_minor },
    { productId: pen._id, name: pen.name, qty: 5, unit_price_minor: pen.price_minor },
  ],
});
```

We then renamed and re-priced the notebook in `products`:

```
order read = ONE query, items inside: [ '2 x Notebook A5 @ 12000', '5 x Gel Pen @ 1500' ]
product renamed/re-priced later -> order still shows the sale-time snapshot (as it should)
total computed from the same doc: 31500
```

Reading an order is **one query**, no join; its line items can't be orphaned (they only exist inside the order); and because a single-document write is **atomic** (§18.6), creating the whole order is atomic *without a transaction*. The **snapshot** idea (Ch 14) comes for free: `name` and `unit_price_minor` are copied into the line.

### The decision guide

| Question | Embed if… | Reference if… |
|---|---|---|
| **Cardinality** | One-to-few (an order's items: ≤ dozens) | One-to-many/huge (a product's reviews: thousands) or many-to-many |
| **Read together?** | Always shown together | Usually read independently |
| **Changes together?** | Written together; part-of relationship | Updated independently and often |
| **Growth** | Bounded | **Unbounded** (would hit the 16 MB limit) |
| **Shared?** | Owned by one parent | Shared across parents (a product is in many orders) |
| **Snapshot needed?** | Yes: copy what was true at the time | No: want the *current* value |

Rules of thumb: *"Embed what you read together and what is bounded; reference what is shared, huge or independently changing."*

**ShopLine's final shape:**

| Collection | Contains | Why |
|---|---|---|
| `users` | profile (+ small embedded `addresses` array) | Bounded, read together |
| `products` | product, `attrs`, `tags` | Flexible attributes |
| `orders` | embedded `items` + address snapshot; reference `userId` | Read/written as a unit |
| `reviews` | references `productId`, `userId` | Unbounded per product; queried independently |

### The price of embedding: duplication and no foreign keys

- **Duplicated data** can go stale. The line's `name` is deliberately a snapshot, but a duplicated *display name* you want to keep current (say, the user's name inside every comment) needs a plan: update many documents, or **reference instead**.
- **MongoDB has no foreign keys.** The database will happily accept an order for a user that doesn't exist:

```
order for a user that does not exist inserted fine; orders: 2
```

Referential integrity is **your application's job** (or you accept eventual cleanup). This is the single biggest philosophical difference from Chapter 14.

### 🎯 Interview Pattern

> *"Design a blog/e-commerce schema in MongoDB."* Start with **access patterns**, not entities. State what you embed (bounded, read together) and what you reference (unbounded, shared), mention duplication/snapshots and the lack of FKs, and name the limits (16 MB document, unbounded arrays). Contrast with the relational design.

---

## 18.4 Indexes and `explain()`

Indexes work like Chapter 15's B-trees, and `explain('executionStats')` is MongoDB's `EXPLAIN ANALYZE`. We loaded **200,000 orders** (about 39.5 MB, average 197 bytes each, 20,000 users, 1–4 embedded items per order) and ran queries before and after indexes.

```
userId = 1234 (no index)                      plan=COLLSCAN       docsExamined=200000 keysExamined=     0 returned=   10  132 ms
userId = 1234 (index userId,createdAt)        plan=FETCH>IXSCAN   docsExamined=    10 keysExamined=    10 returned=   10    7 ms
latest 5 of user (sort via index)             plan=LIMIT>FETCH>IXSCAN docsExamined= 5 keysExamined=     5 returned=    5    0 ms
status = cancelled (no index)                 plan=COLLSCAN       docsExamined=200000                       returned= 2000  154 ms
only createdAt range (index not usable first) plan=COLLSCAN       docsExamined=200000                       returned=  550  198 ms
createdAt range (own index)                   plan=FETCH>IXSCAN   docsExamined=   550 keysExamined=   550 returned=  550    5 ms
covered query (project only indexed fields)   plan=PROJECTION_COVERED>IXSCAN docsExamined= 0 keysExamined= 10 returned=  10    4 ms
deep skip(150000) sort createdAt              plan=LIMIT>FETCH>SKIP>IXSCAN docsExamined= 20 keysExamined=150020 returned=   20  131 ms
```

The lessons are the **same as Chapter 15**, in MongoDB's vocabulary:

- **`COLLSCAN`** (collection scan) = a sequential scan: 200,000 documents examined to return 10. **`IXSCAN`** examined exactly the 10 it returned.
- A **compound index** `{ userId: 1, createdAt: -1 }` serves equality on `userId` *and* "latest 5 for a user" with **no sort step** (5 documents examined).
- The compound index **can't help a query on `createdAt` alone** (left-prefix rule), so that query needed its own index (198 ms → 5 ms).
- **`PROJECTION_COVERED`**: if the index contains every field you project, MongoDB never touches the documents (`docsExamined: 0`).
- **`skip(150000)`** examined 150,020 *index keys*: deep offset pagination is O(offset) here too. Use a "seek" filter on the last-seen value instead (Ch 8/15's keyset idea): `find({ createdAt: { $gt: lastSeen } })`.

### More index types

```js
await orders.createIndex({ createdAt: 1 }, { name: 'pending_by_date', partialFilterExpression: { status: 'pending' } });  // partial
await sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 1 });                                                  // TTL
await users.createIndex({ email: 1 }, { unique: true });                                                                  // unique
```

- **Partial**: the pending-orders index was **132 KB** vs **2,192 KB** for the full `createdAt` index (as in Chapter 15, indexing just the hot subset).
- **TTL**: the database deletes expired documents automatically. We inserted a document already 5 s old into a collection with a 1 s TTL: right after insert `count = 1`; after waiting 65 s (the TTL monitor runs about every 60 s) `count = 0`. Perfect for sessions, one-time codes and caches; *not* a precise timer.
- **Unique**: MongoDB has no `UNIQUE` column constraint; you create a unique *index*. (Our Mongoose duplicate-email test returned error code `11000` from it.)
- Also: text, geospatial (`2dsphere`), and wildcard indexes, not demonstrated here.

### Seeing indexes' costs

Same trade-offs as PostgreSQL: each index costs RAM, disk and write speed. Our indexes: `_id_` 2,976 KB, `{userId,createdAt}` 2,536 KB, `{createdAt}` 2,192 KB.

---

## 18.5 The Aggregation Pipeline

MongoDB's analytics tool: documents flow through **stages**, each transforming the stream.

| SQL | Pipeline stage |
|---|---|
| `WHERE` | `$match` |
| `SELECT` / computed columns | `$project` / `$addFields` |
| `GROUP BY` | `$group` |
| `ORDER BY` / `LIMIT` | `$sort` / `$limit` |
| `JOIN` | `$lookup` |
| unnest an array | `$unwind` |

**Monthly revenue** (Chapter 13's query 4/11), on embedded items:

```js
const agg = await orders.aggregate([
  { $match: { status: { $ne: 'cancelled' } } },
  { $unwind: '$items' },                                          // one document per line item
  { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              revenue_minor: { $sum: { $multiply: ['$items.qty', '$items.price'] } },
              orders: { $addToSet: '$_id' } } },                  // distinct orders (fan-out lesson!)
  { $project: { revenue_minor: 1, orders: { $size: '$orders' } } },
  { $sort: { _id: 1 } },
], { allowDiskUse: true }).toArray();
```
```
{ _id: '2025-01', revenue_minor: 241639400, orders: 16890 }
{ _id: '2025-02', revenue_minor: 218246700, orders: 15255 }
{ _id: '2025-03', revenue_minor: 241619500, orders: 16889 }   ... 12 months
```

Notice `$unwind` creates the same **fan-out** as a SQL join (Ch 13 §10): one order becomes several documents, so counting orders needs `$addToSet` of ids (a `$sum: 1` would count line items). The same bug, a different syntax.

A top-N pipeline:

```js
orders.aggregate([{ $unwind: '$items' }, { $group: { _id: '$items.sku', units: { $sum: '$items.qty' } } },
                  { $sort: { units: -1 } }, { $limit: 3 }])
// [ { _id: 'Backpack', units: 150002 }, { _id: 'Notebook', units: 150001 }, { _id: 'Compass', units: 150000 } ]
```

**`$lookup`** (the join) exists, but it is a *stage that does extra work per input document*; heavy reliance on it is a sign you've modelled relationally in a document database. Put `$match` and `$project` **early** to shrink the stream, and remember pipelines can use indexes only in their leading `$match`/`$sort` stages. *(`$lookup` was not benchmarked here.)*

**When analytics get serious** (multi-collection joins, window functions, ad-hoc BI), PostgreSQL's SQL is generally more expressive; MongoDB's pipeline is excellent for per-document-shaped analytics.

---

## 18.6 Atomicity, Concurrency and Transactions

### Single-document operations are atomic

A write to **one document** (including its nested arrays) is atomic and isolated. This is why embedding is attractive: "create an order with its items" is one write. Chapter 16's oversell test, in MongoDB, with 50 concurrent buyers and stock 10:

```
naive read-then-write      confirmed = 50  final stock = 8      ← lost updates, exactly like Chapter 16
atomic $inc with filter    confirmed = 10  final stock = 0      ← correct
```

```js
const r = await p.updateOne({ _id: 1, stock: { $gte: 1 } }, { $inc: { stock: -1 } });
return r.modifiedCount === 1;                          // the same "atomic conditional update" pattern
```

**The Chapter 16 lesson transfers unchanged:** read-modify-write in application code is a race; push the condition into one atomic update operation.

### Multi-document transactions (need a replica set)

If you must change several documents atomically (a transfer between accounts), MongoDB supports ACID transactions on **replica sets and sharded clusters** (not on a standalone server, which is why my test container runs as a single-node replica set).

```js
const session = client.startSession();
await session.withTransaction(async () => {
  const r = await accts.updateOne({ _id: from, balance: { $gte: amt } }, { $inc: { balance: -amt } }, { session });
  if (r.modifiedCount !== 1) throw new Error('insufficient funds');
  await accts.updateOne({ _id: to }, { $inc: { balance: amt } }, { session });   // every operation must pass { session }
});
```
```
transfer 30 A->B     : committed
crash mid-transfer   : aborted: crash between debit and credit
overdraft 500        : aborted: insufficient funds
balances: A=70 B=130 (total must be 200)
```

The "crash" aborted after the debit; **no money vanished**. Notes:

- Pass `{ session }` on **every** operation (forgetting it is the MongoDB version of the `pool.query('BEGIN')` bug).
- `withTransaction` automatically **retries** on transient errors (like Chapter 16's retry loop).
- Transactions are **more expensive** and have time/size limits; MongoDB's own guidance is that good modelling should make them the exception, not the rule. *(I did not measure the transaction overhead.)*

### Write concern and read concern (the durability dials)

`writeConcern: { w: 'majority' }` waits until most replica-set members have the write (survives a primary failure); `readConcern` controls what snapshot you read. Defaults are sensible in recent versions, but know they exist. *(Described from documentation; not tested here, since I ran a single node.)*

---

## 18.7 Schema Validation: Putting Some Rules Back

MongoDB can enforce structure with a **`$jsonSchema` validator** on a collection:

```js
await db.createCollection('items', { validator: { $jsonSchema: {
    bsonType: 'object', required: ['name', 'price_minor'],
    properties: { name: { bsonType: 'string', minLength: 1 },
                  price_minor: { bsonType: 'int', minimum: 0 },
                  stock: { bsonType: 'int', minimum: 0 } } } },
  validationAction: 'error' });
```

Results:

```
valid doc inserted
rejected {"name":"x","price_minor":-5}      -> code 121     (below minimum)
rejected {"name":"x"}                       -> code 121     (required field missing)
rejected {"name":"x","price_minor":1.5}     -> code 121     (a double, not an int)
rejected {"name":"x","price_minor":"100"}   -> code 121     (a string)
```

Code **121** is `DocumentValidationFailure`. Observe how the driver's number typing matters: the valid insert passed `price_minor: 100` and it was stored as an `int`; `1.5` is a double and was rejected by `bsonType: 'int'`.

The recommended practice for a mature system: **flexible while prototyping, strict in production**. Validate the invariants that matter (required fields, types, ranges, enums) in the database *and* in the app. Compared with SQL: no foreign keys, no cross-document `CHECK`, so the validator covers **one document at a time**.

---

## 18.8 Mongoose (the Popular ODM)

**Mongoose** is the standard Object-Document Mapper for Node: schemas, validation, middleware, population. Our test ([resources/ch18/04-mongoose.mjs](resources/ch18/04-mongoose.mjs)):

```js
const User = mongoose.model('User', new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:  { type: String, required: true } }, { timestamps: true }));
const Product = mongoose.model('Product', new Schema({
  name: { type: String, required: true },
  price_minor: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: 'must be an integer' } },
  stock: { type: Number, default: 0, min: 0 } }));
```

```
ValidationError: name - Path `name` is required.
created, email normalised -> a@x.com                   ← lowercase + trim applied
ValidationError: must be an integer                    ← custom validator for price 12.5
duplicate -> 11000 (from the unique INDEX, in the database)
bypass: collection.insertOne skips Mongoose validation -> true (negative price stored!)
```

Important truths:

1. **Mongoose validation lives in your app**, not the database. Anything that bypasses the model (a script, another service, `Model.collection.insertOne`) bypasses it. We stored a **negative price** that way. If invariants matter, also use `$jsonSchema`.
2. **`unique: true` is just an index** declaration; the 11000 error comes from MongoDB. (Call `Model.init()` / ensure indexes are built before relying on it.)
3. Mongoose casts and normalizes inputs (lowercase, trim, number coercion), which is helpful but can surprise you.

### Populate: convenient, and N+1-shaped

`populate` is Mongoose's "join": it runs **additional queries** and stitches the results. With debugging on:

```
-- find + populate("user") + populate("items.product"):
   mongo> orders.find   {"user":"6af5…"}
   mongo> users.find    {"_id":{"$in":["6af5…"]}}
   mongo> products.find {"_id":{"$in":["…","…"]}}
-- find only (embedded snapshot is enough):
   mongo> orders.find   {"user":"6af5…"}
```

Three queries (batched with `$in`, so not literally N+1 per row, but one extra round trip per populated path) versus **one** when the data you need is embedded. This is the same lesson as Chapter 17's Prisma `include`: **count queries.** If you populate on every request, reconsider your model.

### `lean()`: skip the hydration

By default Mongoose returns rich *documents* (getters, change tracking, methods). `.lean()` returns plain JS objects:

```
300 finds x 5 docs: hydrated 7198 ms vs lean 1638 ms
```

About **4.4× faster** in this run (the hydrated loop ran first, so JIT warm-up and noise may inflate the gap; I'd expect the direction, not the exact ratio, to hold). Use `lean()` for read-only endpoints.

### Atomic updates in Mongoose

Same rule as the raw driver: prefer `Model.updateOne({ _id, stock: { $gte: 3 } }, { $inc: { stock: -3 } })` (we got `modified: 1`, stock 10 → 7) over `doc.stock -= 3; await doc.save()`, which is read-modify-write.

---

## 18.9 Classic MongoDB Traps

### 18.9.1 NoSQL (operator) injection

SQL injection has a MongoDB cousin. If a login handler passes the parsed request body straight into a query:

```js
const login = (body) => users.findOne({ email: body.email, password: body.password });
```

then an attacker sends JSON where `password` is **an object, not a string**:

```
honest wrong password : null
attack {"$ne": null}  : true  <- logged in without knowing the password
```

`{"password": {"$ne": null}}` means "password is not null", which every user satisfies. (Never store plain-text passwords as in my demo; Chapter 21 covers hashing. The demo is about the query.) **Defence:** validate the *type* of every input (Zod, Chapter 7): `typeof body.password === 'string'` made the attack fail with `invalid types`. Mongoose's `strictQuery`/`sanitizeFilter` options and `express-mongo-sanitize` help, but **type validation at the boundary is the real fix**. Also never accept raw `$where` or JavaScript from users.

### 18.9.2 The 16 MB document limit and unbounded arrays

A document may not exceed **16 MB**. If you `$push` into an array forever (comments on a post), it will, eventually, fail:

```
failed at push #168: BSONObj size: 16804626 (0x1006B12) is invalid. Size must be between 0 and 16793600(16MB)
comments stored before hitting the 16 MB document limit: 167
```

(Each fake comment was ~100 KB; real ones are smaller, but the principle holds, and large documents get slow long before 16 MB because every update rewrites more data.) **Never embed unbounded arrays**: reference instead, or use the "bucket" pattern (a document per day/page of N items).

### 18.9.3 Silent typos and missing fields

No schema means `pricee_minor` isn't an error (§18.2). Use Mongoose schemas (with `strict`), `$jsonSchema`, TypeScript types, and tests.

### 18.9.4 No foreign keys, no joins by default

Dangling references (§18.3) and expensive `$lookup`s. If your data is heavily relational, you are fighting the tool.

### 18.9.5 Unindexed queries

`COLLSCAN` is as deadly as a Postgres seq scan: run `explain` on every important query (§18.4).

### 18.9.6 Write acknowledgement

Fire-and-forget writes (`w: 0`) can silently lose data; keep acknowledged writes (default) for anything important.

---

## 18.10 MongoDB vs PostgreSQL: Choosing

| | **PostgreSQL** | **MongoDB** |
|---|---|---|
| Model | Tables, rows, relations | Collections, nested documents |
| Schema | Enforced, evolves through migrations | Optional validation, flexible per document |
| Integrity | FKs, `CHECK`, `UNIQUE`, exclusion constraints | Unique indexes + `$jsonSchema` (single-document only); no FKs |
| Joins & analytics | Excellent (SQL, window functions, CTEs) | Aggregation pipeline; `$lookup` is secondary |
| Transactions | Everywhere, cheap, mature | Single-doc atomic; multi-doc on replica sets (costlier) |
| Nested/variable data | `jsonb` (good) | Native (excellent) |
| Horizontal scaling | Read replicas; sharding needs extensions/effort | Built-in sharding |
| Developer fit | Strong with relational thinking | Strong when the object *is* the unit of work |

### Choose MongoDB when

- Your data is naturally **document-shaped** and read/written as a unit (content, catalogs with variable attributes, user profiles, event/activity payloads).
- The schema **varies per record** or evolves very fast.
- You need **built-in horizontal sharding** for very large, partitionable data sets.
- Most access is **by key or a few well-known queries** (known access patterns).

### Choose PostgreSQL when

- You have **relationships and integrity rules** (orders ↔ customers ↔ payments), money, inventory.
- You need **ad-hoc queries and reporting**, joins, window functions.
- Strong **transactions across entities** are central.
- You're unsure (**PostgreSQL's `jsonb` covers a surprising amount of "flexible" data**, and you keep FKs and SQL).

### The honest ShopLine answer

An e-commerce core (orders, payments, stock) wants **PostgreSQL**: money, FKs, transactions, reports. MongoDB could reasonably hold **the product catalogue** (variable attributes), **activity/event logs**, or **sessions**. Many real systems use both: *polyglot persistence* (Ch 20).

> **Warning:** choosing MongoDB because "it's schemaless and easy" is how teams end up re-implementing foreign keys, validation and joins in application code, badly. Choose it because the *document model fits the data*, not because it feels lighter.

---

## 18.11 Edge Cases and Gotchas Checklist

- [ ] Believing "schemaless" means "no design needed".
- [ ] Embedding unbounded arrays (16 MB limit; slow updates).
- [ ] Referencing *and* repeatedly `populate`/`$lookup`-ing: you wanted relational.
- [ ] Duplicated data without a staleness plan (or an intentional snapshot).
- [ ] Assuming foreign keys exist (they don't); orphaned references.
- [ ] Read-modify-write instead of `$inc`/`$set` with a filter.
- [ ] Forgetting `{ session }` on an operation inside a transaction.
- [ ] Transactions on a standalone server (they require a replica set).
- [ ] Passing request bodies straight into queries (operator injection); `$where` from users.
- [ ] Relying only on Mongoose validation when other writers exist.
- [ ] Money as doubles.
- [ ] Missing indexes; `COLLSCAN` on hot queries; `skip()` for deep pagination.
- [ ] Unique constraints not backed by a unique index.
- [ ] `lean()` forgotten on read-heavy endpoints; or relying on document methods after `lean()`.
- [ ] TTL treated as a precise timer (the monitor runs ~every 60 s).
- [ ] Typos in field names silently matching nothing.
- [ ] Running an unauthenticated MongoDB on a public port.

---

## 18.12 Chapter Summary

- MongoDB stores **BSON documents** in collections; `_id` is an `ObjectId` containing a timestamp. Flexible per-document shape is the key advantage; "schemaless" does **not** mean "no schema design".
- **Model for your queries**: embed what is read together and bounded (ShopLine's order with its items and address snapshot = one document, one query, one atomic write); reference what is shared, huge or independent. There are **no foreign keys**.
- Indexes and `explain()` behave like Chapter 15: `COLLSCAN` examined 200,000 docs for 10 results; a compound index `{userId, createdAt}` examined 10, and 5 for "latest 5"; covered queries examine 0 documents; partial indexes are ~16× smaller; TTL indexes expire data automatically.
- The **aggregation pipeline** (`$match`, `$unwind`, `$group`, `$sort`…) is MongoDB's analytics; `$unwind` fan-out is the same trap as SQL joins.
- Single-document writes are **atomic**: the Chapter 16 oversell race reproduced (50 confirmed, stock 8) and was fixed with `updateOne({stock:{$gte:1}}, {$inc:{stock:-1}})`. **Multi-document transactions** need a replica set and `{ session }` on every operation; the crash test rolled back cleanly.
- **`$jsonSchema`** validation enforces types/ranges per document (error 121). **Mongoose** validation lives in the app and can be bypassed (negative price stored); `populate` = extra queries; `lean()` is much faster for reads.
- Traps: **operator injection** (`{"$ne": null}` logged in), 16 MB limit (167 comments), silent typos, no FKs.
- Choose by data shape: documents read as a unit and flexible schemas → MongoDB; relationships, integrity, money and reporting → PostgreSQL (often **both**).

---

## 18.13 Revision Notes

- Collections/documents/BSON; `_id` ObjectId (has a timestamp); dates are `Date`.
- Operators: `$set $inc $push $pull $addToSet $setOnInsert`; filters `$in $lt $gte $ne`; dot notation for nested.
- Embed = bounded + read together; reference = shared/huge/independent. Snapshot what must not change.
- `explain('executionStats')`: COLLSCAN vs IXSCAN; docsExamined vs nReturned; covered = 0 docs.
- Compound index: equality, then sort/range; left prefix; TTL, partial, unique.
- Aggregation: `$match` early; `$unwind` fans out; `$lookup` sparingly.
- Atomic: single doc yes; multi-doc → replica set transaction, `{ session }` everywhere.
- Validate types at the boundary; `$jsonSchema` in the DB; Mongoose validation is app-only.
- Mongoose: `lean()` for reads; `populate` = more queries.

---

## 18.14 Mind Map (ASCII)

```
                               MONGODB
                                  │
      ┌─────────────┬─────────────┼──────────────┬───────────────────┐
   MODEL         QUERY/INDEX    ATOMICITY      SAFETY              CHOOSING
      │              │             │              │                    │
  documents      find/update    single-doc     $jsonSchema         documents as unit
  BSON/ObjectId  operators      atomic         Mongoose (app)      flexible schema
  embed vs ref   explain        $inc+filter    type validation     sharding
  snapshots      compound/TTL   transactions   operator injection  vs PostgreSQL:
  no FKs         partial/unique (replica set)  16 MB limit         integrity, joins, money
                 aggregation    {session}      unbounded arrays    ← often BOTH (polyglot)
```

---

## 18.15 Cheat Sheet

```js
db.collection('orders').find({ userId, status: { $in: ['paid','shipped'] } }).sort({ createdAt: -1 }).limit(20);
updateOne({ _id, stock: { $gte: n } }, { $inc: { stock: -n } });          // atomic check-and-write; check modifiedCount
updateOne(filter, { $setOnInsert: {...} }, { upsert: true });
createIndex({ userId: 1, createdAt: -1 });                                // equality first, then sort
createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });              // TTL
createIndex({ email: 1 }, { unique: true });
find(...).explain('executionStats');                                       // COLLSCAN? docsExamined vs nReturned
aggregate([{ $match }, { $unwind }, { $group }, { $sort }, { $limit }]);
client.startSession().withTransaction(async () => { /* every op gets { session } */ });
createCollection('x', { validator: { $jsonSchema: {...} } });
// Mongoose: Model.find().lean();   populate() = extra queries;   validate types of req.body (Zod)!
```

---

## 18.16 Key Takeaways

1. **Schemaless ≠ designless.** Model around your queries.
2. **Embed bounded, co-read data; reference the rest.** Never embed unbounded arrays.
3. **No foreign keys**: integrity is your job.
4. **Atomic single-document updates** replace most transactions; push conditions into the update.
5. **Validate the *type* of every input** (operator injection) and validate in the DB as well as the app.
6. **PostgreSQL by default; MongoDB when documents truly fit the data.**

---

## 18.17 20 Multiple Choice Questions

**Q1.** The "schemaless" claim about MongoDB is best understood as:
A) No design needed  B) The database doesn't enforce structure by default, so *you* must  C) Data has no types  D) Indexes aren't needed

**Q2.** What does an `ObjectId` contain besides randomness?
A) A checksum only  B) A creation timestamp  C) The collection name  D) The user id

**Q3.** `find({ pricee_minor: { $lt: 20000 } })` (typo) returns:
A) An error  B) An empty result, silently  C) All documents  D) A warning

**Q4.** Which is the best candidate for *embedding* in an order document?
A) All the customer's past orders  B) The order's line items (bounded)  C) The product's 50,000 reviews  D) The whole product catalogue

**Q5.** Why are the `name` and `unit_price_minor` copied into each order line?
A) Laziness  B) A snapshot of what was true at sale time  C) MongoDB requires it  D) For indexing

**Q6.** MongoDB's referential integrity is provided by:
A) Foreign keys  B) Nothing built in: the application  C) `$lookup`  D) ObjectIds

**Q7.** `docsExamined: 200000, nReturned: 10` indicates:
A) A great plan  B) A collection scan: a missing/unusable index  C) A covered query  D) A sharded query

**Q8.** A compound index `{ userId: 1, createdAt: -1 }` can answer "latest 5 orders of user X" because:
A) It's unique  B) Equality on the prefix plus index order gives sorted results without a sort stage  C) It's partial  D) TTL

**Q9.** `PROJECTION_COVERED` means:
A) The query used a transaction  B) The index contained all projected fields, so no documents were read  C) The projection failed  D) Sharding

**Q10.** In aggregation, `$unwind` on `items` before `$group` can cause:
A) Fan-out: counting orders needs distinct ids  B) Data loss  C) Index loss  D) Nothing

**Q11.** In our oversell test, "naive read-then-write" gave:
A) 10 confirmed, stock 0  B) 50 confirmed, stock 8  C) An error  D) 0 confirmed

**Q12.** The correct atomic pattern is:
A) `findOne` then `updateOne`  B) `updateOne({ stock: { $gte: 1 } }, { $inc: { stock: -1 } })` and check `modifiedCount`  C) Use `$where`  D) Lock the collection

**Q13.** Multi-document transactions in MongoDB require:
A) A standalone server  B) A replica set (or sharded cluster)  C) The Atlas cloud  D) Mongoose

**Q14.** What's the classic mistake inside `withTransaction`?
A) Using `await`  B) Forgetting to pass `{ session }` to an operation  C) Retrying  D) Using `$inc`

**Q15.** Error code 121 means:
A) Duplicate key  B) Document validation failure  C) Network error  D) Auth failure

**Q16.** Mongoose's `required`/`min` validators are enforced:
A) By the database for all writers  B) Only for writes going through the Mongoose model  C) Never  D) By the replica set

**Q17.** `populate()` is best described as:
A) A server-side join  B) Extra queries that Mongoose stitches together  C) An index  D) A cache

**Q18.** The `{"password": {"$ne": null}}` attack works because:
A) MongoDB has a bug  B) An object from the request body was used as a query operator  C) Passwords are hashed  D) TTL

**Q19.** The best fix for operator injection is:
A) Escape quotes  B) Validate that inputs have the expected primitive types at the boundary  C) Disable `$ne`  D) Use `lean()`

**Q20.** Which is a natural reason to choose PostgreSQL over MongoDB?
A) Highly variable document shapes  B) Strong relationships, money, multi-entity transactions and reporting  C) You want built-in sharding  D) Tiny prototypes

### Answer Key

| Q | A | Why |
|---|---|---|
| 1 | B | You enforce structure. |
| 2 | B | Embedded timestamp. |
| 3 | B | No schema to complain. |
| 4 | B | Bounded, read together. |
| 5 | B | Snapshot. |
| 6 | B | No FKs. |
| 7 | B | COLLSCAN. |
| 8 | B | Index order = sort order. |
| 9 | B | Covered query. |
| 10 | A | Fan-out. |
| 11 | B | 50 confirmed, stock 8 (measured). |
| 12 | B | Atomic conditional update. |
| 13 | B | Replica set required. |
| 14 | B | Operation runs outside the transaction. |
| 15 | B | DocumentValidationFailure. |
| 16 | B | App-level only. |
| 17 | B | Additional queries. |
| 18 | B | Query-operator injection. |
| 19 | B | Type validation. |
| 20 | B | Relational strengths. |

---

## 18.18 20 Hands-on Exercises

*(Follow [resources/ch18/README.txt](resources/ch18/README.txt) to start the throwaway MongoDB replica set.)*

**Easy**

1. Insert three products with different `attrs`; query by a nested field and by an array member.
2. Print the creation date from an `ObjectId`.
3. Use `$inc`, `$push` and `$set` in one `updateOne`; verify.
4. Do an upsert twice and show `upsertedCount` differences.
5. Reproduce the silent-typo query and explain why SQL would have failed.

**Medium**

6. Model ShopLine's `orders` with embedded items; fetch an order in one query; change a product's price and show the snapshot is unchanged.
7. Load 200k orders; capture `explain` before/after a compound index; compute the speedup.
8. Show that a `{userId, createdAt}` index does not help a `createdAt`-only query; fix it.
9. Create a partial index and compare its size to the full index.
10. Write the monthly-revenue pipeline; then fix a `$sum: 1` order count that wrongly counts line items.
11. Create a `$jsonSchema` validator and trigger each type of rejection.
12. Reproduce the Chapter 16 oversell race with 50 concurrent buyers and fix it atomically.

**Hard**

13. Implement a money transfer with `withTransaction`, with a failure injected after the debit; verify no money is lost.
14. Demonstrate that a transaction fails on a standalone `mongod` (start one on another port) and explain why.
15. Implement the login operator-injection attack and the Zod-based defence; add a regression test.
16. Build a bucketed comments model (50 comments per bucket doc); compare to an unbounded array at 100k comments.
17. Compare "embed the 20 latest reviews + reference the rest" vs "reference only" for a product page: queries, latency, update cost.
18. Port Chapter 13's "top product per category" query to an aggregation pipeline using `$lookup`; benchmark vs SQL.
19. Add a TTL index for sessions and write an app that tolerates the ≤60 s deletion lag.
20. Build the same small feature in PostgreSQL (with `jsonb` for attrs) and MongoDB; write a one-page comparison of code, integrity guarantees and performance.

---

## 18.19 5 Interview Questions

**1. When would you choose MongoDB over PostgreSQL?**
*Model answer:* When data is naturally document-shaped and accessed as a unit, schemas vary per record or change rapidly, access patterns are known and key-based, or I need built-in horizontal sharding. For relational data with integrity rules, money, cross-entity transactions or heavy reporting I'd choose PostgreSQL, whose `jsonb` also covers much of the flexible-data need. Many systems use both.

**2. Embedding vs referencing: how do you decide?**
*Model answer:* Embed data that is bounded, read together and changes together, and that belongs to one parent (an order's line items and address snapshot). Reference data that is shared, unbounded or updated independently (a product's reviews, users). Consider growth (16 MB limit), duplication/staleness, and whether a snapshot is desired. Model from access patterns, not entities.

**3. How do you guarantee atomicity in MongoDB?**
*Model answer:* Single-document operations are atomic, so model related data in one document when possible and use update operators with filters (`updateOne({stock:{$gte:1}}, {$inc:{stock:-1}})`). For multi-document atomicity use transactions (replica set required), passing the session to every operation and using `withTransaction` for retries; they cost more, so I design to need them rarely.

**4. What is NoSQL injection?**
*Model answer:* When untrusted input is placed into a query object and can carry operators (`{"password": {"$ne": null}}`), changing the query's meaning. Defend by validating that inputs are the expected primitive types (strings/numbers) at the boundary, using sanitization options, never accepting `$where`/server-side JS from users, and hashing passwords (the query shouldn't compare plaintext at all).

**5. MongoDB has no foreign keys. How do you keep data consistent?**
*Model answer:* Prefer embedding for owned data so consistency is a single atomic write; for references, enforce existence in the service layer (and transactions where needed), clean up orphans with jobs, use unique indexes and `$jsonSchema` for what the DB can check, and accept eventual consistency where the business allows. If integrity is central everywhere, that's a signal PostgreSQL fits better.

---

## 18.20 3 Real Projects

**Project 1: Product Catalogue Service (beginner–intermediate, ~8 hours).**
Build a REST API over MongoDB where categories define different `attrs` shapes (notebooks vs backpacks vs electronics), with `$jsonSchema` validation per category, faceted filtering with the aggregation pipeline (`$facet`), compound/partial indexes, and `explain` evidence for every query.

**Project 2: Activity Feed with Bucketing (intermediate, ~10 hours).**
Model a social/activity feed with the bucket pattern, TTL for old buckets, cursor-based pagination, and a load test comparing bucketed vs unbounded-array designs; document when each breaks (16 MB, update latency).

**Project 3: Dual-Database ShopLine (advanced, ~14 hours).**
Keep orders/payments/stock in PostgreSQL and the product catalogue and event log in MongoDB. Implement the cross-store flow (checkout reads catalogue, writes SQL, emits events), an idempotent sync between stores, and chaos tests for partial failures. Write up consistency decisions.

---

## 18.21 Further Reading

- MongoDB documentation: *Data Modeling* (embedding vs referencing, design patterns), *Indexes*, *Aggregation*, *Transactions*, *Schema Validation*, *Security Checklist*.
- *MongoDB Applied Design Patterns* and the MongoDB "Building With Patterns" blog series (bucket, subset, extended reference patterns).
- *MongoDB: The Definitive Guide* (Bradshaw, Brazil, Chodorow).
- Mongoose documentation: validation, middleware, populate, lean, `strictQuery`/`sanitizeFilter`.
- OWASP: *Testing for NoSQL Injection*.
- Jepsen.io analyses of MongoDB for what its guarantees mean under failure.

---

### Up next → Chapter 19: Redis and In-Memory Data

Databases are fast, but memory is faster. Next: Redis data structures (strings, hashes, lists, sets, sorted sets, streams), expiry, caching patterns, atomic counters and rate limiters, distributed locks (and why they're subtle), pub/sub, persistence (RDB/AOF) and the Node client, tested against a real Redis 7 container.
