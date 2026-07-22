# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 4: Hashing — The Highest-Leverage Tool in Interview Prep

---

## 4.0 Why This Chapter Might Be the Most Important One in the Book

If you could only learn one data structure before walking into a coding interview, it should be the hash table. An enormous fraction of "medium" difficulty interview problems have a brute-force O(n²) solution and a hash-table-based O(n) solution, and the entire skill of recognizing which is which comes down to one question: **"can I trade some memory to remember something I've already seen, so I don't have to search for it again?"**

We already previewed this exact idea twice: the `usernameExists` example in Chapter 1 (Array scan vs. `Set.has`), and the memoization `Map` in Chapter 2 (remembering computed Fibonacci values). This chapter makes that idea rigorous — we'll open the hood on *how* a hash table achieves O(1) average-case lookup, not just *that* it does.

---

## 4.1 The Problem Hashing Solves

Recall from Chapter 3: checking whether a value exists in an array is O(n) — you must scan. Recall from Chapter 1: binary search gets this down to O(log n), but *only* if the data is sorted, and even then, insertion into a sorted array is O(n) (shifting elements).

**The question hashing answers:** can we get O(1) — genuinely constant time, not even O(log n) — for lookup, insertion, and deletion, without requiring sorted order?

### Real-Life Analogy: The Coat Check

Imagine walking into a theater and handing your coat to a coat-check attendant. They don't search through every coat on the rack to figure out where to put yours. Instead, they compute a number (say, based on your ticket number) and hang your coat at that **exact, predetermined position** on the rack. When you come back, you hand over your ticket, they compute the same number, and walk **directly** to that position — no searching required, regardless of how many hundreds of coats are on the rack.

This is the entire idea of a hash table: **use a function to compute exactly where something belongs, so you never have to search for it.**

### 🧠 Memory Trick

"Hashing" the everyday word means "chopping something into smaller, mixed-up pieces" (like hash browns — chopped and mixed potatoes). A **hash function** takes your data (a string, a number, an object) and "chops it up" mathematically into a single number — deterministically scrambled, but always the *same* scramble for the *same* input.

---

## 4.2 How a Hash Function Works (From First Principles)

**Definition:** A hash function is a function that takes an input of arbitrary size (a string, a number, any data) and deterministically produces an output of fixed size (usually an integer), called a **hash code**.

### 4.2.1 The Core Requirements of a Good Hash Function

1. **Deterministic** — the same input must *always* produce the same hash code. If `hash("cat")` returns `42` today, it must return `42` every single time, forever, in this run of the program.
2. **Fast to compute** — O(1) or close to it relative to the size of typical inputs (technically O(k) for a string of length k, but k is usually small and bounded, so we treat it as effectively constant).
3. **Uniform distribution** — good hash codes should spread out across the available range as evenly as possible, minimizing the chance that two different inputs land on the same value.

### 4.2.2 A Simple Hash Function, Built From Scratch

Let's build a genuinely simple (not production-grade, but illustrative) hash function for strings, so the mechanism stops being a black box.

```javascript
function simpleHash(str, bucketCount) {
  let hashCode = 0;

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);          // e.g., 'a' -> 97
    hashCode = (hashCode * 31 + charCode) % bucketCount;
    // multiply-and-add: a classic, simple, surprisingly effective hashing strategy
  }

  return hashCode;
}

console.log(simpleHash('cat', 10));  // some number between 0-9, deterministic every run
console.log(simpleHash('dog', 10));  // a different (usually) number between 0-9
```

### 🧮 Mathematical Explanation: Why Multiply by 31?

You'll see the constant `31` in hash functions across many real languages and libraries (Java's `String.hashCode()` uses it too). Why 31 specifically? Two practical reasons: it's an **odd prime number** (primes reduce the chance of predictable patterns/collisions when combined with modulo operations), and historically, `31 * i` can be optimized by compilers into `(i << 5) - i` (a bit-shift and subtraction), which used to matter more for raw performance on older hardware. In modern JavaScript engines this specific optimization is less relevant, but the "odd prime multiplier" convention persists because it still produces good distribution properties.

### Dry Run: Hashing `'cat'` with `bucketCount = 10`

```
str = 'cat', bucketCount = 10

charCodeAt: 'c'=99, 'a'=97, 't'=116

i=0: hashCode = (0 * 31 + 99) % 10 = 99 % 10 = 9
i=1: hashCode = (9 * 31 + 97) % 10 = (279 + 97) % 10 = 376 % 10 = 6
i=2: hashCode = (6 * 31 + 116) % 10 = (186 + 116) % 10 = 302 % 10 = 2

Final hash: 2
```

So `'cat'` would be stored at **bucket index 2** in an array-backed hash table with 10 buckets.

---

## 4.3 From Hash Function to Hash Table: The Bucket Array

**Definition:** A hash table is a data structure that stores key-value pairs by using a hash function to compute an array index (a "bucket") for each key, enabling average-case O(1) insertion, lookup, and deletion.

### ASCII Visualization: The Bucket Array

```
Buckets (an array of size 10):

Index:  0    1    2         3    4    5    6    7    8    9
       [ ]  [ ]  [cat:5]   [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
                  ^
                  'cat' hashed to index 2, so we store the
                  key-value pair {cat: 5} there directly.

To look up 'cat':
  1. Compute hash('cat') = 2       <- O(1) (string length is bounded)
  2. Go DIRECTLY to buckets[2]     <- O(1) direct array access (Chapter 3!)
  3. Found it. No searching required.
```

This is exactly why hash table operations are O(1) on average: **we never search.** We compute an address and go directly there, exactly like array index access from Chapter 3 — because that's literally the mechanism underneath: a hash table *is* an array, with a hash function acting as the address-calculator.

### 4.3.1 Building a Minimal Hash Table From Scratch

Let's implement one ourselves, to fully demystify what `Map` is doing for you under the hood.

