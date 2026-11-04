# The Backend Master Handbook

### From Absolute Beginner to Production-Grade Engineer

---

# Chapter 7: Express Mastery and Fastify — Validation, Security Middleware, Uploads and a Faster Framework

---

## 7.0 Why This Chapter Matters

At the end of Chapter 6, ShopLine could route requests, log them and fail gracefully. But it had a glaring weakness we flagged ourselves:

> **It trusts whatever clients send.**

Remember the `PATCH /products/:id` bug? A client could send `{ "id": 999, "price": -5 }` and we'd happily store it. That is not a coding slip; it's what happens whenever *input is not validated at the edge of the system*. Almost every serious web vulnerability starts with data nobody checked.

This chapter turns ShopLine into a professional-grade Express app by adding the standard layers of defense and convenience, then introduces **Fastify**, the main modern alternative.

By the end you will be able to:

- Validate and **coerce** params, queries and bodies with **Zod** schemas.
- Add **security headers**, **CORS**, **rate limiting** and **structured logging** with the standard packages, knowing what each one actually does.
- Handle **file uploads** safely.
- Explain Fastify's model (schemas, hooks, plugins) and decide between it and Express.

### 💡 Did You Know?

The Equifax breach of 2017 (about 147 million people affected) began with an unpatched web-framework vulnerability, a flaw in how the server processed a crafted request. Input handling, and keeping the libraries that do it up to date, is not a nicety; it's the front line.

---

## 7.1 The Golden Rule of Input: Parse, Don't Validate

There are two ways to deal with untrusted input.

**Validate-and-hope:** write `if` statements that check things, then keep using the original untrusted object.

```javascript
if (typeof body.price !== 'number') throw ...
// ...200 lines later someone uses body.priceee or body.isAdmin
```

**Parse into a trusted shape:** run input through a *schema* that produces a **new object** containing only the fields you declared, in the types you declared. Everything downstream uses *only* that clean object.

```
 untrusted JSON ──▶ [ SCHEMA ] ──▶ trusted, typed, minimal object ──▶ your code
                       │
                       └──▶ 422 with a precise error list if it doesn't fit
```

The second approach is the one we use. Reasons:

1. **One place** defines what valid input looks like (and it doubles as documentation).
2. **Unknown fields never reach your logic** (the end of mass assignment).
3. **Types are converted** (`"42"` → `42`) deliberately and predictably.
4. Error messages are consistent and precise.

### Real-Life Analogy: Airport Security

Passengers (requests) don't walk straight to the gate. They pass through a checkpoint where bags are scanned, liquids removed, and only approved items go through. Whatever the passenger *claims* they're carrying, only what passes the scan reaches the plane. A schema is your checkpoint.

---

## 7.2 Zod: Schemas for Everything

