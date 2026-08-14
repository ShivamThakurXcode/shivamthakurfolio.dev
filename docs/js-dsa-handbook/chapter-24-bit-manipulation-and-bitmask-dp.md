# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 24: Bit Manipulation and Bitmask Dynamic Programming

---

## 24.0 Numbers as Compact Sets: The Idea That Unlocks This Chapter

Chapter 23 previewed the `i & (-i)` bit trick powering Fenwick Trees. This chapter builds full, genuine fluency with bitwise operations — and introduces the single idea that makes them so powerful for algorithms: **a single integer can represent an entire set of small items, with each bit acting as a "yes/no" flag for one item's membership.** A 32-bit integer can represent the presence/absence of up to 32 distinct items simultaneously, and — this is the genuinely important part — **operations on that entire set (union, intersection, toggling membership) become single, O(1) machine-level operations**, instead of O(n) loops over an actual `Set` (Chapter 4) or array.

---

## 24.1 Bitwise Operators: The Complete, Precise Reference

### 24.1.1 The Six Operators

```javascript
console.log(5 & 3);   // AND: 0101 & 0011 = 0001 = 1
console.log(5 | 3);   // OR:  0101 | 0011 = 0111 = 7
console.log(5 ^ 3);   // XOR: 0101 ^ 0011 = 0110 = 6
console.log(~5);      // NOT: flips every bit -> -6 (two's complement, explained below)
console.log(5 << 1);  // LEFT SHIFT: 0101 -> 1010 = 10 (multiply by 2)
console.log(5 >> 1);  // RIGHT SHIFT: 0101 -> 0010 = 2 (divide by 2, rounding toward -Infinity)
console.log(-5 >>> 1); // UNSIGNED RIGHT SHIFT: treats -5 as unsigned, shifts in ZEROS from the left
```

### ⚠ Common Mistake / 🔥 Interview Tip: JavaScript's Bitwise Operators Convert to 32-Bit Integers First

