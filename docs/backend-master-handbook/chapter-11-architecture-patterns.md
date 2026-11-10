# The Backend Master Handbook

### From Absolute Beginner to Production-Grade Engineer

---

# Chapter 11: Architecture Patterns — Layers, Services, Dependency Injection and the Modular Monolith

---

## 11.0 Why This Chapter Matters

You can now build endpoints, validate input, secure them, and push real-time events. ShopLine works. But look at what happens in a typical codebase six months in:

- A route handler is 200 lines: it validates, checks permissions, queries the database, applies pricing rules, calls the payment provider, sends an email, and formats the response.
- To test the pricing rule you have to start a server, a database and a fake payment provider.
- Changing "free shipping over ₹500" means hunting through five files.
- Two developers editing the same file collide daily.
- Nobody dares touch the order code because *"it might break checkout."*

That codebase did not become a mess through carelessness. It became a mess because **nobody decided where each kind of logic lives.** Architecture is simply that decision, made deliberately and written down.

This chapter gives you the standard answers:

- **Layers**: HTTP, service, data, and what each may know about the others.
- **Services and repositories**, with the business rules in one testable place.
- **Dependency injection**, so code receives its collaborators instead of grabbing them.
- **Ports and adapters** (hexagonal/clean architecture), explained without the jargon.
- **Feature folders and the modular monolith**: how to scale a codebase to many developers *without* microservices.
- **Architecture tests** that fail the build when someone breaks the rules.

Everything marked *tested* was built and run for this chapter: 8 automated tests that pass in about 200 ms with **no server, no database and no network**, plus an architecture rule that I deliberately broke to prove it catches violations.

### 💡 Did You Know?

The phrase **"big ball of mud"** comes from a 1997 paper by Brian Foote and Joseph Yoder describing the most common real-world architecture: none. They noted it's "the de-facto standard" because it's what you get when you ship fast and never pause to organize. Their honest conclusion was not "never do it" but "know when you're doing it, and pay it back."

---

## 11.1 The Problem: A Fat Handler

Here is what an un-architected checkout looks like. Read it and count the *different reasons* it could need to change:

```javascript
// ❌ Everything in one place
app.post('/orders', async (req, res) => {
  // 1. HTTP concern: parsing & validating
  if (!Array.isArray(req.body.items) || req.body.items.length === 0)
    return res.status(422).json({ error: 'items required' });

  // 2. Auth concern
  if (!req.user) return res.status(401).json({ error: 'login' });

  // 3. Data concern: raw database access
  let subtotal = 0;
  for (const item of req.body.items) {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [item.productId]);
    if (!rows[0]) return res.status(404).json({ error: 'no such product' });
    // 4. Business rule
    if (rows[0].stock < item.quantity) return res.status(409).json({ error: 'out of stock' });
    subtotal += rows[0].price * item.quantity;
  }

  // 5. Business rule (pricing)
  const shipping = subtotal >= 50000 ? 0 : 4900;

  // 6. More data access
  await pool.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [/* ... */]);
  const order = (await pool.query('INSERT INTO orders ...')).rows[0];

  // 7. Side effect: email
  await sendgrid.send({ to: req.user.email, subject: 'Order placed' /* ... */ });

  // 8. HTTP concern: formatting the response
  res.status(201).json(order);
});
```

**Eight reasons to change in one function.** Consequences:

| Pain | Why |
|---|---|
| Can't test pricing without HTTP + DB + email | Everything is welded together |
| Can't reuse the logic from a CLI, a job, or GraphQL | It lives *inside* an Express handler |
| Merge conflicts | Everyone edits the same file |
| Fear of change | You can't tell what a change affects |
| Swapping the database or email vendor | Means rewriting business code |

The fix is not a framework or a trendy acronym. It's the oldest idea in software: **separation of concerns**: each piece of code has *one reason to change*.

### 🧠 Memory Trick

**"One reason to change."** If a function would need editing because the *pricing rule* changed **and** because the *email vendor* changed **and** because the *JSON shape* changed, it's doing three jobs.

---

## 11.2 Layered Architecture

Split the system into **layers**, each with one responsibility, and a strict rule about who may talk to whom.

```
 ┌──────────────────────────────────────────────────────────────────────┐
 │  1. HTTP / PRESENTATION LAYER   routes, controllers, request parsing,  │
 │     (Express)                    status codes, response shapes        │
 ├──────────────────────────────────────────────────────────────────────┤
 │  2. SERVICE / APPLICATION LAYER business rules and workflows:          │
 │     (plain JavaScript)           "place an order", authorization,     │
 │                                  pricing, orchestration, events       │
 ├──────────────────────────────────────────────────────────────────────┤
 │  3. DATA ACCESS LAYER           repositories: the ONLY code that knows │
 │     (SQL, ORM, Redis)            about tables, queries, drivers       │
 ├──────────────────────────────────────────────────────────────────────┤
 │  4. INFRASTRUCTURE              database, cache, email vendor, payment │
 │     (external systems)           provider, queue                       │
 └──────────────────────────────────────────────────────────────────────┘
        dependencies point DOWNWARD only: HTTP → service → data → infra
```

### The one rule that makes it work: the dependency rule

> **Code may depend on layers *below* it, never above.** The service layer must not know that Express exists. The data layer must not know about HTTP or business workflows.

Concretely, in a healthy codebase:

- **No `import express` and no `req`/`res` in services.**
- **No SQL strings in services or routes.** SQL lives in repositories.
- **No business rules in routes or repositories.** Routes translate; repositories fetch/store.

### What each layer does (and doesn't)

| Layer | Does | Doesn't |
|---|---|---|
| **HTTP** | Parse and validate input (schemas), call a service, translate the result/error into status + JSON, set headers | Contain business rules, run SQL |
| **Service** | Enforce rules, authorize, orchestrate repositories and external calls, publish events, define transaction boundaries | Know about HTTP, status codes, SQL |
| **Repository** | Translate between objects and storage: `findById`, `save`, `decrementStock` | Decide *whether* something should happen |
| **Infrastructure client** | Talk to one external system (Stripe, SendGrid) behind a small interface | Contain business decisions |

### Real-Life Analogy: A Hospital

The **reception desk** (HTTP) checks your paperwork and routes you; it doesn't diagnose. The **doctor** (service) applies medical rules and decides the treatment; the doctor doesn't care whether you arrived by ambulance or on foot. The **records room** (repository) files and retrieves charts; it doesn't give advice. If the hospital changes its filing system from paper to computer, doctors don't relearn medicine. That independence is the entire point.

---

## 11.3 The Service Layer

A **service** is where the application's *use cases* live: "place an order," "cancel an order," "register a user." It is plain JavaScript that receives data in and returns data out.

### The refactored checkout (tested)