```javascript
class SimpleHashTable {
  #buckets;
  #bucketCount;

  constructor(bucketCount = 16) {
    this.#bucketCount = bucketCount;
    this.#buckets = new Array(bucketCount).fill(null).map(() => []);
    // each bucket is its own array, to handle collisions (explained in 4.4)
  }

  #hash(key) {
    const str = String(key);
    let hashCode = 0;
    for (let i = 0; i < str.length; i++) {
      hashCode = (hashCode * 31 + str.charCodeAt(i)) % this.#bucketCount;
    }
    return hashCode;
  }

  set(key, value) {
    const index = this.#hash(key);
    const bucket = this.#buckets[index];

    for (const pair of bucket) {
      if (pair[0] === key) {
        pair[1] = value;          // key already exists, update it
        return;
      }
    }

    bucket.push([key, value]);    // new key, add it
  }

  get(key) {
    const index = this.#hash(key);
    const bucket = this.#buckets[index];

    for (const pair of bucket) {
      if (pair[0] === key) {
        return pair[1];
      }
    }

    return undefined;             // not found
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    const index = this.#hash(key);
    const bucket = this.#buckets[index];

    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i][0] === key) {
        bucket.splice(i, 1);
        return true;
      }
    }

    return false;
  }
}

const table = new SimpleHashTable();
table.set('name', 'Alice');
table.set('age', 30);
console.log(table.get('name')); // 'Alice'
console.log(table.get('age'));  // 30
console.log(table.has('job'));  // false
```

We use private class fields (`#buckets`, `#bucketCount`, `#hash`) — modern ES2022+ JavaScript syntax for genuine encapsulation, not just a naming convention like the old `_buckets` underscore trick. This means `table.#buckets` from *outside* the class throws a syntax error, providing real access control.

### ⚠ Common Mistake: Why Each Bucket Is an Array, Not a Single Slot

You might notice each bucket in our implementation is itself an array (`[[key1, value1], [key2, value2], ...]`), not a single value. This isn't incidental — it's the direct solution to the single most important problem in hash table design, which we address next: **collisions.**

---

## 4.4 Collisions: The Central Problem of Hash Table Design

**Definition:** A collision occurs when two different keys hash to the same bucket index.

### 🧮 Mathematical Explanation: Why Collisions Are Mathematically Guaranteed

By the **pigeonhole principle**, if you have more possible keys than buckets (which is virtually always true — think of all possible strings versus, say, 16 buckets), collisions are not just possible, they are **inevitable** given enough keys. This isn't a design flaw to be eliminated; it's a mathematical certainty to be *managed*.

### 🧠 Memory Trick: The Birthday Paradox

You may have heard the surprising fact that in a room of just 23 people, there's roughly a 50% chance two people share a birthday — despite there being 365 possible birthdays and only 23 people. This is the **birthday paradox**, and it's a direct, intuitive preview of why collisions happen far more often than beginners expect: **the chance of at least one collision grows much faster than the ratio of items to buckets would naively suggest.** Keep this in your back pocket — it's a favorite "gotcha" trivia question about hash table behavior.

### 4.4.1 Collision Resolution Strategy #1: Separate Chaining

This is what our `SimpleHashTable` above already implements: **each bucket holds a small collection (a list) of all key-value pairs that hashed to that index**, and lookups within a bucket fall back to a linear scan of just that bucket's (hopefully small) contents.

```
Buckets:

Index:  0    1              2                3
       [ ]  [ ]  [['cat',5], ['ate',9]]      [ ]
                       ^          ^
                  Both 'cat' and 'ate' happened to hash to index 1.
                  They're stored together in a small list (a "chain").

Looking up 'ate': hash('ate') = 1 -> go to bucket 1 -> scan the
small list [['cat',5], ['ate',9]] -> find 'ate' -> return 9.
```

This is called "chaining" because colliding entries form a chain (traditionally implemented as a linked list — see Chapter 5 — though we used a plain array above for simplicity).

### 4.4.2 Collision Resolution Strategy #2: Open Addressing (Linear Probing)

The alternative approach: instead of storing multiple entries per bucket, **if a bucket is already occupied, probe (check) the next available slot** according to some fixed sequence, until an empty slot is found.

```
Buckets (each slot holds AT MOST one entry):

Index:   0        1         2         3         4
        [ ]   ['cat',5]     [ ]       [ ]       [ ]

Insert 'ate', which also hashes to index 1:
  Index 1 is occupied -> probe index 2 (linear probing: just check next slot)
  Index 2 is empty -> place 'ate' there

Index:   0        1         2         3         4
        [ ]   ['cat',5] ['ate',9]     [ ]       [ ]

Looking up 'ate': hash('ate')=1 -> occupied by 'cat', not a match ->
  probe index 2 -> found 'ate' -> return 9.
```

### 📌 Quick Revision: Chaining vs. Open Addressing

