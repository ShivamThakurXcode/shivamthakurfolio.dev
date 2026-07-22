# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 27: System Design Connections for DSA

---

## 27.0 Why This Chapter Exists

Every structure and algorithm in this book has been presented as a solution to a specific access-pattern problem. This chapter's purpose is to make explicit what's been implicit throughout: **the exact same reasoning you've built for choosing a data structure in a coding problem is the reasoning senior engineers use to make real production system design decisions.** A cache eviction policy, a database index, a rate limiter, a load balancer's routing algorithm — these are not new concepts. They are this book's structures, deployed at a different scale, for a business reason instead of an interview question.

---

## 27.1 Caching: LRU/LFU as Direct Applications of Chapters 4, 5, and 9

### 27.1.1 LRU Cache: The Direct Payoff of Chapter 5's Doubly Linked List Preview

Recall Chapter 5, section 5.3.2's forward reference: "LRU caches" as a canonical real-world use case for a doubly linked list. This chapter delivers on that promise in full production context.

**The business problem:** a cache has limited capacity; when full, it must evict something to make room for a new entry. **Least Recently Used (LRU)** evicts whichever entry hasn't been accessed in the longest time — the intuition being that recently-accessed data is statistically more likely to be accessed again soon (a real, empirically-supported principle called "temporal locality").

```javascript
class LRUCache {
  #capacity;
  #map = new Map(); // key -> DoublyListNode  (Chapter 4's Map + Chapter 5's doubly linked list!)
  #head; // most recently used (MRU) sentinel
  #tail; // least recently used (LRU) sentinel

  constructor(capacity) {
    this.#capacity = capacity;
    this.#head = { key: null, value: null, prev: null, next: null };
    this.#tail = { key: null, value: null, prev: null, next: null };
    this.#head.next = this.#tail;
    this.#tail.prev = this.#head;
  }

  #remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  #insertAtFront(node) {
    node.next = this.#head.next;
    node.prev = this.#head;
    this.#head.next.prev = node;
    this.#head.next = node;
  }

  get(key) {
    if (!this.#map.has(key)) return -1;

    const node = this.#map.get(key);
    this.#remove(node);
    this.#insertAtFront(node); // move to MRU position — accessing counts as "using"
    return node.value;
  }
  // Time: O(1) — Chapter 5's key lesson: doubly linked list deletion given a node reference

  put(key, value) {
    if (this.#map.has(key)) {
      this.#remove(this.#map.get(key));
    } else if (this.#map.size >= this.#capacity) {
      const lru = this.#tail.prev;
      this.#remove(lru);
      this.#map.delete(lru.key); // evict the LEAST recently used entry
    }

    const newNode = { key, value, prev: null, next: null };
    this.#insertAtFront(newNode);
    this.#map.set(key, newNode);
  }
  // Time: O(1)
}
```

### 🎯 Interview Pattern: Why This Exact Combination of Structures, Not Any Other

This is worth stating explicitly, since "why THIS combination" is exactly the reasoning system design interviews probe for: **we need O(1) lookup by key (Chapter 4's `Map`) AND O(1) reordering to the front on access, AND O(1) eviction from the back (both requiring Chapter 5's doubly linked list, specifically because it gives O(1) deletion given a direct node reference — a plain array or singly linked list cannot do this).** Neither structure alone solves the problem; **the combination is the solution**, a direct, concrete instance of this book's repeated theme that real problems often require composing multiple structures, not picking a single "correct" one from a list.

### 27.1.2 LFU Cache: A Direct Payoff of Chapter 9's Heap (or a Cleverer Alternative)

**Least Frequently Used (LFU)** evicts whichever entry has been accessed the *fewest* times (not longest ago). The "obvious" implementation reaches for Chapter 9's heap (tracking access counts, evicting the minimum) — but a genuinely clever alternative achieves **O(1)** using a combination of hash maps and Chapter 5's doubly linked lists, one list per frequency count, worth knowing exists as an example of "the heap-based solution is correct but not always optimal — sometimes a cleverer structural combination beats the obvious choice."

### 🔥 Interview Tip

The clean, quotable comparison: **"A heap-based LFU gives O(log n) operations — correct, and often sufficient. An O(1) LFU exists using a hash map from key to frequency, combined with a hash map from frequency to a doubly linked list of keys at that frequency — genuinely more complex to implement, and the trade-off (extra complexity for a better asymptotic bound) is exactly the kind of judgment call system design interviews want you to articulate, not just execute silently."**

---

## 27.2 Rate Limiting: Sliding Windows and Token Buckets

### 🎯 Direct Callback to Chapter 3's Sliding Window

**The business problem:** prevent a single client from making more than `N` requests per time window (protecting a service from abuse or overload). This is **precisely** Chapter 3's sliding window pattern, applied to a stream of timestamps instead of an array.

