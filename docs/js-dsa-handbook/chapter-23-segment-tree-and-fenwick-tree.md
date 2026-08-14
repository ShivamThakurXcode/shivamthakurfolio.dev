# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 23: Segment Trees and Fenwick Trees — Range Queries AND Updates, Together

---

## 23.0 The Gap This Chapter Fills

Chapter 3 gave us prefix sums: O(n) setup, O(1) range-sum **queries**, but the array had to stay **static** — a single update anywhere would require rebuilding the whole prefix array. Chapter 3 also gave us difference arrays: O(1) range **updates**, but no way to answer a query about an intermediate state without a full O(n) reconstruction. **What if you need both — many range queries AND many range updates, interleaved, on the same dynamically-changing array?** Neither of Chapter 3's tools handles this. This chapter introduces two structures purpose-built for exactly this gap: the **Segment Tree** and the **Fenwick Tree (Binary Indexed Tree)**.

---

## 23.1 The Segment Tree: A Tree That Answers Range Questions

**Definition:** A segment tree is a binary tree where each node represents a range (segment) of the original array, storing an aggregate value (sum, min, max, etc.) for that range; leaf nodes represent individual elements, and internal nodes represent the combination of their two children's ranges.

### ASCII Visualization: A Segment Tree for Range Sums

```
Array: [1, 3, 5, 7, 9, 11]

                          [0-5]=36
                        /          \
                  [0-2]=9          [3-5]=27
                 /       \         /        \
            [0-1]=4    [2-2]=5  [3-4]=16   [5-5]=11
            /    \                /    \
        [0-0]=1 [1-1]=3      [3-3]=7  [4-4]=9

Each internal node's value = sum of its two children.
Leaf nodes correspond directly to array elements.
```

### 🎯 Direct Callback to Chapter 8's Tree Vocabulary and Chapter 9's Array Representation

This is worth stating explicitly: **a segment tree is precisely Chapter 8's tree concept, but built specifically to represent hierarchical range decomposition, and (like Chapter 9's heap) is almost always implemented via a flat array using index arithmetic** rather than pointer-based nodes, for the exact same cache-locality and simplicity reasons discussed in Chapter 9.

### 23.1.1 Building the Segment Tree (Array-Based, Chapter 9-Style Index Arithmetic)

```javascript
class SegmentTree {
  #tree;
  #n;

  constructor(arr) {
    this.#n = arr.length;
    this.#tree = new Array(4 * this.#n).fill(0); // 4n is a safe, standard upper bound on space needed
    this.#build(arr, 0, 0, this.#n - 1);
  }

  #build(arr, node, start, end) {
    if (start === end) {
      this.#tree[node] = arr[start]; // leaf node — represents a single element
      return;
    }

    const mid = Math.floor((start + end) / 2);
    const leftChild = 2 * node + 1;   // EXACTLY Chapter 9's heap index arithmetic!
    const rightChild = 2 * node + 2;

    this.#build(arr, leftChild, start, mid);
    this.#build(arr, rightChild, mid + 1, end);

    this.#tree[node] = this.#tree[leftChild] + this.#tree[rightChild]; // combine children
  }
  // Time: O(n) — every node is visited exactly once, same reasoning as any tree traversal (Chapter 8)
```

### 23.1.2 Range Sum Query: O(log n)

```javascript
  query(queryStart, queryEnd) {
    return this.#queryHelper(0, 0, this.#n - 1, queryStart, queryEnd);
  }

  #queryHelper(node, start, end, queryStart, queryEnd) {
    if (queryEnd < start || end < queryStart) {
      return 0; // COMPLETELY outside the query range — contributes nothing
    }

    if (queryStart <= start && end <= queryEnd) {
      return this.#tree[node]; // COMPLETELY inside the query range — use the precomputed value directly!
    }

    // PARTIAL overlap — must recurse into both children and combine
    const mid = Math.floor((start + end) / 2);
    const leftSum = this.#queryHelper(2 * node + 1, start, mid, queryStart, queryEnd);
    const rightSum = this.#queryHelper(2 * node + 2, mid + 1, end, queryStart, queryEnd);

    return leftSum + rightSum;
  }
```

### 🧠 Memory Trick: The Three-Case Decision at Every Node