| | Separate Chaining | Open Addressing |
|---|---|---|
| Storage | Each bucket holds a list | Each bucket holds at most one entry |
| Behavior under high load | Degrades gracefully (longer chains) | Can degrade sharply (long probe sequences) |
| Memory overhead | Extra pointers/list overhead per bucket | More memory-compact (no extra list structure) |
| Deletion complexity | Simple (remove from the chain) | Trickier (must handle "tombstones" so probing sequences aren't broken) |
| Real-world use | More common in general-purpose implementations | Common in performance-critical/cache-friendly implementations |

### 🚀 Pro Tip

You do not need to memorize which exact strategy V8 uses internally for `Map`/`Set`/plain objects to use them well (and it's an implementation detail that could change between engine versions). What you *do* need is the conceptual fluency to explain, if asked, why collisions are inevitable and how they're generally handled — this demonstrates you understand hash tables as a real mechanism, not a magic black box.

---

## 4.5 Load Factor and Resizing

**Definition:** The load factor of a hash table is the ratio of stored elements to total bucket count: `loadFactor = numberOfEntries / numberOfBuckets`.

As load factor increases, chains get longer (in chaining) or probe sequences get longer (in open addressing) — both degrade average lookup time away from the ideal O(1). Well-implemented hash tables monitor their load factor and **resize** (allocate more buckets and redistribute all existing entries) once it crosses a threshold (commonly around 0.7–0.75).

### 🧮 Mathematical Explanation: Amortized Resizing, Again

This should feel familiar — it's the *exact same amortized analysis* from Chapter 3's dynamic array doubling! Resizing a hash table (rehashing every existing entry into a larger bucket array) is an O(n) operation, but because it happens exponentially less often as the table doubles in size each time, the **amortized** cost per insertion remains O(1). This is a beautiful example of the same mathematical idea (geometric/doubling growth → amortized constant cost) appearing in two completely different data structures.

### ⚠ Common Mistake

Beginners sometimes assume hash table operations are a *hard, guaranteed* O(1) with no caveats. The fully accurate statement is: **O(1) average case, amortized, assuming a reasonably well-distributed hash function.** Worst case (extremely poor hash function causing all keys to collide into one bucket, or an adversarial input designed to cause maximum collisions) degrades to **O(n)**. This distinction is worth stating explicitly in interviews — it shows you understand hashing isn't magic, it's probability working in your favor under normal conditions.

### 🔥 Interview Tip: Hash-Flooding Attacks (A Security-Adjacent Trivia Point)

Real production systems have been attacked by sending deliberately crafted inputs designed to all hash to the same bucket (an "algorithmic complexity attack" or "hash flooding"), degrading a server's hash-table-based request parsing from O(1) to O(n) per operation and causing denial-of-service-style slowdowns. This is precisely why many languages (including V8's internal object/Map hashing) incorporate a randomized seed into their hash function at startup — so an attacker can't predict which inputs will collide. Mentioning this unprompted is an excellent signal of real-world engineering awareness, well beyond textbook knowledge.

---

## 4.6 JavaScript's Built-In Hashing Tools: `Object`, `Map`, `Set`, `WeakMap`, `WeakSet`

Now that we've built a hash table from scratch and understand exactly what's happening inside, let's cover JavaScript's actual built-in tools in depth — what each is *for*, and the specific trade-offs between them.

### 4.6.1 Plain Objects as Hash Tables (The Historical Default)

```javascript
const ages = {};
ages['Alice'] = 30;
ages['Bob'] = 25;

console.log(ages['Alice']);          // 30
console.log('Alice' in ages);        // true
console.log(Object.keys(ages));      // ['Alice', 'Bob']
```

Plain objects have historically been JavaScript's default "dictionary" structure, and they do use hashing internally for property lookup. But they carry real limitations that `Map` was specifically introduced (in ES6/2015) to fix:

### ⚠ Common Mistakes With Plain Objects as Hash Maps

1. **Keys are always coerced to strings** (or Symbols). `ages[42]` and `ages['42']` are the *same* property — you cannot use a genuine number, object, or other reference as a distinct key.
2. **Prototype chain pollution risk.** Every plain object inherits from `Object.prototype` by default, meaning `'toString' in ages` is `true` even though you never explicitly added it — a classic source of subtle bugs when checking key existence with `in` or iterating with `for...in` without a `hasOwnProperty` guard.
3. **No built-in `.size` property.** You must do `Object.keys(ages).length`, an O(n) operation just to count entries, whereas `Map` tracks size in O(1).
4. **No guaranteed insertion-order iteration for all key types** (in practice, modern JS engines *do* preserve insertion order for string keys, but integer-like keys get reordered numerically first — a genuinely confusing, spec-mandated quirk).

```javascript
const weird = {};
weird['b'] = 1;
weird['2'] = 2;
weird['a'] = 3;
weird['1'] = 4;

console.log(Object.keys(weird)); // ['1', '2', 'b', 'a']
// Integer-like keys ('1', '2') are sorted numerically FIRST,
// then string keys appear in insertion order. This surprises almost everyone.
```

### 🔥 Interview Tip

This exact "integer keys get reordered" quirk is real, spec-mandated behavior (defined in the `[[OwnPropertyKeys]]` internal method ordering rules of the ECMAScript spec), not an engine bug. It's obscure enough that bringing it up unprompted signals genuine spec-level JavaScript knowledge.

### 4.6.2 `Map` — The Correct Modern Choice for General-Purpose Hashing

```javascript
const ages = new Map();
ages.set('Alice', 30);
ages.set('Bob', 25);
ages.set(42, 'a number key');           // any type can be a key!
ages.set({ id: 1 }, 'an object key');   // even objects!

console.log(ages.get('Alice'));  // 30
console.log(ages.has('Bob'));    // true
console.log(ages.size);          // 4 — O(1), built in
console.log(ages.delete('Bob')); // true, and removes it

for (const [key, value] of ages) {
  console.log(key, value);       // guaranteed insertion order, ALWAYS, no numeric-key quirk
}
```

### 📌 Quick Revision: `Map` vs. Plain Object

| | Plain Object | `Map` |
|---|---|---|
| Key types | Strings and Symbols only | **Any** value, including objects, functions, `NaN` |
| Iteration order | Insertion order, EXCEPT integer-like keys sort numerically first | Always guaranteed insertion order |
| Size | `Object.keys(obj).length` — O(n) | `.size` — O(1) |
| Prototype pollution risk | Yes (inherits `Object.prototype`) | No — `Map` has no such inherited enumerable keys |
| Performance for frequent add/remove | Generally worse (engines optimize objects for stable "shapes") | Generally better — optimized specifically for this use case |
| JSON serialization | Native (`JSON.stringify`) | Not directly (`JSON.stringify(new Map())` gives `'{}'`— needs manual conversion) |

### 🎯 Interview Pattern

**Default to `Map` over plain objects whenever you're building a dictionary/lookup structure in modern JavaScript**, especially in interview code — it signals current best practice, sidesteps the prototype pollution and key-coercion footguns entirely, and gives honest O(1) `.size`. Use plain objects when you specifically want a fixed, known set of named properties (i.e., when you're modeling a "thing with attributes," not "an arbitrary lookup table") — that's a different, legitimate use case for objects, distinct from using them as hash maps.

### 4.6.3 `Set` — Hashing for Uniqueness, Not Key-Value Pairs

```javascript
const uniqueNumbers = new Set([1, 2, 2, 3, 3, 3]);
console.log(uniqueNumbers);        // Set(3) {1, 2, 3}
console.log(uniqueNumbers.has(2)); // true — O(1) average case
console.log(uniqueNumbers.size);   // 3

uniqueNumbers.add(4);
uniqueNumbers.delete(1);
console.log([...uniqueNumbers]);   // [2, 3, 4] — convert to array when needed
```