[Zod](https://zod.dev) is the most popular schema library in the JavaScript ecosystem. It is plain JavaScript (and fully typed if you use TypeScript).

```bash
npm install zod
```

### The basics

```javascript
import { z } from 'zod';

const Product = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
});

Product.parse({ name: '  Pen ', price: 15 });
// → { name: 'Pen', price: 15, stock: 0 }       ← trimmed, default applied

Product.safeParse({ name: '', price: -1 });
// → { success: false, error: ZodError { issues: [ ... ] } }
```

- `.parse(x)` returns the clean value or **throws**.
- `.safeParse(x)` returns `{ success, data }` or `{ success: false, error }` and **never throws**. Use this in middleware.

### A tour of what you'll use every day

```javascript
z.string()                       // text
z.string().email()               // email-shaped (z.email() in newer Zod works too)
z.string().uuid()                // UUID
z.string().min(8).max(72)        // length limits
z.number().int().positive()      // whole number > 0
z.boolean()
z.enum(['price', 'name'])        // one of a fixed set
z.array(z.string()).max(10)      // list with a cap
z.object({ ... })                // object: unknown keys are STRIPPED by default
z.strictObject({ ... })          // object: unknown keys are an ERROR
z.optional() / .optional()       // may be undefined
z.nullable()                     // may be null
z.default(0) / .default(0)       // fill in when undefined
z.coerce.number()                // convert "42" → 42 first (for query/params)
z.union([a, b]) / z.discriminatedUnion('type', [...])   // either/or shapes
.refine(fn, { message })         // custom rule
.transform(fn)                   // change the value after validation
```

### Why `coerce` exists

Query strings and URL params are **always strings** (Chapter 6). `?page=2` arrives as `"2"`. A plain `z.number()` would reject it. `z.coerce.number()` converts first, then validates (so `"abc"` still fails, correctly).

Body values from JSON are already typed (a JSON `5` is a number), so for bodies we do **not** coerce: `{"price": "5"}` should fail loudly rather than be silently accepted.

### Unknown keys: strip or reject?

| Choice | Behavior | Use when |
|---|---|---|
| `z.object` (default) | Silently drops unknown keys | Lenient APIs; evolving clients |
| `z.strictObject` | **Rejects** unknown keys | Security-sensitive writes; catches typos (`pirce`) immediately |

For writes we prefer `strictObject`: if a client sends `id` or `isAdmin`, they get a clear `422` rather than a silent no-op.

### 🧠 Memory Trick

**"Params, query, body: all three through a schema."** If untrusted input reaches your logic without passing through a schema, treat it as a bug.

---

## 7.3 A Validation Middleware for Express

We want routes to read like documentation:

```javascript
router.post('/', validate({ body: createProductBody }), handler);
```

```javascript
// src/middleware/validate.js
import { AppError } from '../errors.js';

// validate({ params, query, body }) puts parsed, coerced data in req.valid.
// (Express 5 makes req.query read-only, so we never assign back onto req.)
export const validate = (schemas) => (req, _res, next) => {
  const valid = {};
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part]);
    if (!result.success) {
      throw new AppError(422, 'Validation failed', result.error.issues.map((i) => ({
        field: [part, ...i.path].join('.'),
        message: i.message,
      })));
    }
    valid[part] = result.data;
  }
  req.valid = valid;
  next();
};
```

Two design decisions worth noticing:

1. **It's a factory** (`validate(...)` returns the middleware), the configurable-middleware pattern from Chapter 6.
2. **Results go in `req.valid`**, not back onto `req.query`/`req.body`. In Express 5, `req.query` is a read-only getter. Reassigning it fails silently or throws. Handlers read `req.valid.query.page` (a real number), never raw `req.query`.

### Schemas for ShopLine: `src/schemas/product.js`

```javascript
import { z } from 'zod';

export const idParams = z.object({ id: z.coerce.number().int().positive() });

// Base fields WITHOUT defaults. A default would silently overwrite data on PATCH.
const fields = {
  name: z.string().trim().min(1).max(100),
  price: z.number().nonnegative().max(1_000_000),
  stock: z.number().int().nonnegative(),
};

export const createProductBody = z.strictObject({ ...fields, stock: fields.stock.default(0) });

// PATCH: every field optional, but at least one must be present
export const updateProductBody = z.strictObject(fields)
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

export const listProductsQuery = z.object({
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(['price', 'name']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

### 🐛 A real bug I hit while writing this chapter (and why it's instructive)

My first draft built the update schema as `createProductBody.partial()`. It looked right. But `createProductBody` had `stock: ….default(0)`, and **`.partial()` keeps defaults**. Result: `PATCH /products/1 {"price": 130}` silently **reset `stock` from 50 to 0**, and `PATCH {}` (nothing to change) *succeeded* because the default made the object non-empty.

Lessons that apply far beyond Zod:

- **Defaults belong to creation, not to updates.** A "default" on a partial update is data loss.
- **Test the unhappy paths and the "nothing changed" path**, not only the happy one.
- **Derive schemas deliberately** instead of cloning one for two purposes.

The fix is the structure above: share the fields *without* defaults, add the default only for create.

### The routes, now clean

```javascript
// src/routes/products.js
import { Router } from 'express';
import { productStore } from '../store.js';
import { notFound } from '../errors.js';
import { validate } from '../middleware/validate.js';
import { idParams, createProductBody, updateProductBody, listProductsQuery } from '../schemas/product.js';

export const productsRouter = Router();

productsRouter.get('/', validate({ query: listProductsQuery }), (req, res) => {
  const { maxPrice, sort, page, limit } = req.valid.query;
  let list = productStore.all();
  if (maxPrice !== undefined) list = list.filter((p) => p.price <= maxPrice);
  if (sort) list = [...list].sort((a, b) =>
    sort === 'price' ? a.price - b.price : a.name.localeCompare(b.name));
  const total = list.length;
  res.json({ data: list.slice((page - 1) * limit, page * limit), page, limit, total });
});

productsRouter.get('/:id', validate({ params: idParams }), (req, res) => {
  const product = productStore.get(req.valid.params.id);
  if (!product) throw notFound('Product');
  res.json(product);
});

productsRouter.post('/', validate({ body: createProductBody }), (req, res) => {
  const product = productStore.create(req.valid.body);
  res.status(201).location(`/products/${product.id}`).json(product);
});

productsRouter.patch('/:id', validate({ params: idParams, body: updateProductBody }), (req, res) => {
  const updated = productStore.update(req.valid.params.id, req.valid.body);
  if (!updated) throw notFound('Product');
  res.json(updated);
});

productsRouter.delete('/:id', validate({ params: idParams }), (req, res) => {
  if (!productStore.remove(req.valid.params.id)) throw notFound('Product');
  res.status(204).end();
});
```

Every manual `typeof`/`Number.isNaN` check from Chapter 6 is gone. Handlers contain only business logic.

### Try it

```bash
curl -s "localhost:3000/products?limit=500&sort=zzz"
```
```json
{"error":{"message":"Validation failed","details":[
  {"field":"query.sort","message":"Invalid option: expected one of \"price\"|\"name\""},
  {"field":"query.limit","message":"Too big: expected number to be <=100"}],
  "requestId":"ff1d8898-..."}}
```

```bash
curl -s --json '{"name":"","price":-1,"id":9}' localhost:3000/products
```
```json
{"error":{"message":"Validation failed","details":[
  {"field":"body.name","message":"Too small: expected string to have >=1 characters"},
  {"field":"body.price","message":"Too small: expected number to be >=0"},
  {"field":"body","message":"Unrecognized key: \"id\""}], ...}}
```

```bash
curl -s -X PATCH --json '{"id":999,"price":10}' localhost:3000/products/1
# 422: Unrecognized key "id"           ← mass assignment closed

curl -s -X PATCH --json '{}' localhost:3000/products/1
# 422: Provide at least one field to update

curl -s -X PATCH --json '{"price":130}' localhost:3000/products/1
# {"id":1,"name":"Notebook","price":130,"stock":50}     ← stock untouched ✔
```

(Exact message wording varies between Zod versions; the structure is what matters. The examples above come from Zod 4.)

### 400 or 422?

Both are used in the wild. A reasonable convention:

- **400 Bad Request:** the request can't even be *parsed* (malformed JSON, wrong `Content-Type`).
- **422 Unprocessable Content:** well-formed, but the data fails your rules.

Pick one convention, document it, and be consistent.

### ⚠ Common Mistake: Validating only the body

IDs in the path and options in the query are input too. `GET /products/-1`, `?limit=99999999` (a cheap denial-of-service by requesting a million rows!) and `?sort=<script>` all need the same care. **Always cap `limit`.**

### 🎯 Interview Pattern

"How do you prevent mass assignment / over-posting?" → Whitelist fields via a schema (strict or stripping), never spread `req.body` into a database call, and keep *separate* schemas for create vs update vs admin-only fields.

---

## 7.4 Security Middleware: The Standard Hardening Kit

Every public Express app should start with these. Each is one line. Each stops a *specific, real* class of attack.

### 7.4.1 `helmet`: security headers

```bash
npm install helmet
```

```javascript
import helmet from 'helmet';
app.use(helmet());
```

Helmet sets a bundle of response headers that instruct browsers to behave more safely:

| Header | Protects against |
|---|---|
| `Strict-Transport-Security` | Downgrade to plain HTTP: "only ever use HTTPS for this site" |
| `X-Content-Type-Options: nosniff` | Browsers guessing a file is a script ("MIME sniffing") |
| `X-Frame-Options` / CSP `frame-ancestors` | **Clickjacking** (your site hidden in an invisible iframe) |
| `Content-Security-Policy` | **XSS**: restricts which scripts/styles/images may load |
| `Referrer-Policy` | Leaking full URLs to other sites |
| `Cross-Origin-*-Policy` | Cross-site data leaks |

Verify:

```bash
curl -sI localhost:3000/health
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# Content-Security-Policy: default-src 'self'; ...
```

For a **pure JSON API** most of this is belt-and-braces (browsers mostly care when rendering HTML). It costs nothing and protects any HTML you ever serve (error pages, docs). The CSP is the one most likely to need tuning if you serve a frontend or Swagger UI from the same app.

### 7.4.2 `cors`: the allow-list, done right

```bash
npm install cors
```

In Chapter 3 you learned that CORS is a browser rule configured by the server. Now the production-quality version:

```javascript
import cors from 'cors';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',');

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  maxAge: 600,                 // browsers cache the preflight for 10 minutes
  // credentials: true,        // only if you use cookies; then origin must NOT be '*'
}));
```

- `!origin` allows non-browser callers (curl, server-to-server) which send no `Origin`. They aren't governed by CORS anyway.
- Origins come from an **environment variable**, so production can allow `https://shopline.com` without a code change.
- A list in code, never `origin: true` (which reflects *any* origin back, the vulnerability from Chapter 3).