Every segment tree query boils down to exactly one of three cases at each node, worth memorizing as a template: **(1) No overlap at all — contribute nothing, stop recursing here. (2) Total overlap (this node's entire range is inside the query) — use the precomputed aggregate directly, stop recursing here. (3) Partial overlap — recurse into both children and combine their results.** This "no overlap / total overlap / partial overlap" trichotomy is the beating heart of every segment tree operation in this chapter.

### Dry Run: `query(1, 4)` on `[1, 3, 5, 7, 9, 11]`

```
Tree (from the visualization above):
[0-5]=36 -> [0-2]=9, [3-5]=27
[0-2]=9  -> [0-1]=4, [2-2]=5
[0-1]=4  -> [0-0]=1, [1-1]=3
[3-5]=27 -> [3-4]=16, [5-5]=11
[3-4]=16 -> [3-3]=7, [4-4]=9

queryHelper(node=[0-5], queryRange=[1,4]):
  [0-5] partially overlaps [1,4] -> recurse both children

  queryHelper([0-2], [1,4]):
    [0-2] partially overlaps [1,4] -> recurse both children
    queryHelper([0-1], [1,4]):
      [0-1] partially overlaps [1,4] -> recurse both children
      queryHelper([0-0], [1,4]): [0-0] is OUTSIDE [1,4] (end=0 < queryStart=1) -> return 0
      queryHelper([1-1], [1,4]): [1-1] is FULLY INSIDE [1,4] -> return tree value = 3
      Combine: 0 + 3 = 3
    queryHelper([2-2], [1,4]): [2-2] is FULLY INSIDE [1,4] -> return tree value = 5
    Combine: 3 + 5 = 8

  queryHelper([3-5], [1,4]):
    [3-5] partially overlaps [1,4] -> recurse both children
    queryHelper([3-4], [1,4]): [3-4] is FULLY INSIDE [1,4] -> return tree value = 16
    queryHelper([5-5], [1,4]): [5-5] is OUTSIDE [1,4] (start=5 > queryEnd=4) -> return 0
    Combine: 16 + 0 = 16

  Final: 8 + 16 = 24

Verify: arr[1..4] = [3,5,7,9], sum = 3+5+7+9 = 24 ✓
```

### 23.1.3 Point Update: O(log n)

```javascript
  update(index, newValue) {
    this.#updateHelper(0, 0, this.#n - 1, index, newValue);
  }

  #updateHelper(node, start, end, index, newValue) {
    if (start === end) {
      this.#tree[node] = newValue; // reached the leaf — apply the update
      return;
    }

    const mid = Math.floor((start + end) / 2);
    const leftChild = 2 * node + 1;
    const rightChild = 2 * node + 2;

    if (index <= mid) {
      this.#updateHelper(leftChild, start, mid, index, newValue);
    } else {
      this.#updateHelper(rightChild, mid + 1, end, index, newValue);
    }

    this.#tree[node] = this.#tree[leftChild] + this.#tree[rightChild]; // recompute this node from its (now-updated) children
  }
}
```

### 🎯 Interview Pattern: Why O(log n), Not O(n), for Both Operations

Both `query` and `update` only ever traverse **one root-to-leaf path** (or, for query, a small number of paths that branch off from the "partial overlap" nodes along one conceptual path — provably still O(log n) total, since a query range can only partially overlap at most O(log n) nodes at each level). This is the exact same height-bounded guarantee as Chapter 9's heap (a segment tree, like a heap, is always a **complete-ish** binary tree by construction, giving an unconditional O(log n) height, with no BST-style degeneration risk from Chapter 8 possible).

### 📌 Quick Revision: Segment Tree Complexity

| Operation | Complexity |
|---|---|
| Build | O(n) |
| Range query | O(log n) |
| Point update | O(log n) |
| Space | O(n) (specifically, up to 4n array slots, a standard safe bound) |

---

## 23.2 The Fenwick Tree (Binary Indexed Tree): A Cleverer, More Compact Alternative

### 🚀 Pro Tip: Why This Structure Exists Alongside the Segment Tree

The Fenwick Tree solves the **exact same problem** as a segment tree restricted to prefix-sum-style queries (range sum, specifically) — but with a genuinely more compact, elegant implementation using **only O(n) space with a small constant factor** (versus the segment tree's `4n` array) and a beautifully clever bit-manipulation trick (previewing Chapter 24!) instead of explicit tree recursion.

### 23.2.1 The Core Insight: Every Index "Owns" a Specific Range, Determined by Its Lowest Set Bit

**Definition:** In a Fenwick Tree, index `i` (1-indexed) is responsible for storing the sum of a range of length equal to `i`'s **lowest set bit** (the rightmost `1` bit in its binary representation), ending exactly at index `i`.

### 🧠 Memory Trick: The Bit-Trick `i & (-i)` Isolates the Lowest Set Bit

```
i = 12 = binary 1100
-i in two's complement = binary 0100 (flip all bits of 12, add 1: ...0011+1=...0100)
i & (-i) = 1100 & 0100 = 0100 = 4

So index 12 is responsible for a range of length 4, covering indices 9 through 12.
```

This single bit trick (`i & (-i)`) — extracting the lowest set bit — is the entire mechanism powering both of the Fenwick Tree's core operations, and it's worth sitting with until it feels natural, since it will reappear as a named technique in Chapter 24's Bit Manipulation masterclass.

```javascript
class FenwickTree {
  #tree;
  #n;

  constructor(size) {
    this.#n = size;
    this.#tree = new Array(size + 1).fill(0); // 1-INDEXED — a genuine convention requirement, not a choice!
  }

  update(index, delta) {
    // index is 1-indexed. `delta` is the AMOUNT to ADD (not the new value directly)
    for (let i = index; i <= this.#n; i += i & (-i)) {
      this.#tree[i] += delta;
    }
  }
  // Time: O(log n) — the number of steps is bounded by the number of bits in `n`

  prefixSum(index) {
    // sum of elements from index 1 to `index`, inclusive
    let sum = 0;
    for (let i = index; i > 0; i -= i & (-i)) {
      sum += this.#tree[i];
    }
    return sum;
  }
  // Time: O(log n)

  rangeSum(left, right) {
    // sum of elements from `left` to `right`, inclusive (both 1-indexed)
    return this.prefixSum(right) - this.prefixSum(left - 1);
  }
}
```

### ⚠ Common Mistake: Forgetting the Fenwick Tree Is 1-Indexed

This is a genuinely important, easy-to-miss convention: **Fenwick Trees are conventionally 1-indexed, not 0-indexed** (unlike almost every other structure in this book) — this is *required*, not stylistic, because the `i & (-i)` bit trick relies on index `0`'s binary representation being all zeros, which would break the traversal logic (an index of 0 has no set bits at all, causing the update/query loops to terminate immediately or behave incorrectly). **Always convert your problem's 0-indexed array positions to 1-indexed Fenwick Tree positions** (`fenwickIndex = arrayIndex + 1`) at the boundary between your problem logic and the Fenwick Tree's internal API.

### Dry Run: Building and Querying a Fenwick Tree

```
Starting array (0-indexed, conceptually): [3, 2, -1, 6, 5, 4, -3, 3]
Fenwick tree size = 8, tree array initialized to all 0s (indices 0-8)

update(1, 3):  // add 3 at position 1 (1-indexed)
  i=1: tree[1] += 3 -> tree[1]=3. i += 1&(-1)=1 -> i=2
  i=2: tree[2] += 3 -> tree[2]=3. i += 2&(-2)=2 -> i=4
  i=4: tree[4] += 3 -> tree[4]=3. i += 4&(-4)=4 -> i=8
  i=8: tree[8] += 3 -> tree[8]=3. i += 8&(-8)=8 -> i=16 > n=8, STOP

update(2, 2):  // add 2 at position 2
  i=2: tree[2] += 2 -> tree[2]=5. i -> i=4
  i=4: tree[4] += 2 -> tree[4]=5. i -> i=8
  i=8: tree[8] += 2 -> tree[8]=5. i -> 16, STOP

(... continuing for all 8 positions would fill out the tree completely ...)

prefixSum(4) after fully building (conceptually, sum of first 4 elements = 3+2-1+6 = 10):
  i=4: sum += tree[4]. i -= 4&(-4)=4 -> i=0, STOP
  Result depends on tree[4]'s final accumulated value after ALL updates — matches 10 when fully built.
```

### 🎯 Interview Pattern: Segment Tree vs. Fenwick Tree — The Decisive Comparison

| | Segment Tree | Fenwick Tree |
|---|---|---|
| Space | O(4n) (a safe standard bound) | **O(n)**, smaller constant factor |
| Code complexity | More code (explicit recursive tree structure) | **Less code** (two short bit-trick loops) |
| Supported operations | **General** — sum, min, max, GCD, or any associative combining operation | **Primarily sum-like** (or other invertible operations, where "subtract" makes sense — min/max don't naturally support the prefix-sum-difference trick) |
| Range updates (not just point updates) | Requires "lazy propagation" (an advanced extension, mentioned below) | Requires a secondary trick (a "difference array"-style Fenwick Tree, directly extending Chapter 3's difference array concept) |
| Best for | Range min/max/GCD queries, or when range updates are needed alongside range queries | **Simple range-sum with point updates** — the common case, solved with less code and less memory |

### 🔥 Interview Tip

The clean decision framework: **"If I only need range SUM queries with point updates, I'd reach for a Fenwick Tree — less code, less memory, same O(log n) guarantees. If I need range MIN/MAX/GCD queries, or need to support efficient RANGE updates (not just single-point updates) alongside range queries, I'd reach for a segment tree, since it generalizes to any associative combining operation and supports range updates via lazy propagation, which Fenwick Trees don't naturally accommodate as cleanly."**

---

## 23.3 Range Update, Range Query: Extending Both Structures

### 🚀 Pro Tip: Combining Chapter 3's Difference Array With a Fenwick Tree

Recall Chapter 3's difference array: O(1) range updates, but no efficient way to query an intermediate prefix sum without a full O(n) reconstruction. **By storing the difference array's values inside a Fenwick Tree instead of a plain array, range updates become O(log n) (updating just two positions in the underlying Fenwick Tree, exactly like a plain difference array's two-position update) AND prefix-sum queries become O(log n) too** (a direct Fenwick Tree `prefixSum` call) — genuinely combining the best of both Chapter 3 techniques into one structure.

```javascript
class RangeUpdateFenwickTree {
  #fenwick;

  constructor(size) {
    this.#fenwick = new FenwickTree(size);
  }

  rangeUpdate(left, right, delta) {
    // Add `delta` to every element from `left` to `right` (1-indexed), in O(log n)!
    this.#fenwick.update(left, delta);
    this.#fenwick.update(right + 1, -delta); // EXACTLY Chapter 3's difference array trick!
  }

  pointQuery(index) {
    // The value AT a specific index, after all range updates so far
    return this.#fenwick.prefixSum(index);
  }
}
```

### 🎯 Interview Pattern: The Direct Callback

This is a genuinely satisfying moment of synthesis: **the "add at start, subtract at end+1" difference-array trick from Chapter 3, section 3.8, applied not to a plain array (giving O(1) update but O(n) reconstruction), but to a Fenwick Tree (giving O(log n) update AND O(log n) point/prefix query)** — the exact same core idea, elevated by a smarter underlying data structure. This pattern (recognizing an earlier, simpler technique's core idea, then re-implementing it atop a more powerful structure to unlock a capability the simple version lacked) is a genuinely valuable, generalizable skill.

### 🚀 Pro Tip: Lazy Propagation for Segment Trees (Conceptual Mention)

Segment trees can be similarly extended to support efficient **range** updates (not just point updates) via a technique called **lazy propagation**: instead of immediately recursing into every affected leaf when a range update occurs, a node "remembers" that its entire subtree needs an update, deferring the actual propagation until a future query actually needs to descend into that subtree. This is a genuinely more advanced technique than this book's core coverage — **know that it exists and what problem it solves** (efficient range updates on segment trees, mirroring the Fenwick Tree's range-update extension above), consistent with this book's established pattern of giving full implementation depth to foundational techniques while treating genuinely advanced extensions (AVL rotations in Chapter 8, suffix tree construction in Chapter 22) at a conceptual level.

---

## 23.4 Edge Cases and Gotchas Checklist

1. **Off-by-one between 0-indexed problem input and 1-indexed Fenwick Tree internals** — always explicitly convert at the API boundary; this is the single most common Fenwick Tree bug.
2. **Empty array or size-0 structures.** Verify constructors and queries handle this gracefully.
3. **Query range entirely outside the array's bounds.** Verify both structures return a sensible result (typically `0` for sum-based queries) rather than crashing.
4. **`update` semantics: "set to a new value" vs. "add a delta"** — Segment Tree's `update` (section 23.1.3) sets an absolute new value; Fenwick Tree's `update` (section 23.2.1) adds a delta. Confusing these two conventions is a common, easy-to-miss source of bugs when switching between the two structures; always verify which semantic a specific implementation uses.
5. **Non-invertible operations (min/max) with Fenwick Trees** — the `prefixSum(right) - prefixSum(left-1)` range-query trick relies on the operation being invertible (subtraction undoes addition); this does NOT work for min/max, which have no inverse operation — use a segment tree for range min/max instead.
6. **4n array sizing for segment trees** — using an under-sized array (e.g., `2n` instead of `4n`) can cause out-of-bounds errors for certain tree shapes; always use the standard `4n` safe bound unless you've specifically verified a tighter bound for your exact tree-construction approach.

---

## 23.5 Chapter Summary

This chapter filled a genuine gap left open since Chapter 3: **structures that support both efficient range queries and efficient updates simultaneously, on a dynamically changing array** — something neither prefix sums (queries only, static array) nor difference arrays (updates only, no efficient intermediate queries) could offer alone. We built the **segment tree** as a direct application of Chapter 8's tree vocabulary combined with Chapter 9's array-based index arithmetic (`2i+1`, `2i+2`, the identical formulas from heaps), where every query and update operation is governed by a memorable three-case decision (no overlap, total overlap, partial overlap) and bounded to O(log n) by the tree's unconditional, construction-guaranteed height — the same degeneration-proof guarantee Chapter 9's heap enjoyed over Chapter 8's plain BST.

We then introduced the **Fenwick Tree (Binary Indexed Tree)** as a more compact, more elegant alternative specifically for sum-like range queries, built on the genuinely clever `i & (-i)` bit trick (isolating an index's lowest set bit) that determines exactly which range each array position is "responsible for" — a preview of Chapter 24's bit manipulation techniques, and a structure requiring the important, easy-to-miss 1-indexing convention (unlike almost everything else in this book), since the bit trick's correctness specifically depends on index 0's all-zero binary representation being excluded from the traversal. We built a precise, honest comparison table: segment trees generalize to any associative operation (min, max, GCD, sum) and support range updates via the more advanced lazy propagation technique, while Fenwick Trees offer less code and less memory but are naturally restricted to invertible operations (sum, and similar), where the `prefixSum(right) - prefixSum(left-1)` trick actually works.

Finally, we delivered a genuinely satisfying synthesis: applying **Chapter 3's difference array trick — "add at the start, subtract at end+1" — not to a plain array, but to a Fenwick Tree itself**, upgrading Chapter 3's O(1)-update-but-O(n)-reconstruction technique into a structure offering O(log n) range updates **and** O(log n) point/prefix queries simultaneously — the exact capability gap this chapter opened by identifying, now closed by recognizing that an earlier, simpler technique's core idea can be elevated by re-implementing it atop a more powerful underlying structure, a genuinely valuable and repeatable problem-solving move worth carrying forward.

---

## 23.6 Revision Notes

- Segment trees and Fenwick trees fill the gap Chapter 3 left open: efficient range queries AND range updates together, on a dynamically changing array.
- Segment trees use Chapter 8's tree concept with Chapter 9's array-index arithmetic (2i+1, 2i+2); every operation follows the "no overlap / total overlap / partial overlap" three-case decision, bounded to O(log n) by unconditional tree height.
- Fenwick Trees use the `i & (-i)` bit trick (isolating the lowest set bit) to determine each index's responsible range — a preview of Chapter 24's bit manipulation.
- Fenwick Trees require 1-indexing — a hard requirement, not a stylistic choice, since the bit trick depends on excluding index 0's all-zero representation.
- Segment trees generalize to any associative operation (sum, min, max, GCD) and support range updates via lazy propagation (advanced, conceptual coverage); Fenwick Trees are more compact but restricted to invertible operations like sum.
- Applying Chapter 3's difference-array trick atop a Fenwick Tree (instead of a plain array) upgrades O(1)-update/O(n)-query into O(log n) for both — a genuine synthesis worth recognizing as a repeatable pattern.

---

## 23.7 Mind Map (ASCII)

```
                    SEGMENT TREES & FENWICK TREES
                                  |
      +------------------+-------+-------+------------------------+
      |                  |               |                        |
  THE GAP FROM        SEGMENT TREE   FENWICK TREE              SYNTHESIS:
  CHAPTER 3                |         (Binary Indexed Tree)     RANGE UPDATE +
      |               Ch.8 tree +         |                    RANGE QUERY
  Prefix sums:        Ch.9 array      i & (-i) bit trick             |
  query-only,         index math      isolates LOWEST SET BIT   Ch.3's difference
  static array        (2i+1,2i+2)     (preview of Ch.24!)        array trick
      |                    |               |                     ("add at start,
  Difference arrays:  3-case query:    1-INDEXED required        subtract at
  update-only, no     no overlap /     (hard requirement,        end+1"), applied
  efficient           total overlap /  not style -- bit trick    to a FENWICK TREE
  intermediate        partial overlap  needs index 0 excluded)   instead of a
  query                    |               |                     PLAIN ARRAY
      |               O(log n) query/  O(log n) update/               |
  NEITHER supports    update, O(n)     prefixSum, O(n) space,   = O(log n) RANGE
  BOTH simultaneously build, O(4n)     smaller constant          UPDATE + O(log n)
                       space                 |                   POINT/PREFIX QUERY
                            |            SEGMENT vs FENWICK:      (the gap CLOSED!)
                     Lazy propagation   general ops + range
                     (advanced,         updates (seg. tree)
                     conceptual) for    vs less code/memory,
                     range UPDATES      sum-only (Fenwick)
```

---

## 23.8 Cheat Sheet

```
SEGMENT TREE QUICK REFERENCE
===============================
Build:  O(n)         Query: O(log n)        Update: O(log n)      Space: O(4n)
Index math: left=2*node+1, right=2*node+2 (SAME as Chapter 9's heap!)
Query 3-case rule: no overlap -> 0; total overlap -> use precomputed value;
                    partial overlap -> recurse both children, combine

FENWICK TREE QUICK REFERENCE
================================
update(i, delta):  for (i; i<=n; i += i&(-i)) tree[i] += delta
prefixSum(i):      for (i; i>0; i -= i&(-i)) sum += tree[i]
rangeSum(l,r):     prefixSum(r) - prefixSum(l-1)
MUST be 1-INDEXED. i & (-i) isolates the LOWEST SET BIT.

DECISION GUIDE
=================
Range SUM query + point update, want minimal code/memory  -> Fenwick Tree
Range MIN/MAX/GCD query                                     -> Segment Tree (Fenwick can't invert these!)
Need RANGE updates (not just point) + range queries         -> Segment Tree + lazy propagation
                                                                (or Fenwick + difference-array trick, sum only)

SYNTHESIS: RANGE UPDATE + RANGE QUERY VIA FENWICK
=====================================================
rangeUpdate(l, r, delta):  fenwick.update(l, delta); fenwick.update(r+1, -delta)
                            [Chapter 3's difference array trick, atop a Fenwick Tree!]
pointQuery(i):              fenwick.prefixSum(i)
```

---

## 23.9 Key Takeaways

1. Segment trees and Fenwick trees close the gap Chapter 3 left open: efficient range queries AND updates together on a changing array.
2. Segment trees reuse Chapter 8's tree concept and Chapter 9's array-index arithmetic; every operation follows a memorable three-case (no/total/partial overlap) decision, O(log n) via unconditional tree height.
3. Fenwick Trees use the `i & (-i)` lowest-set-bit trick (a Chapter 24 preview) and require 1-indexing as a hard correctness requirement, not a style choice.
4. Segment trees generalize to any associative operation and support range updates via lazy propagation; Fenwick Trees are more compact but restricted to invertible operations like sum.
5. Applying Chapter 3's difference-array trick atop a Fenwick Tree (rather than a plain array) is a genuine synthesis unlocking O(log n) range updates and queries together.

---

## 23.10 20 Multiple Choice Questions

1. What capability gap do segment trees and Fenwick trees fill, left open since Chapter 3?
   a) Sorting arrays efficiently
   b) Efficient range queries AND range updates together, on a dynamically changing array
   c) Searching unsorted arrays
   d) Detecting cycles in graphs

2. What earlier chapters' concepts does a segment tree directly combine?
   a) Chapter 4's hashing and Chapter 6's queues
   b) Chapter 8's tree vocabulary and Chapter 9's array-based index arithmetic
   c) Chapter 15's sorting and Chapter 16's binary search
   d) Chapter 5's linked lists and Chapter 7's fast/slow pointers