```javascript
// src/modules/orders/order.service.js
import { conflict, invalid, notFound } from '../../shared/errors.js';

const FREE_SHIPPING_FROM = 50_000;   // minor units (paise): ₹500.00
const SHIPPING_FEE = 4_900;

// A factory that RECEIVES its dependencies.
// No `import express`, no `req`/`res`, no database driver here.
export function createOrderService({ orderRepo, productRepo, events, clock = () => new Date(), newId }) {
  return {
    async placeOrder(userId, items) {
      if (!items?.length) throw invalid('An order needs at least one item');

      const lines = [];
      for (const { productId, quantity } of items) {
        const product = await productRepo.findById(productId);
        if (!product) throw notFound(`Product ${productId}`);
        if (product.stock < quantity) {
          throw conflict(`Insufficient stock for ${product.name}`, { productId, available: product.stock });
        }
        lines.push({ productId, name: product.name, quantity, unitPrice: product.price });
      }

      const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
      const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;

      for (const l of lines) await productRepo.decrementStock(l.productId, l.quantity);

      const order = {
        id: newId(), userId, lines, subtotal, shipping,
        total: subtotal + shipping, status: 'pending',
        createdAt: clock().toISOString(),
      };
      await orderRepo.save(order);
      events.publish('order.placed', { orderId: order.id, userId, total: order.total });
      return order;
    },

    async getForUser(user, orderId) {
      const order = await orderRepo.findById(orderId);
      // Authorization lives HERE, in the service, so every entry point gets it.
      if (!order || (order.userId !== user.id && user.role !== 'admin')) throw notFound('Order');
      return order;
    },
  };
}
```

Study three decisions in that code:

1. **Dependencies arrive as parameters** (`orderRepo`, `productRepo`, `events`, `clock`, `newId`). The service never *creates* them or imports a database. (That's dependency injection, §11.4.)
2. **Even the clock and the ID generator are injected.** Why? Because `new Date()` and `randomUUID()` make tests non-deterministic. Injecting them lets a test freeze time and fix ids. (Time and randomness are dependencies, too.)
3. **It throws domain errors** (`conflict`, `notFound`, `invalid`), not HTTP responses. The service doesn't know 409 exists.
4. **Authorization is in the service.** `getForUser` returns `NOT_FOUND` (not "forbidden") for someone else's order, so the existence of other people's orders isn't leaked.

### Domain errors vs HTTP errors

```javascript
// src/shared/errors.js: knows what went wrong, not how HTTP expresses it
export class DomainError extends Error {
  constructor(code, message, details) { super(message); this.code = code; this.details = details; }
}
export const notFound = (what) => new DomainError('NOT_FOUND', `${what} not found`);
export const conflict = (msg, details) => new DomainError('CONFLICT', msg, details);
export const invalid  = (msg, details) => new DomainError('INVALID', msg, details);
```

The HTTP layer contains the **only** translation table:

```javascript
const STATUS = { NOT_FOUND: 404, CONFLICT: 409, INVALID: 422 };

app.use((err, _req, res, _next) => {
  const status = STATUS[err.code] ?? 500;
  res.status(status).json({ error: {
    code: err.code ?? 'INTERNAL',
    message: status === 500 ? 'Internal error' : err.message,
    details: err.details,
  } });
});
```

Tomorrow's GraphQL resolver or gRPC handler maps the same `DomainError.code` to *its* conventions (`extensions.code`, `grpc.status.NOT_FOUND`) without touching a service. That is the payoff.

### The thin HTTP layer (tested)

```javascript
// src/http/orders.routes.js: only translates HTTP ↔ service calls
export function ordersRoutes({ orderService }) {
  const router = Router();

  router.post('/', async (req, res) => {
    const order = await orderService.placeOrder(req.user.id, req.body.items);
    res.status(201).location(`/orders/${order.id}`).json(order);
  });

  router.get('/:id', async (req, res) => {
    res.json(await orderService.getForUser(req.user, req.params.id));
  });

  return router;
}
```

Five lines of logic, zero business rules. (In the real project you'd add the Chapter 7 `validate(...)` schema middleware to the `POST`.) Express 5 forwards rejected promises to the error handler, so there's no try/catch.

### Where does validation live?

Validation is layered, and each layer checks different things:

| Layer | Validates | Example |
|---|---|---|
| **HTTP (schema)** | **Shape and types** of untrusted input | `items` is an array of `{ productId: string, quantity: positive int ≤ 100 }` |
| **Service (rules)** | **Business invariants** | Stock available; product exists; user allowed |
| **Database (constraints)** | **Last line of defense** for data integrity | `CHECK (stock >= 0)`, `UNIQUE`, foreign keys |

All three. Schemas don't replace business rules, and business rules don't replace constraints (concurrency can slip past app-level checks; Chapter 16).

---

## 11.4 Repositories: Hiding the Database

A **repository** gives the service a collection-like interface to storage, hiding *how* storage works.

```javascript
// src/modules/orders/order.repo.memory.js
export function createInMemoryOrderRepo() {
  const rows = new Map();
  return {
    async save(order)     { rows.set(order.id, structuredClone(order)); },
    async findById(id)    { const r = rows.get(id); return r ? structuredClone(r) : null; },
  };
}
```

In Part 3 we'll write `order.repo.postgres.js` with the **same two methods** backed by SQL. The service won't change a character.

Guidelines for good repositories:

1. **Name methods for the domain, not the database:** `findPendingOrdersOlderThan(date)`, not `selectWhereStatusEquals`.
2. **Return plain objects** (not ORM entities with lazy-loading magic) so the service layer doesn't depend on the ORM.
3. **Keep them dumb.** No pricing, no permission checks. If you see an `if` that's a *business* decision, it belongs in the service.
4. **One repository per aggregate/feature**, not one per table. (An *aggregate* is a cluster of objects treated as a unit, like an order and its lines.)
5. **Don't leak the database:** don't return query builders or driver rows to callers.

### The in-memory twin is a feature

Having a fake repository with the same interface as the real one gives you: instant tests, local development with no database, and a **contract test** opportunity (below).

### Contract tests: one test suite, many implementations

Write the repository behavior tests *once*, as a function that takes a repository factory, and run it against **every** implementation:

```javascript
export function orderRepoContract(makeRepo) {
  test('saves and finds an order', async () => { /* uses makeRepo() */ });
  test('returns null for unknown id', async () => { /* ... */ });
}

orderRepoContract(() => createInMemoryOrderRepo());       // runs in milliseconds
orderRepoContract(() => createPostgresOrderRepo(testDb)); // runs in CI with a real database (Chapter 24)
```

This guarantees the fake behaves like the real thing, so tests that use the fake stay trustworthy.

---

## 11.5 Dependency Injection (DI)

### The idea in one sentence

> **A piece of code should be *given* the things it needs, not go and fetch or create them itself.**

Compare:

```javascript
// ❌ Hard-wired: the service creates/imports its own collaborators
import { pool } from '../db.js';
import sendgrid from '@sendgrid/mail';

export async function placeOrder(userId, items) {
  const { rows } = await pool.query('SELECT ...');      // can't run without Postgres
  await sendgrid.send(...);                              // can't run without sending real email
}

// ✅ Injected: the service declares what it needs and receives it
export function createOrderService({ orderRepo, productRepo, events, clock, newId }) {
  return { async placeOrder(userId, items) { /* uses orderRepo, events... */ } };
}
```

### Real-Life Analogy: A Power Plug

A lamp doesn't contain a power plant; it has a **plug**. Any compatible outlet (home, hotel, a battery adapter) supplies electricity. Because the lamp only depends on the *plug shape*, you can test it on a bench supply or swap the building's wiring without opening the lamp. Dependency injection is making your code a lamp, not a power plant.

### Why it matters (concretely)

| Benefit | Example |
|---|---|
| **Testability** | Pass a fake repo and a frozen clock; no database needed |
| **Swappability** | Memory repo in dev, Postgres in prod, a stub payment provider in tests |
| **Explicit dependencies** | The function signature *documents* what it needs |
| **Fewer hidden couplings** | No global singletons reaching around |

### 11.5.1 Manual DI with factories (recommended in JavaScript)

You don't need a framework. A **factory function** that takes its dependencies and returns an object is the simplest, most transparent form (and what we've been writing). Closures keep dependencies private.

Classes work equally well:

```javascript
export class OrderService {
  constructor({ orderRepo, productRepo, events }) {
    this.orderRepo = orderRepo; this.productRepo = productRepo; this.events = events;
  }
  async placeOrder(userId, items) { /* ... */ }
}
```

### 11.5.2 The Composition Root

If every piece receives its dependencies, *someone* must create and connect them. That place, **exactly one place near the program's entry point**, is the **composition root**:

```javascript
// src/container.js: the ONLY file that knows which concrete pieces are plugged together
export function buildContainer(overrides = {}) {
  const events = overrides.events ?? createEventBus();
  const productRepo = overrides.productRepo ?? createInMemoryProductRepo([ /* seed */ ]);
  const orderRepo = overrides.orderRepo ?? createInMemoryOrderRepo();

  const orderService = createOrderService({ orderRepo, productRepo, events, newId: randomUUID });

  // A subscriber reacting to a domain event, fully decoupled from the order code
  events.subscribe('order.placed', (e) => console.log(JSON.stringify({ evt: 'order.placed', ...e })));

  return { orderService, events };
}

// src/app.js
export function createApp(container = buildContainer()) { /* routes receive pieces of the container */ }
```

Swap the whole system for tests with `buildContainer({ orderRepo: fake })`. Production's `server.js` builds the real one (Postgres repos, real email). **Everything else in the codebase is ignorant of the wiring.**

### 11.5.3 DI containers (when and whether)

Libraries like **awilix**, **tsyringe**, **InversifyJS**, and frameworks like **NestJS** automate the wiring (they construct objects and resolve dependency graphs by name or type).

- ✅ Helpful when you have *dozens* of services and scopes (per-request instances).
- ❌ Adds magic and indirection; failures move from compile/read time to runtime ("cannot resolve X").
- **Recommendation:** start with manual factories and a composition root. Add a container only when the wiring file becomes genuinely painful, not before.

### ⚠ Common Mistake: The Service Locator

```javascript
// ❌ Anti-pattern: reaching into a global registry from inside the function
import { container } from './container.js';
export async function placeOrder(...) {
  const repo = container.get('orderRepo');    // hidden dependency: signature lies
}
```

The function's signature no longer reveals what it needs, tests must configure a global, and dependencies become invisible. **Inject; don't look up.**

### 🎯 Interview Pattern

"What is dependency injection and why use it?" → Give dependencies to a component rather than letting it construct/locate them: it inverts control, makes dependencies explicit, enables substituting fakes for tests and different implementations per environment, and keeps business code independent of infrastructure. Mention the composition root and the difference from service locator.

---

## 11.6 Unit Testing the Service With No Infrastructure (tested)

Because the service takes its collaborators as parameters, a test builds the whole thing from fakes:

```javascript
// test/order.service.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

function setup() {
  const published = [];
  const productRepo = createInMemoryProductRepo([
    { id: 'p1', name: 'Notebook', price: 12_000, stock: 5 },
    { id: 'p2', name: 'Backpack', price: 89_900, stock: 1 },
  ]);
  const service = createOrderService({
    orderRepo: createInMemoryOrderRepo(),
    productRepo,
    events: { publish: (type, payload) => published.push({ type, payload }) },   // a spy
    clock: () => new Date('2026-11-03T09:30:00Z'),                                // frozen time
    newId: () => 'ord_1',                                                         // fixed id
  });
  return { service, productRepo, published };
}

test('charges shipping below the free-shipping threshold', async () => {
  const { service } = setup();
  const order = await service.placeOrder('asha', [{ productId: 'p1', quantity: 2 }]);  // 24,000 < 50,000
  assert.equal(order.shipping, 4_900);
  assert.equal(order.total, 28_900);
});

test('rejects insufficient stock without changing anything', async () => {
  const { service, productRepo, published } = setup();
  await assert.rejects(service.placeOrder('asha', [{ productId: 'p2', quantity: 3 }]), { code: 'CONFLICT' });
  assert.equal((await productRepo.findById('p2')).stock, 1);   // untouched
  assert.equal(published.length, 0);                             // no event emitted
});

test('only the owner or an admin can read an order', async () => {
  const { service } = setup();
  await service.placeOrder('asha', [{ productId: 'p1', quantity: 1 }]);
  assert.equal((await service.getForUser({ id: 'asha', role: 'customer' }, 'ord_1')).id, 'ord_1');
  assert.equal((await service.getForUser({ id: 'root', role: 'admin' }, 'ord_1')).id, 'ord_1');
  await assert.rejects(service.getForUser({ id: 'ravi', role: 'customer' }, 'ord_1'), { code: 'NOT_FOUND' });
});
```

Result of `node --test` (six service tests plus two architecture tests, §11.9):

```
# tests 8
# pass 8
# fail 0
# duration_ms 201
```

**Eight tests in about 200 ms**, with no server, port, database or network. Compare to the fat handler, where verifying "free shipping over ₹500" required booting everything. This speed is what lets teams run thousands of tests on every commit.

### The end-to-end check (also tested)

```bash
curl -s -H 'x-user: asha' --json '{"items":[{"productId":"p1","quantity":2}]}' localhost:3000/orders
# 201 {"id":"2962ebcd-...","userId":"asha","lines":[...],"subtotal":24000,"shipping":4900,"total":28900,"status":"pending",...}
# server log: {"evt":"order.placed","orderId":"2962ebcd-...","userId":"asha","total":28900}

curl -s -H 'x-user: asha' --json '{"items":[{"productId":"p2","quantity":9}]}' localhost:3000/orders
# 409 {"error":{"code":"CONFLICT","message":"Insufficient stock for Backpack","details":{"productId":"p2","available":2}}}

curl -s -H 'x-user: asha' --json '{"items":[]}' localhost:3000/orders
# 422 {"error":{"code":"INVALID","message":"An order needs at least one item"}}

GET /orders/<id> as asha → 200      as ravi → 404      as root (admin) → 200
```

The same service rules produce correct HTTP behavior through the thin layer, and the ownership rule (`ravi` gets `404`) is enforced in exactly one place.

---

## 11.7 Hexagonal Architecture (Ports & Adapters) and Clean Architecture

You've now built it; here's the vocabulary.

**Hexagonal Architecture** (Alistair Cockburn) and **Clean Architecture** (Robert C. Martin) describe the same shape: put your **business logic in the center**, and have everything else (web, database, vendors) plug into it at the edges.

```
                         ┌────────────────────────────────────────────┐
     DRIVING SIDE        │                                            │       DRIVEN SIDE
  (things that call us)  │          APPLICATION CORE                  │  (things we call)
                         │      services + business rules             │
   Express routes  ────▶ │                                            │ ────▶  Postgres repo
   GraphQL resolvers ──▶ │   PORTS = the interfaces the core needs:   │ ────▶  Redis cache
   gRPC handlers ─────▶  │   orderRepo, productRepo, paymentGateway,  │ ────▶  Stripe adapter
   CLI / cron jobs ───▶  │   events, clock                            │ ────▶  SendGrid adapter
   queue consumers ───▶  │                                            │ ────▶  in-memory fakes
                         └────────────────────────────────────────────┘
                              dependencies point INWARD, toward the core
```

Vocabulary:

- **Port:** *what the core needs*, expressed in the core's own terms (`orderRepo.save(order)`, `paymentGateway.charge(amount)`). In TypeScript it's an `interface`; in JavaScript it's just "an object with these methods."
- **Adapter:** *a concrete implementation* of a port for a specific technology (`PostgresOrderRepo`, `StripePaymentGateway`, `InMemoryOrderRepo`).
- **Driving adapters** (Express, GraphQL, CLI) call *into* the core. **Driven adapters** (DB, email) are called *by* the core.

Our code **is** this architecture: the service is the core; `orderRepo`/`productRepo`/`events`/`clock` are ports; the in-memory repos and Express routes are adapters; `container.js` is where adapters are plugged in.

### The key insight: inverted dependencies

In a naive layered app, *business logic depends on the database* (it imports the DB module). Here, business logic depends only on an **abstraction it defines** (`orderRepo.save`), and the database adapter depends on that. The arrow is *inverted* ("Dependency Inversion Principle", the D in SOLID). That's why you can replace Postgres without touching the core.

### How far should you take it?

This is where engineers over-engineer. Be pragmatic:

| Situation | Reasonable level |
|---|---|
| Prototype, small CRUD, one developer | Routes + thin services + a store module. Don't ceremony-ize |
| Real product, growing team | **Layers + services + repositories + DI** (what this chapter builds) |
| Complex business rules (finance, logistics) | Add a richer **domain model** (entities/value objects with behavior), domain events |
| Regulated/large domain with many teams | Full ports-and-adapters, modular boundaries enforced by tests |

**YAGNI (You Aren't Gonna Need It) applies.** Don't create an `IOrderRepository` interface plus a factory plus a registry when you have exactly one implementation *and* no test need. We introduced ports here because we genuinely have **two implementations** (memory and Postgres) and tests that depend on swapping them. Add abstraction when there's a second implementation or a testing/changeability need, not on speculation.

### ⚠ Common Mistake: Abstraction cargo-culting

Symptoms: every class has an interface with a single implementation; a "ServiceFactoryProvider"; 12 files to add one field. If a new feature touches 10 files in 6 folders for no benefit, the structure is serving the pattern, not the product. Architecture should make change *cheaper*. If it makes change slower, simplify.

---

## 11.8 Project Structure: By Layer or By Feature?

Two ways to arrange folders.

**By technical layer** (what most tutorials show):

```
src/
├── controllers/   orders.js  products.js  users.js
├── services/      orders.js  products.js  users.js
├── repositories/  orders.js  products.js  users.js
└── models/ ...
```

Adding a feature touches *every folder*. Everything is mixed together, and nothing hints which pieces belong to the same feature.

**By feature (module)** (recommended):

```
src/
├── modules/
│   ├── orders/
│   │   ├── order.service.js
│   │   ├── order.repo.memory.js      (later: order.repo.postgres.js)
│   │   ├── order.schemas.js
│   │   └── index.js                  ← the module's PUBLIC API
│   ├── products/
│   │   ├── product.repo.memory.js
│   │   └── ...
│   └── users/ ...
├── http/                              ← adapters that drive the modules
│   ├── orders.routes.js
│   └── ...
├── shared/                            ← cross-cutting, domain-agnostic: errors, events, logger
│   ├── errors.js
│   └── events.js
├── container.js                       ← composition root
├── app.js                             ← builds Express
└── server.js                          ← listens, signals
```

Why by-feature wins:

1. **Locality:** everything about orders sits together; deleting a feature is deleting a folder.
2. **Ownership:** a team can own `modules/orders`.
3. **Boundaries:** it creates a natural seam for the *modular monolith* (next section), and, if ever needed, for extraction into a service.
4. **Fewer merge conflicts.**

This is exactly the tree we ran. (ShopLine's flat `routes/`, `store.js` from Chapters 6–7 migrate into this shape; the business behavior doesn't change, only where the code lives.)

---

## 11.9 The Modular Monolith

### Monolith, microservices, and the sensible middle

| | Plain monolith | **Modular monolith** | Microservices |
|---|---|---|---|
| Deployables | 1 | **1** | Many |
| Internal structure | Often tangled | **Strict module boundaries** | Separate services/repos |
| Calls between parts | Anywhere calls anything | **Through public module APIs/events** | Network (HTTP/gRPC/queues) |
| Data | One shared database, anyone touches any table | One database, **each module owns its tables** | Database per service |
| Operational cost | Lowest | **Low** | **High** (deploys, tracing, distributed failures) |
| Team scaling | Poor beyond ~10 devs | **Good** | Best (independent teams) |

A **modular monolith** is one deployable application organized as independent **modules**, each with a **public interface** and **private internals**, communicating through defined channels. You get most of the benefits of microservices (clear ownership, replaceable parts, parallel work) *without* the network, the distributed transactions, or the operational burden. For most companies it is the right architecture for years, and it makes a later split to microservices far easier because the seams already exist.

### The rules of a module

1. **A module owns its data.** Only the orders module reads/writes the `orders` tables. Others ask the orders module's public API. (No cross-module SQL joins.)
2. **A module exposes a small public API** (`modules/orders/index.js` exports `createOrderService`, a few types). Everything else is private.
3. **No reaching into another module's internals.** `orders` must not import `products/product.repo.memory.js`; it depends on a *port* the container satisfies.
4. **Modules communicate via public APIs or domain events.** Prefer events for "X happened, others may react" (`order.placed` → inventory, email, analytics), keeping modules decoupled.
5. **Dependencies form a DAG, no cycles.** (`orders` may depend on `catalog`, but then `catalog` cannot depend on `orders`.)

### Domain events: decoupling modules

```javascript
// src/shared/events.js: a tiny in-process bus
import { EventEmitter } from 'node:events';
export function createEventBus() {
  const emitter = new EventEmitter();
  return {
    publish: (type, payload) => emitter.emit(type, payload),
    subscribe: (type, handler) => emitter.on(type, handler),
  };
}
```

The orders service calls `events.publish('order.placed', {...})` and knows nothing about who listens. The notifications module subscribes and sends the email. Add analytics later without touching orders. This is the Chapter 5 `EventEmitter` pattern scaled into architecture.

Caveats of an **in-process** bus: handlers run in the same process and *synchronously* on `emit` (a slow or throwing subscriber affects the publisher); events are lost if the process crashes. When you need durability and retries, replace it with a queue/outbox (Chapter 28), and since orders only knows the `events.publish` port, **it won't change.**

### Enforcing boundaries with an automated architecture test (tested)

Rules that live only in a wiki erode. Make the build enforce them. This test scans import statements:

```javascript
// test/architecture.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : [];
});
const importsOf = (file) =>
  [...readFileSync(file, 'utf8').matchAll(/^import .* from ['"](.+)['"];?$/gm)].map((m) => m[1]);

test('modules (business logic) must not depend on express or the http layer', () => {
  const offenders = [];
  for (const file of files(path.join(root, 'modules')))
    for (const imp of importsOf(file))
      if (imp === 'express' || imp.includes('/http/')) offenders.push(`${path.relative(root, file)} imports ${imp}`);
  assert.deepEqual(offenders, []);
});

test("modules must not import other modules' internals", () => {
  const offenders = [];
  for (const file of files(path.join(root, 'modules'))) {
    const mine = path.relative(path.join(root, 'modules'), file).split(path.sep)[0];
    for (const imp of importsOf(file).filter((i) => i.startsWith('.'))) {
      const rel = path.relative(path.join(root, 'modules'), path.resolve(path.dirname(file), imp));
      if (!rel.startsWith('..') && rel.split(path.sep)[0] !== mine) offenders.push(`${path.relative(root, file)} -> ${imp}`);
    }
  }
  assert.deepEqual(offenders, []);
});
```

I verified it catches violations by **inserting `import express from 'express'` into `order.service.js`** on purpose:

```
✖ modules (business logic) must not depend on express or the http layer
    + 'modules\\orders\\order.service.js imports express'
# pass 1
# fail 1
```

The build breaks the moment someone drags HTTP into business logic. (I removed the line again, and all 8 tests passed.) In larger codebases use a tool: **dependency-cruiser** or **ESLint `import/no-restricted-paths`** express rules like "`modules/orders` may not import `modules/billing/internal/*`" and detect cycles (`madge`).

### When modules should become services

Microservices are a *deployment* choice, not an architecture requirement. Extract a module into its own service only when you can name a concrete need:

- **Independent scaling** (video processing needs 50 workers; the rest needs 3).
- **Independent deployment** by a separate team on a different cadence.
- **Different technology** or isolation/compliance (payment card data).
- **Fault isolation** for a flaky, high-risk component.

If the modular monolith is clean, extraction is mostly mechanical: the module's public API becomes a network API (HTTP/gRPC), in-process events become queue messages, and its tables move to its own database. Chapter 33 treats this honestly, including when *not* to.

---

## 11.10 Configuration as a First-Class Module

Configuration (Chapter 4) deserves a single, validated, typed entry point so the rest of the code never touches `process.env`:

```javascript
// src/config.js: the ONLY file that reads process.env
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid configuration:', parsed.error.issues.map((i) => `${i.path}: ${i.message}`));
  process.exit(1);                                   // fail fast at boot
}
export const config = Object.freeze({
  env: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  corsOrigins: parsed.data.CORS_ORIGINS.split(','),
});
```

Rules:

1. **Only `config.js` reads `process.env`.** Everything else imports `config` (or receives values via DI). Scattered `process.env.X` reads are untestable and typo-prone.
2. **Validate at startup** and exit with a clear error (the Chapter 4 "fail fast" rule).
3. **Pass config into the composition root**, which hands the needed values to the pieces that need them (a service shouldn't import global config; it gets `{ freeShippingFrom }` injected if it varies).
4. **Never log secrets**; freeze the object.

(**Feature flags**, runtime switches that enable behavior for some users, are the next level of configuration. Chapters 32 and 35 return to them for safe rollouts.)

---

## 11.11 Transactions and the Service Boundary (A Preview)

Notice a latent flaw in our `placeOrder`: it **decrements stock** for each line and *then* saves the order. If saving fails after the stock was reduced, we've lost inventory for an order that doesn't exist. Worse, two simultaneous orders can both pass the stock check and **oversell**.

This is exactly what **database transactions** solve: a group of operations that succeed or fail *as one unit* (Chapter 16). The architectural point to absorb now:

> **A service method is the natural transaction boundary.** The service decides "these steps are one atomic business operation"; repositories participate in that transaction.

The common pattern is a **Unit of Work** (or passing a transaction handle to repository calls):

```javascript
// conceptual, built for real in Chapters 16–17
await uow.run(async ({ productRepo, orderRepo }) => {
  // inside here, every repo call uses the same database transaction
  const product = await productRepo.findByIdForUpdate(id);   // row lock
  ...
  await productRepo.decrementStock(id, qty);
  await orderRepo.save(order);
});                                                          // commits, or rolls back on any throw
```

Also note the ordering of **side effects**: publishing `order.placed` (which triggers an email) should happen only **after** the transaction commits; otherwise you email customers about orders that were rolled back. The robust solution is the **transactional outbox** pattern (Chapter 28). Spotting these hazards in a design review is exactly the kind of judgment this chapter is building.

---

## 11.12 Other Patterns You'll Meet (Brief)

| Pattern | Idea | When |
|---|---|---|
| **DTO / mapper** | Separate objects for API input/output vs internal domain objects; mapper functions convert | Prevent leaking internals; allow API and storage to evolve independently |
| **CQRS (lite)** | Separate *read* models/queries from *write* use cases | Reads and writes have very different shapes/scale (e.g., reporting queries) |
| **Anti-corruption layer** | An adapter that translates a messy third-party/legacy model into your domain terms | Integrating Stripe, ERPs, legacy APIs without letting their vocabulary infect your core |
| **Strategy** | Pluggable algorithm behind one interface (shipping calculators, tax rules) | Many interchangeable behaviors |
| **Specification / policy objects** | Encapsulate a business rule as a testable object (`isEligibleForFreeShipping(order)`) | Rules multiply or need reuse |
| **Result types** (`{ ok, value } / { ok:false, error }`) | Return errors as values instead of throwing | Expected failures in tight flows; some teams prefer to exceptions for domain outcomes |
| **Outbox** | Write events to the DB in the same transaction; a worker publishes them | Reliable event publishing (Chapter 28) |
| **Saga** | Coordinate multi-step operations across services with compensations | Distributed workflows (Chapter 30) |

You don't need these on day one. Know they exist, and reach for them when a concrete pain matches the pattern.

---

## 11.13 Anti-Patterns and How to Spot Them

| Smell | Symptom | Fix |
|---|---|---|
| **Fat controller** | Route handlers over ~30 lines with `if`s about business rules | Move logic to a service |
| **God service** | `AppService` with 60 methods touching everything | Split by use case/module |
| **Anemic everything** | Services that just forward to repositories ("pass-through") | Keep services if they hold rules; skip the layer for pure CRUD |
| **Leaky repository** | Returns ORM entities or raw rows; callers write queries | Return plain objects; domain-named methods |
| **Reaching across modules** | `orders` imports `billing/internal/…` | Public API or events; architecture tests |
| **Circular dependencies** | A imports B imports A | Extract the shared part, invert via a port, or publish events |
| **Global singletons** | `import db from './db'` everywhere; shared mutable state | Inject dependencies; one composition root |
| **Service locator** | `container.get('x')` inside business code | Constructor/factory injection |
| **Over-abstraction** | Interfaces with one implementation, factories of factories | Remove until a real second need appears |
| **Premature microservices** | Distributed system for a 3-person team | Modular monolith first |
| **Business logic in SQL/triggers** | Rules scattered across DB and app | Keep rules in services; use constraints for integrity only |
| **Environment checks in code** | `if (process.env.NODE_ENV === 'test')` in business logic | Inject test doubles instead |

### Rule of thumb for *when* to add structure

**The Rule of Three:** the first time, just write it; the second, wince and copy; the third, refactor into an abstraction. Structure is cheapest when it follows real, repeated pain rather than prediction. Start with layers and services (they pay off immediately); add modules when the team grows; add ports for what truly varies.

---

## 11.14 ShopLine v0.3: The Structure Going Forward

From here on, ShopLine uses this layout. Each later chapter slots in without restructuring:

```
shopline-api/
├── src/
│   ├── server.js                    ← listen + signals (Ch. 4–6)
│   ├── app.js                       ← Express, middleware order (Ch. 6–7)
│   ├── config.js                    ← validated env (this chapter)
│   ├── container.js                 ← composition root (this chapter)
│   ├── shared/                      ← errors, events, logger, clock
│   ├── http/                        ← routes + schemas + middleware (Ch. 7–8)
│   └── modules/
│       ├── catalog/                 ← products, categories           (Ch. 13–17)
│       ├── orders/                  ← placeOrder, cancel, history    (Ch. 16)
│       ├── users/                   ← register, login, roles         (Ch. 21–22)
│       ├── notifications/           ← reacts to events: emails       (Ch. 28)
│       └── billing/                 ← payments, webhooks             (Ch. 10, 28)
├── test/
│   ├── architecture.test.js         ← enforces the rules (this chapter)
│   └── ... unit, integration, contract tests                          (Ch. 24)
└── package.json
```

The migration of the existing code is mechanical: move `store.js` logic behind repositories, move rules out of routes into services, keep the Chapter 7 `validate` middleware and schemas in `http/`.

---

## 11.15 Edge Cases and Gotchas Checklist

- [ ] `import express` (or `req`/`res`) inside services → business logic is welded to HTTP.
- [ ] SQL or ORM calls inside route handlers or services.
- [ ] Business decisions (`if (price > …)`) inside repositories.
- [ ] Service throwing HTTP errors (`res.status(404)`) instead of domain errors.
- [ ] `new Date()`, `Math.random()`, `randomUUID()` called directly in business logic → flaky tests. Inject clock/id.
- [ ] Hidden global singletons (`import pool from './db'`) in business code.
- [ ] Composition done in many places (multiple files `new`-ing services) instead of one root.
- [ ] Service-locator lookups in business code.
- [ ] Modules sharing tables or joining across each other's data.
- [ ] Circular imports between modules.
- [ ] In-process event handlers that throw and break the publisher, or that perform slow work synchronously.
- [ ] Publishing events before the transaction commits.
- [ ] Multi-step writes with no transaction (partial failure leaves inconsistent data).
- [ ] `process.env` read across the codebase instead of one config module.
- [ ] A shared `utils/` or `common/` folder that becomes a dumping ground and everyone depends on.
- [ ] Abstractions created for a second implementation that never arrives.
- [ ] No automated check of the rules, so they erode within months.

---

## 11.16 Chapter Summary

- **Architecture = deciding where each kind of logic lives**, so each piece has *one reason to change*.
- **Layers:** HTTP → service → repository → infrastructure; dependencies point **downward/inward** only. No Express in services; no SQL outside repositories; no business rules in routes or repositories.
- **Services** hold use cases, business rules and authorization; they throw **domain errors**, mapped to HTTP in exactly one place.
- **Repositories** hide storage behind domain-named methods; an in-memory twin makes tests instant, and **contract tests** keep fakes honest.
- **Dependency injection** (factories receiving collaborators, including the clock and ID generator) makes code testable and swappable; wire everything in one **composition root**; avoid service locators; add a DI container only when wiring truly hurts.
- **Hexagonal/Clean architecture** = a core with **ports** plus **adapters** at the edges, with inverted dependencies. Apply it pragmatically (YAGNI).
- **Organize by feature/module**, not by technical layer. A **modular monolith**, with modules owning their data, exposing small public APIs and talking via APIs/events, delivers most microservice benefits at a fraction of the cost.
- **Enforce boundaries with architecture tests** (we proved a violation fails the build).
- Centralize **configuration** in one validated module; treat service methods as **transaction boundaries** (Chapter 16), and publish side effects only after commit (Chapter 28).

---

## 11.17 Revision Notes

- Layers: `http → service → repository → infra`; arrows only downward.
- Service: no `express`, no SQL; takes `{ repos, events, clock, newId }`; throws `DomainError(code)`.
- Map domain codes → HTTP status in **one** error handler.
- Repository: domain-named methods, plain objects, no business rules; contract tests for each implementation.
- DI: *give, don't fetch*; factories/classes; composition root builds the graph; avoid service locator.
- Ports = what the core needs; adapters = tech-specific implementations.
- Structure: `modules/<feature>/…`, `http/`, `shared/`, `container.js`, `config.js`.
- Module rules: own your data; public API only; no cycles; communicate via API/events.
- Enforce with tests (`dependency-cruiser`, `madge`, ESLint restricted paths).
- Validation layers: schema (shape) → service (rules) → DB constraints (integrity).
- Events: publish **after commit**; outbox for reliability.

---

## 11.18 Mind Map (ASCII)

```
                          ARCHITECTURE PATTERNS (Ch. 11)
                                       │
     ┌────────────┬──────────────┬─────┼──────────┬───────────────┬────────────┐
   LAYERS       SERVICES       DI / IoC      HEXAGONAL      MODULES         GUARDRAILS
     │             │              │             │              │               │
 HTTP→service  use cases      give, don't    core + ports    by feature     architecture
 →repo→infra   rules + authz  fetch          adapters at    own your data  tests
 arrows down   domain errors  factories      the edges      public API     dependency-
 no express    (not HTTP)     composition    inverted deps  events between cruiser/madge
 in services   inject clock   root           YAGNI!         modules        YAGNI / rule
 no SQL in     & ids          no service     memory vs      modular        of three
 routes        tx boundary    locator        postgres       monolith →     config module
                                                             services only  fail-fast
                                                             if needed
```

---

## 11.19 Cheat Sheet

```
LAYERS      routes (HTTP) → services (rules) → repositories (data) → infra (DB, email, Stripe)
SERVICE     createXService({ repoA, repoB, events, clock, newId }) → { useCase(...) }  // throws DomainError
ERRORS      new DomainError('NOT_FOUND'|'CONFLICT'|'INVALID', msg, details)  →  http: { NOT_FOUND:404, CONFLICT:409, INVALID:422 }
REPO        { findById, save, … } domain-named, returns plain objects; one contract test suite, many impls
DI          pass dependencies in; ONE composition root (container.js); tests: buildContainer({ repo: fake })
TIME/RANDOM inject clock() and newId()  → deterministic tests
LAYOUT      src/{ modules/<feature>/, http/, shared/, container.js, config.js, app.js, server.js }
MODULE      owns tables | exposes index.js | no imports of other modules' internals | no cycles | events for "X happened"
CONFIG      only config.js reads process.env; zod-validate; exit(1) on bad config
VALIDATE    schema (shape) + service (rules) + DB constraints (integrity)
TX          service method = transaction boundary; publish events AFTER commit (outbox)
TEST        unit (services + fakes, ms) | contract (repos) | integration (DB) | architecture (imports)
SMELLS      fat controller | god service | leaky repo | cycles | service locator | over-abstraction
RULE        Add structure for repeated pain, not predicted pain.
```

---

## 11.20 Key Takeaways

1. **Put business rules where they can be tested without infrastructure.** That single habit explains the entire chapter.
2. Dependencies point **inward**: business logic never imports the web framework or the database driver.
3. **Inject, don't fetch:** including the clock and ID generator, so tests are deterministic.
4. A **modular monolith** is the best default architecture: clear boundaries today, optional microservices tomorrow.
5. **Automate the rules** (architecture tests), or they will erode.
6. Structure should make change **cheaper**. If it makes change slower, you've over-built.

---

## 11.21 20 Multiple Choice Questions

**Q1.** What is the main idea behind separation of concerns?
A) Fewer files  B) Each piece of code has one reason to change  C) Faster CPU use  D) Use more frameworks

