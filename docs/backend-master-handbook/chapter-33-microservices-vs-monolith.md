# The Backend Master Handbook

### From Absolute Beginner to Production-Grade Engineer

---

# Chapter 33: Microservices vs Monolith — Choosing Your Architecture's Shape

---

## 33.0 Why This Chapter Matters

At some point every engineer hears: *"We should move to microservices."* Sometimes it's the right call. Often it's a fashionable way to turn a manageable problem into a distributed-systems problem, and a team of five into the operators of forty services.

The honest truth, repeated by teams that have done both: **most systems should start as a well-structured monolith**, and **many should stay one**. Microservices are a trade: they buy *independent deployment and team autonomy at scale* and they cost *network failures, data consistency, operational complexity and debugging pain.* You pay the cost whether or not you needed the benefit.

You have already built the pieces of this decision across the book: the **layered/modular** architecture of Chapter 11, the **distributed-systems** costs of Chapter 30, the **queues and sagas** of Chapters 28/30, the **observability** of Chapter 25, the **resilience** patterns of Chapter 26, and the **delivery pipeline** of Chapter 32. This chapter assembles them into a decision framework, with the structural patterns on both sides.

### ⚠️ What was and wasn't run (fast mode)

**Nothing in this chapter was executed.** It's an architecture and judgement chapter, written in "fast mode": diagrams, trade-off tables, and short code sketches that I did **not** run and that **may contain mistakes**. The only *measured* facts used are from earlier chapters (for instance, Chapter 26's resilience experiments, Chapter 29's scaling numbers, Chapter 28's outbox test). The latency-amplification arithmetic below is standard maths, not a benchmark.

### 💡 Did You Know?

In 2023, Amazon Prime Video's engineering team published that moving one monitoring component **from a distributed serverless microservice architecture back to a single-process monolith** cut its infrastructure cost by about 90%. And Shopify, one of the largest e-commerce platforms on earth, runs on a **modular monolith** (a very large Rails application). Architecture follows needs, not fashion.

---

## 33.1 The Spectrum, Not a Binary

```
 Big ball of mud      Layered monolith       Modular monolith       Service-based        Microservices
 (no structure)  ──►  (Ch 11: layers)  ──►   (modules with strict ──► (few coarse    ──► (many fine-grained
                                              boundaries, one deploy)  services)          services)
   ◄── simpler to run, change across modules is easy ──────────── independent deploy & scale, harder to run ──►
```