A `Set` is, conceptually, a `Map` where you only care about the keys, not associated values — same underlying hashing mechanism, same O(1) average-case `has`/`add`/`delete`. This is precisely the structure behind the Chapter 1 `usernameExists` example and the Chapter 3 sliding-window `seen` tracker.

### 🚀 Pro Tip: Deduplicating an Array in One Line

```javascript
const deduped = [...new Set([1, 2, 2, 3, 3, 3])]; // [1, 2, 3]
```

This is a genuinely idiomatic, production-quality one-liner — not a toy trick. It's O(n) time (building the Set) and O(n) space, versus a naive nested-loop dedup at O(n²).

### 4.6.4 `WeakMap` and `WeakSet` — Hashing That Respects Garbage Collection

This is the pair most tutorials skip, and it's genuinely important, JavaScript-specific, memory-management-adjacent knowledge.

**The problem `WeakMap`/`WeakSet` solve:** a regular `Map` holds a **strong reference** to every key it stores. This means if you use an object as a `Map` key, that object can **never be garbage collected** — even if every other part of your program has completely stopped using it — because the `Map` itself is still "holding on" to it.

```javascript
let user = { name: 'Alice' };
const metadata = new Map();
metadata.set(user, { loginCount: 5 });

user = null; // we're done with `user`... or are we?

// The object { name: 'Alice' } CANNOT be garbage collected, because
// `metadata` (the Map) still holds a strong reference to it internally,
// even though our own `user` variable no longer points to it.
// This is a memory leak if `metadata` lives for the app's entire lifetime.
```

`WeakMap` solves this by holding **weak references** to its keys — references that do *not* prevent garbage collection:

```javascript
let user = { name: 'Alice' };
const metadata = new WeakMap();
metadata.set(user, { loginCount: 5 });

user = null; // now the object CAN be garbage collected, because WeakMap's
             // reference to it doesn't count as a reason to keep it alive.
             // The entry in metadata simply vanishes once the key is collected.
```

### ⚠ Key Restrictions of `WeakMap`/`WeakSet` (These Are Not Arbitrary — They're a Direct Consequence of Weak References)

1. **Keys must be objects** (or, as of newer JS versions, registered Symbols) — never primitives like strings or numbers. This makes sense once you understand *why*: primitives aren't garbage collected in the same reference-counted/reachability sense objects are, so "weak reference to a primitive" is a meaningless concept.
2. **Not iterable.** No `.forEach`, no `for...of`, no `.size`, no way to list all keys. This is also a direct, unavoidable consequence: if you could iterate a `WeakMap`, you could observe *whether* a given object had been garbage collected yet by seeing if it's still in the list — which would make garbage collection timing observable and non-deterministic behavior would leak into your program's visible logic. JavaScript's designers deliberately closed this off.

### 🎯 Interview Pattern: When to Actually Reach for `WeakMap`

The canonical real-world use case: **attaching metadata/cached-computation-results to objects you don't own the lifecycle of**, without preventing them from being cleaned up. Common concrete examples:

- Caching expensive computed results keyed by DOM nodes in a browser (if the DOM node is removed from the page and has no other references, you don't want your cache to be the *only* thing keeping it alive in memory).
- Storing private, "hidden" data associated with class instances (a pattern used before private class fields — `#field` syntax, covered in this chapter's `SimpleHashTable` — became standard; `WeakMap`-backed privacy is still seen in some codebases and libraries).
- Any "extra info about this specific object, for as long as the object exists, and not a moment longer" scenario.

### 🔥 Interview Tip

If asked "why would you ever use `WeakMap` instead of `Map`?", the single sharpest answer is: **"to avoid memory leaks when using objects as keys, by allowing garbage collection to still reclaim those objects once nothing else references them — a regular `Map` would keep them alive forever."** Following up with "that's also why `WeakMap` isn't iterable — allowing iteration would make garbage collection timing observable, which JavaScript's design deliberately prevents" demonstrates unusually deep, specific understanding.

### 📌 Quick Revision: The Full Hashing Toolkit

| Tool | Keys | Values | Iterable | Use Case |
|---|---|---|---|---|
| `Object` | Strings/Symbols only | Anything | Yes (with quirks) | Fixed-shape data ("a thing with attributes") |
| `Map` | Anything | Anything | Yes, insertion order | General-purpose dictionary/lookup |
| `Set` | N/A (keys ARE the values) | Anything (unique) | Yes, insertion order | Uniqueness tracking, membership testing |
| `WeakMap` | Objects only | Anything | **No** | Metadata on objects, without leaking memory |
| `WeakSet` | Objects only | N/A | **No** | Tracking object membership without leaking memory |

---

## 4.7 The Hashing Pattern Playbook

Now let's build real muscle memory with the specific *patterns* that hashing enables, presented as a playbook you should recognize instantly.

### 4.7.1 Pattern: Frequency Counting

**The signal:** "count occurrences," "find the most/least frequent," "check if characters/elements repeat."

```javascript
function characterFrequency(str) {
  const freq = new Map();

  for (const char of str) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }

  return freq;
}

console.log(characterFrequency('banana'));
// Map(3) { 'b' => 1, 'a' => 3, 'n' => 2 }
```

**Dry run:**

```
str = 'banana'

char='b': freq.get('b') is undefined -> (undefined || 0)+1 = 1  -> freq={b:1}
char='a': freq.get('a') is undefined -> 0+1 = 1                -> freq={b:1,a:1}
char='n': freq.get('n') is undefined -> 0+1 = 1                -> freq={b:1,a:1,n:1}
char='a': freq.get('a') is 1 -> 1+1 = 2                        -> freq={b:1,a:2,n:1}
char='n': freq.get('n') is 1 -> 1+1 = 2                        -> freq={b:1,a:2,n:2}
char='a': freq.get('a') is 2 -> 2+1 = 3                        -> freq={b:1,a:3,n:2}

Final: {b:1, a:3, n:2}
```

- **Naive** (nested loop counting each character against every other): O(n²).
- **Hash-based frequency counting**: **O(n)** — one pass, O(1) average-case map operations per character.

### 4.7.2 Pattern: The Complement/Two-Sum Pattern

We solved Two Sum with sorted-array two-pointers in Chapter 3 — but that required sorting (O(n log n)) and lost original indices. Hashing solves the *unsorted, indices-matter* version in a single O(n) pass.

```javascript
function twoSumUnsorted(nums, target) {
  const seen = new Map(); // value -> index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];

    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }

    seen.set(nums[i], i);
  }

  return null;
}

console.log(twoSumUnsorted([2, 7, 11, 15], 9)); // [0, 1]  (2 + 7 = 9)
```

**Dry run:**

```
nums = [2, 7, 11, 15], target = 9
seen = {}

i=0, nums[0]=2: complement = 9-2 = 7. seen.has(7)? No.  seen.set(2, 0) -> seen={2:0}
i=1, nums[1]=7: complement = 9-7 = 2. seen.has(2)? YES! seen.get(2) = 0.
    return [0, 1]
```

- **Naive** (nested loop checking every pair): O(n²).
- **Hash-based complement lookup**: **O(n) time, O(n) space.**

### 🎯 Interview Pattern

This "for each element, check if its *complement/partner* has already been seen" shape is arguably **the single most reused idea in all of hash-table interview problems.** It generalizes far beyond sums: "have I seen this value's negation," "have I seen this string's reverse," "have I seen this word's anagram signature" — all the same shape, just swapping what "complement" means.

### ⚠ Common Mistake: Building the Whole Map First, Then Searching

```javascript
// WORKS, but subtly worse and can be WRONG for "can't use the same element twice" variants
function twoSumWrongOrder(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    seen.set(nums[i], i);          // populate the ENTIRE map first
  }
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement) && seen.get(complement) !== i) {
      return [i, seen.get(complement)];
    }
  }
  return null;
}
```

This two-pass version works for simple cases but requires an extra `!== i` guard to avoid matching an element with itself (e.g., `target = 4`, `nums = [2]` shouldn't match `2` with itself unless there are two separate `2`s). The **single-pass version above is both simpler and automatically correct**, because you check for the complement *before* adding the current element — the current element genuinely isn't in the map yet when you check, so self-matching is structurally impossible rather than needing a manual guard. This is a subtle but real code-quality signal in interviews: prefer the single-pass version, and be ready to explain *why* it avoids the self-matching bug for free.

### 4.7.3 Pattern: Grouping by a Computed Key

**The signal:** "group anagrams," "group by category," "cluster items sharing some derived property."

```javascript
function groupAnagrams(words) {
  const groups = new Map();

  for (const word of words) {
    const signature = word.split('').sort().join(''); // canonical form: sorted letters
    if (!groups.has(signature)) {
      groups.set(signature, []);
    }
    groups.get(signature).push(word);
  }

  return [...groups.values()];
}

console.log(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']));
// [['eat','tea','ate'], ['tan','nat'], ['bat']]
```

**Dry run (abbreviated):**

```
'eat' -> sorted -> 'aet'  -> groups: {aet: ['eat']}
'tea' -> sorted -> 'aet'  -> groups: {aet: ['eat','tea']}     (same key as 'eat'!)
'tan' -> sorted -> 'ant'  -> groups: {aet: [...], ant: ['tan']}
'ate' -> sorted -> 'aet'  -> groups: {aet: ['eat','tea','ate'], ant: ['tan']}
'nat' -> sorted -> 'ant'  -> groups: {aet: [...], ant: ['tan','nat']}
'bat' -> sorted -> 'abt'  -> groups: {aet: [...], ant: [...], abt: ['bat']}
```

- **Time**: O(n · k log k), where `n` = number of words, `k` = max word length (dominated by sorting each word to build its signature).
- **Space**: O(n · k) to store all the grouped words.

### 🚀 Pro Tip: A Faster Signature for Anagram Grouping

Sorting each word costs O(k log k). If you know the alphabet is small and fixed (e.g., lowercase English letters), you can build a signature via **character frequency counting** instead — O(k) per word, no sorting required:

```javascript
function groupAnagramsFast(words) {
  const groups = new Map();

  for (const word of words) {
    const counts = new Array(26).fill(0);
    for (const char of word) {
      counts[char.charCodeAt(0) - 97]++; // 'a'.charCodeAt(0) === 97
    }
    const signature = counts.join(',');  // e.g., "1,0,0,...,1,...": a fixed-length fingerprint

    if (!groups.has(signature)) groups.set(signature, []);
    groups.get(signature).push(word);
  }

  return [...groups.values()];
}
```

This drops the per-word cost from O(k log k) to O(k), for a total of **O(n · k)** — a genuine asymptotic improvement, not just a constant-factor tweak, and a great example of "know your alphabet size" thinking that impresses interviewers.

### 4.7.4 Pattern: Existence/Membership Tracking (The Sliding Window Callback)

We already used this pattern in Chapter 3's `longestUniqueSubstring` (the `seen` Set). It's worth naming explicitly here as its own reusable playbook entry: **whenever a sliding window or two-pointer algorithm needs to know "have I already included this value in my current window/range?", reach for a `Set` (or a `Map` if you need counts, not just booleans).**

### 4.7.5 Pattern: Caching/Memoization (Full Circle to Chapter 2)

We built this in depth in Chapter 2 — the `Map`-based memoization cache is, quite literally, a hash table application. It's worth explicitly closing this loop: **memoization is hashing applied to recursive function calls**, using the function's arguments as the key and its (expensive-to-compute) return value as the value.

### 📌 Quick Revision: The Five-Pattern Playbook

| Pattern | Signal Phrase | Structure |
|---|---|---|
| Frequency Counting | "count occurrences," "most/least frequent" | `Map<value, count>` |
| Complement Lookup | "pair that sums to X," "have I seen the opposite of this" | `Map<value, index>` or `Set<value>` |
| Grouping by Key | "group anagrams," "cluster by category" | `Map<computedKey, array>` |
| Existence Tracking | "have I seen this before in my current window" | `Set<value>` |
| Memoization | "expensive recursive/repeated computation" | `Map<argsKey, result>` |

---

## 4.8 Edge Cases and Gotchas Checklist for Hashing Problems

1. **`NaN` as a key or value.** Unlike `===`, `Map` and `Set` correctly treat `NaN` as equal to itself (using the "SameValueZero" algorithm internally), so `new Set([NaN, NaN]).size === 1`. This is actually *more* intuitive than raw `===` comparison (`NaN === NaN` is `false`!) — know this distinction; it's a common trivia question.
2. **`+0` and `-0`.** `Map`/`Set` treat `+0` and `-0` as the same key (again, via SameValueZero), even though `Object.is(+0, -0)` is `false`. Another subtle but real distinction worth knowing.
3. **Object keys and reference equality.** `new Map().set({}, 'a')` — a *new* `{}` object literal used as a key will never match another `{}` literal via `.get()`, because objects are compared by reference, not structural equality. Two separately-created objects with identical contents are different keys.
4. **Case sensitivity in string keys.** `'Cat'` and `'cat'` are different keys by default — normalize with `.toLowerCase()` explicitly if the problem calls for case-insensitive matching.
5. **Empty input.** Does your frequency-counting/grouping code handle an empty array or string gracefully (returning an empty `Map`/array, not throwing)?
6. **Very large inputs and hash-flooding awareness** (from section 4.5) — while not usually testable directly in an interview, it's worth being aware that a security-conscious system should never let untrusted external input directly determine hash bucket placement without safeguards.

---

## 4.9 Chapter Summary

This chapter opened the black box of the single highest-leverage data structure in interview preparation. We learned that hashing solves a very specific problem — getting O(1) average-case lookup, insertion, and deletion without requiring sorted order — by using a **hash function** to compute a direct storage address (a bucket index) for any key, so that lookups become direct array access (Chapter 3's O(1) again) rather than a search. We built a hash table completely from scratch, including a real (if simplified) hash function using the classic "multiply by an odd prime, take modulo" strategy, and saw exactly how collisions are handled via **separate chaining** (each bucket holds a small list) or **open addressing** (probe for the next free slot), and why collisions are mathematically inevitable by the pigeonhole principle, made intuitive by the birthday paradox.

We covered **load factor and resizing**, connecting it directly back to Chapter 3's amortized dynamic array analysis — the exact same "double when full, so the average cost per operation stays O(1)" idea applies here too. We established the fully accurate, nuanced complexity claim professionals actually make: **hash table operations are O(1) average case, amortized, assuming a reasonably distributed hash function** — not an unconditional guarantee, and worth stating with that precision in interviews, including awareness of hash-flooding attacks as a real-world consequence of poor/predictable hashing.

We then did a deep, practical tour of JavaScript's actual hashing toolkit: **plain objects** (string/Symbol keys only, prototype pollution risk, the surprising integer-key reordering quirk), **`Map`** (the correct modern default for general-purpose dictionaries — any key type, guaranteed insertion order, O(1) `.size`), **`Set`** (uniqueness/membership tracking, same underlying mechanism as `Map` with keys-only), and **`WeakMap`/`WeakSet`** (weak references that don't prevent garbage collection, deliberately non-iterable to avoid making GC timing observable — the right tool for attaching metadata to objects you don't own the lifecycle of).

Finally, we built a five-entry **pattern playbook** that will recur constantly throughout the rest of this book and in real interviews: frequency counting, complement/pair lookup, grouping by a computed key, existence tracking (closing the loop with Chapter 3's sliding window), and memoization (closing the loop with Chapter 2's recursion). If Chapter 1 taught you to *measure* algorithms and Chapter 2 taught you to *think recursively*, this chapter taught you the single most commonly reached-for *tool* for turning an O(n²) brute force into an O(n) solution.

---

## 4.10 Revision Notes

- Hash tables achieve O(1) average lookup by computing a direct address (bucket index) via a hash function, avoiding search entirely.
- A good hash function is deterministic, fast, and produces a uniform distribution across buckets.
- Collisions are mathematically inevitable (pigeonhole principle); handled via separate chaining (list per bucket) or open addressing (probe for next free slot).
- Load factor triggers resizing; resizing is O(n) but amortizes to O(1) per operation, identical reasoning to Chapter 3's dynamic array growth.
- Accurate complexity claim: O(1) **average case, amortized**, not an unconditional guarantee — worst case is O(n) with a poor hash function or adversarial input.
- Prefer `Map` over plain objects for general-purpose dictionaries in modern JS: any key type, guaranteed insertion order, O(1) `.size`, no prototype pollution risk.
- `WeakMap`/`WeakSet` hold weak references (object keys only, not iterable) — use for metadata on objects you don't control the lifecycle of, to avoid memory leaks.
- The five-pattern playbook: frequency counting, complement lookup, grouping by computed key, existence tracking, memoization — recognize the signal phrase, reach for the matching `Map`/`Set` shape.

---

## 4.11 Mind Map (ASCII)

```
                                   HASHING
                                      |
      +----------------+-------------+-------------+------------------+
      |                |                            |                  |
  HASH FUNCTION    COLLISIONS                  JS BUILT-INS       PATTERN PLAYBOOK
      |                |                            |                  |
  Deterministic    Inevitable              +--------+--------+    Frequency count
  Fast              (pigeonhole)           |        |        |    Complement lookup
  Uniform           |                    Object   Map/Set  WeakMap/  Grouping by key
  distribution   Birthday paradox        (quirks) (default) WeakSet  Existence tracking
      |          intuition                                  (weak    Memoization
  multiply by        |                                       refs,
  odd prime,     Chaining vs.                                 no
  mod bucket     Open Addressing                            iteration)
  count               |
                 LOAD FACTOR
                 & RESIZING
                 (same amortized
                  logic as Ch.3
                  dynamic arrays)
```

---

## 4.12 Cheat Sheet

```
HASHING QUICK REFERENCE
==========================
Average case: O(1) insert / lookup / delete (amortized, assuming good hash function)
Worst case:   O(n) (poor hash function, adversarial collisions, or hash-flooding)

JS TOOLKIT DECISION TABLE
============================
Need: fixed-shape "thing with attributes"       -> Object
Need: general-purpose dictionary                -> Map (default choice)
Need: uniqueness / membership testing           -> Set
Need: metadata on objects, avoid memory leaks   -> WeakMap
Need: object membership, avoid memory leaks     -> WeakSet

PATTERN SIGNAL PHRASES
=========================
"count occurrences / most frequent"        -> Map<value, count>
"pair summing to X, unsorted, need index"  -> Map<value, index> (complement lookup)
"group anagrams / cluster by category"     -> Map<computedKey, array>
"seen this before in my current window"    -> Set<value>
"expensive repeated computation"           -> Map<argsKey, result> (memoization)

GOTCHAS
=========
NaN === NaN is false, but Map/Set treat NaN as equal to itself (SameValueZero)
+0 and -0 are treated as the same key in Map/Set
Object keys compare by REFERENCE, not structural equality
Plain object integer-like keys get reordered numerically in iteration
```

---

## 4.13 Key Takeaways

1. Hashing trades memory for speed: compute a direct address instead of searching.
2. Collisions are inevitable by the pigeonhole principle — chaining and open addressing are the two standard ways to manage them.
3. Hash table operations are O(1) average case, amortized — not an unconditional guarantee; know why, and know the worst case.
4. `Map`/`Set` are the modern, correct defaults for dictionaries/uniqueness in JavaScript; `WeakMap`/`WeakSet` exist specifically to avoid memory leaks on object keys.
5. The five-pattern playbook (frequency, complement, grouping, existence, memoization) covers a staggering fraction of real interview problems — drilling these patterns is higher-leverage than memorizing individual problems.

---

## 4.14 20 Multiple Choice Questions

1. What is the primary advantage of a hash table over a sorted array for lookups?
   a) It uses less memory
   b) O(1) average-case lookup without requiring sorted order
   c) It automatically sorts data
   d) It never has collisions