```javascript
class SlidingWindowRateLimiter {
  #requestLog = new Map(); // clientId -> array of request timestamps
  #maxRequests;
  #windowMs;

  constructor(maxRequests, windowMs) {
    this.#maxRequests = maxRequests;
    this.#windowMs = windowMs;
  }

  allowRequest(clientId, now = Date.now()) {
    if (!this.#requestLog.has(clientId)) {
      this.#requestLog.set(clientId, []);
    }

    const timestamps = this.#requestLog.get(clientId);
    const windowStart = now - this.#windowMs;

    // SLIDE the window: remove timestamps that have aged out (Chapter 3/21's technique!)
    while (timestamps.length > 0 && timestamps[0] <= windowStart) {
      timestamps.shift(); // NOTE: O(n) with a plain array — a real Deque (Chapter 6) is better in production!
    }

    if (timestamps.length < this.#maxRequests) {
      timestamps.push(now);
      return true; // request ALLOWED
    }

    return false; // rate limit EXCEEDED
  }
}
```

### 🎯 Interview Pattern: This IS Chapter 21's Monotonic Queue Problem, Wearing a Business Costume

Recognize the structural identity: **"remove timestamps that have aged out of the window" is exactly the front-removal step of Chapter 21's Sliding Window Maximum deque** — the only difference is that a rate limiter doesn't need to track a *maximum*, just a *count* of items currently in the window. This is a genuinely valuable, concrete demonstration that the pattern-recognition skill this book has trained since Chapter 7 ("same shape, different words") extends directly into recognizing production system requirements as disguised versions of interview algorithm patterns.

### 🚀 Pro Tip: The Token Bucket Algorithm — A Genuinely Different, Also-Valid Strategy

An alternative, widely-used real-world rate-limiting strategy: **maintain a "bucket" that holds tokens, refilling at a fixed rate; each request consumes one token, and requests are rejected when the bucket is empty.** This allows **short bursts** of traffic (using up saved tokens) while still enforcing a long-term average rate — a genuinely different trade-off than the sliding window's strict "at most N in any window" guarantee.

```javascript
class TokenBucketRateLimiter {
  #capacity;
  #tokens;
  #refillRatePerMs;
  #lastRefillTime;

  constructor(capacity, refillRatePerSecond) {
    this.#capacity = capacity;
    this.#tokens = capacity;
    this.#refillRatePerMs = refillRatePerSecond / 1000;
    this.#lastRefillTime = Date.now();
  }

  allowRequest() {
    const now = Date.now();
    const elapsed = now - this.#lastRefillTime;

    this.#tokens = Math.min(this.#capacity, this.#tokens + elapsed * this.#refillRatePerMs);
    this.#lastRefillTime = now;

    if (this.#tokens >= 1) {
      this.#tokens -= 1;
      return true;
    }

    return false;
  }
}
```

### 🔥 Interview Tip

The decisive comparison worth stating: **"Sliding window rate limiting gives a strict, precise guarantee ('never more than N requests in any rolling window'), at the cost of tracking every individual timestamp. Token bucket allows controlled bursts (spending saved-up tokens), which better matches real user behavior (bursty, not perfectly smooth), at the cost of a less strict guarantee. The choice depends on whether the business requirement is 'hard limit, no exceptions' or 'smooth out average load while tolerating reasonable bursts.'"**

---

## 27.3 Database Indexing: B-Trees as Production Cousins of Chapter 8's BST

### 🎯 Why Databases Don't Use Plain BSTs

Recall Chapter 8's honest treatment of BST degeneration and the conceptual introduction to AVL/Red-Black trees as the self-balancing fix. **Production databases use a related but distinct structure: the B-Tree** (and its common variant, the B+ Tree), specifically because of a factor Chapter 5 introduced but databases take to an extreme: **disk I/O cost, not just comparison count, dominates real-world performance.**

### 🧠 Memory Trick: Why B-Trees Have Many Children Per Node, Not Just Two

**A binary tree's O(log₂ n) height assumes every "step" (comparison) costs the same. But reading data from disk (as opposed to RAM) is dramatically slower and typically happens in large, fixed-size "blocks" — reading one byte from disk costs almost the same as reading an entire block.** A B-Tree exploits this by making each node **enormous** (holding hundreds or thousands of keys, sized to fill exactly one disk block), so that traversing from root to leaf requires only a handful of disk reads (O(log_b n), where `b` is the branching factor — often several hundred), rather than the many more disk reads a binary tree's O(log₂ n) height would require, even though both are technically "logarithmic."

### 🎯 Interview Pattern: The General Lesson — Big-O Ignores Constant Factors, and Sometimes Those Factors Are Everything