| | **Monolith** | **Modular monolith** | **Microservices** |
|---|---|---|---|
| Deployment unit | One | One | Many, independently |
| Code boundaries | Often weak | **Enforced** modules (Ch 11: architecture tests) | Process/network boundaries |
| Data | One database | One database, **schema-per-module ownership** | **Database per service** |
| Calls between parts | In-process function calls (ns, can't fail independently) | In-process via module interfaces | Network calls (ms, can fail, timeout, be slow) |
| Transactions | ACID across everything | ACID across modules (use sparingly) | **Sagas/outbox**, eventual consistency |
| Refactoring across boundaries | IDE rename | Easy, compiler/test-checked | Multi-repo, versioned API changes |
| Debugging | One stack trace | One stack trace | Distributed traces (Ch 25) |
| Scaling | Whole app together | Whole app together | Each service independently |
| Team autonomy | Low | Medium | High (when well designed) |
| Operational cost | Low | Low | **High** |
| Best for | Small team, young product | **Most products for a long time** | Large orgs, clear domains, proven scale/autonomy needs |

---

## 33.2 What Microservices Actually Buy You

1. **Independent deployability**: Team A ships the catalogue without coordinating with Team B's payments. (The most important benefit; if your services must be deployed together, you have none of it.)
2. **Independent scaling**: scale the search service 20× without scaling checkout.
3. **Fault isolation**: a crash or leak in one service doesn't take down the others (if designed with timeouts, breakers, bulkheads: Chapter 26).
4. **Technology freedom**: the recommendation service in Python, the API in Node (at a cost in tooling and hiring).
5. **Team autonomy and clear ownership**: small teams own services end to end ("you build it, you run it"). This is largely an **organisational** benefit.

And what they **cost**: every call can fail or be slow (Chapter 26's whole toolkit becomes mandatory); data consistency is eventual (Chapter 30); testing needs contracts and environments (Chapter 24); observability needs tracing everywhere (Chapter 25); deployments multiply (Chapter 32); security surface grows (each service authenticates and authorises: Chapters 21–22); and you need a **platform** (service discovery, config, CI templates, secrets, tracing, gateways).

### The latency tax, with arithmetic *(standard maths; not a benchmark)*

In a monolith a function call costs nanoseconds. A network hop costs roughly **0.5–5 ms** within a datacenter, plus serialisation, plus the chance of failure. If rendering a product page requires **8 sequential** service calls at 3 ms each, you've added ~24 ms *before any work*; fan-out calls in parallel are as slow as the slowest, and **tail latency amplifies**: if each of 10 services has a 1% chance of being slow, a request touching all ten is slow `1 − 0.99¹⁰ ≈ 9.6%` of the time (Chapter 30). Availability multiplies too: ten services at 99.9% each give at best `0.999¹⁰ ≈ 99.0%` for a request that needs all of them (≈ 7 hours of downtime a month instead of 43 minutes). **Every synchronous dependency is a multiplier on failure.**

---

## 33.3 The Modular Monolith: The Default Choice

A **modular monolith** is one deployable application internally divided into **modules with strict boundaries**, each owning its logic **and its data**, communicating through **explicit interfaces** (and events), so that *any module could be extracted into a service later with minimal change.* It captures most of the design benefits of microservices (clear boundaries, ownership, low coupling) while keeping the monolith's operational simplicity (one deploy, in-process calls, ACID transactions).

You built this in Chapter 11: `src/modules/<feature>/` with services, repositories and ports; a composition root; **architecture tests** that fail the build if module A imports module B's internals. Make the boundaries real:

```
src/modules/
  catalog/     { api.js (public interface), service.js, repo.js, events.js, tables: catalog_* }
  orders/      { api.js, service.js, repo.js, events.js, tables: orders_*, order_items }
  payments/    { … tables: payments_* }
  inventory/   { … tables: inventory_* }
  shared/      { kernel: ids, money, errors, clock }      ← tiny, stable
```

Rules that keep it modular *(enforce with tests/lint, as in Chapter 11)*:

- Modules call each other **only through their public `api.js`** (or by publishing events), never by importing internals or reading another module's tables.
- **Each module owns its tables** (separate PostgreSQL **schemas** per module, with DB roles that can only touch their own schema, Chapter 22): "no cross-module joins" is a rule you can enforce in the database.
- **Cross-module consistency**: either a transaction when it truly must be atomic (an explicit, rare exception) or **in-process events via an outbox** (Chapter 28) so a later service split changes the transport, not the design.
- Keep the dependency graph **acyclic** (orders → catalog, payments → orders; never the reverse).

**The payoff:** if a module later needs its own scale, team or technology, you extract it, replacing the in-process `api.js` call with an HTTP/gRPC client and the in-process event with a message, with the contract already defined. Premature extraction is expensive; *late extraction of a well-bounded module is cheap.*

---

## 33.4 When to Split: A Decision Framework

Ask these in order. A "no" to the early questions should end the conversation:

1. **Do you have a problem that a modular monolith can't solve?** (Not "microservices are modern.") Name it: *deployment contention, scaling mismatch, team scaling, fault-isolation need, regulatory isolation.*
2. **Is the team large enough that coordination cost dominates?** Rough heuristic: under ~20–30 engineers, one deployable almost always wins. Microservices solve **organisational** scaling.
3. **Are the boundaries stable and well understood?** A wrong boundary baked into a network API is **very** costly to change. Early in a product's life the domain is still being discovered; keep it in one codebase until the seams are obvious.
4. **Do parts have genuinely different scaling, availability or technology profiles?** (A CPU-heavy image-processing pipeline vs a CRUD API; a payment service needing PCI isolation.)
5. **Do you have the platform and skills?** CI/CD per service, tracing, alerting, on-call, service discovery, secrets, a way to run the whole system locally. If not, you'll build them under pressure.
6. **Can the data be partitioned?** If two services need constant joins and shared transactions, they're one service with a network in the middle.

### Good reasons to extract a service

- A distinct **team** wants an independent release cadence and the boundary is clear.
- **Independent scaling** is measured and expensive in the monolith (e.g., search or media processing).
- **Different runtime needs** (GPU, long-running jobs, a different language ecosystem).
- **Isolation for risk/compliance** (payments, PII vault).
- A genuinely **separate product** domain (an identity provider, a notification platform).

### Bad reasons

- "It's modern / everyone does it / our résumés."
- "The codebase is messy": splitting a mess gives you a **distributed** mess; fix the modularity first.
- "To scale": most scaling problems are queries, caches and connection limits (Chapters 15, 27, 29), not process count.
- "To use a new language": a service per language multiplies ops cost.

### The anti-pattern: the distributed monolith

Services that **must be deployed together**, share a database, call each other synchronously in long chains, or change in lockstep. You get all the costs of microservices and none of the benefits. Tell-tale signs: a feature change touches 5 repos; the whole system is down if any service is; "release trains" coordinate versions; one shared database schema is edited by many services.

---

## 33.5 Defining Service Boundaries

### Domain-driven design vocabulary (the useful parts)

- **Bounded context**: a boundary within which a model and its language are consistent. "Customer" means something different to *Orders* (a purchaser with addresses), *Billing* (a payer with a tax id), and *Support* (a person with tickets). Each context has its own model; they are **not** one shared `Customer` table.
- **Aggregate**: a cluster of objects changed together under one consistency rule (an **Order** with its lines). *Transactions don't cross aggregate boundaries; service boundaries shouldn't cut through aggregates.*
- **Context map**: how contexts relate (customer-supplier, conformist, anti-corruption layer, shared kernel).
- **Ubiquitous language**: the team uses the domain's words in code and conversation.

### Drawing boundaries for ShopLine

| Context (candidate service) | Owns | Key data | Why a boundary here |
|---|---|---|---|
| **Catalogue** | Products, categories, attributes, search index | `products`, `categories` | Read-heavy, cacheable, different scaling |
| **Orders** | Carts, orders, order lifecycle | `orders`, `order_items` | The transactional core |
| **Inventory** | Stock levels, reservations | `stock`, `reservations` | Needs strong consistency, high write contention (Ch 16/24) |
| **Payments** | Payment attempts, refunds, provider integration | `payments` | Compliance isolation, idempotency (Ch 26) |
| **Identity** | Users, auth, sessions | `users`, credentials | Security-critical, reusable (or buy: Ch 21) |
| **Notifications** | Email/SMS/push, templates | `outbox`, delivery log | Async by nature (Ch 28) |
| **Search / Analytics** | Derived read models | Elasticsearch, warehouse | Derived data (Ch 20) |

Boundary heuristics: **align with teams and business capabilities**, not with technical layers (never a "database service" or "validation service"); prefer **coarser first** (3–5 services) and split further only on evidence; look for **high cohesion inside, low coupling across**; and watch for **chatty** boundaries (two services that call each other constantly belong together).

### Conway's Law

> *"Organisations design systems that mirror their communication structures."* (Melvin Conway, 1968)

Your architecture will end up shaped like your org chart. The **inverse Conway manoeuvre**: shape the teams (small, cross-functional, owning a business capability end to end) to get the architecture you want. Splitting services without splitting ownership produces a distributed monolith with cross-team dependencies on every change.

---

## 33.6 Data Ownership and Consistency

The hardest part of microservices is data. The rule: **each service owns its data and exposes it only through its API/events.** No shared database, no reading another service's tables.

Why a **shared database** is the cardinal sin: it couples schemas (any change breaks others), hides dependencies, lets anyone bypass invariants, and makes independent deploys impossible: the distributed monolith's usual root cause.

How services still get data they don't own:

| Need | Pattern |
|---|---|
| **Query another service's data right now** | Synchronous API/gRPC call (with timeout, breaker, cache: Chapters 26–27) |
| **Reference data used often** (product name/price in Orders) | Keep a **local read-only copy** updated via events (replication by events) or **snapshot at the time of use** (Chapter 14: the order stores name and price at purchase) |
| **Composite views** ("order with product images and payment status") | **API composition** (a gateway/BFF queries several services) or a **CQRS read model** built from events |
| **Multi-service business transaction** | **Saga** with compensations, orchestrated or choreographed (Chapter 30) |
| **Reliable event publishing** | **Transactional outbox** (Chapter 28: we saw naive dual-write lose 60 of 300 events) |
| **Idempotent consumers** | Dedup by event id (Chapter 28: absorbed 100 duplicate deliveries) |

Reporting needs across all services go to a **data warehouse** fed by events/CDC (Chapter 20), not cross-service SQL joins.

---

## 33.7 Communication Between Services

### Synchronous (request/response)

REST/JSON (Chapter 8), **gRPC** (Chapter 10: typed contracts, deadlines, streaming), GraphQL for client-facing composition (Chapter 9). Simple to reason about, but couples availability and latency: **service A is only as available as everything it calls synchronously.** Use **timeouts, retries (idempotent only), circuit breakers and bulkheads** (Chapter 26), and keep call chains **shallow** (≤ 2–3 hops).

### Asynchronous (events and commands)

Queues, streams, pub/sub (Chapter 28). The sender doesn't wait; consumers process at their pace; failures are isolated and retried. Prefer async for anything that doesn't need an immediate answer, and for *notifying* about facts ("OrderPlaced") rather than *asking* for data.

| Choose | When |
|---|---|
| **Sync** | You need the answer to continue (price lookup at checkout, auth check); low-latency queries |
| **Async events** | Decoupling reactions (email, search index, analytics, inventory updates); long-running work |
| **Async commands via a queue** | Work that must happen but not now, with retries |

### API contracts and versioning

The API between services is a **public API** (Chapter 8): version it, evolve additively, deprecate gradually. **Consumer-driven contract tests** (Pact; Chapter 24) catch breaking changes in CI. Use **schema registries / OpenAPI / protobuf** and the **tolerant reader** principle (ignore unknown fields). **Backward compatibility** is non-negotiable because services deploy independently (Chapter 32's two-version overlap, now between services).

### The edge: API gateway and BFF

- An **API gateway** (Kong, Envoy, AWS API Gateway, nginx) is the single entry point: TLS termination, authentication, rate limiting (Chapter 23), routing to services, request/response transformation, aggregation. Keep it thin: **no business logic** in the gateway.
- A **BFF (Backend-for-Frontend)** is a small server per client type (web, mobile) that composes calls to services into exactly what that UI needs, reducing chattiness over slow mobile networks.
- **Service discovery** (Kubernetes DNS, Consul) lets services find each other as instances come and go; a **service mesh** (Istio, Linkerd) can add mTLS, retries, timeouts, traffic splitting and telemetry outside the application code, at the price of more moving parts *(none of these run here)*.
- **Internal service-to-service auth**: mutual TLS or signed service tokens (Chapter 21), plus authorisation at each service (Chapter 22): **never trust the network just because it's "internal"**.

---

## 33.8 Operating Many Services

What you must have **before** you split (the "microservices prerequisites", per Martin Fowler):

- **Rapid provisioning** and **automated deployment** per service (Chapter 32: pipelines, IaC, containers: Chapter 31).
- **Observability**: centralised logs with correlation ids, metrics per service (RED), **distributed tracing** (Chapter 25), dashboards and SLOs per service.
- **Resilience patterns built in** (Chapter 26) and **chaos testing**.
- **A platform**: service templates ("golden paths"), shared libraries for logging/metrics/auth/retries, a service catalogue with owners and runbooks.
- **Testing strategy**: unit and contract tests per service, a few end-to-end tests; test environments that don't require running 40 services locally (Compose subsets, contract stubs, ephemeral environments).
- **On-call and ownership**: each service has a team that is paged for it.
- **Cost visibility**: each service multiplies baseline compute, observability and network costs.

**Versioning and compatibility across the fleet:** support at least N-1 versions of every API; deploy producers before consumers for additive changes and consumers before producers for removals (the same expand/contract thinking as Chapter 14, applied to APIs).

---

## 33.9 Migrating: The Strangler Fig

If you must move from a monolith to services, **do not rewrite**. The **Strangler Fig pattern** (Martin Fowler) grows new services around the monolith, gradually routing functionality to them until the old code can be removed:

```
1. Put a facade/gateway in front of the monolith (all traffic passes through it).
2. Pick ONE well-bounded capability (e.g., notifications or search), the least entangled.
3. Build it as a new service; keep the monolith's version running.
4. Route a small % of traffic via the gateway to the new service (canary: Chapter 32); compare.
5. Move data ownership (sync, then switch the source of truth; use outbox/CDC to keep them aligned during the transition).
6. Cut over fully; delete the old code. Repeat.
```

Guidelines: **modularise inside the monolith first** (this is cheaper and often sufficient); extract the **edges** before the **core** (notifications, search, media processing are easier than orders); introduce an **anti-corruption layer** so the new service's model isn't polluted by the monolith's; keep the migration **incremental and reversible**; measure outcomes (deploy frequency, incident rate, lead time) to confirm the split helped; and be willing to **stop** once the pain is solved. The big-bang rewrite ("version 2 in 18 months") fails far more often than it succeeds.

---

## 33.10 Serverless and "Nanoservices"

**Functions-as-a-service** (Lambda, Cloud Functions) push decomposition further: one function per event/route. They suit **spiky, event-driven, glue** workloads (resize an image on upload, handle a webhook) with no servers to manage (Chapter 32). Cautions: cold starts, execution time limits, **database connection exhaustion** (needs a proxy/pooler: Chapter 29), vendor lock-in, hard local testing/observability, and **function sprawl** that becomes an unmaintainable web of triggers. Use them where they fit, not as the default shape of a whole backend.

---

## 33.11 ShopLine: A Recommended Path

1. **Now (team ≤ ~10):** one **modular monolith** (Chapter 11's structure), one PostgreSQL with **schema-per-module**, Redis, a worker process from the same codebase (Chapter 28), managed hosting (Chapter 32). Enforce module boundaries with architecture tests; events inside the monolith via the outbox.
2. **Extract when evidence appears:** *search* (different scaling/technology: Chapter 20) and *media processing* are classic first candidates; *notifications* is naturally async; *payments* may deserve isolation for compliance.
3. **Keep orders + inventory + catalogue core together** as long as possible: they share transactional invariants (stock, price snapshots, Chapter 16/24); splitting them forces sagas for what is currently one `BEGIN … COMMIT`.
4. **Before each extraction:** the module already has an `api.js` boundary and its own schema; contract tests exist; tracing and a pipeline template are ready; ownership is assigned.
5. **After:** measure deploy frequency, p99, error budget burn, cost and on-call load; if they got worse, you've learned the split wasn't worth it.

---

## 33.12 Edge Cases and Gotchas Checklist

- [ ] Choosing microservices for résumé/fashion reasons; splitting before the domain is understood; a "rewrite" instead of a strangler.
- [ ] A shared database between services; cross-service joins; services reading each other's tables.
- [ ] Services that must deploy together (distributed monolith); chatty synchronous chains; no timeouts/breakers.
- [ ] Boundaries drawn by technical layer ("DB service", "utility service") instead of business capability; aggregates split across services.
- [ ] No contract tests or API versioning; breaking changes shipped to consumers.
- [ ] No tracing/correlation ids; per-service dashboards missing; no on-call ownership; no platform.
- [ ] Distributed transactions attempted (2PC) instead of sagas + outbox; non-idempotent consumers.
- [ ] Trusting the internal network: no service-to-service auth/authorisation.
- [ ] Gateways containing business logic; one giant gateway team as a bottleneck.
- [ ] A monolith with no internal boundaries (so that neither modularity nor extraction is possible).
- [ ] Ignoring Conway's law: service boundaries that don't match team ownership.
- [ ] Cost of N services' baseline (compute, logging, monitoring) not budgeted.

---

## 33.13 Chapter Summary

- Architecture is a **spectrum**; **microservices trade operational and consistency complexity for independent deployment and team autonomy.** Their main benefit is **organisational**.
- Costs are concrete: every call can fail/slow; tail latency amplifies (`1 − 0.99¹⁰ ≈ 9.6%`); availability multiplies (ten 99.9% services ≈ 99.0%); eventual consistency; testing, tracing, security and platform overhead.
- The **modular monolith** (Chapter 11 made enforceable: public module APIs, schema-per-module ownership, acyclic dependencies, in-process events via outbox) is the **default**; extraction later is cheap if boundaries are real.
- **Split only for named reasons** (independent teams/release cadence with clear boundaries, measured scaling mismatch, different runtime needs, compliance isolation). Avoid the **distributed monolith**.
- **Boundaries** follow business capabilities/bounded contexts and aggregates, not layers; **Conway's law**: align teams with services.
- **Data**: each service owns its data; never share a database; use APIs, events with local copies/snapshots, composition/CQRS, **sagas**, and the **outbox**; analytics via a warehouse.
- **Communication**: sync with timeouts/breakers/shallow chains; async events/queues for decoupling; versioned, contract-tested APIs; gateway/BFF kept thin; authenticate internal calls.
- **Prerequisites** for many services: automation, observability, resilience, platform, ownership, cost visibility.
- **Migrate with the strangler fig**, edges first, never a big-bang rewrite; serverless for glue, not as the default.
- *Fast mode: no examples in this chapter were run.*

---

## 33.14 Revision Notes

- Default: modular monolith; schema-per-module; public module API only; events via outbox.
- Split reasons: independent teams/deploys, measured scale mismatch, runtime/compliance isolation.
- Distributed monolith = shared DB + lockstep deploys + chatty sync chains.
- Boundaries: bounded contexts, aggregates, business capabilities; Conway's law.
- Data ownership; no shared DB; snapshot/replicate-by-events; saga + outbox + idempotent consumers.
- Sync (answer needed) vs async (reactions); shallow chains; contracts + versioning; thin gateway; BFF.
- Prereqs: CI/CD, tracing, resilience, platform, on-call.
- Strangler fig: facade → extract edge capability → route gradually → move data → delete old.
- Availability multiplies; tail latency amplifies.

---

## 33.15 Mind Map (ASCII)

```
                          MONOLITH vs MICROSERVICES
                                      │
      ┌───────────┬───────────┬───────┴───────┬────────────┬──────────────┐
   SPECTRUM    BENEFITS     COSTS          BOUNDARIES    DATA & COMMS    MIGRATION
      │            │           │                │              │              │
  monolith     independent   network/failure   bounded       own your data  strangler fig
  modular ★    deploy        consistency       contexts      no shared DB   edges first
  services     scale/fault   testing/tracing   aggregates    saga + outbox  anti-corruption
  micro        team autonomy platform/ops      Conway        sync vs async  no big-bang
  serverless                 latency/availability              gateway/BFF
```

---

## 33.16 Cheat Sheet

```
Start: modular monolith. Boundaries by business capability. One module = one schema = one owner.
Split when: (a) independent team + stable boundary, (b) measured scaling mismatch, (c) different runtime, (d) compliance isolation.
Never: shared database · lockstep deploys · layer-based services · big-bang rewrite.
Sync call: timeout + breaker + (idempotent) retry + cache + ≤3 hops.   Async: outbox → queue → idempotent consumer.
Multi-service transaction: saga (orchestrated) + compensations.      Reporting: warehouse via CDC/events.
Availability ≈ ∏ availability_i.   P(slow | fan-out N) = 1 − (1−p)^N.
Migrate: strangler fig — facade, extract an edge capability, route gradually, move data, delete.
```

---

## 33.17 Key Takeaways

1. **Microservices are an organisational scaling tool with a steep technical price.** Pay it only when you need what it buys.
2. **A modular monolith gets you 80% of the design benefit at 20% of the operational cost**; extraction later is cheap if boundaries are real.
3. **Never share a database across services**; data ownership is the heart of the split.
4. **Every network call is a failure mode**: apply Chapter 26's patterns, keep chains shallow, prefer events.
5. **Align boundaries with teams and business capabilities** (Conway's law).
6. **Migrate incrementally** with the strangler fig; measure whether it helped.

---

## 33.18 20 Multiple Choice Questions

**Q1.** The primary benefit of microservices is:
A) Faster code  B) Independent deployment and team autonomy  C) Less operations work  D) Simpler debugging

**Q2.** A modular monolith differs from a "big ball of mud" by having:
A) More servers  B) Enforced module boundaries and data ownership  C) Microservices  D) A message broker