3. What is the three-case decision made at every segment tree query node?
   a) Sorted, unsorted, partially sorted
   b) No overlap, total overlap, partial overlap
   c) Left child, right child, both children
   d) Empty, full, half-full

4. What is the time complexity of a segment tree range query?
   a) O(n)
   b) O(log n)
   c) O(n log n)
   d) O(1)

5. What is the standard safe array size bound used for a segment tree's underlying array?
   a) n
   b) 2n
   c) 4n
   d) n²

6. What bit-manipulation trick powers the Fenwick Tree's operations?
   a) Left-shifting by 1
   b) i & (-i), isolating the lowest set bit
   c) XOR with a constant
   d) Counting total set bits

7. Why must a Fenwick Tree be 1-indexed rather than 0-indexed?
   a) It's an arbitrary convention with no technical reason
   b) The i & (-i) bit trick depends on excluding index 0's all-zero binary representation
   c) JavaScript arrays cannot start at index 0
   d) It matches array.length conventions

8. What is the time complexity of a Fenwick Tree's update and prefixSum operations?
   a) O(n)
   b) O(log n)
   c) O(1)
   d) O(n log n)

9. What is a key space advantage of Fenwick Trees over segment trees?
   a) Fenwick Trees use O(n) space with a smaller constant factor, versus segment trees' O(4n)
   b) Fenwick Trees use O(1) space always
   c) There is no space difference
   d) Segment trees always use less space