This is a direct, concrete extension of Chapter 5's cache-locality lesson (arrays beating linked lists in practice despite matching Big-O) to an even larger scale: **disk I/O latency is roughly 100,000x slower than RAM access, making "minimize the number of disk reads" a completely different optimization target than "minimize the number of comparisons."** A B-Tree's higher branching factor directly minimizes disk reads, even though a binary search tree would technically have a smaller Big-O *height* in the abstract comparison-counting sense — a genuinely important, real-world-informed nuance to bring up when discussing database internals.

### 🔥 Interview Tip

The quotable summary: **"Databases use B-Trees instead of binary search trees because B-Trees are optimized to minimize disk I/O operations, not just comparisons — each B-Tree node is sized to match a disk block, so traversing the tree touches far fewer physical disk blocks than a binary tree's height would require, even at the same asymptotic O(log n) complexity class."**

---

## 27.4 Load Balancing: Consistent Hashing as an Evolution of Chapter 4

### 🎯 The Problem Plain Hashing Creates at Scale

**The business problem:** distribute requests (or data) across `N` servers, using something like `hash(key) % N` to decide which server handles a given key — Chapter 4's hashing, applied to routing instead of storage. **The catastrophic failure mode**: if a server is added or removed (changing `N`), `hash(key) % N` changes for **almost every single key**, forcing a massive, disruptive redistribution of nearly all cached data or connections simultaneously — a direct, painful real-world consequence of the exact hash-bucket-assignment mechanism covered in Chapter 4.

### 🧠 Memory Trick: Consistent Hashing's Ring

**Definition:** Consistent hashing maps both servers and keys onto a conceptual "ring" (a circular hash space), assigning each key to the nearest server clockwise from its position. **Adding or removing one server only affects the keys between that server and its neighbors on the ring** — not a redistribution of everything, dramatically reducing the disruption of scaling the server pool up or down.

```javascript
class ConsistentHashRing {
  #ring = []; // sorted array of [hashValue, serverId] pairs
  #hash(key) {
    // A simplified hash function for illustration (production systems use a
    // well-distributed cryptographic-adjacent hash, e.g., MD5 or a variant)
    let h = 0;
    for (const char of String(key)) {
      h = (h * 31 + char.charCodeAt(0)) % 1_000_000; // Chapter 4's hash function, again!
    }
    return h;
  }

  addServer(serverId) {
    const hashValue = this.#hash(serverId);
    // Insert in sorted position (Chapter 16's binary search could find the insertion point in O(log n)!)
    this.#ring.push([hashValue, serverId]);
    this.#ring.sort((a, b) => a[0] - b[0]);
  }

  removeServer(serverId) {
    this.#ring = this.#ring.filter(([, id]) => id !== serverId);
  }

  getServerForKey(key) {
    const hashValue = this.#hash(key);

    // Find the first server hash >= this key's hash (WRAPPING around the ring if needed) —
    // exactly Chapter 16's "lower bound" binary search boundary-finding technique!
    for (const [serverHash, serverId] of this.#ring) {
      if (serverHash >= hashValue) return serverId;
    }

    return this.#ring[0][1]; // wrap around to the FIRST server on the ring
  }
}
```

### 🎯 Interview Pattern: The Direct Callback to Chapter 16

Notice `getServerForKey`'s "find the first server hash `>=` this key's hash" is precisely **Chapter 16's lower-bound boundary-finding binary search technique**, conceptually — in a production system with thousands of servers on the ring, this lookup would genuinely use binary search (O(log n)) rather than the linear scan shown here for illustration. This is another concrete instance of a chapter's core pattern reappearing, recognizably, inside a completely different real-world system.

### 🔥 Interview Tip

The quotable insight: **"Consistent hashing solves the 'adding a server reshuffles everything' problem inherent in plain `hash(key) % N` by mapping servers and keys onto a shared ring, so a topology change only affects the keys in that one server's immediate neighborhood — not a global redistribution. It's Chapter 4's hashing lesson, evolved specifically to handle a dynamically changing number of buckets gracefully."**

---

## 27.5 Distributed Systems Concepts Built on This Book's Foundations

### 27.5.1 Distributed Rate Limiting: Union-Find's Conceptual Cousin

A genuinely interesting connection: **tracking "which servers are part of the same currently-healthy cluster" during a network partition** (a distributed systems scenario) is conceptually similar to Chapter 14's Union-Find "which group does this belong to" question — though real distributed systems solve this with dedicated consensus protocols (Raft, Paxos) rather than literal Union-Find, the underlying *question being asked* ("are these nodes currently in the same connected/agreeing group?") is recognizably the same shape.

### 27.5.2 Message Queues: Chapter 6's Queue, at Massive Scale