**Q2.** In a layered architecture, which dependency direction is correct?
A) Repository → service  B) Service → HTTP layer  C) HTTP → service → repository  D) Repository → HTTP

**Q3.** Which does NOT belong in a service?
A) Pricing rules  B) `res.status(404).json(...)`  C) Authorization checks  D) Orchestrating repositories

**Q4.** Where should SQL queries live?
A) Route handlers  B) Services  C) Repositories  D) Middleware

**Q5.** Why should services throw domain errors rather than HTTP responses?
A) HTTP errors are slower  B) The same service can then serve REST, GraphQL, gRPC and jobs, each mapping errors its own way  C) Express forbids it  D) Domain errors are shorter

**Q6.** What is dependency injection?
A) Importing a database globally  B) Giving a component its collaborators instead of letting it create or locate them  C) A security vulnerability  D) A kind of database query

**Q7.** Why inject a `clock` and an `id` generator into a service?
A) Style  B) Tests can freeze time and fix ids for deterministic assertions  C) Required by Node  D) Faster execution

**Q8.** What is the composition root?
A) The root folder  B) The single place where concrete implementations are created and wired together  C) A database root user  D) A React concept

**Q9.** What's wrong with `container.get('orderRepo')` inside business logic?
A) Nothing  B) It's a service locator: hidden dependencies, signature lies, global state in tests  C) It's too fast  D) It only works in TypeScript