2. What are the three core requirements of a good hash function?
   a) Slow, unpredictable, sparse
   b) Deterministic, fast to compute, uniform distribution
   c) Random, reversible, recursive
   d) Sorted, indexed, cached

3. What causes a hash collision?
   a) Using `let` instead of `const`
   b) Two different keys hashing to the same bucket index
   c) The array being too large
   d) Using `Map` instead of `Object`

4. What principle guarantees collisions are inevitable given enough keys?
   a) The birthday paradox
   b) The pigeonhole principle
   c) Amdahl's law
   d) The halting problem

5. What is "separate chaining"?
   a) Encrypting hash values
   b) Each bucket holds a small collection of all entries that hashed to it
   c) Splitting the hash table across multiple servers
   d) Sorting entries within each bucket

6. What is "open addressing" (linear probing)?
   a) Making all buckets public
   b) Probing for the next available slot when a bucket is already occupied
   c) Using open-source hash functions
   d) Allowing duplicate keys

7. What is the "load factor" of a hash table?
   a) The maximum key length allowed
   b) The ratio of stored entries to total bucket count
   c) The time it takes to hash a single key
   d) The number of collisions per second

8. What is the fully accurate complexity claim for hash table operations?
   a) O(1) always, no exceptions
   b) O(1) average case, amortized, assuming a good hash function
   c) O(log n) always
   d) O(n) always