This is a genuinely important, JavaScript-specific fact worth knowing cold: **JavaScript numbers are IEEE 754 doubles internally (recall Chapter 1's discussion of `Number.MAX_SAFE_INTEGER`), but every bitwise operator (`&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`) first converts its operands to 32-bit signed integers, performs the operation, then converts the result back to a regular JavaScript number.** This has two real consequences: **(1) bitwise operations silently misbehave for numbers outside the 32-bit signed integer range** (`-2,147,483,648` to `2,147,483,647`) — a number larger than this gets truncated in ways that can surprise you; **(2) `~5` doesn't produce a huge number, because the "flip all bits" operation happens within that fixed 32-bit frame, using two's complement representation, where `~x` is mathematically equivalent to `-x - 1`.**

### 🧠 Memory Trick: `~x === -(x+1)`, Always

```javascript
console.log(~5);  // -6  (== -(5+1))
console.log(~0);  // -1  (== -(0+1))
console.log(~-1); // 0   (== -(-1+1))
```

This identity is worth memorizing directly, since it explains every `~` result instantly without needing to manually flip bits in your head.

### 24.1.2 `>>` vs. `>>>`: The Crucial, Frequently-Tested Distinction

```javascript
console.log(-8 >> 1);  // -4  (SIGNED right shift: preserves the sign bit, fills with 1s for negative numbers)
console.log(-8 >>> 1); // 2147483644  (UNSIGNED right shift: treats -8's bit pattern as if it were a
                        //  large POSITIVE number, fills with 0s regardless of original sign)
```

### 🎯 Interview Pattern

**`>>` (signed/arithmetic right shift)** preserves the number's sign by filling newly-vacated high bits with copies of the sign bit — dividing by 2 (rounding toward negative infinity) even for negative numbers. **`>>>` (unsigned/logical right shift)** always fills newly-vacated high bits with `0`, treating the original bit pattern as an unsigned number regardless of its original sign — which is precisely why `-8 >>> 1` produces a huge positive number rather than `-4`. **This distinction is a favorite, specific interview question**, precisely because `>>>` has no direct equivalent in many other mainstream languages, making it a genuinely JavaScript-specific piece of knowledge worth demonstrating unprompted.

---

## 24.2 The Bit-Trick Toolkit: A Reference You'll Use Constantly

### 24.2.1 Check if the `i`-th Bit Is Set

```javascript
function isBitSet(num, i) {
  return (num & (1 << i)) !== 0;
}
```

### 24.2.2 Set the `i`-th Bit

```javascript
function setBit(num, i) {
  return num | (1 << i);
}
```

### 24.2.3 Clear (Unset) the `i`-th Bit

```javascript
function clearBit(num, i) {
  return num & ~(1 << i);
}
```

### 24.2.4 Toggle the `i`-th Bit

```javascript
function toggleBit(num, i) {
  return num ^ (1 << i);
}
```

### 🧠 Memory Trick: XOR as a Toggle Switch

**XOR (`^`) with `1` flips a bit; XOR with `0` leaves it unchanged.** This is the entire mechanism behind "toggle" — `num ^ (1 << i)` XORs a `1` at exactly position `i` (and `0` everywhere else, from the shifted `1`), flipping only that one bit and leaving every other bit untouched.

### 24.2.5 Check if a Number Is a Power of Two

```javascript
function isPowerOfTwo(num) {
  return num > 0 && (num & (num - 1)) === 0;
}
```

### 🧮 Mathematical Explanation: Why `num & (num - 1)` Clears the Lowest Set Bit

This is worth understanding rigorously, since `num & (num - 1)` is one of the most reused bit tricks in this entire chapter. **Subtracting 1 from any number flips every bit from the rightmost set bit down to (and including) that bit itself** (e.g., `1100 - 1 = 1011`: the lowest set bit at position 2 becomes 0, and every bit below it, previously all 0, becomes 1). **ANDing the original number with this result cancels out that lowest set bit entirely, while leaving every higher bit unchanged** (since those higher bits are identical in both `num` and `num-1`). A power of two has **exactly one set bit** — so clearing its only set bit produces `0`, which is the exact condition `isPowerOfTwo` checks.

### 24.2.6 Count the Number of Set Bits (Popcount)

```javascript
function countSetBits(num) {
  let count = 0;
  while (num !== 0) {
    num &= (num - 1); // clears the LOWEST set bit each iteration — the exact trick from 24.2.5!
    count++;
  }
  return count;
}

console.log(countSetBits(13)); // 13 = 1101 -> 3 set bits
```

### 🎯 Interview Pattern: Brian Kernighan's Algorithm

This specific technique — repeatedly clearing the lowest set bit via `num & (num-1)` until `num` becomes `0`, counting iterations — is famous enough to have a name (**Brian Kernighan's algorithm**), and it's worth knowing by name as well as by mechanism. **Its complexity is O(number of set bits), not O(total bit width)** — a genuinely important, easy-to-miss distinction from a naive "check every one of the 32 bits" approach, which is always O(32) = O(1) but does strictly more work than necessary for numbers with few set bits.

### 24.2.7 The XOR Trick Family: Finding "The One That's Different"

**Core XOR properties, worth memorizing as a group:** `x ^ x = 0` (anything XORed with itself cancels to zero), `x ^ 0 = x` (XOR with zero is a no-op), and XOR is both commutative and associative (order and grouping don't matter).

```javascript
function findSingleNumber(nums) {
  // Every number appears TWICE except for one — find the one that appears ONCE.
  let result = 0;
  for (const num of nums) {
    result ^= num; // every PAIR cancels to 0 (x^x=0); whatever's left is the unpaired number!
  }
  return result;
}

console.log(findSingleNumber([4, 1, 2, 1, 2])); // 4
```

### Dry Run

```
nums = [4, 1, 2, 1, 2]
result = 0

result ^= 4 -> result = 4       (0100)
result ^= 1 -> result = 5       (0101)
result ^= 2 -> result = 7       (0111)
result ^= 1 -> result = 6       (0110)  <- the two 1's have now cancelled out (4^1^1 = 4)
result ^= 2 -> result = 4       (0100)  <- the two 2's have now cancelled out too!

Final result = 4 ✓ (the single, unpaired number)
```

### 🔥 Interview Tip

This is a beautiful, extremely elegant algorithm, and specifically worth having ready: it solves "find the single non-duplicated element" in **O(n) time and O(1) space** — beating a `Set`-based approach (Chapter 4, O(n) time but O(n) space) purely through XOR's cancellation property. It's a favorite interview question precisely because the O(1)-space solution is so much more elegant than the "obvious" hash-based approach, and recognizing "everything appears twice except one" as an XOR-cancellation signal is a genuine, transferable pattern-recognition skill.

---

## 24.3 Bitmask Representation of Sets: The Foundation for Bitmask DP

### 🎯 The Core Translation Table

**A set of `n` items (where `n` is small, typically ≤ 20-25 for practical DP purposes) can be represented as an integer from `0` to `2^n - 1`, where bit `i` being set means "item `i` is included in this set."**

```
Set {0, 2, 3} out of items {0, 1, 2, 3} -> bitmask 1101 (binary) = 13 (decimal)
                                             ^  ^ ^
                                        item 3  2 0 are set; item 1 is not

Set operations, as bitwise operations:
Union:        maskA | maskB
Intersection: maskA & maskB
Add item i:   mask | (1 << i)
Remove item i: mask & ~(1 << i)
Is item i in the set?: (mask & (1 << i)) !== 0
Is set A a SUBSET of set B?: (maskA & maskB) === maskA
```

### 🧠 Memory Trick: Iterating All Subsets of a Set

```javascript
function getAllSubsetMasks(fullMask) {
  const subsets = [];
  let subset = fullMask;

  while (true) {
    subsets.push(subset);
    if (subset === 0) break;
    subset = (subset - 1) & fullMask; // the classic "iterate all submasks" trick
  }

  return subsets;
}
```

This `(subset - 1) & fullMask` trick is a genuinely advanced, specialized technique — worth knowing exists (it correctly enumerates every subset of `fullMask` in O(3^n) total across all masks of size `n`, a provably tight bound for this specific enumeration pattern), though full mastery of its derivation is more relevant to competitive programming than typical interviews.

---

## 24.4 Bitmask Dynamic Programming: A New State Dimension

### 🎯 The Core Insight: Using a Bitmask as a DP State, Directly Extending Chapters 18-19

Recall Chapter 18's five-step framework: define the sub-problem, write the recurrence, identify base cases, choose top-down/bottom-up, locate the answer. **Bitmask DP is the exact same framework — the only new idea is that the sub-problem's "position" or "state" is now (at least partly) a bitmask representing which items have been used/visited/included so far**, rather than a single integer index.

### 24.4.1 Worked Example: Traveling Salesman Problem (TSP), Small-Scale

**The problem:** given `n` cities and pairwise distances, find the shortest possible route that visits every city exactly once and returns to the start.

### Applying the Five-Step Framework

1. **Define the sub-problem**: `f(mask, i)` = the minimum cost to visit exactly the set of cities represented by `mask`, ending at city `i`.
2. **Recurrence**: to arrive at city `i` having visited the set `mask`, we must have come from some city `j` (also in `mask`, but with `i` excluded from the "previous" state) via the cheapest such predecessor: **`f(mask, i) = min(f(mask without i, j) + dist(j, i))` for every `j` in `mask` where `j != i`.**
3. **Base case**: `f({start}, start) = 0` (visiting only the starting city, already there, costs nothing).
4. **Bottom-up** (iterating masks in increasing numeric order naturally processes smaller subsets before larger ones that build on them).
5. **Answer location**: `min(f(fullMask, i) + dist(i, start))` across all cities `i` — the cheapest way to have visited everyone and return home.

```javascript
function tsp(dist) {
  const n = dist.length;
  const fullMask = (1 << n) - 1;
  const dp = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));

  dp[1][0] = 0; // mask=1 (binary ...0001) means "only city 0 visited," ending at city 0

  for (let mask = 1; mask <= fullMask; mask++) {
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue; // city i must be IN this mask to be the "ending" city
      if (dp[mask][i] === Infinity) continue; // this state is unreachable — skip

      for (let next = 0; next < n; next++) {
        if (mask & (1 << next)) continue; // `next` must NOT already be visited

        const newMask = mask | (1 << next);
        const newCost = dp[mask][i] + dist[i][next];

        if (newCost < dp[newMask][next]) {
          dp[newMask][next] = newCost;
        }
      }
    }
  }

  let minCost = Infinity;
  for (let i = 1; i < n; i++) {
    if (dp[fullMask][i] !== Infinity) {
      minCost = Math.min(minCost, dp[fullMask][i] + dist[i][0]); // return to the start!
    }
  }

  return minCost;
}
```

### 🧮 Complexity Analysis: Why This Beats Brute Force Dramatically

- **Brute force** (try every permutation of cities, Chapter 17's backtracking): **O(n!)** — for `n=15`, roughly `1.3 trillion` permutations, utterly infeasible.
- **Bitmask DP**: **O(n² · 2ⁿ)** — for `n=15`, roughly `15² × 32,768 ≈ 7.4 million` operations, entirely feasible in well under a second.

### 🎯 Interview Pattern: When Bitmask DP Applies

The signal: **a small, fixed number of items (typically ≤ 20-25, since `2^25` is already around 33 million, pushing the limits of practical time/space) where the DP state fundamentally needs to track "exactly which subset of items has been used/visited so far," not just a count or a position.** TSP, "assign tasks to workers minimizing total cost" (assignment problem), and various "can this set of items be partitioned to satisfy constraint X" problems are the classic signal shapes.

### ⚠ Common Mistake: Applying Bitmask DP to Problems With Too Many Items

**Bitmask DP's `2ⁿ` factor makes it explode rapidly** — `n=20` gives `2^20 ≈ 1 million` masks (usually fine), but `n=30` gives `2^30 ≈ 1 billion` (usually too slow/memory-intensive for typical constraints). **Always sanity-check the problem's stated constraints on `n` before committing to a bitmask DP approach** — if `n` can be in the hundreds or thousands, bitmask DP is the wrong tool entirely, and the problem likely wants a different technique (perhaps Chapters 18-19's simpler DP, or Chapter 20's greedy approach).

### 24.4.2 A Second, Simpler Worked Example: Can We Partition Into Two Equal-Sum Subsets?

We solved this conceptually in Chapter 19's coding problems using subset-sum DP indexed by achievable sums. Here's the bitmask-DP framing for a **small** number of items, useful specifically when you need to track *which specific items* were used, not just whether a sum is achievable:

```javascript
function canPartitionBitmask(nums) {
  const n = nums.length;
  const totalSum = nums.reduce((a, b) => a + b, 0);
  if (totalSum % 2 !== 0) return false;

  const target = totalSum / 2;
  const sumForMask = new Array(1 << n).fill(0);

  for (let mask = 1; mask < (1 << n); mask++) {
    const lowestSetBit = mask & (-mask); // Chapter 23's Fenwick Tree trick, reused here!
    const lowestIndex = Math.log2(lowestSetBit);
    sumForMask[mask] = sumForMask[mask ^ lowestSetBit] + nums[lowestIndex];

    if (sumForMask[mask] === target) return true;
  }

  return false;
}
```

### 🎯 Interview Pattern: The `i & (-i)` Trick Reappears

Notice `mask & (-mask)` here — **the exact same lowest-set-bit-isolation trick from Chapter 23's Fenwick Tree.** This is a genuinely satisfying, concrete demonstration of this book's central philosophy: a specific bit-manipulation technique, once learned deeply in one context (Fenwick Trees), transfers directly and recognizably to a completely different problem domain (bitmask DP subset-sum tracking) — exactly the kind of cross-chapter pattern transfer this entire book has been built to train.

---

## 24.5 Edge Cases and Gotchas Checklist for Bit Manipulation Problems

1. **32-bit signed integer conversion** — always remember bitwise operators truncate to 32 bits internally; verify your numbers stay within `Number.MAX_SAFE_INTEGER`-adjacent-but-still-32-bit-safe ranges for correctness.
2. **`>>` vs. `>>>` confusion** — always double-check which shift you actually need, especially with negative numbers or numbers that might be interpreted as such.
3. **Off-by-one in bit position indexing** — always verify whether "bit 0" means the least significant bit (the overwhelming convention in this chapter) or the most significant, and stay consistent.
4. **Bitmask DP array sizing** — `1 << n` for `n` up to ~25 is fine; verify this doesn't silently overflow or become impractically large for a given problem's actual constraints.
5. **Negative numbers and bitwise operations** — two's complement representation means negative numbers have "all high bits set," which can produce surprising results in bit-counting or bit-position functions if not explicitly handled.
6. **Empty bitmask (`0`) as a valid state** — verify your DP base cases and iteration correctly handle the "no items selected yet" state, typically `mask = 0`, distinctly from an "invalid/unreachable" state.

---

## 24.6 Chapter Summary

This chapter built genuine fluency with bitwise operations, opening with the precise mechanics often glossed over: JavaScript's bitwise operators convert operands to 32-bit signed integers internally, a fact with real consequences for large numbers, and the specifically JavaScript-relevant, frequently-tested distinction between `>>` (signed, sign-preserving) and `>>>` (unsigned, always zero-filling) right shifts. We built a complete bit-trick toolkit — checking, setting, clearing, and toggling individual bits, testing for powers of two via the `num & (num-1)` lowest-set-bit-clearing trick, and Brian Kernighan's algorithm for counting set bits by repeatedly applying that same trick — establishing `num & (num-1)` as a genuinely reusable technique worth recognizing on sight, not a one-off formula.

We covered the XOR trick family, anchored by the memorable core properties `x^x=0` and `x^0=x`, and demonstrated their power directly via the "find the single non-duplicated element" problem — an O(n) time, O(1) space solution that elegantly outperforms a `Set`-based approach (Chapter 4) purely through cancellation, a genuinely beautiful illustration of bit tricks succeeding where hash-based approaches would need extra memory. We then built the chapter's central idea: **an integer can represent an entire small set, turning set operations (union, intersection, membership testing) into single O(1) bitwise operations** — the direct foundation for everything that followed.

This culminated in **Bitmask Dynamic Programming**, which we were careful to frame not as a new technique but as Chapter 18's five-step DP framework with one new twist: **the sub-problem's state now includes a bitmask tracking exactly which items have been used/visited so far**, worked through fully via the Traveling Salesman Problem, where bitmask DP's O(n²·2ⁿ) dramatically beats brute-force permutation's O(n!) — while being explicit that this technique only remains practical for small, fixed `n` (roughly ≤20-25), since `2ⁿ` growth is still exponential, just with a much smaller, more forgiving base than pure permutation counting. We closed with a genuinely satisfying cross-chapter callback: the exact `mask & (-mask)` lowest-set-bit trick powering Chapter 23's Fenwick Tree reappearing, recognizably, inside a bitmask-DP subset-sum tracking solution — concrete proof that a bit-manipulation technique learned deeply in one context transfers directly to a completely different problem domain, exactly the pattern-transfer skill this entire book has been built to cultivate.

---

## 24.7 Revision Notes

- JavaScript's bitwise operators convert operands to 32-bit signed integers internally — a real consequence for large numbers and negative-number behavior.
- `>>` (signed, sign-preserving) versus `>>>` (unsigned, always zero-filling) is a specifically JavaScript-relevant, frequently-tested distinction.
- `num & (num-1)` clears the lowest set bit — the foundation for power-of-two checking and Brian Kernighan's bit-counting algorithm.
- XOR's core properties (`x^x=0`, `x^0=x`) power elegant O(n)-time, O(1)-space solutions like "find the single non-duplicated element," beating hash-based (Chapter 4) alternatives on space.
- An integer can represent an entire small set — union, intersection, and membership testing all become O(1) bitwise operations.
- Bitmask DP extends Chapter 18's five-step framework by making the state include a bitmask of used/visited items — TSP's O(n²·2ⁿ) dramatically beats brute-force O(n!), but remains practical only for small, fixed n (roughly ≤20-25).
- Bit-manipulation techniques transfer directly across contexts — the `mask & (-mask)` trick from Chapter 23's Fenwick Tree reappears recognizably in bitmask-DP subset-sum tracking.

---

## 24.8 Mind Map (ASCII)

```
                    BIT MANIPULATION & BITMASK DP
                                  |
      +------------------+-------+-------+------------------------+
      |                  |               |                        |
  OPERATOR           BIT-TRICK        XOR TRICK               BITMASK DP
  PRECISION           TOOLKIT          FAMILY                       |
      |                  |                |                  Ch.18's 5-step
  JS converts to     isBitSet/setBit/  x^x=0, x^0=x           framework, state
  32-bit signed      clearBit/         (cancellation)         now INCLUDES a
  ints internally    toggleBit             |                  BITMASK of
      |                  |             findSingleNumber:      used/visited items
  >> (signed,        num & (num-1)     O(n) time, O(1)              |
  sign-preserving)   clears LOWEST     space -- beats          TSP: f(mask,i) =
  vs >>> (unsigned,  set bit           Set-based (Ch.4)        min cost ending
  always zero-fill)       |            O(n) space              at i, having
  -- JS-SPECIFIC     isPowerOfTwo,          |                  visited exactly
  frequently tested  Brian Kernighan's  "everything appears    `mask`
                      popcount algo     twice except one"           |
  ~x = -(x+1)                          = XOR signal            O(n^2 * 2^n) beats
  (two's complement)                                           brute-force O(n!)
                                                                 (but only n<=20-25!)
                                                                      |
                                                                mask & (-mask)
                                                                REAPPEARS from
                                                                Ch.23's Fenwick
                                                                Tree -- same trick,
                                                                different domain!
```

---

## 24.9 Cheat Sheet

```
BITWISE OPERATORS
=====================
&   AND           |   OR            ^   XOR           ~   NOT (= -(x+1))
<<  left shift (*2)  >>  signed right shift (/2, sign-preserving)
>>> unsigned right shift (always zero-fills, treats as unsigned)

JS GOTCHA: all bitwise ops convert to 32-bit SIGNED integers first!

BIT TRICK TOOLKIT
=====================
isBitSet(n,i):    (n & (1<<i)) !== 0
setBit(n,i):      n | (1<<i)
clearBit(n,i):    n & ~(1<<i)
toggleBit(n,i):   n ^ (1<<i)
isPowerOfTwo(n):  n > 0 && (n & (n-1)) === 0
countSetBits(n):  while(n){ n &= (n-1); count++ }  [Brian Kernighan's algorithm]
lowest set bit:   n & (-n)  [Ch.23 Fenwick Tree trick, reused everywhere]

XOR PROPERTIES
=================
x ^ x = 0        x ^ 0 = x        commutative & associative (order doesn't matter)
"find the single non-duplicate" -> XOR everything, pairs cancel, answer remains

BITMASK AS A SET
===================
Union:        maskA | maskB
Intersection: maskA & maskB
Add item i:   mask | (1<<i)
Remove item i: mask & ~(1<<i)
Subset check: (maskA & maskB) === maskA

BITMASK DP TEMPLATE
=======================
dp[mask][i] = best value achievable having used exactly the items in `mask`,
              currently "at" or "ending with" item i
Iterate masks 0 to 2^n - 1; for each valid (mask,i), try transitioning to
every unused item `next`: newMask = mask | (1<<next)
ONLY practical for n <= ~20-25 (2^n growth, though far better than n!)
```

---

## 24.10 Key Takeaways

1. JavaScript's bitwise operators convert to 32-bit signed integers internally — know this and the `>>` vs `>>>` distinction cold.
2. `num & (num-1)` clears the lowest set bit — the foundation for power-of-two checks, Brian Kernighan's popcount, and (from Chapter 23) Fenwick Tree indexing.
3. XOR's cancellation property (`x^x=0`) enables elegant O(1)-space solutions that outperform hash-based alternatives for specific "find the odd one out" problem shapes.
4. An integer can represent an entire small set — set operations become single O(1) bitwise operations.
5. Bitmask DP extends the standard DP framework with a bitmask state dimension, making previously-infeasible O(n!) problems tractable at O(n²·2ⁿ) — but only for small, fixed n.

---

## 24.11 20 Multiple Choice Questions

1. What do JavaScript's bitwise operators do to their operands before performing the operation?
   a) Convert them to strings
   b) Convert them to 32-bit signed integers
   c) Convert them to floating-point doubles
   d) Nothing; they operate on the native number type directly