Test it:

```bash
curl -sI -H "Origin: http://localhost:5173" localhost:3000/health | grep -i access-control
# Access-Control-Allow-Origin: http://localhost:5173

curl -sI -H "Origin: http://evil.example" localhost:3000/health | grep -ic access-control
# 0     ← no permission header → the browser blocks the page from reading it
```

Remember: **CORS protects users' browsers, not your API.** `curl` ignores it. Authentication (Chapter 21) protects the API.

### 7.4.3 `express-rate-limit`: slow down abuse

```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';
import { AppError } from './errors.js';

app.use(rateLimit({
  windowMs: 60_000,                 // 1 minute window
  limit: 100,                       // 100 requests per client per window
  standardHeaders: 'draft-7',       // sends RateLimit and Retry-After headers
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, 'Too many requests, slow down')),
}));
```

By using our own `handler` that forwards an `AppError`, rate-limit responses share the same JSON shape as every other error (the library's default body is plain text). I tested it by setting the limit to 14 and firing requests:

```
200 200 ... 429 429 429
HTTP/1.1 429 Too Many Requests
Retry-After: 59
{"error":{"message":"Too many requests, slow down","requestId":"edf47645-..."}}
```

**Critical caveats**, which we'll revisit in Chapter 23:

1. **The default store is in process memory.** With 4 server instances, each counts separately (a client effectively gets 4× the limit), and counts reset on restart. For real deployments, use a shared store (Redis; Chapter 19).
2. **"Per client" means per IP.** Behind a load balancer, every request appears to come from the balancer unless you configure `app.set('trust proxy', 1)` (one trusted proxy hop) so Express reads the real client IP from `X-Forwarded-For`. Set it to the **exact number of proxies you have**; too high lets attackers forge their IP by sending their own `X-Forwarded-For`.
3. Apply **stricter limits to sensitive routes** (login, password reset, signup), e.g., 5 per minute.

```javascript
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, /* ... */ });
app.post('/auth/login', loginLimiter, loginHandler);
```

### 7.4.4 Body size and parameter pollution (already covered)

`express.json({ limit: '100kb' })` and capped `limit` query params complete the basic set.

### The Kit, in order

```javascript
app.use(requestLogger);        // 1. log everything, including rejected requests
app.use(helmet());             // 2. security headers on every response
app.use(cors({...}));          // 3. answer preflights early
app.use(rateLimit({...}));     // 4. reject abusers cheaply, BEFORE doing real work
app.use(express.json({ limit: '100kb' }));   // 5. parse bodies
// ...routes (each with validate(...))...
app.use(notFoundHandler);
app.use(errorHandler);
```

**Why this order?** Cheap rejections go first. There's no point parsing a 100 KB JSON body for a client who is already rate-limited. And the logger sits first so every outcome, even a 429, gets recorded.

---

## 7.5 Structured Logging with `pino`

In Chapter 6 we hand-wrote a logger. In production we use a fast, standard one: **pino** (the same logger Fastify uses internally).

```bash
npm install pino pino-http
```

```javascript
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';

app.use(pinoHttp({
  genReqId: (req, res) => {
    const id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  level: process.env.LOG_LEVEL ?? 'info',
}));
```

Every request now logs one JSON line when it finishes, containing the request id, method, URL, status and response time. Inside any handler, `req.log` is a logger **pre-tagged with that request's id**:

```javascript
productsRouter.post('/', validate({ body: createProductBody }), (req, res) => {
  req.log.info({ name: req.valid.body.name }, 'creating product');
  // ...
});
```

Output (pretty-printed; real output is one line):

```json
{"level":30,"time":1730000000000,"req":{"id":"4df36408-...","method":"POST","url":"/products"},
 "name":"Eraser","msg":"creating product"}
```

Why JSON logs? Because log platforms (Datadog, Loki, CloudWatch) can search and graph fields: "show every request with `status >= 500` and `ms > 1000` for user 42." Free-text logs can't do that. We cover log levels, redaction of secrets (never log passwords or tokens!), and aggregation in Chapter 25.

### 🚀 Pro Tip

Use **log levels** purposefully: `error` (something failed, a human may need to act), `warn` (odd but handled), `info` (business events and request summaries), `debug` (developer detail, off in production). In development, pipe through `pino-pretty` for readable output: `node src/server.js | npx pino-pretty`.

---

## 7.6 File Uploads with `multer`

Browsers upload files as `multipart/form-data`, which `express.json()` cannot parse. **multer** handles it.

```bash
npm install multer
```

```javascript
// src/upload.js
import multer from 'multer';
import { AppError } from './errors.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPG = Buffer.from([0xff, 0xd8, 0xff]);

export const upload = multer({
  storage: multer.memoryStorage(),           // keeps the file in RAM: OK for small files only
  limits: { fileSize: 1_000_000, files: 1 }, // 1 MB, one file: ALWAYS set limits
});

// Content-Type and filename are CLAIMS by the client. Check the real bytes.
export function assertImage(file) {
  if (!file) throw new AppError(400, 'Attach an image in the image field');
  const ok = file.buffer.subarray(0, 4).equals(PNG) || file.buffer.subarray(0, 3).equals(JPG);
  if (!ok) throw new AppError(415, 'Only PNG or JPEG images are accepted');
}
```

```javascript
// in app.js
import { upload, assertImage } from './upload.js';

app.post('/products/:id/image', upload.single('image'), (req, res) => {
  assertImage(req.file);
  res.status(201).json({ bytes: req.file.size, type: req.file.mimetype });
});

// map multer's own errors to proper statuses in the error handler
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') err.status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  errorHandler(err, req, res, next);
});
```

Tested:

```bash
curl -s -F "image=@real.png"  localhost:3000/products/1/image   # {"bytes":8,"type":"image/png"}
curl -s -F "image=@notes.txt" localhost:3000/products/1/image   # 415 Only PNG or JPEG images are accepted
curl -s -F "image=@big.bin"   localhost:3000/products/1/image   # 413 File too large
```

### Upload safety checklist (very frequently exploited)

1. **Set size and count limits.** Unlimited uploads fill your disk and memory.
2. **Never trust the filename or the `Content-Type`.** An attacker names a script `cute-cat.png`. Check magic bytes (as above) or use a library such as `file-type`.
3. **Never use the client's filename as a path.** `../../etc/passwd` is a *path traversal* attack. Generate your own names (`crypto.randomUUID() + '.png'`).
4. **Don't serve uploads from the same origin as your app** if they could contain HTML/SVG/JS; serve from a separate domain/bucket with `Content-Disposition: attachment` or `nosniff`.
5. **Don't keep big files in app servers at all.** The production pattern is to upload **directly to object storage** (S3, GCS) using a short-lived **pre-signed URL** your API issues. Your servers never touch the bytes (Chapter 20).
6. Consider virus scanning and image re-encoding for user content.

### ⚠ Common Mistake: `memoryStorage` with big limits

100 simultaneous 50 MB uploads in memory = 5 GB of RAM. Memory storage is for small files with small limits; otherwise stream to disk or (better) to object storage.

---

## 7.7 Organizing Code as It Grows: Controllers and Services

Our handlers currently mix three jobs: HTTP concerns (status codes, `res.json`), business rules, and data access. For ShopLine's small CRUD that's fine. As logic grows, split:

```
 route (HTTP)  →  validate  →  controller (HTTP ↔ domain)  →  service (business rules)  →  repository (data)
```

A taste (Chapter 11 covers architecture fully):

```javascript
// services/orderService.js: knows NOTHING about Express
export async function placeOrder(userId, items) {
  const products = await productRepo.findMany(items.map((i) => i.productId));
  for (const item of items) {
    const p = products.get(item.productId);
    if (!p) throw notFound(`Product ${item.productId}`);
    if (p.stock < item.quantity) throw new AppError(409, `Insufficient stock for ${p.name}`);
  }
  return orderRepo.create(userId, items, products);
}

// routes/orders.js: only translates HTTP ↔ service
ordersRouter.post('/', validate({ body: createOrderBody }), async (req, res) => {
  const order = await placeOrder(req.user.id, req.valid.body.items);
  res.status(201).json(order);
});
```

Payoff: the service can be unit-tested with no HTTP, reused by a background job or a CLI, and your routes stay thin. **Rule of thumb: nothing below the route file should import `express` or touch `req`/`res`.**

---

## 7.8 Putting Express Together: ShopLine v0.2

Folder state after this chapter:

```
src/
├── server.js
├── app.js               ← now wires: logger → helmet → cors → rate limit → json → routes → 404 → errors
├── config.js
├── errors.js
├── store.js
├── upload.js
├── schemas/product.js
├── middleware/
│   ├── validate.js
│   └── errorHandler.js
└── routes/products.js
```

`app.js`:

```javascript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { AppError } from './errors.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { productsRouter } from './routes/products.js';
import { upload, assertImage } from './upload.js';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',');

export function createApp({ rateLimitMax = 100 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);            // exactly one proxy in front; set to your real hop count

  app.use(pinoHttp({
    genReqId: (req, res) => {
      const id = req.headers['x-request-id'] || randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    level: process.env.LOG_LEVEL ?? 'info',
  }));
  app.use(helmet());
  app.use(cors({ origin: (o, cb) => cb(null, !o || ALLOWED_ORIGINS.includes(o)), maxAge: 600 }));
  app.use(rateLimit({
    windowMs: 60_000, limit: rateLimitMax,
    standardHeaders: 'draft-7', legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, 'Too many requests, slow down')),
  }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/products', productsRouter);
  app.post('/products/:id/image', upload.single('image'), (req, res) => {
    assertImage(req.file);
    res.status(201).json({ bytes: req.file.size, type: req.file.mimetype });
  });

  app.use(notFoundHandler);
  app.use((err, req, res, next) => {
    if (err.name === 'MulterError') err.status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    errorHandler(err, req, res, next);
  });
  return app;
}
```

Note that `req.id` is set by `pino-http` (it assigns `req.id` from `genReqId`), so the `errorHandler` from Chapter 6, which includes `requestId: req.id`, keeps working. We replaced our hand-written `requestId` and `requestLogger` middleware with a single better one.

**Everything in this section was run and verified:** validation errors, mass-assignment rejection, the `stock` preservation fix, helmet and CORS headers, upload checks, and the 429 response.

---

## 7.9 Fastify: The Performance-Focused Alternative

Express is flexible and ubiquitous. **Fastify** (created 2016, now at v5) is designed around two ideas Express lacks natively:

1. **Schemas are built in.** You declare the shape of requests *and* responses, and Fastify validates input and serializes output using them.
2. **Speed by design.** Compiled validators (Ajv), schema-driven JSON serialization (`fast-json-stringify`) and a fast router make it typically **significantly higher in requests/second** than Express in synthetic benchmarks.

> **Honest caveat on benchmarks:** "hello world" tests exaggerate framework differences. In a real API, the database and network dominate time, so the framework is usually a small slice. Pick Fastify for its design (schemas, plugins, logging) as much as for raw speed. Measure your own workload.

### 7.9.1 A complete route with schemas

```bash
npm install fastify
```

```javascript
// src/fastify/server.js
import Fastify from 'fastify';

const products = new Map([[1, { id: 1, name: 'Notebook', price: 120 }], [2, { id: 2, name: 'Pen', price: 15 }]]);
let nextId = 3;

export function buildApp() {
  const app = Fastify({ logger: true });        // pino built in!

  app.get('/products/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer', minimum: 1 } }, required: ['id'] },
      response: {
        200: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, price: { type: 'number' } } },
      },
    },
  }, async (req, reply) => {
    const p = products.get(req.params.id);          // already a NUMBER: Fastify coerced it
    if (!p) return reply.code(404).send({ error: { message: 'Product not found' } });
    return p;                                       // just return the value: async handlers send it
  });

  app.post('/products', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'price'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          price: { type: 'number', minimum: 0 },
        },
      },
    },
  }, async (req, reply) => {
    const p = { id: nextId++, ...req.body };
    products.set(p.id, p);
    return reply.code(201).send(p);
  });

  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode ?? 500;
    reply.code(status).send({
      error: { message: status >= 500 ? 'Internal server error' : err.message, requestId: req.id },
    });
  });

  return app;
}
```

```javascript
// start it
import { buildApp } from './src/fastify/server.js';
await buildApp().listen({ port: 3000 });
```

Tested results:

```bash
curl -s localhost:3000/products/1
# {"id":1,"name":"Notebook","price":120}

curl -s localhost:3000/products/abc
# {"error":{"message":"params/id must be integer","requestId":"req-2"}}

curl -s --json '{"name":"","price":5}' localhost:3000/products
# {"error":{"message":"body/name must NOT have fewer than 1 characters","requestId":"req-4"}}
```

Differences from Express you can see right there:

- **Handlers `return` the response** (or `reply.send`); the framework serializes it.
- Validation is **declarative JSON Schema**, not middleware.
- `reply.code(201).send(...)` replaces `res.status(201).json(...)`.
- Request ids default to a simple counter (`req-2`); supply `genReqId` (or `requestIdHeader`) for UUIDs.

### 7.9.2 ⚠ Fastify's default validation is *forgiving* (a gotcha I verified)

Fastify's Ajv is configured by default with **type coercion** and **`removeAdditional`**. I sent `{"name":"Z","price":"5"}` and got:

```
{"id":4,"name":"Z","price":5}        ← the STRING "5" was silently coerced to the NUMBER 5
```

That convenience is useful for query strings and params, but for JSON bodies it means a mistyped client passes validation. Likewise, with `additionalProperties: false` Fastify's default *removes* unknown fields rather than rejecting them. If you want strict behavior, configure Ajv:

```javascript
const app = Fastify({
  ajv: { customOptions: { coerceTypes: false, removeAdditional: false } },
});
```

Know your validator's defaults; "it validated" doesn't mean "it's strict." (Zod's `strictObject` vs `object` is the same decision in a different place.)

### 7.9.3 Response schemas: speed *and* safety

The `response` schema above does two jobs:

1. **Speed:** Fastify compiles a specialized JSON serializer for exactly that shape, faster than generic `JSON.stringify`.
2. **Safety:** only the declared fields are included. If your database row also contains `passwordHash` and a handler accidentally returns the whole row, the response schema **strips it** because it isn't declared. That's an excellent defense against *excessive data exposure* (OWASP API Top 10).

### 7.9.4 The request lifecycle and hooks

Fastify has a well-defined lifecycle, with **hooks** where you can plug in logic:

```
 Incoming request
   │
   ▼
 onRequest        ← auth, request-scoped setup (before the body is read)
   ▼
 preParsing       ← transform the raw payload stream
   ▼
 (body parsing)
   ▼
 preValidation    ← adjust data before schema validation
   ▼
 (validation)     ← fails → error handler
   ▼
 preHandler       ← authorization, loading entities
   ▼
 HANDLER          ← your code
   ▼
 preSerialization ← modify payload before it's serialized
   ▼
 (serialization)
   ▼
 onSend           ← last chance to change payload/headers
   ▼
 onResponse       ← after the response is sent (metrics, logging)
```

```javascript
app.addHook('onRequest', async (req, reply) => {
  if (!req.headers['x-api-key']) return reply.code(401).send({ error: { message: 'API key required' } });
});

app.addHook('onResponse', async (req, reply) => {
  req.log.info({ ms: reply.elapsedTime }, 'request completed');
});
```

Express middleware is one linear chain; Fastify makes the *phase* explicit, which prevents the "validation ran after auth, or before?" confusion.

### 7.9.5 Plugins and encapsulation

Fastify's other big idea: everything is a **plugin**, and plugins are **encapsulated**: decorators, hooks and routes registered inside a plugin don't leak to siblings.

```javascript
// products plugin: owns its routes, prefix and hooks
export default async function productsPlugin(app) {
  app.addHook('preHandler', async (req) => { /* only for /products routes */ });
  app.get('/', listHandler);
  app.post('/', createHandler);
}

// root
app.register(productsPlugin, { prefix: '/products' });
app.register(ordersPlugin,   { prefix: '/orders' });
```

Need something shared (a DB connection) to be visible to everything? Wrap it with `fastify-plugin` to opt out of encapsulation:

```javascript
import fp from 'fastify-plugin';
export default fp(async (app) => {
  const db = await connectDb(process.env.DATABASE_URL);
  app.decorate('db', db);                        // now available as app.db / req.server.db everywhere
  app.addHook('onClose', async () => db.end());  // clean shutdown, built in
});
```

Think of it as Express's `Router` + dependency injection + lifecycle management in one concept. Also available: official plugins `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/multipart`, `@fastify/jwt`, `@fastify/swagger`, each integrating with the lifecycle.

### 7.9.6 Fastify with Zod

If you love Zod, `fastify-type-provider-zod` lets you use Zod schemas as Fastify route schemas, giving you validation, serialization and TypeScript types in one. Both approaches are valid; JSON Schema is portable (it also generates OpenAPI docs), Zod is more ergonomic.

---

## 7.10 Express vs Fastify (and Friends): Choosing

| | Express 5 | Fastify 5 |
|---|---|---|
| Age / ecosystem | Oldest, largest; every tutorial and SO answer | Mature, rich official plugin set |
| Validation | Bring your own (Zod/Joi) | **Built in** (JSON Schema/Ajv) |
| Serialization | `JSON.stringify` | **Schema-compiled**, faster, filters fields |
| Throughput (typical benchmarks) | Baseline | Often substantially higher |
| Logging | Add pino/morgan | **pino built in** |
| Structure | Free-form middleware chain | Lifecycle hooks + encapsulated plugins |
| Learning curve | Gentlest | Slightly steeper (schemas, plugins) |
| Async errors | Auto-forwarded (v5) | Native async design |
| TypeScript | Via `@types` | First-class |
| Hiring pool | Largest | Large and growing |

### Other options you'll meet

| Framework | One-line summary |
|---|---|
| **NestJS** | Opinionated, Angular-style (decorators, DI, modules), very popular in enterprises; runs on Express or Fastify underneath |
| **Hono** | Tiny, fast, runs on Node, Bun, Deno and edge runtimes (Cloudflare Workers) |
| **Koa** | By Express's original authors; minimal, async-first |
| **AdonisJS** | Batteries-included, Laravel-style full-stack framework |
| **tRPC** | End-to-end typesafe APIs when frontend and backend are both TypeScript |

### How to choose (my recommendation)

- **Learning, or a team that knows Express:** Express 5. The concepts transfer to everything.
- **New API service where throughput, schemas and logging matter:** Fastify.
- **Large team that wants conventions and structure out of the box:** NestJS.
- **Edge/serverless:** Hono.

Whichever you pick, **the architecture matters more than the framework**: validation at the edge, thin handlers, services below, consistent errors, observable behavior. Those carry over unchanged.

### 🎯 Interview Pattern

"Express vs Fastify?" Strong answer: "Fastify validates and serializes with compiled JSON-Schema, ships with pino, and has an encapsulated plugin model with explicit lifecycle hooks, which yields better throughput and structure. Express has the larger ecosystem and the gentlest learning curve. In real services the database dominates latency, so I'd choose by team familiarity and need for schema-first design, and I'd benchmark my actual workload."

---

## 7.11 API Documentation Preview: OpenAPI

Schemas can generate documentation automatically. **OpenAPI** (formerly Swagger) is the industry standard JSON/YAML description of an HTTP API: paths, methods, parameters, bodies, responses. Tools turn it into interactive docs and client SDKs.

- With Fastify: `@fastify/swagger` builds the spec directly from your route schemas, so docs *can't* drift from reality.
- With Express: `zod-to-openapi`-style libraries, or write the spec by hand and validate against it.

We design full API contracts in Chapter 8.

---

## 7.12 Edge Cases and Gotchas Checklist

- [ ] Validation exists for body but not **params and query**.
- [ ] `limit` not capped → one request returns a million rows.
- [ ] `z.object` (strips) used where `strictObject` was needed to catch typos or attacks.
- [ ] `.partial()` of a schema that has `.default(...)` → silent data overwrites.
- [ ] Reading `req.query` instead of validated `req.valid.query` (types are still strings).
- [ ] Trying to reassign `req.query` in Express 5 (read-only).
- [ ] `cors({ origin: true })` or `'*'` with credentials.
- [ ] Rate limiter with in-memory store behind multiple instances → limits not shared.
- [ ] `trust proxy` unset (everyone shares one IP) or over-trusting (attackers forge IPs).
- [ ] Rate limiting placed *after* body parsing and heavy work.
- [ ] Logging secrets (passwords, tokens, card numbers). Configure pino `redact`.
- [ ] Upload limits missing; trusting `Content-Type`/filename; using client filename as a path.
- [ ] Large uploads buffered in memory.
- [ ] Fastify coercion/`removeAdditional` defaults assumed to be strict.
- [ ] Returning DB rows directly, exposing internal fields. Use response schemas or explicit mappers.
- [ ] Error handler not covering library errors (multer, body-parser, rate-limit) → inconsistent JSON.
- [ ] Mixing 400 and 422 inconsistently.
- [ ] Helmet's CSP breaking Swagger UI or a bundled frontend (tune, don't disable blindly).

---

## 7.13 Chapter Summary

- **Parse input through schemas** at the edge: params, query *and* body. Downstream code only ever sees the clean, typed object.
- **Zod** gives readable schemas, coercion (`z.coerce`) for strings from URLs, `strictObject` to reject unknown keys, and `safeParse` for non-throwing validation. Beware `.partial()` + `.default()`.
- The standard Express hardening kit: **helmet** (headers), **cors** with an allow-list, **express-rate-limit** (with a shared store in production, correct `trust proxy`), **body size limits**, and **pino** for structured logs. Order cheap rejections first.
- **Uploads:** limit size/count, verify real content, generate your own filenames, and prefer direct-to-object-storage in production.
- Keep handlers thin; push rules into **services** with no Express imports.
- **Fastify** brings built-in schema validation/serialization, pino, hooks and encapsulated plugins. Know its forgiving Ajv defaults (coercion, `removeAdditional`).
- Choose frameworks by team and needs; the architecture principles are framework-independent.

---

## 7.14 Revision Notes

- Pipeline: `logger → helmet → cors → rateLimit → json(limit) → routes(validate) → 404 → errorHandler`.
- `schema.safeParse(x)` → `{ success, data | error }`; `z.coerce.number()` for strings from URLs/params.
- `z.object` strips unknown keys; `z.strictObject` rejects.
- Never spread `req.body`; never trust filename/MIME; always cap `limit`.
- 400 = malformed; 422 = well-formed but invalid; 429 = rate limited (`Retry-After`); 413 = too large; 415 = wrong media type.
- `trust proxy` = number of trusted proxy hops, exactly.
- Fastify: return values from async handlers; JSON Schema via Ajv; `response` schema filters output; hooks: `onRequest → preValidation → preHandler → handler → onSend → onResponse`.
- Fastify plugins are encapsulated; `fastify-plugin` shares decorators.

---

## 7.15 Mind Map (ASCII)

```
                      EXPRESS MASTERY & FASTIFY (Ch. 7)
                                     │
      ┌────────────┬─────────────┬───┴────────┬───────────────┬──────────────┐
  VALIDATION    HARDENING      LOGGING      UPLOADS         FASTIFY      CHOOSING
      │             │             │            │               │             │
  Zod schemas   helmet        pino-http    multer          JSON Schema     team + needs
  parse don't   cors list     JSON lines   size limits     (Ajv)           Express=ecosystem
  validate      rate limit    request id   magic bytes     hooks           Fastify=schemas+speed
  strict vs     (shared       req.log      own filenames   plugins         Nest=conventions
  strip         store)        redact       → S3 presigned  response        Hono=edge
  coerce        trust proxy   levels                       schema filters
  422 vs 400    body limit                                 defaults forgiving
```

---

## 7.16 Cheat Sheet

```
INSTALL     npm i zod helmet cors express-rate-limit pino pino-http multer
SCHEMA      const S = z.strictObject({ name: z.string().trim().min(1), price: z.number().min(0) })
            S.safeParse(x) → { success, data } | { success:false, error.issues }
URL INPUT   z.coerce.number().int().positive()      (params & query are strings)
CREATE/PATCH  fields (no defaults) → create = fields + defaults ; patch = fields.partial() + refine(non-empty)
VALIDATE MW validate({ params, query, body }) → req.valid.*
SECURITY    app.use(helmet()); app.use(cors({ origin: allowList })); app.use(rateLimit({...}))
PROXY       app.set('trust proxy', <exact hop count>)
LOGGING     app.use(pinoHttp({ genReqId })) → req.log.info({...}, 'msg')
UPLOAD      multer({ storage: memoryStorage(), limits: { fileSize, files } }) + check magic bytes
STATUS      400 bad syntax | 413 too big | 415 wrong type | 422 invalid | 429 rate limit
FASTIFY     app.get(path, { schema:{ params, body, response } }, async (req, reply) => value)
            hooks: onRequest, preValidation, preHandler, onSend, onResponse
            plugins: app.register(fn, { prefix }) ; fastify-plugin to share decorators
STRICT AJV  Fastify({ ajv:{ customOptions:{ coerceTypes:false, removeAdditional:false } } })
RULE        Nothing untrusted reaches business logic without passing through a schema.
```

---

## 7.17 Key Takeaways

1. **Parse into trusted shapes** at the boundary; everything past it assumes valid data.
2. A schema is validation, documentation and a security control in one artifact.
3. A handful of well-understood middleware (helmet, CORS allow-list, rate limit, size limits, structured logs) block a large share of common attacks and operational pain.
4. Untrusted means *all* of it: body, query, params, headers, filenames, content types.
5. Know your tools' defaults. Both Zod's `object` and Fastify's Ajv are more lenient than you may expect.
6. Architecture beats framework: thin handlers, services, schemas, consistent errors.

---

## 7.18 20 Multiple Choice Questions

**Q1.** What is the main advantage of "parsing" input through a schema over scattered `if` checks?
A) Faster CPU  B) Downstream code receives a clean, typed object containing only declared fields  C) Smaller bundles  D) It replaces authentication