10. What types of operations can segment trees support that Fenwick Trees generally cannot?
    a) Sum only
    b) Non-invertible operations like min, max, and GCD
    c) Addition only
    d) Sorting operations

11. Why can't the standard Fenwick Tree range-query trick (prefixSum(r) - prefixSum(l-1)) work for min/max queries?
    a) It actually does work fine for min/max
    b) Min/max have no inverse operation, so "subtracting" a prefix min/max doesn't make sense
    c) JavaScript doesn't support Math.min/Math.max
    d) Min/max queries require a different indexing scheme entirely

12. What advanced technique allows segment trees to support efficient RANGE updates (not just point updates)?
    a) Path compression
    b) Lazy propagation
    c) Union by rank
    d) Rolling hash

13. What earlier chapter's technique is combined with a Fenwick Tree to achieve both range updates AND range queries?
    a) Chapter 9's heap building
    b) Chapter 3's difference array trick ("add at start, subtract at end+1")
    c) Chapter 15's merge sort
    d) Chapter 11's BFS

14. What is the resulting complexity of range updates and point/prefix queries when combining a difference array with a Fenwick Tree?
    a) O(n) for both
    b) O(log n) for both
    c) O(1) for updates, O(n) for queries
    d) O(n log n) for both

15. What does the Segment Tree's `update` operation typically do, compared to the Fenwick Tree's `update`?
    a) They are identical in semantics
    b) Segment Tree's update SETS an absolute new value; Fenwick Tree's update ADDS a delta
    c) Fenwick Tree's update sets an absolute value; Segment Tree's adds a delta
    d) Neither supports updates at all