2. What is the difference between `>>` and `>>>` in JavaScript?
   a) There is no difference
   b) `>>` preserves the sign bit when shifting; `>>>` always fills with zeros, treating the value as unsigned
   c) `>>` only works on positive numbers
   d) `>>>` is faster but otherwise identical

3. What does `~x` equal, mathematically?
   a) `x + 1`
   b) `-(x + 1)`
   c) `-x`
   d) `x * -1`

4. What does the expression `num & (num - 1)` do?
   a) Sets the lowest bit
   b) Clears the lowest set bit
   c) Reverses all bits
   d) Doubles the number

5. What algorithm uses `num & (num-1)` repeatedly to count set bits?
   a) Dijkstra's algorithm
   b) Brian Kernighan's algorithm
   c) Kruskal's algorithm
   d) KMP algorithm

6. What is the time complexity of Brian Kernighan's bit-counting algorithm?
   a) O(32), always, regardless of the number
   b) O(number of set bits), which can be less than the total bit width
   c) O(n²)
   d) O(log n)

7. What core XOR property enables the "find the single non-duplicate number" solution?
   a) x ^ 1 = x
   b) x ^ x = 0 (anything XORed with itself cancels to zero)
   c) x ^ 0 = 1
   d) XOR is not commutative

8. What is the time and space complexity of the XOR-based "find the single number" solution?
   a) O(n) time, O(n) space
   b) O(n) time, O(1) space
   c) O(n²) time, O(1) space
   d) O(log n) time, O(log n) space