**Q2.** Which Zod method never throws?
A) `.parse()`  B) `.safeParse()`  C) `.refine()`  D) `.strict()`

**Q3.** Why use `z.coerce.number()` for `req.query.page`?
A) Query values are always strings  B) Numbers are faster  C) It encrypts values  D) It prevents CORS

**Q4.** Which Zod type rejects unknown keys?
A) `z.object`  B) `z.strictObject`  C) `z.any`  D) `z.passthrough`

**Q5.** In the chapter's bug, why did `PATCH {"price":130}` reset `stock` to 0?
A) Zod is buggy  B) `.partial()` kept `.default(0)` on `stock`, so the default was applied  C) The store was cleared  D) CORS

**Q6.** Why does the validation middleware store results in `req.valid` instead of `req.query`?
A) Style  B) In Express 5 `req.query` is read-only  C) Faster  D) Required by Zod

**Q7.** What does `helmet()` mainly do?
A) Compresses responses  B) Sets security-related HTTP response headers  C) Validates bodies  D) Adds authentication

**Q8.** Why is `cors({ origin: true })` dangerous?
A) It's slow  B) It reflects any requesting origin, effectively allowing all sites  C) It disables HTTPS  D) It's deprecated

**Q9.** What's wrong with using the default in-memory store of `express-rate-limit` across 4 instances?
A) Nothing  B) Each instance counts separately and resets on restart, so limits aren't shared  C) It encrypts counters  D) It only works with HTTPS