**Q3.** A distributed monolith is:
A) A monolith on many servers behind a balancer  B) Services that must deploy together, share a database or call in lockstep chains  C) A well-designed system  D) Serverless

**Q4.** Ten services in a synchronous chain, each 99.9% available, yield roughly:
A) 99.9%  B) 99.0%  C) 100%  D) 90%

**Q5.** A request fans out to 10 services each slow 1% of the time; it's slow about:
A) 1%  B) ~9.6%  C) 50%  D) 0.1%

**Q6.** Which is a *bad* reason to adopt microservices?
A) Independent release cadence for separate teams  B) Because it's trendy or the monolith is messy  C) Compliance isolation of payments  D) Measured scaling mismatch

**Q7.** A bounded context is:
A) A database  B) A boundary within which a model and language are consistent  C) A Docker network  D) A queue

**Q8.** Service boundaries should align with:
A) Technical layers  B) Business capabilities and team ownership  C) File size  D) Programming languages

**Q9.** Sharing one database among services leads to:
A) Independent deploys  B) Tight schema coupling and lockstep changes  C) Faster queries only  D) Better isolation

**Q10.** To get product names into Orders without a shared database, you can:
A) Join across schemas  B) Snapshot at purchase and/or keep a local copy updated by events  C) Read the catalogue table directly  D) Share credentials