9. How can an integer represent an entire set of small items?
   a) It cannot; sets require a Set object
   b) Each bit position acts as a yes/no flag for one item's membership
   c) By storing the count of items only
   d) By converting the integer to a string

10. What bitwise operation represents the UNION of two sets represented as bitmasks?
    a) maskA & maskB
    b) maskA | maskB
    c) maskA ^ maskB
    d) ~maskA

11. What bitwise operation represents the INTERSECTION of two sets represented as bitmasks?
    a) maskA | maskB
    b) maskA & maskB
    c) ~maskA
    d) maskA ^ maskB

12. What does bitmask Dynamic Programming add to the standard five-step DP framework from Chapter 18?
    a) A completely different framework with no relation to Chapter 18
    b) The sub-problem's state now includes a bitmask tracking which items have been used/visited
    c) It removes the need for a recurrence relation
    d) It only works with sorted arrays

13. What is the time complexity of the bitmask DP solution to the Traveling Salesman Problem, for n cities?
    a) O(n!)
    b) O(n² * 2^n)
    c) O(n log n)
    d) O(2^n) only, without the n² factor

14. How does bitmask DP's complexity for TSP compare to brute-force permutation checking?
    a) It's always slower
    b) O(n² * 2^n) is dramatically faster than O(n!) for practical n values like 15-20
    c) They are the same complexity
    d) Bitmask DP cannot solve TSP at all