**Q10.** What should `trust proxy` be set to?
A) Always `true`  B) The exact number of trusted proxy hops in front of your app  C) Always 0  D) The port number

**Q11.** Where should the rate limiter sit relative to body parsing?
A) After heavy work  B) Before body parsing, to reject cheaply  C) Never in the chain  D) Only on GET

**Q12.** Which is the safest way to decide an uploaded file is an image?
A) Trust the `Content-Type` header  B) Trust the extension  C) Check the file's magic bytes (or use a library)  D) Ask the user

**Q13.** Why shouldn't you use a client-supplied filename as a save path?
A) Too long  B) Path traversal (`../../`) could write outside the intended folder  C) Wrong encoding  D) It slows disks

**Q14.** The recommended production pattern for big uploads is:
A) Buffer in server memory  B) Pre-signed URLs to upload directly to object storage  C) Email the file  D) Base64 in JSON

**Q15.** Which status fits a well-formed request body that violates business validation rules?
A) 200  B) 422  C) 502  D) 304

**Q16.** What does Fastify do with a `response` schema?
A) Nothing  B) Compiles a fast serializer and filters out undeclared fields  C) Validates the request  D) Adds CORS

**Q17.** In Fastify's default config, sending `{"price":"5"}` to a route declaring `price: number`:
A) Always errors  B) May be coerced to the number 5  C) Crashes the server  D) Returns 500