16. What is the index arithmetic used for segment tree children, and what chapter does it directly echo?
    a) i+1, i-1; echoes Chapter 5 (linked lists)
    b) 2*node+1, 2*node+2; echoes Chapter 9 (heaps)
    c) node/2; echoes Chapter 16 (binary search)
    d) node*node; echoes Chapter 15 (sorting)

17. What guarantees a segment tree's O(log n) operation complexity, similar to a heap's guarantee?
    a) The tree is always sorted
    b) The tree's height is unconditionally bounded by construction, with no degeneration risk (unlike a plain BST)
    c) It uses a hash table internally
    d) The array must be pre-sorted

18. What must you verify at the API boundary when using a Fenwick Tree in a problem with 0-indexed array input?
    a) Nothing; Fenwick Trees handle 0-indexing automatically
    b) Explicitly convert 0-indexed positions to 1-indexed Fenwick Tree positions
    c) Reverse the array first
    d) Use a segment tree instead, always

19. When would you choose a segment tree over a Fenwick Tree, according to this chapter's decision framework?
    a) Never; Fenwick Trees are always better
    b) When you need range min/max/GCD queries, or need to support efficient range updates alongside range queries
    c) Only when the array is very small
    d) Only for string data

20. When would you choose a Fenwick Tree over a segment tree?
    a) Never; segment trees are always better
    b) When you only need range SUM queries with point updates, wanting minimal code and memory
    c) Only when the array contains negative numbers
    d) Only for 2D data

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-c, 6-b, 7-b, 8-b, 9-a, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-b, 19-b, 20-b