15. What is the practical limit on `n` for bitmask DP to remain feasible?
    a) No limit; it works for any n
    b) Roughly n <= 20-25, since 2^n growth remains exponential
    c) n must be exactly 10
    d) n must be a power of 2

16. What earlier chapter's specific bit trick reappears in the bitmask-DP subset-sum example (section 24.4.2)?
    a) Chapter 15's sorting algorithms
    b) Chapter 23's Fenwick Tree lowest-set-bit trick (mask & (-mask))
    c) Chapter 9's heap building
    d) Chapter 6's stack operations

17. What should you verify before committing to a bitmask DP approach for a new problem?
    a) That the array is sorted
    b) That the number of items (n) is small enough (typically <=20-25) for 2^n to remain feasible
    c) That all values are positive
    d) That the problem involves strings

18. What does `mask & (-mask)` compute?
    a) The total number of set bits
    b) The lowest set bit of mask, isolated
    c) The highest set bit of mask
    d) Whether mask is zero

19. Why is bit manipulation's O(1) set-operation performance an advantage over a Set object (Chapter 4) for small, fixed-size collections?
    a) Set objects cannot store numbers
    b) Bitwise operations on integers are single machine-level operations, versus a Set's hash-based overhead per operation
    c) Sets are always incorrect for this use case
    d) There is no actual advantage