**Q18.** What are Fastify plugins' key property?
A) They're global  B) They're encapsulated unless wrapped with `fastify-plugin`  C) They can't have routes  D) They require TypeScript

**Q19.** Which hook runs after validation and before the handler?
A) `onRequest`  B) `preHandler`  C) `onSend`  D) `onClose`

**Q20.** "Excessive data exposure" is best mitigated in Fastify by:
A) Larger timeouts  B) Declaring response schemas so undeclared fields are stripped  C) More logging  D) Using GET only

### Answer Key

| Q | A | Why |
|---|---|---|
| 1 | B | Only declared, typed fields flow onward. |
| 2 | B | `safeParse` returns a result object. |
| 3 | A | URL values arrive as strings. |
| 4 | B | `strictObject` errors on unknown keys. |
| 5 | B | Defaults survive `.partial()`. |
| 6 | B | Express 5 makes `req.query` a getter. |
| 7 | B | Security headers. |
| 8 | B | Reflecting any origin = allow all. |
| 9 | B | Per-process counters. |
| 10 | B | Too high lets attackers forge IPs. |
| 11 | B | Reject cheaply first. |
| 12 | C | Headers/extensions are client claims. |
| 13 | B | Path traversal. |
| 14 | B | Bytes never touch your app servers. |
| 15 | B | 422 Unprocessable Content. |
| 16 | B | Speed plus field filtering. |
| 17 | B | Ajv coercion is on by default. |
| 18 | B | Encapsulated by default. |
| 19 | B | `preHandler` follows validation. |
| 20 | B | Response schemas filter output. |