Production message queue systems (Kafka, RabbitMQ, SQS) are, at their conceptual core, **exactly Chapter 6's Queue** — FIFO processing of work items — scaled to distributed, persistent, fault-tolerant infrastructure. The core guarantee they provide (process work in the order it arrived, or in a well-defined priority order via Chapter 9's heap-like priority queue concepts) is identical to this book's foundational structures; the *engineering* added on top (durability, replication, exactly-once delivery semantics) is what production systems contribute beyond the core DSA concept.

### 27.5.3 Distributed Caching and Consensus: Where This Book's Techniques End and New Territory Begins

### 🎯 An Honest Boundary Statement

It's worth being explicit about where this chapter's connections stop being direct extensions and start requiring genuinely new knowledge: **distributed consensus (how multiple servers agree on a single value despite network failures and delays), replication strategies, and CAP theorem trade-offs are NOT direct extensions of this book's single-machine data structures** — they involve fundamentally new concerns (network partitions, message ordering across machines, Byzantine fault tolerance) that this book's DSA foundation prepares you to *understand the vocabulary and mechanisms of* (queues, trees, hashing all reappear as building blocks), but does not itself teach. **This is the honest, appropriate scope boundary for this chapter**: showing where DSA foundations connect to system design, not attempting to teach system design or distributed systems as complete subjects in their own right.

---

## 27.6 A Decision Framework: Translating "Interview Problem" Instincts Into "System Design" Instincts

### 🔥 Interview Tip: The Master Translation Table

| Interview-Problem Instinct | System-Design Translation |
|---|---|
| "I need O(1) lookup" (Chapter 4) | Database indexing, cache key lookup, session storage |
| "I need O(1) insertion/deletion at both ends" (Chapters 5, 6) | Message queues, LRU cache ordering, undo/redo history |
| "I need to always know the current min/max cheaply" (Chapter 9) | Priority-based task scheduling, LFU eviction, top-K trending content |
| "I need to answer 'are these connected' cheaply, repeatedly" (Chapter 14) | Distributed cluster membership, dependency resolution, feature-flag grouping |
| "I need fast prefix-based lookup" (Chapter 10) | Autocomplete, URL routing tables, IP routing (longest-prefix match) |
| "I need range queries AND updates together" (Chapter 23) | Real-time analytics dashboards, time-series aggregation |
| "This problem has a monotonic checkable property" (Chapter 16) | Capacity planning ("what's the minimum server count to handle this load"), binary-search-based auto-scaling thresholds |
| "I need to prevent redundant recomputation" (Chapters 2, 18-19) | Memoized/cached expensive computations, materialized views in databases |

### 🎯 The Single Most Important Mindset Shift

**Every "which data structure should I use" decision you've practiced throughout this book is fundamentally the same decision a system architect makes when choosing a caching strategy, a database index type, or a message queue configuration** — just at a different scale, with different concrete constraints (network latency instead of CPU cycles, disk I/O instead of RAM access, distributed failure modes instead of single-process correctness). **The access-pattern-first thinking this book has trained since Chapter 1 — "what operations does this system need to do most often, and what structure makes those operations cheap?" — is the exact same question, asked at a different altitude.**

---

## 27.7 Chapter Summary

This chapter made explicit the connection between this book's algorithmic foundations and real production system design, organized around the principle that **every system design decision covered here is a direct, recognizable extension of a structure or pattern already built in earlier chapters, not a new body of knowledge to learn from scratch.** LRU caching delivered on Chapter 5's forward reference to doubly linked lists, demonstrating that neither Chapter 4's `Map` nor Chapter 5's linked list alone solves the problem — **the specific combination**, chosen because each piece provides exactly the O(1) capability the other lacks, is itself the solution, a concrete instance of this book's recurring composition theme. LFU caching's heap-based (Chapter 9) baseline, contrasted against a cleverer O(1) hash-map-plus-linked-list alternative, modeled the genuine engineering judgment call between "correct and simple" versus "more complex but asymptotically better," rather than presenting a single "right" answer.

Rate limiting demonstrated one of this chapter's clearest pattern-transfer moments: the sliding window rate limiter is **structurally identical** to Chapter 21's monotonic queue technique, simply counting items in a time window instead of tracking a maximum value — direct, recognizable proof that the "same shape, different words" skill this book has cultivated since Chapter 7 extends into recognizing production requirements as disguised algorithm patterns, not just recognizing other algorithm problems. The token bucket alternative demonstrated that system design, like algorithm selection, involves genuine trade-off judgment (strict guarantees versus burst tolerance), not a single universally correct choice.