9. Which of these can be used as a `Map` key but NOT as a plain object key (without coercion)?
   a) A string
   b) A number like `42` used directly as a distinct key from `'42'`
   c) A Symbol
   d) None — objects and Maps support identical key types

10. What is the surprising default iteration order quirk of plain objects with integer-like keys?
    a) They iterate in reverse insertion order
    b) They are sorted numerically first, before string keys in insertion order
    c) They are randomized every time
    d) They are removed automatically

11. Why does `Map` generally outperform plain objects for frequent add/remove operations?
    a) Map uses less RAM per entry always
    b) Objects are optimized by engines for stable "shapes," which frequent add/remove disrupts
    c) Map is written in a faster language
    d) Objects cannot be modified after creation

12. What does `WeakMap` hold that a regular `Map` does not?
    a) Stronger references, preventing garbage collection
    b) Weak references, allowing garbage collection of unreferenced keys
    c) No references at all
    d) References only to primitive values

13. Why can't `WeakMap` keys be primitives like strings or numbers?
    a) It's an arbitrary restriction with no reason
    b) Weak references only make sense for garbage-collectible objects, not primitives
    c) Strings are too large to hash
    d) Numbers cause hash collisions

14. Why is `WeakMap` deliberately not iterable?
    a) Performance reasons only
    b) Iterating would make garbage collection timing observable, which JS design prevents
    c) JavaScript doesn't support iteration on weak references at all
    d) It would require too much memory

15. In the Two Sum "complement lookup" pattern, why does checking for the complement BEFORE adding the current element avoid a bug?
    a) It doesn't matter which order you do it in
    b) It structurally prevents matching an element with itself, without needing an extra guard
    c) It makes the algorithm run faster
    d) JavaScript requires this order syntactically

16. What is the time complexity of grouping anagrams using sorted-string signatures, for `n` words of max length `k`?
    a) O(n)
    b) O(n · k)
    c) O(n · k log k)
    d) O(n²)

17. How does `Map`/`Set` treat `NaN` as a key, compared to `===` comparison?
    a) The same as `===`: `NaN` never equals `NaN`
    b) `Map`/`Set` treat `NaN` as equal to itself (SameValueZero), unlike `===`
    c) `NaN` cannot be used as a key at all
    d) `NaN` is converted to `0` automatically

18. Why do two separately-created object literals with identical contents fail to match as the same `Map` key?
    a) Map only supports primitive keys
    b) Objects are compared by reference, not structural equality
    c) It's a bug in the JavaScript spec
    d) Object literals cannot be hashed

19. What real-world security concern relates to poorly-designed or predictable hash functions?
    a) SQL injection
    b) Hash-flooding / algorithmic complexity attacks degrading O(1) operations to O(n)
    c) Cross-site scripting
    d) Buffer overflows