**Q11.** For a multi-service business transaction use:
A) 2PC across all services  B) A saga with compensating actions  C) A global lock  D) A shared transaction

**Q12.** Which communication fits "notify other parts that an order was placed"?
A) A synchronous call to each  B) An event via outbox and a queue  C) Shared memory  D) A cron job

**Q13.** An API gateway should:
A) Contain business logic  B) Handle cross-cutting concerns like TLS, auth, rate limits and routing  C) Own the database  D) Replace services

**Q14.** Conway's law says systems mirror:
A) Hardware  B) The communication structure of the organisation  C) Programming languages  D) The database

**Q15.** The strangler fig pattern:
A) Rewrites everything at once  B) Gradually routes functionality to new services until the old code can be removed  C) Splits a database  D) Kills the monolith immediately

**Q16.** Which should usually be extracted first?
A) The transactional core (orders)  B) Loosely coupled edge capabilities (notifications, search, media)  C) The shared kernel  D) Authentication tables

**Q17.** Before adopting many services you need:
A) Nothing  B) Automation, observability, resilience patterns and ownership  C) A bigger monolith  D) A service mesh only

**Q18.** Consumer-driven contract tests help by:
A) Speeding builds  B) Catching breaking API changes between independently deployed services  C) Replacing unit tests  D) Generating code