Database indexing extended Chapter 5 and Chapter 8's lessons about cache locality and tree balancing to their logical, real-world conclusion: B-Trees exist specifically because disk I/O cost (not comparison count) dominates real database performance, making a wide-branching-factor tree genuinely superior to a binary tree at the same Big-O height class — a direct, concrete lesson that **Big-O's deliberate blindness to constant factors sometimes hides the single most important real-world consideration**, extending Chapter 5's array-versus-linked-list cache-locality point to an even more extreme, production-relevant scale. Consistent hashing extended Chapter 4's hashing lesson to solve a failure mode plain modulo-hashing creates at scale (catastrophic full redistribution on any topology change), using a ring structure whose key-to-server lookup is recognizably Chapter 16's lower-bound binary search technique in a new context.

We closed with an honest scope boundary — genuinely distributed concerns like consensus protocols and CAP theorem trade-offs are new territory this book's single-machine foundations inform but don't themselves teach — and a master translation table mapping this book's core "which structure fits this access pattern" instincts directly onto their system-design equivalents, reinforcing this chapter's central thesis: **the reasoning is identical; only the scale and concrete constraints differ.**

---

## 27.8 Revision Notes

- LRU cache combines Chapter 4's Map (O(1) key lookup) with Chapter 5's doubly linked list (O(1) reordering and eviction given a direct node reference) — neither alone solves the problem; the combination is the solution.
- LFU cache's heap-based (Chapter 9) approach is correct but not asymptotically optimal; an O(1) alternative exists via nested hash maps and linked lists — a genuine "simple vs. more complex but better" engineering trade-off.
- Sliding window rate limiting is structurally identical to Chapter 21's monotonic queue technique, counting items in a window rather than tracking a maximum.
- Token bucket rate limiting offers a genuinely different trade-off (burst tolerance) versus sliding window's strict guarantee — not a strictly better or worse choice, a different fit for different requirements.
- B-Trees (used by databases) extend Chapter 5/8's cache-locality and tree-balancing lessons: wide branching factor minimizes disk I/O operations, a different optimization target than minimizing comparisons, despite matching Big-O height classes.
- Consistent hashing solves plain hash-modulo's catastrophic full-redistribution failure mode at scale, using a ring structure whose lookup recognizably reuses Chapter 16's lower-bound binary search technique.
- Genuinely distributed concerns (consensus, CAP theorem) are new territory beyond this book's single-machine foundations — an honest scope boundary, not a gap to paper over.

---

## 27.9 Mind Map (ASCII)

```
                    SYSTEM DESIGN CONNECTIONS
                                  |
      +------------------+-------+-------+------------------------+
      |                  |               |                        |
  CACHING             RATE LIMITING   DATABASE               LOAD BALANCING
      |                    |          INDEXING                     |
  LRU = Ch.4 Map      Sliding window       |                Consistent Hashing
  (O(1) lookup) +     = Ch.21's        B-Trees extend       = Ch.4 hashing,
  Ch.5 doubly         MONOTONIC QUEUE  Ch.5/Ch.8's cache     evolved to avoid
  linked list          (count instead   locality/balancing   catastrophic full
  (O(1) reorder/       of max!)         lessons: wide         redistribution on
  evict) --                 |           branching = fewer    topology change
  NEITHER ALONE       Token Bucket:     DISK I/O ops, not         |
  suffices, the       DIFFERENT         fewer comparisons    Ring lookup =
  COMBINATION is      trade-off             |                Ch.16's LOWER
  the solution        (burst tolerance  Big-O ignores        BOUND binary
      |               vs strict limit) constant factors --   search, reused
  LFU = Ch.9 heap                       disk I/O dominates   in a new context
  (correct, O(log n))                   at THIS scale
  vs O(1) alt (more                     (Ch.5 cache
  complex, hash+                        locality, taken
  linked-list combo)                    further)
      |
  Engineering judgment:
  simple+correct vs
  complex+optimal
                                                          DISTRIBUTED SYSTEMS
                                                          (HONEST BOUNDARY):
                                                          Message queues = Ch.6
                                                          Queue at scale.
                                                          Consensus/CAP theorem =
                                                          NEW territory beyond
                                                          this book's single-
                                                          machine foundations
                                                                |
                                                    MASTER TRANSLATION TABLE:
                                                    "which structure fits this
                                                    access pattern" = SAME
                                                    question at every scale
```

---

## 27.10 Cheat Sheet