20. What is a genuine risk of misapplying bitmask DP to a problem with too many items?
    a) The code will not compile
    b) 2^n can become impractically large (e.g., n=30 gives over 1 billion masks), making the approach infeasible
    c) JavaScript cannot represent bitmasks at all
    d) The recurrence relation becomes undefined

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-b, 19-b, 20-b

---

## 24.12 20 Coding Problems

**Easy**

1. Implement `isBitSet`, `setBit`, `clearBit`, and `toggleBit` from memory (section 24.2).
2. Implement `isPowerOfTwo` from memory (section 24.2.5), and test it against a range of numbers including edge cases (0, 1, negative numbers).
3. Implement `countSetBits` (Brian Kernighan's algorithm) from memory (section 24.2.6).
4. Implement `findSingleNumber` from memory (section 24.3), and verify it works correctly on an array where the "single" number is negative.
5. Write a function to reverse the bits of a 32-bit integer.

**Medium**

6. Given an array where every number appears three times except one, find the single number that appears only once (a trickier variant of XOR-based single-number finding, requiring bit-counting per position instead of simple XOR).
7. Given two integers, find the number of bits you'd need to flip to convert one into the other (the "Hamming distance").
8. Implement a function to generate all subsets of a set using bitmask iteration (0 to 2^n - 1), rather than Chapter 17's recursive backtracking approach — compare the two approaches in a comment.
9. Given a small set of items with weights and values, implement bitmask DP to solve a variant of the 0/1 Knapsack problem (Chapter 19) where you specifically need to know WHICH items were selected, not just the total value.
10. Implement the `getAllSubsetMasks` function from memory (section 24.3), and verify it correctly enumerates every subset of a given bitmask.

**Hard**

11. Implement the full TSP bitmask DP solution (`tsp` function) from memory (section 24.4.1), and verify it against a brute-force permutation-based solution (Chapter 17) on a small (4-5 city) test case.
12. Given a list of tasks each requiring a specific subset of skills, and a list of workers each possessing a specific subset of skills, use bitmask DP to determine the minimum number of workers needed to cover all required skills across all tasks.
13. Implement "Partition to K Equal Sum Subsets" using bitmask DP, determining if an array can be partitioned into k subsets each summing to the same target value.
14. Given a small graph (n <= 20 vertices), use bitmask DP to solve the "Hamiltonian Path" problem: does a path exist that visits every vertex exactly once?
15. Implement a bitmask-DP solution to the "Assignment Problem": given n workers and n tasks with costs for each worker-task pairing, find the minimum-cost complete assignment (each worker to exactly one task).

**Interview Level**

16. **(Google-level)** Given a small set of servers (n <= 20) each with specific capability flags (represented as bitmasks), design a system to efficiently find the minimum number of servers needed to cover a required set of capabilities, using bitmask DP.
17. **(Amazon-level)** Given a small delivery route optimization problem (n <= 15 delivery stops), implement the TSP bitmask DP solution to find the optimal route, and discuss in comments why this wouldn't scale to hundreds of stops (connecting back to the n<=20-25 practical limit).
18. **(Microsoft-level)** Given a feature flag system where each user's enabled features are represented as a bitmask, implement efficient bitwise operations to determine feature overlap between user cohorts, feature adoption rates, and cohort intersection sizes.
19. **(Meta-level)** Given a small set of content categories (n <= 20) and a user's viewing history represented as a bitmask, use bitmask DP to determine the minimum number of "recommendation sessions" needed to expose the user to all categories, given constraints on categories per session.
20. **(Netflix-level)** Design an A/B testing feature-flag combination tracker, using bitmasks to represent which experimental features are active for a given user session, and implement efficient bitwise queries for "how many users have EXACTLY this combination of features enabled" and "how many users have AT LEAST this subset of features enabled" (a subset-check query).

---

## 24.13 5 Interview Questions

1. "What's the difference between `>>` and `>>>` in JavaScript, and when would each matter?" (Tests specific, JavaScript-relevant bitwise knowledge.)
2. "How would you count the number of set bits in an integer efficiently?" (Tests Brian Kernighan's algorithm and the underlying `num & (num-1)` trick.)
3. "Given an array where every element appears twice except one, find the unique element in O(1) space." (Tests the XOR cancellation trick and its space advantage over hashing.)
4. "How would you represent a small set of items as an integer, and what operations become possible?" (Tests bitmask-as-set fluency.)
5. "How would you solve the Traveling Salesman Problem for a small number of cities more efficiently than brute force?" (Tests bitmask DP and the O(n²·2ⁿ) vs O(n!) comparison.)

---

## 24.14 3 Real Projects

1. **Complete Bit Manipulation Toolkit**: Implement every bit trick from this chapter (bit checking/setting/clearing/toggling, power-of-two check, Brian Kernighan's popcount, XOR single-number finder) in a single library, with a self-check script verifying correctness across randomized and edge-case (0, negative, `Number.MAX_SAFE_INTEGER`-adjacent) inputs.
2. **TSP Solver with Benchmark**: Build the full bitmask-DP TSP solution and benchmark it against a brute-force permutation-based solution (Chapter 17) at increasing city counts, empirically demonstrating the point at which brute force becomes infeasible while bitmask DP remains practical.
3. **Feature Flag Bitmask Manager**: Build a small module representing user feature-flag combinations as bitmasks, supporting efficient union/intersection/subset queries across large numbers of users, and benchmark it against an equivalent `Set`-based (Chapter 4) implementation to empirically demonstrate the performance advantage for small, fixed-size flag collections.

---

## 24.15 Further Reading

- Henry S. Warren Jr., *Hacker's Delight* — the definitive, comprehensive reference on bit manipulation tricks, covering dozens of techniques beyond this chapter's core selection.
- Search "Brian Kernighan bit counting trick" for the algorithm's origin and additional variants.
- Search "bitmask dynamic programming competitive programming" for extensive additional problem sets built around the technique introduced in section 24.4.
- LeetCode's "Bit Manipulation" and "Bitmask" problem tags, for extensive additional practice directly extending this chapter's techniques.

---

*End of Chapter 24. Next: Chapter 25 will cover Mathematics for Programmers — number theory (GCD/LCM, primality testing, modular arithmetic), combinatorics (permutations, combinations, and their efficient computation), and an introduction to game theory (Nim and the Sprague-Grundy theorem), rounding out the mathematical foundations that many advanced algorithms in this book have quietly relied upon.*

**Say "Continue to the next chapter" when ready.**