**Q19.** Synchronous chains should be:
A) As long as possible  B) Shallow, with timeouts, breakers and caching  C) Retried infinitely  D) Unmonitored

**Q20.** A recommended default for a small, young team:
A) 30 microservices  B) A modular monolith with clear module boundaries  C) Only serverless functions  D) A big-bang rewrite

### Answer Key

| Q | A | Why |
|---|---|---|
| 1 | B | Autonomy. |
| 2 | B | Enforced boundaries. |
| 3 | B | Coupled services. |
| 4 | B | 0.999^10 ≈ 99.0%. |
| 5 | B | 1−0.99^10. |
| 6 | B | Fashion/mess. |
| 7 | B | Model boundary. |
| 8 | B | Capabilities/teams. |
| 9 | B | Coupling. |
| 10 | B | Snapshot/local copy. |
| 11 | B | Saga. |
| 12 | B | Event. |
| 13 | B | Cross-cutting only. |
| 14 | B | Org structure. |
| 15 | B | Incremental. |
| 16 | B | Edges first. |
| 17 | B | Prerequisites. |
| 18 | B | Compatibility. |
| 19 | B | Shallow + protected. |
| 20 | B | Default. |

---

## 33.19 20 Hands-on Exercises

*(Suggestions; none were run by me.)*