```
SYSTEM DESIGN <- -> DSA TRANSLATION TABLE
=============================================
LRU Cache          -> Ch.4 Map + Ch.5 Doubly Linked List (O(1) lookup + reorder/evict)
LFU Cache          -> Ch.9 Heap (simple) or hash-map+linked-list combo (O(1), complex)
Rate Limiting       -> Ch.21 Monotonic Queue (sliding window) or Token Bucket (bursts OK)
Database Indexing   -> Ch.8 BST concept, evolved to B-Trees (minimize DISK I/O, not comparisons)
Load Balancing      -> Ch.4 Hashing, evolved to Consistent Hashing (avoid full redistribution)
                        + Ch.16 binary search for ring lookup
Message Queues      -> Ch.6 Queue, at distributed scale
Cluster Membership  -> Conceptually similar to Ch.14 Union-Find's "same group?" question
Autocomplete/Routing -> Ch.10 Tries (prefix-based lookup)
Analytics Dashboards -> Ch.23 Segment/Fenwick Trees (range query + update together)
Capacity Planning    -> Ch.16 Binary search on the answer (monotonic checkable constraint)
Memoized Computations-> Ch.2/18-19 DP (avoid redundant recomputation), DB materialized views

KEY LESSON: BIG-O IGNORES CONSTANT FACTORS -- SOMETIMES THOSE FACTORS ARE EVERYTHING
========================================================================================
RAM vs disk I/O (Ch.5 cache locality, taken to B-Tree extreme):
  disk latency ~100,000x slower than RAM -> minimize DISK READS, not just comparisons

HONEST SCOPE BOUNDARY
=========================
Distributed consensus (Raft, Paxos), CAP theorem, Byzantine fault tolerance =
NEW territory this book's single-machine DSA foundation INFORMS but does NOT teach.
```

---

## 27.11 Key Takeaways

1. LRU caching is a genuine composition of two structures (Map + doubly linked list), neither sufficient alone — a model for how real system design often requires combining tools, not picking one.
2. Rate limiting's sliding window is literally Chapter 21's monotonic queue technique in a business costume — the "same shape, different words" skill extends to recognizing production requirements, not just other algorithm problems.
3. Database B-Trees extend Chapter 5's cache-locality lesson to its logical conclusion: at disk-I/O scale, minimizing block reads (not comparisons) is the real optimization target, even at matching Big-O height classes.
4. Consistent hashing evolves Chapter 4's hashing to solve a real failure mode (catastrophic redistribution) that plain modulo-hashing creates at scale.
5. This book's core question — "what access pattern does this system need, and what structure makes those operations cheap?" — is the same question asked at every scale, from a coding interview to a production system architecture decision.

---

## 27.12 20 Multiple Choice Questions

1. What two data structures combine to implement an O(1) LRU cache?
   a) A trie and a heap
   b) A hash map and a doubly linked list
   c) A binary search tree and a stack
   d) A segment tree and a queue

2. Why does an LRU cache need BOTH structures, rather than either alone?
   a) It doesn't; either would work equally well
   b) The hash map gives O(1) key lookup, while the doubly linked list gives O(1) reordering and eviction given a direct node reference — neither alone provides both
   c) Only the hash map is actually needed
   d) Only the linked list is actually needed

3. What earlier chapter's forward reference does the LRU cache implementation deliver on?
   a) Chapter 9's heap
   b) Chapter 5's doubly linked list preview
   c) Chapter 15's sorting
   d) Chapter 11's graph traversal

4. What data structure does a simple LFU cache implementation typically use?
   a) A trie
   b) A min-heap tracking access frequencies
   c) A stack
   d) A segment tree

5. What earlier chapter's pattern is the sliding window rate limiter structurally identical to?
   a) Chapter 15's sorting algorithms
   b) Chapter 21's monotonic queue (counting items in a window instead of tracking a maximum)
   c) Chapter 8's tree traversal
   d) Chapter 14's Union-Find

6. What genuine trade-off does the Token Bucket rate limiter offer compared to a sliding window?
   a) It's always strictly worse
   b) It allows controlled bursts of traffic while still enforcing a long-term average rate, versus the sliding window's strict "never exceed N in any window" guarantee
   c) It's always strictly better
   d) There is no difference between the two

7. Why do production databases use B-Trees instead of plain binary search trees?
   a) B-Trees are always faster in every context
   b) B-Trees minimize disk I/O operations by sizing nodes to match disk blocks, which matters more than minimizing comparisons at this scale
   c) Binary search trees cannot store more than 100 items
   d) B-Trees don't require balancing

8. What earlier chapter's lesson does the B-Tree design extend?
   a) Chapter 15's sorting stability
   b) Chapter 5's cache-locality lesson (arrays beating linked lists in practice despite matching Big-O)
   c) Chapter 9's heap building
   d) Chapter 6's stack operations

9. What problem does plain `hash(key) % N` create when the number of servers N changes?
   a) No problem; it adapts automatically
   b) It causes almost every key's assigned server to change, forcing a massive, disruptive redistribution
   c) It only affects keys added after the change
   d) It causes a syntax error

10. What does consistent hashing solve?
    a) It makes hashing unnecessary
    b) It ensures a server topology change only affects keys in that server's immediate neighborhood on a hash ring, not a global redistribution
    c) It eliminates the need for a hash function entirely
    d) It only works for numeric keys