**Q10.** In ports-and-adapters terms, a "port" is:
A) A TCP port  B) The interface/shape of something the core needs  C) A database connection  D) An Express route

**Q11.** What is the Dependency Inversion Principle's effect here?
A) The database depends on business logic's abstractions, not the other way around  B) Business logic depends on the database module  C) Routes depend on SQL  D) No effect

**Q12.** Which folder organization is generally recommended for growing teams?
A) By technical layer only  B) By feature/module  C) One giant file  D) Alphabetical

**Q13.** In a modular monolith, who may read and write the `orders` tables?
A) Any module  B) Only the orders module; others use its public API  C) Only the DBA  D) Only the HTTP layer

**Q14.** Why are contract tests valuable for repositories?
A) They speed up SQL  B) The same behavior tests run against both the in-memory fake and the real implementation, keeping them equivalent  C) They replace integration tests  D) They generate code

**Q15.** What does an architecture test (e.g., scanning imports) provide?
A) Performance numbers  B) Automatic failure when someone violates layering/module rules  C) Type safety  D) Documentation only

**Q16.** When should an event like `order.placed` be published relative to the database transaction?
A) Before it starts  B) After it commits  C) During every query  D) Never

**Q17.** What is a good reason to extract a module into a separate microservice?
A) It's fashionable  B) It needs independent scaling/deployment or isolation that the monolith can't provide  C) To use more languages  D) To make debugging easier