**Easy**

1. List five costs a network boundary adds compared to a function call.
2. Compute availability for a request needing 5 services at 99.9%, 99.95% and 99.99%.
3. Draw ShopLine's bounded contexts and the events between them.
4. Identify any shared-database coupling in a project you know.
5. Write down three reasons to split and three reasons not to for your own system.

**Medium**

6. Refactor ShopLine into modules with `api.js` boundaries and add architecture tests enforcing them (Chapter 11).
7. Give each module its own PostgreSQL schema and DB role; prove cross-module table access fails.
8. Replace one cross-module call with an outbox event and an idempotent consumer.
9. Write consumer-driven contract tests between two modules/services.
10. Design a saga for checkout with compensations and decide orchestration vs choreography.
11. Create an API gateway config (routing, auth, rate limits) for three services.
12. Draw a context map showing customer-supplier and anti-corruption relationships.

**Hard**

13. Extract the notifications module into a separate service with a queue; keep the contract; measure latency and failure behaviour.
14. Use the strangler fig to route 5% of search traffic to a new service with comparison logging.
15. Build a distributed trace across gateway → orders → inventory → payments.
16. Chaos-test a three-service chain (timeouts, breakers, bulkheads) and report availability.
17. Implement CQRS read models for "order with product and payment status" built from events.
18. Create a service template (logging, metrics, tracing, auth, health checks) and generate two services from it.
19. Perform a cost model: monolith vs 8 services (compute, logging, monitoring, people).
20. Write an architecture decision record (ADR) for "stay modular monolith" vs "extract search".