---

## 7.19 20 Hands-on Exercises

**Easy**

1. Add `zod`, `helmet`, `cors` to ShopLine and verify the headers with `curl -I`.
2. Write a Zod schema for `{ email, password (8–72 chars), name? }` and test five valid and five invalid inputs with `safeParse`.
3. Use `z.coerce.number()` in a schema and test `"42"`, `"abc"`, `""`, `null`, `undefined`. Explain each result (hint: `""` and `null` may surprise you).
4. Make `limit` default to 20 and cap at 100. Prove `?limit=1000` is rejected.
5. Send `Origin: http://evil.example` and confirm no `Access-Control-Allow-Origin` header returns.
6. Add `express-rate-limit` with a limit of 5/min and watch it return 429 with `Retry-After`.
7. Switch the logger to `pino-http` and find one request's log line by its `X-Request-Id`.

**Medium**

8. Reproduce the `.partial()` + `.default()` data-loss bug, write a failing test, then fix it.
9. Switch one schema from `object` to `strictObject` and list which client requests would now break.
10. Add `GET /products?q=pen&minPrice=10&maxPrice=100` with validated, coerced filters and `minPrice <= maxPrice` enforced via `.refine`.
11. Add a stricter login-style limiter (5 per 15 minutes) to one route and a looser global one; test both.
12. Add pino `redact` for `req.headers.authorization` and `req.headers.cookie`; prove they're hidden in logs.
13. Implement the upload endpoint with magic-byte checking for PNG, JPEG and GIF; add tests for each type plus a renamed `.exe`.
14. Move the order-placement logic into a `services/` module that doesn't import Express, and unit-test it without HTTP.