---

## 23.11 20 Coding Problems

**Easy**

1. Implement `SegmentTree`'s `build` and `query` from memory (section 23.1), and verify against the book's dry run.
2. Implement `SegmentTree`'s `update` from memory (section 23.1.3).
3. Implement `FenwickTree`'s `update` and `prefixSum` from memory (section 23.2.1), and verify the 1-indexing convention explicitly in a test.
4. Write a function to convert a 0-indexed array-based problem into correct calls against a 1-indexed Fenwick Tree, handling the index conversion explicitly.
5. Given a small array, build both a segment tree and a Fenwick tree for range-sum queries, and verify they produce identical query results across several test ranges.

**Medium**

6. Extend `SegmentTree` to support range MINIMUM queries instead of range sum (change the combine operation from `+` to `Math.min`), and verify it correctly handles a case where a Fenwick-tree-based approach would fail (min is non-invertible).
7. Implement `RangeUpdateFenwickTree` from memory (section 23.3), verifying both `rangeUpdate` and `pointQuery` work correctly together.
8. Given an array representing daily stock prices, use a segment tree to efficiently answer "what was the maximum price between day A and day B" for many queries, with occasional price corrections (updates).
9. Implement a segment tree supporting range GCD queries (combine operation: greatest common divisor of the two children).
10. Given a large array of numbers with frequent point updates and range-sum queries interleaved, benchmark a Fenwick-tree-based solution against a naive O(n)-per-query recomputation approach.