**Q18.** Which is an example of over-engineering?
A) An interface with one implementation, a factory and a registry for a trivial CRUD feature  B) A service with unit tests  C) A config module  D) A composition root

**Q19.** Which layer should validate that `quantity` is a positive integer in the request body?
A) Only the database  B) The HTTP layer via a schema (and business rules in the service, constraints in the DB)  C) The repository only  D) None

**Q20.** Why does `getForUser` return `NOT_FOUND` for another user's order rather than `FORBIDDEN`?
A) Laziness  B) It avoids revealing that the order exists  C) HTTP requires it  D) Faster lookup

### Answer Key

| Q | A | Why |
|---|---|---|
| 1 | B | One reason to change. |
| 2 | C | Dependencies point downward. |
| 3 | B | HTTP concerns belong in the HTTP layer. |
| 4 | C | Repositories own data access. |
| 5 | B | Transport-agnostic business logic. |
| 6 | B | Provide collaborators from outside. |
| 7 | B | Determinism. |
| 8 | B | One place builds the object graph. |
| 9 | B | Hidden, global, untestable. |
| 10 | B | What the core needs, in its own terms. |
| 11 | A | Inverted dependency direction. |
| 12 | B | Feature folders give locality and boundaries. |
| 13 | B | Data ownership per module. |
| 14 | B | Fakes stay trustworthy. |
| 15 | B | Rules enforced by the build. |
| 16 | B | Otherwise you announce rolled-back work. |
| 17 | B | Concrete operational need. |
| 18 | A | Abstraction without a second use. |
| 19 | B | Shape at the edge; rules and constraints elsewhere too. |
| 20 | B | Don't leak existence. |