---

## 33.20 5 Interview Questions

**1. Monolith or microservices for a new product?**
*Model answer:* Start with a modular monolith: one deployable with enforced module boundaries and data ownership, giving clear design and low operational cost. Extract services only for named reasons (independent team cadence with stable boundaries, measured scaling mismatch, different runtime, compliance isolation) once the domain is understood and the platform (CI/CD, tracing, resilience) exists.

**2. What is a distributed monolith and how do you avoid it?**
*Model answer:* Services that can't be deployed independently because they share a database, change in lockstep, or form long synchronous call chains: all the costs, none of the benefits. Avoid with data ownership per service, backward-compatible versioned APIs, async events, shallow call chains, and boundaries aligned to business capabilities and teams.

**3. How do you handle a transaction spanning several services?**
*Model answer:* Avoid distributed ACID transactions. Use a saga: local transactions with compensating actions, orchestrated by a durable coordinator or choreographed through events, with idempotent steps, the outbox for reliable publishing, and a UX that tolerates pending states. Also reconsider whether those capabilities should be one service.

**4. How would you migrate a monolith to services?**
*Model answer:* Modularise the monolith first; then apply the strangler fig: put a gateway in front, extract a loosely coupled edge capability, route traffic gradually with comparison/canary, migrate data ownership with outbox/CDC, cut over and delete the old code; repeat, measuring benefit and stopping when the pain is solved. Avoid big-bang rewrites.