**Hard**

15. Build the products API in Fastify with JSON Schema; make validation strict (no coercion, no stripping) and add tests proving `"5"` is rejected.
16. Add a Fastify `response` schema that hides `costPrice`; demonstrate that returning the full DB object still doesn't leak it.
17. Create a Fastify plugin per feature (`products`, `orders`) with its own `preHandler` hook; show hooks don't leak across plugins; then share a decorator via `fastify-plugin`.
18. Benchmark Express vs Fastify with `autocannon` for the same `/products/:id` route (identical logic, logging off). Record req/s and latency. Then add a simulated 20 ms database delay and re-run. What happened to the gap?
19. Implement a Redis-backed rate limiter store (or use `rate-limit-redis`) and prove limits are shared across two instances running on different ports behind a simple round-robin proxy.
20. Generate an OpenAPI document from your schemas (Fastify: `@fastify/swagger`; Express: a zod-to-openapi library) and serve interactive docs at `/docs`. Ensure helmet's CSP still allows them.

---

## 7.20 5 Interview Questions

**1. How do you validate and sanitize input in a Node API? Where does it live?**
*Model answer:* At the edge, via schema validation (Zod/Joi/Ajv) in middleware or Fastify route schemas, applied to body, query, params (and headers if used). Output is a new typed object; handlers never touch raw `req.body`. Unknown fields rejected or stripped, strings trimmed and length-limited, numbers coerced only where inputs are strings by nature, collection sizes capped. Escaping for output/queries is a *separate* concern handled by parameterized queries and templating, not by validation.

**2. What is mass assignment and how do you prevent it?**
*Model answer:* It's when a client sets fields it shouldn't (`isAdmin`, `id`, `price`) because the server copies the request body into a model. Prevent with whitelisting schemas (strict or stripping), separate DTO/schemas per operation and role, never `Object.assign(model, req.body)` or ORM `create(req.body)`, and tests that submit extra fields.

**3. What does rate limiting protect against, and what pitfalls exist in distributed deployments?**
*Model answer:* Brute force, credential stuffing, scraping, accidental client loops and some DoS. Pitfalls: per-instance memory counters (use Redis), incorrect client identification behind proxies (`trust proxy`), IP sharing (NAT/mobile carriers), different limits per endpoint, response shape (`429` + `Retry-After`), and that rate limiting alone isn't DDoS protection (use a WAF/CDN upstream).

**4. Compare Express and Fastify.**
*Model answer:* Express: minimal, huge ecosystem, linear middleware chain, bring-your-own validation/logging. Fastify: schema-first validation and serialization (Ajv, fast-json-stringify), built-in pino, explicit lifecycle hooks, encapsulated plugins, higher throughput in benchmarks; slightly steeper learning curve. I'd choose by team skill and need for schema-driven docs/performance, and benchmark real workloads since I/O usually dominates.

**5. How would you securely handle file uploads?**
*Model answer:* Enforce size/count limits, authenticate first, verify content via magic bytes/libraries rather than headers or extensions, generate server-side filenames, avoid executing or serving user content from the app origin, scan or re-encode media, and prefer direct uploads to object storage through short-lived pre-signed URLs with constraints (content-type, max size), then process asynchronously via a queue.

---

## 7.21 3 Real Projects

**Project 1: Hardened Contacts API (beginner, ~4 hours).**
CRUD for contacts with Zod schemas (email, phone format, strict bodies), helmet, an allow-listed CORS config driven by env, a global rate limit and a stricter write limit, pino logs with redaction, and a test suite that attacks it: extra fields, huge bodies, bad IDs, oversized limits, forged origins. Document each defense and the attack it blocks.

**Project 2: Avatar Upload Service (intermediate, ~6 hours).**
`POST /users/:id/avatar` accepting PNG/JPEG/WebP up to 2 MB: magic-byte detection, random filenames, resizing with `sharp` into a worker thread (Chapter 5), storage to local disk behind an abstraction (`storage.put/get`) that you later swap for S3, and `GET` that serves with correct `Content-Type`, `nosniff` and caching headers. Include a test for a polyglot file (valid image header + embedded script) and path traversal in the filename.

**Project 3: Express ↔ Fastify Port with Benchmarks (advanced, ~8 hours).**
Port the full ShopLine v0.2 to Fastify with equivalent behavior (verified by the *same* black-box test suite run against both servers). Compare: lines of code, request-validation strictness, response filtering, memory, and throughput/latency under `autocannon` with and without a simulated 10 ms DB call. Write a one-page recommendation for a hypothetical team, with the numbers.

---

## 7.22 Further Reading

- Zod documentation (zod.dev): *Basic usage*, *Defining schemas*, *Error handling*.
- Express docs: *Production best practices: security* and *performance*.
- OWASP Cheat Sheets: *Input Validation*, *Mass Assignment*, *File Upload*, *REST Security*.
- OWASP *API Security Top 10* (note API3: Broken Object Property Level Authorization, i.e., excessive data exposure and mass assignment).
- Fastify docs: *Validation and Serialization*, *Lifecycle*, *Plugins* and *Encapsulation*.
- Pino docs: *Redaction*, *Transports*, *Child loggers*.
- helmet.js documentation: what each header does and when to tune the CSP.

---

### Up next → Chapter 8: REST API Design

Your server can now defend itself. But *what should the API look like?* How should URLs be named, how do you paginate a million rows, version a public API without breaking customers, make retries safe with idempotency keys, and document it all? That's the art of REST API design.