---

## 11.22 20 Hands-on Exercises

**Easy**

1. Take the "fat handler" from §11.1 and list each distinct reason it might change. Mark which layer each belongs to.
2. Create the folder structure from §11.8 and move ShopLine's Chapter 7 product routes into `http/products.routes.js`.
3. Write `createProductService` with `list`, `get`, `create`, taking a `productRepo`. Throw domain errors only.
4. Write the in-memory product repository with `findById`, `list`, `save`, `remove`.
5. Create `shared/errors.js` and the HTTP mapping table; verify a `NOT_FOUND` becomes `404` in a test.
6. Run `node --test` on the six service tests from §11.6 and read each assertion.
7. Add a new rule, "orders over 20 items are rejected," with a test written first.

**Medium**

8. Build `container.js`; create two containers (production-like and test) and show a test swapping in a failing repository.
9. Freeze the clock and ID generator to write a test asserting the exact `createdAt` and `id` in an order.
10. Add `cancelOrder(user, orderId)` with state-machine rules (`pending → cancelled` allowed; `shipped → cancelled` is a `CONFLICT`) and authorization; write tests for every path.
11. Write a repository **contract test** function and run it against the in-memory repo; then write a second implementation (a JSON-file repo) and run the same contract against it.
12. Create a `notifications` module that subscribes to `order.placed` and records "emails" in an array; test it without touching the orders module.
13. Add an architecture test that forbids any file under `modules/` from importing `process.env` directly (hint: scan for `process.env`).
14. Write `config.js` with Zod; run with missing `DATABASE_URL` and show the fail-fast exit.