20. Which of the five hashing patterns best fits the signal phrase "have I seen this value before in my current sliding window"?
    a) Frequency counting
    b) Grouping by computed key
    c) Existence tracking (Set)
    d) Memoization

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-c, 17-b, 18-b, 19-b, 20-c

---

## 4.15 20 Coding Problems

**Easy**

1. Given an array, return `true` if it contains any duplicate values, using a `Set`.
2. Write a function that returns the first non-repeating character in a string, using frequency counting.
3. Given two strings, determine if one is an anagram of the other using frequency counting.
4. Write a function that intersects two arrays (returns common elements) using a `Set`.
5. Implement your own simplified `Map`-like class using a plain object internally, and note in a comment one limitation this has versus a real `Map`.

**Medium**

6. Implement the Two Sum (unsorted, return indices) problem from section 4.7.2 from memory, then verify against the book's version.
7. Implement `groupAnagrams` from section 4.7.3, then implement the faster frequency-signature version, and compare their complexities in a comment.
8. Given a list of log entries `[userId, timestamp]`, use a `Map` to compute the number of unique users who logged in more than once.
9. Write a function that finds the longest consecutive sequence of integers in an unsorted array in O(n) time using a `Set` (hint: only start counting a sequence from a number that has no predecessor in the set).
10. Implement a simple LRU-cache-flavored function using `Map` (leveraging that `Map` preserves insertion order) that evicts the least-recently-used entry once a size limit is reached.

**Hard**

11. Given an array of strings, group them by whether they are anagrams of each other, but do it using the frequency-count signature approach (section 4.7.3's optimized version) and prove in a comment why it beats the sorted-signature approach for long words.
12. Implement a hash table from scratch (extend `SimpleHashTable` from section 4.3.1) that automatically resizes (doubles bucket count) once load factor exceeds 0.75, rehashing all existing entries.
13. Given a very large stream of numbers, design a `Map`-based solution to track the top-3 most frequent numbers seen so far, updated efficiently as new numbers arrive.
14. Implement a `WeakMap`-based cache for an expensive computation keyed by object references, and write a small demonstration (with comments explaining what you'd observe, since GC timing isn't directly observable) of why this avoids leaking memory compared to a `Map`-based cache.
15. Given two large arrays representing sets, implement union, intersection, and difference operations, all in O(n+m) time using `Set`.

**Interview Level**

16. **(Google-level)** Design a URL shortener's core lookup mechanism: given a short code, return the original URL in O(1) average time. Discuss (in comments) collision handling if two different original URLs somehow hash to the same short code.
17. **(Amazon-level)** Given millions of customer orders as `[customerId, amount]`, compute the total spend per customer in O(n) time using a `Map`, and discuss why this beats a naive nested-loop grouping approach.
18. **(Microsoft-level)** Implement a function that checks if a string can be rearranged into a palindrome, using frequency counting (hint: at most one character can have an odd count).
19. **(Meta-level)** Given a social graph represented as adjacency lists, use a `Set` per user to efficiently compute "mutual friends" between any two users, and discuss the time complexity in terms of friend-list sizes.
20. **(Netflix-level)** Design a "content deduplication" system: given a stream of video fingerprint hashes, use a `Set` to detect duplicate uploads in O(1) average time per check, and discuss (in comments) what happens to correctness if the hash function has a non-trivial collision rate — connect this back to the "false positive" risk inherent in any hash-based existence check (a preview of the "Bloom Filter" concept, mentioned in Further Reading).

---

## 4.16 5 Interview Questions

1. "Explain, from first principles, why a hash table achieves O(1) average lookup time." (Tests whether the candidate understands the mechanism, not just the claim.)
2. "What happens when two keys collide, and how would you handle it?" (Tests knowledge of chaining vs. open addressing.)
3. "Why would you choose `Map` over a plain object for a dictionary in modern JavaScript?" (Tests awareness of key-type flexibility, insertion order guarantees, and prototype pollution risk.)
4. "When would you use a `WeakMap` instead of a `Map`?" (Tests understanding of garbage collection and memory leak avoidance — a strong, specific JS-depth question.)
5. "Walk me through how you'd recognize that a brute-force O(n²) solution can be improved to O(n) using a hash table." (Tests pattern recognition — the complement/frequency/grouping playbook.)

---

## 4.17 3 Real Projects

1. **Hash Table From Scratch, With Resizing**: Extend `SimpleHashTable` from section 4.3.1 into a complete implementation with automatic load-factor-triggered resizing (coding problem #12), then benchmark it against native `Map` at increasing sizes to see how close a hand-rolled implementation gets to native performance.
2. **Log Analyzer**: Build a Node.js CLI tool that reads a log file (simulate one with random data if needed) and uses the frequency-counting and grouping patterns from this chapter to report: most frequent error codes, unique user counts, and requests grouped by endpoint — a direct, practical application of the pattern playbook.
3. **Memory-Safe Object Metadata Cache**: Build a small module using `WeakMap` that attaches computed "tags" or "scores" to a set of objects representing, e.g., in-memory user session objects, and write a demonstration script showing objects being created, tagged, dereferenced, and (conceptually, since GC timing can't be forced deterministically in JS) explain in comments why a `WeakMap`-based design is the correct choice here versus a regular `Map`.

---

## 4.18 Further Reading

- MDN Web Docs: "Map," "Set," "WeakMap," "WeakSet," and "Keyed collections" — for exact spec-level behavior guarantees.
- Search "V8 blog fast properties" and "V8 blog hash tables" for real engineering detail on how V8 actually implements object property lookup and `Map`/`Set` internals.
- Look up **Bloom Filters** as a natural next step beyond this chapter — a probabilistic hashing structure that trades a small false-positive rate for dramatically reduced memory usage versus a full `Set`, used heavily in large-scale systems (mentioned in coding problem #20 above).
- Steven Skiena, *The Algorithm Design Manual*, chapter on hashing, for additional real-world hash function design discussion.

---

*End of Chapter 4. Next: Chapter 5 will cover Linked Lists — singly and doubly linked lists, memory representation versus arrays, and the classic operations, reversals, and cycle-related problems that set up the Fast & Slow Pointer masterclass immediately following it.*

**Say "Continue to the next chapter" when ready.**