**Hard**

11. Implement lazy propagation for a segment tree, supporting efficient RANGE updates (add a delta to every element in a range) alongside range-sum queries, both in O(log n).
12. Given a large dataset of e-commerce order counts per hour, use a Fenwick Tree to efficiently answer "how many total orders occurred between hour A and hour B" with frequent updates as new orders arrive.
13. Implement a 2D Fenwick Tree (Binary Indexed Tree) supporting point updates and rectangular range-sum queries on a matrix, extending the 1D bit-trick logic to two dimensions.
14. Given a competitive programming "inversion count" problem (count pairs i<j where arr[i]>arr[j]), use a Fenwick Tree to solve it efficiently in O(n log n), rather than the naive O(n²) approach.
15. Implement a segment tree that supports both range-sum queries AND finding the k-th smallest element efficiently (a "merge sort tree" or "segment tree with sorted vectors" variant), discussing the added complexity in comments.

**Interview Level**

16. **(Google-level)** Given a real-time analytics dashboard requiring range-sum queries over time-series data with frequent updates (new data points arriving continuously), design and implement a Fenwick-Tree-based solution, discussing the trade-offs versus recomputing from scratch.
17. **(Amazon-level)** Given a warehouse inventory system needing efficient range-sum queries (total inventory across a range of SKU IDs) with frequent stock-level updates, implement a Fenwick Tree solution and discuss why it beats a naive prefix-sum-array approach (Chapter 3) for this dynamically-changing use case.
18. **(Microsoft-level)** Given a document editing system needing to track "character count per paragraph range" with frequent insertions/deletions (updates) and range queries (e.g., "total characters in paragraphs 5 through 10"), design a segment-tree-based solution.
19. **(Meta-level)** Given a social media engagement tracker needing "total likes in the last N posts" with frequent new posts (updates) and range queries, implement a Fenwick Tree solution, and discuss the trade-off versus a simpler sliding-window approach (Chapter 3) if updates were less frequent.
20. **(Netflix-level)** Design a video streaming analytics system tracking "total watch-time across a range of content IDs" with frequent updates as viewers watch content, using a segment tree or Fenwick Tree (justify your choice), and discuss how you'd extend it to support range MAXIMUM queries (e.g., "most-watched content ID in this range") if that requirement were added later.