11. What earlier chapter's technique does a consistent hash ring's key-to-server lookup resemble?
    a) Chapter 9's heap extraction
    b) Chapter 16's lower-bound binary search technique
    c) Chapter 6's stack operations
    d) Chapter 11's BFS

12. What real-world system is conceptually "Chapter 6's Queue, at massive scale"?
    a) A database index
    b) A message queue system (Kafka, RabbitMQ, SQS)
    c) A load balancer
    d) A consistent hash ring

13. What honest scope boundary does this chapter draw regarding distributed systems?
    a) This book fully teaches distributed consensus and CAP theorem trade-offs
    b) Distributed consensus, replication, and CAP theorem trade-offs are new territory this book's single-machine foundations inform but don't themselves teach
    c) Distributed systems are identical to single-machine data structures with no new concerns
    d) This chapter claims to be a complete system design course

14. What is the central mindset shift this chapter aims to establish?
    a) System design and DSA are entirely unrelated fields
    b) The "which structure fits this access pattern" reasoning from coding problems is the same reasoning used in real system design decisions, just at a different scale
    c) System design requires memorizing a completely separate set of facts
    d) DSA knowledge is irrelevant to system design

15. What system design concern maps to "I need fast prefix-based lookup" (Chapter 10)?
    a) Database transaction logs
    b) Autocomplete, URL routing tables, IP routing (longest-prefix match)
    c) Load balancer health checks
    d) Message queue ordering

16. What system design concern maps to "I need range queries AND updates together" (Chapter 23)?
    a) Static website hosting
    b) Real-time analytics dashboards, time-series aggregation
    c) User authentication
    d) Image compression

17. Why is disk I/O latency specifically relevant to why databases favor B-Trees?
    a) Disk I/O is roughly 100,000x slower than RAM access, making minimizing disk reads a completely different optimization target than minimizing comparisons
    b) Disk I/O and RAM access have identical latency
    c) B-Trees don't actually reduce disk I/O
    d) This factor is irrelevant to database design

18. What genuine engineering judgment does the LFU cache section model?
    a) There is only ever one correct implementation choice
    b) The trade-off between a simpler, correct heap-based approach (O(log n)) versus a more complex but asymptotically better O(1) alternative
    c) Heaps should never be used for caching
    d) O(1) solutions are always preferable regardless of complexity

19. What concept from Chapter 14 is conceptually similar to distributed cluster membership tracking?
    a) Chapter 14's Union-Find "which group does this belong to" question, though real systems use dedicated consensus protocols instead
    b) Chapter 14's rank-based tree balancing directly implements cluster membership
    c) There is no conceptual relationship
    d) Union-Find is used literally, unmodified, in production consensus systems

20. What is the overarching principle this entire chapter is built around?
    a) System design is a completely separate field requiring no DSA knowledge
    b) Every system design decision covered is a direct, recognizable extension of a structure or pattern from earlier chapters, not new knowledge learned from scratch
    c) Production systems never use the data structures taught in DSA courses
    d) Big-O analysis is irrelevant to real system design

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-a, 18-b, 19-a, 20-b

---

## 27.13 20 Coding Problems

**Easy**

1. Implement `LRUCache` from memory (section 27.1.1), and verify its `get`/`put` operations behave correctly across a sequence of accesses.
2. Implement `SlidingWindowRateLimiter` from memory (section 27.2), and verify it correctly rejects requests exceeding the limit within a window.
3. Implement `TokenBucketRateLimiter` from memory (section 27.2), and verify it allows a burst of requests up to the bucket's capacity.
4. Write a function to simulate `hash(key) % N` server assignment, and demonstrate how many keys change their assigned server when N changes by 1.
5. Implement a basic `ConsistentHashRing`'s `addServer` and `getServerForKey` from memory (section 27.4).

**Medium**