**Hard**

15. Add the "no cross-module internals" rule using `dependency-cruiser` (or `eslint-plugin-import`'s `no-restricted-paths`) and demonstrate it failing.
16. Detect circular imports in your code base with `madge --circular`; introduce one on purpose and break it by publishing an event instead.
17. Make `placeOrder` safer: introduce a fake `unitOfWork.run(fn)` that rolls back the in-memory stock changes if any step throws, and test the rollback.
18. Make event publishing happen only after the unit of work succeeds (collect events during the transaction and flush on commit). Test that a failed order publishes nothing.
19. Replace the in-process event bus with a version that *queues* handlers (`setImmediate`) and isolates subscriber errors; test that a throwing subscriber doesn't affect `placeOrder`.
20. Write a one-page Architecture Decision Record (ADR) for ShopLine: why a modular monolith, what rules modules follow, and exactly what trigger conditions would make you extract the `billing` module into a service.

---

## 11.23 5 Interview Questions

**1. Explain layered architecture and the dependency rule. What goes in each layer?**
*Model answer:* HTTP layer (routing, input validation, mapping results/errors to status codes), service layer (use cases, business rules, authorization, orchestration, transaction boundaries), data layer/repositories (persistence behind domain-named methods), and infrastructure clients. Dependencies point downward/inward only: services don't know about HTTP, and nothing but repositories knows SQL. This keeps business logic testable and reusable across REST, GraphQL, jobs and CLIs.

**2. What is dependency injection and how do you do it in Node without a framework?**
*Model answer:* Components receive their collaborators instead of creating or importing them. In Node: factory functions or classes taking a dependencies object (`createOrderService({ orderRepo, events, clock })`), assembled at one composition root. Tests pass fakes; production passes real adapters. I avoid service locators and global singletons, and only add a container library when the wiring becomes unwieldy.

**3. Monolith vs microservices vs modular monolith: what would you choose for a new product?**
*Model answer:* A modular monolith: single deployable with strong module boundaries (each module owns its data, public API, event-based communication, enforced by tests). It gives fast development and simple operations while keeping seams for later extraction. Move to microservices only for concrete needs such as independent scaling, team autonomy at larger scale, isolation/compliance, or divergent technology, and accept the cost of distributed systems.

**4. How do you make business logic easy to test?**
*Model answer:* Keep it free of framework and infrastructure imports; inject repositories, external clients, clock and ID generation; return plain data and throw domain errors; use in-memory fakes validated by contract tests; reserve integration tests for the repository adapters and end-to-end smoke tests for wiring. This yields fast, deterministic unit tests (hundreds in milliseconds).

**5. What are ports and adapters (hexagonal architecture)? Is it always worth it?**
*Model answer:* The application core defines ports (interfaces for what it needs, like `orderRepo` or `paymentGateway`), and adapters implement them for specific technologies (Postgres, Stripe, in-memory) or drive the core (REST, GraphQL, CLI). Dependencies point inward, so infrastructure is replaceable. It's worth it when there are multiple implementations, meaningful business rules, or testing needs; for small CRUD it's overhead, so I apply it incrementally (YAGNI).

---

## 11.24 3 Real Projects

**Project 1: Refactor the Fat Handler (beginner–intermediate, ~5 hours).**
Start from a deliberately messy 200-line Express app (provided by you: checkout, coupons, stock, emails in one file). Characterize its behavior with black-box HTTP tests, then refactor into routes → services → repositories with DI, keeping every black-box test green. Report line counts, test counts, and test runtime before and after.

**Project 2: Modular Monolith with Enforced Boundaries (intermediate–advanced, ~10 hours).**
Build `catalog`, `orders`, `users`, `notifications` modules for ShopLine with a composition root, in-memory repositories, an event bus, and an architecture test suite (no express in modules, no cross-module internals, no cycles, only `config.js` reads env). Provide a script `npm run arch` that prints a module dependency graph. Show that intentionally violating each rule fails CI.

**Project 3: Swap the Adapters (intermediate–advanced, ~8 hours).**
Implement `orderRepo` three ways (in-memory, JSON file, SQLite) and `paymentGateway` two ways (fake, and a recorded-HTTP stub), all behind the same ports and verified by shared contract tests. Switch implementations via configuration only (no service code changes) and demonstrate the same unit-test suite plus the same end-to-end script passing on each combination.

---

## 11.25 Further Reading

- Alistair Cockburn, *Hexagonal Architecture* (alistair.cockburn.us).
- Robert C. Martin, *Clean Architecture*; and his essay *The Clean Architecture* (blog.cleancoder.com).
- Mark Seemann, *Dependency Injection: Principles, Practices, and Patterns*; the "composition root" and "service locator is an anti-pattern" articles.
- Vaughn Vernon, *Implementing Domain-Driven Design*; and Eric Evans, *Domain-Driven Design* (aggregates, bounded contexts).
- Simon Brown, *Modular Monoliths* talks; Kamil Grzybek's "Modular Monolith with DDD" reference repository.
- Foote & Yoder, *Big Ball of Mud* (1997).
- Martin Fowler's articles: *MonolithFirst*, *Repository*, *Dependency Injection (Inversion of Control Containers)*, and *Transaction Script vs Domain Model*.
- Tools: `dependency-cruiser`, `madge`, ESLint `import/no-restricted-paths`; NestJS and awilix docs for DI containers.

---

### Up next → Part 3, Chapter 12: Database Fundamentals

Part 2 is complete: you can build, secure, structure and deploy real-time-capable HTTP APIs. But look at the repositories we wrote: they store everything in a `Map` that vanishes on restart. It's time for the heart of nearly every backend: **databases**. Chapter 12 starts Part 3 by asking why databases exist, what ACID and CAP really mean, how data is stored on disk, and how to choose between SQL and NoSQL.