---

## 23.12 5 Interview Questions

1. "Implement a segment tree supporting range-sum queries and point updates, both in O(log n)." (Tests full implementation and the three-case query logic.)
2. "Why does a Fenwick Tree need to be 1-indexed?" (Tests understanding of the bit-trick's dependency on excluding index 0.)
3. "When would you choose a Fenwick Tree over a segment tree, or vice versa?" (Tests the decisive comparison framework — operation type and update requirements.)
4. "How would you support efficient RANGE updates (not just point updates) on a Fenwick Tree or segment tree?" (Tests knowledge of the difference-array-plus-Fenwick synthesis, or lazy propagation conceptually.)
5. "Why can't you use the standard Fenwick Tree range-query trick for range minimum queries?" (Tests understanding of the invertibility requirement.)

---

## 23.13 3 Real Projects

1. **Complete Range Query Library**: Implement `SegmentTree` (sum, min, and max variants) and `FenwickTree` (including the range-update extension) in a single library, with a self-check script verifying all variants against a naive O(n)-per-query baseline across randomized test sequences of interleaved updates and queries.
2. **Real-Time Analytics Dashboard Simulator**: Build a Node.js tool simulating a time-series analytics dashboard (e.g., hourly order counts) using a Fenwick Tree, supporting live updates and range-sum queries, benchmarked against a naive recomputation-from-scratch approach to empirically demonstrate the O(log n) advantage.
3. **Inversion Counter**: Build the Fenwick-Tree-based inversion count solution (coding problem #14) as a standalone tool, benchmarked against the naive O(n²) approach at increasing array sizes, to empirically demonstrate the dramatic complexity improvement.

---

## 23.14 Further Reading

- Peter Fenwick's original 1994 paper introducing the Binary Indexed Tree structure that bears his name.
- Search "segment tree lazy propagation tutorial" for a full, detailed treatment of the advanced range-update extension only conceptually introduced in section 23.3.
- Search "2D Fenwick Tree" and "2D Segment Tree" for extensions to matrix-shaped data, directly relevant to coding problem #13.
- Competitive Programmer's Handbook (Antti Laaksonen) or similar competitive programming references, for extensive additional segment tree and Fenwick tree problem sets and variants.

---

*End of Chapter 23. Next: Chapter 24 will cover Bit Manipulation and Bitmask Dynamic Programming — building genuine fluency with bitwise operators, the XOR trick family, and using integers as compact sets to unlock an entirely new category of DP state representation for problems involving small, fixed-size collections.*

**Say "Continue to the next chapter" when ready.**