6. Extend `LRUCache` to support a `delete(key)` operation, maintaining all O(1) guarantees.
7. Implement an LFU cache using Chapter 9's heap (frequency-tracking), and compare its complexity against the conceptual O(1) hash-map-based alternative described in section 27.1.2.
8. Implement `ConsistentHashRing`'s `removeServer`, and empirically demonstrate (with a test) that removing one server only reassigns keys that were mapped to it, not a large fraction of all keys.
9. Given a simulated "disk block size" constraint, implement a simplified B-Tree node structure (many keys per node) and compare its height against an equivalent binary search tree for the same total key count.
10. Implement a simple message queue (FIFO) with a maximum size, rejecting new messages when full (a direct application of Chapter 6's Queue with a capacity constraint).

**Hard**

11. Implement the full O(1) LFU cache using nested hash maps and linked lists (frequency -> doubly linked list of keys at that frequency), as conceptually described in section 27.1.2.
12. Given a simulated distributed cache cluster, implement consistent hashing with "virtual nodes" (each physical server mapped to multiple positions on the ring, improving load distribution evenness) and empirically compare load balance with and without virtual nodes.
13. Implement a priority-based message queue (using Chapter 9's heap) where messages have priority levels, and higher-priority messages are always processed first, regardless of arrival order.
14. Given a simulated rate limiter needing to work correctly across multiple server instances (a distributed rate limiter), describe (with a simplified shared-state implementation) how you'd coordinate rate limit counts across instances, discussing the trade-offs versus a per-instance-only rate limiter.
15. Implement a basic "materialized view" simulation: given a base dataset and a query pattern that's run frequently, precompute and cache the query result (directly applying Chapter 2/18-19's memoization philosophy to a database-adjacent context), invalidating the cache when the base data changes.

**Interview Level**

16. **(Google-level)** Design and implement a URL shortener's caching layer, using an LRU cache for frequently-accessed short URLs, discussing cache size trade-offs and eviction policy choices.
17. **(Amazon-level)** Design and implement a rate limiter for an e-commerce API, choosing between sliding window and token bucket based on the specific business requirement (e.g., "no more than 100 requests per minute, hard limit" vs. "allow bursts during flash sales, but average out over time"), justifying your choice explicitly in comments.
18. **(Microsoft-level)** Design a document collaboration system's caching strategy, using LFU (since frequently-edited documents should stay cached, not just recently-edited ones) and discuss why LRU might be a worse fit for this specific access pattern.
19. **(Meta-level)** Design a social media feed's load balancing strategy using consistent hashing to distribute user feed generation across multiple servers, ensuring minimal redistribution as servers scale up/down during traffic spikes.
20. **(Netflix-level)** Design a video content delivery caching strategy across multiple CDN edge servers, using consistent hashing to route content requests, and LRU or LFU (justify your choice) for each edge server's local cache eviction policy, discussing how content popularity patterns (a small number of videos receiving most views — a "long tail" distribution) should inform this choice.

---

## 27.14 5 Interview Questions

1. "Design an LRU cache with O(1) get and put operations." (Tests the Map + doubly linked list composition directly.)
2. "How would you rate-limit an API, and what are the trade-offs between different approaches?" (Tests sliding window vs. token bucket judgment.)
3. "Why do databases use B-Trees instead of binary search trees?" (Tests the disk-I/O-versus-comparisons distinction specifically.)
4. "How would you design a system to distribute load across a dynamically changing number of servers?" (Tests consistent hashing and the redistribution problem it solves.)
5. "How does your DSA knowledge inform real system design decisions?" (Tests the chapter's central mindset — recognizing the same reasoning at different scales.)

---

## 27.15 3 Real Projects

1. **Complete Caching Strategy Library**: Implement LRU (Map + doubly linked list) and both heap-based and O(1) LFU caches, with a self-check script verifying correctness and comparing empirical performance across access patterns favoring recency versus frequency.
2. **Rate Limiter Comparison Tool**: Build both sliding window and token bucket rate limiters, simulate various traffic patterns (steady, bursty, gradually increasing), and produce a report comparing how each limiter handles each pattern — a direct, empirical demonstration of section 27.2's trade-off discussion.
3. **Consistent Hashing Load Distribution Visualizer**: Build a tool that simulates adding/removing servers from both a plain modulo-hash system and a consistent-hash-ring system, reporting the percentage of keys that get reassigned in each case — a direct, empirical demonstration of the redistribution problem consistent hashing solves.

---

## 27.16 Further Reading

- Martin Kleppmann, *Designing Data-Intensive Applications* — the definitive, genuinely excellent book bridging exactly the gap this chapter opened: DSA foundations to real production system design, covering B-Trees, consistent hashing, distributed consensus, and much more in full depth.
- Alex Xu, *System Design Interview* (Volumes 1 and 2) — a widely-used, interview-focused companion covering the practical application of these concepts in technical interview settings.
- Search "Chord distributed hash table" for the original academic paper introducing consistent hashing in the context this chapter's section 27.4 draws from.
- Search "Raft consensus algorithm" for an accessible, well-regarded introduction to distributed consensus — the genuinely new territory this chapter's honest scope boundary (section 27.5.3) pointed toward.

---

*End of Chapter 27. Next: Chapter 28 is the Final Interview Prep Mega-Appendix — the 100 Most Asked Interview Problems, a pattern recognition guide, 90-day and 180-day study plans, company-wise question guides, complete complexity and pattern tables, decision trees, and a full glossary, closing out this handbook.*

**Say "Continue to the next chapter" when ready.**