**5. What does Conway's law mean for architecture?**
*Model answer:* System structure mirrors the organisation's communication structure. To get independently deployable services you need small, autonomous teams owning capabilities end to end; splitting code without splitting ownership yields cross-team dependencies on every change. Use the inverse Conway manoeuvre: design the team structure you want the architecture to reflect.

---

## 33.21 3 Real Projects

**Project 1: Modularise ShopLine (intermediate, ~12 hours).**
Restructure into modules with public APIs, schema-per-module ownership with DB roles, architecture tests, and in-process events via the outbox; prove a boundary violation fails CI and that one module can be run with its dependencies stubbed.

**Project 2: Extract a Service with the Strangler Fig (advanced, ~16 hours).**
Extract notifications (or search) behind a gateway: contract tests, canary routing with comparison, data migration via outbox/CDC, rollback plan, and a before/after report on deploy frequency, latency and incident rate.

**Project 3: Architecture Decision Records (intermediate, ~6 hours).**
Write five ADRs for ShopLine (modular monolith vs services; database per module; sync vs async between orders and inventory; gateway choice; saga orchestration), each with context, options, trade-offs, decision and review triggers.

---

## 33.22 Further Reading

- Martin Fowler: *Microservices* (with James Lewis), *MonolithFirst*, *MicroservicePrerequisites*, *StranglerFigApplication*, *BoundedContext*.
- Sam Newman, *Building Microservices* and *Monolith to Microservices*.
- Eric Evans, *Domain-Driven Design*; Vaughn Vernon, *Implementing Domain-Driven Design*; Matthew Skelton & Manuel Pais, *Team Topologies*.
- Chris Richardson, *Microservices Patterns* (saga, outbox, API composition, CQRS); microservices.io.
- Simon Brown, *Modular Monoliths* talks; Kamil Grzybek's modular monolith with DDD (GitHub).
- Amazon Prime Video engineering blog (2023): scaling up the video monitoring service; Shopify Engineering: *Deconstructing the Monolith*.
- Melvin Conway, *How Do Committees Invent?* (1968).

---

### Up next → Chapter 34: System Design (Part 7: Mastery)

Part 6 is complete. Part 7 turns knowledge into mastery: how to *design* a system from a vague requirement, estimate capacity on the back of an envelope, and communicate trade-offs, with worked designs (URL shortener, e-commerce checkout, notifications, rate limiter, news feed), written in fast mode.

