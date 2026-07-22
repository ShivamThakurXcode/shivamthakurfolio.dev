# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 16: The Binary Search Patterns Masterclass

---

## 16.0 Beyond "Find a Value in a Sorted Array"

Chapter 1 introduced binary search as the phone-book-halving strategy — O(log n) instead of O(n). If that were the whole story, it wouldn't deserve a masterclass chapter. The real power of binary search, and the reason it's one of the most-tested topics in technical interviews, is that **it applies to any problem with a monotonic ("if X works, does anything more/less extreme also work?") structure — not just literal sorted arrays.** This chapter builds the generalized mental model: **binary search on the answer**, not just binary search on an array.

---

## 16.1 The Precise Mechanics: Getting the Boundaries Right

Before generalizing, let's nail the implementation details that cause the most bugs in even the "basic" version.

```javascript
function binarySearch(sortedArr, target) {
  let left = 0;
  let right = sortedArr.length - 1;

  while (left <= right) {                       // NOTE: <=, not <
    const mid = left + Math.floor((right - left) / 2); // NOTE: avoids overflow (see below)

    if (sortedArr[mid] === target) {
      return mid;
    } else if (sortedArr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1; // not found
}
```

### ⚠ Common Mistake #1: `left <= right` vs. `left < right`

Using `left < right` instead of `left <= right` silently skips checking the case where `left === right` (a single remaining candidate) — a classic off-by-one bug that causes valid targets at the very boundary to be missed. **The loop must continue as long as there's at least one element left to check**, which means the condition must be `left <= right`, not strictly less than.

### ⚠ Common Mistake #2: `mid = (left + right) / 2` — The Integer Overflow Trap

```javascript
const mid = Math.floor((left + right) / 2); // WORKS in JS for reasonable array sizes, but...
const mid = left + Math.floor((right - left) / 2); // ALWAYS SAFE, in every language
```

### 🔥 Interview Tip: A Piece of Universal, Cross-Language Trivia

In languages with fixed-width integers (Java, C++), `left + right` can **overflow** the maximum integer value for sufficiently large arrays, silently wrapping around to a negative number and corrupting the search entirely. JavaScript's numbers are IEEE 754 doubles, which can safely represent integers up to `2^53 - 1` (`Number.MAX_SAFE_INTEGER`) without this specific overflow behavior at any array size you'd realistically encounter — **but stating the `left + Math.floor((right-left)/2)` formula anyway is a strong, specific, cross-language-aware habit to demonstrate**, since it's correct and safe universally, and shows you understand the *reason* behind the convention rather than just copying a "safer-looking" formula without knowing why.

### 📌 Quick Revision: The Core Binary Search Template

```
left = 0, right = n - 1
while left <= right:
    mid = left + floor((right - left) / 2)
    if arr[mid] == target: return mid
    if arr[mid] < target: left = mid + 1   (target must be to the RIGHT)
    else: right = mid - 1                   (target must be to the LEFT)
return NOT FOUND
```

---

## 16.2 Finding Boundaries: First and Last Occurrence

**The problem:** given a sorted array with duplicate values, find the **first** (or **last**) index of a target value — not just *any* matching index.

### ⚠ Common Mistake: The Basic Template Finds an Arbitrary Match, Not a Specific Boundary

If `sortedArr = [1, 2, 2, 2, 3]` and `target = 2`, the basic binary search from section 16.1 might return index 1, 2, or 3 depending on exact mid-point arithmetic — **it makes no promise about which occurrence you get.** Finding a *specific* boundary (first or last) requires a genuinely different loop structure: **don't stop immediately upon finding a match — keep searching in the direction of the boundary you want, recording the best candidate found so far.**

```javascript
function findFirstOccurrence(sortedArr, target) {
  let left = 0;
  let right = sortedArr.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);

    if (sortedArr[mid] === target) {
      result = mid;           // record this as a candidate...
      right = mid - 1;        // ...but keep searching LEFT for an even earlier occurrence!
    } else if (sortedArr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}

function findLastOccurrence(sortedArr, target) {
  let left = 0;
  let right = sortedArr.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);

    if (sortedArr[mid] === target) {
      result = mid;           // record this as a candidate...
      left = mid + 1;         // ...but keep searching RIGHT for an even later occurrence!
    } else if (sortedArr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}
```

### Dry Run: `findFirstOccurrence([1, 2, 2, 2, 3], 2)`

```
left=0, right=4

mid=2, arr[2]=2 === target! result=2. Keep searching LEFT: right=1

left=0, right=1
mid=0, arr[0]=1 < 2 -> left=1

left=1, right=1
mid=1, arr[1]=2 === target! result=1 (UPDATED — this is an earlier occurrence!). right=0

left=1, right=0 -> loop condition left<=right fails -> STOP

Final result = 1 (the FIRST occurrence of 2, at index 1) ✓
```

### 🧠 Memory Trick: "Find It, Then Keep Pushing in the Direction You Want"

The core insight distinguishing boundary-finding from basic search: **treat a match as a "maybe, but let's see if there's a better one" signal, not a "done" signal.** You never stop early on a match — you record it and continue narrowing in the specific direction (left for "first," right for "last") that could still yield an improvement.

### 🎯 Interview Pattern

This exact template — **"binary search that doesn't stop on a match, but records it and continues narrowing toward a boundary"** — is the foundation for an enormous family of interview problems: "find the first element greater than or equal to X" (lower bound), "find the last element less than or equal to X" (upper bound), and "count occurrences of X" (last occurrence minus first occurrence, plus one).

---

## 16.3 Binary Search on a Rotated Sorted Array

**The problem:** given a sorted array that's been "rotated" at some unknown pivot (e.g., `[4,5,6,7,0,1,2]`, originally `[0,1,2,4,5,6,7]` rotated), find a target value in O(log n) time.

### 🧠 Memory Trick: "At Least One Half Is Always Properly Sorted"

The key insight that makes this solvable in O(log n) rather than falling back to O(n): **no matter where you split a rotated sorted array, at least one of the two halves is guaranteed to be a normal, properly ordered sorted sub-array.** You can always determine *which* half is properly sorted with a single comparison (`arr[left] <= arr[mid]`), and then check whether the target falls within that sorted half's range — if it does, recurse there; if it doesn't, the target must be in the *other* (also eventually provably sorted, at a deeper level) half.

```javascript
function searchRotated(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);

    if (arr[mid] === target) return mid;

    if (arr[left] <= arr[mid]) {
      // LEFT half [left..mid] is properly sorted
      if (arr[left] <= target && target < arr[mid]) {
        right = mid - 1; // target is within the sorted left half's range
      } else {
        left = mid + 1;  // target must be in the right half
      }
    } else {
      // RIGHT half [mid..right] is properly sorted
      if (arr[mid] < target && target <= arr[right]) {
        left = mid + 1;  // target is within the sorted right half's range
      } else {
        right = mid - 1; // target must be in the left half
      }
    }
  }

  return -1;
}
```

### Dry Run: `searchRotated([4,5,6,7,0,1,2], 0)`

```
arr = [4,5,6,7,0,1,2], target=0
left=0, right=6

mid=3, arr[3]=7. Not target.
Is arr[left]=4 <= arr[mid]=7? YES -> LEFT half [4,5,6,7] is sorted.
Is target(0) within [4,7)? NO (0 < 4) -> target must be in the RIGHT half. left=4

left=4, right=6
mid=5, arr[5]=1. Not target.
Is arr[left]=0 <= arr[mid]=1? YES -> LEFT half [0,1] is sorted.
Is target(0) within [0,1)? YES (0 <= 0 < 1) -> search there. right=4

left=4, right=4
mid=4, arr[4]=0. MATCH! return 4.

Result: 4 (arr[4] IS 0) ✓
```

### 🎯 Interview Pattern

Recognizing "rotated sorted array" problems: the signal is a sorted array with a single "break point" where the ordering resets. **The core technique — determine which half is properly sorted, then check if the target falls within that half's range — generalizes to a whole family of rotated-array problems** (finding the minimum element, finding the rotation count, searching with duplicates present, all included in this chapter's coding problems).

---

## 16.4 Binary Search on the Answer: The Generalization That Changes Everything

This is the single most important concept in this chapter, and the reason binary search deserves masterclass treatment rather than being folded entirely into Chapter 1.

### 🎯 The Core Insight

**Definition:** "Binary search on the answer" applies binary search not to a literal array, but to the **space of possible answers** to a problem, whenever that answer space has a monotonic property: if a candidate answer `X` works (satisfies some condition), then every answer more extreme in one direction (e.g., every value ≥ X, or every value ≤ X) also works — or, symmetrically, fails.

### Real-Life Analogy: Finding Your Maximum Squat Weight at the Gym

Imagine you don't know your one-rep-max squat weight, but you know this: **if you can successfully squat 200 lbs, you can *definitely* also squat 150 lbs, 100 lbs, and so on (anything lighter).** And if you *fail* to squat 250 lbs, you'll definitely also fail at 300 lbs, 350 lbs (anything heavier). This "success at X implies success at everything easier; failure at X implies failure at everything harder" property is **exactly** the monotonic structure binary search needs — and you don't need a literal sorted array of weights to exploit it. You can binary search directly over the *range of possible weights* (say, 0 to 500 lbs), testing "can I lift this much?" at each midpoint, exactly like testing `arr[mid]` in a normal array-based binary search.

### 🧠 Memory Trick: "Can I Check `X` Cheaply, and Is Checking Monotonic?"

Whenever you face an optimization problem ("find the minimum/maximum value such that some condition holds"), ask two questions: **(1) Can I write a fast function `canAchieve(X)` that checks whether a specific candidate value `X` satisfies the problem's requirement? (2) Is the truth of `canAchieve(X)` monotonic — does it flip from false to true (or true to false) exactly once as X increases?** If both answers are yes, you can binary search over the range of possible `X` values, calling `canAchieve(mid)` instead of comparing `arr[mid]` — using the exact same halving logic, just applied to a conceptual range instead of a literal array.

### 16.4.1 Worked Example: Minimum Capacity to Ship Packages Within D Days

**The problem:** given an array of package weights (in order, must be shipped in that order) and a number of days `D`, find the **minimum ship capacity** such that all packages can be shipped within `D` days (each day, load as many consecutive packages as fit without exceeding the capacity).

```javascript
function shipWithinDays(weights, days) {
  function daysNeeded(capacity) {
    let daysUsed = 1;
    let currentLoad = 0;

    for (const weight of weights) {
      if (currentLoad + weight > capacity) {
        daysUsed++;           // start a new day
        currentLoad = 0;
      }
      currentLoad += weight;
    }

    return daysUsed;
  }

  let left = Math.max(...weights);  // minimum POSSIBLE capacity: must fit the heaviest single package
  let right = weights.reduce((sum, w) => sum + w, 0); // maximum conceivable capacity: ship everything in 1 day

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);

    if (daysNeeded(mid) <= days) {
      right = mid;   // capacity `mid` WORKS (needs <= `days` days) — try to find something even smaller
    } else {
      left = mid + 1; // capacity `mid` FAILS (needs too many days) — need MORE capacity
    }
  }

  return left; // the smallest capacity that still works
}

console.log(shipWithinDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)); // 15
```

### 🧮 Why This Is Monotonic (The Justification You Must State)

**"If capacity `X` allows shipping within `D` days, then any capacity greater than `X` also allows shipping within `D` days (or fewer) — because a larger ship can only fit MORE packages per day, never fewer, for the same loading strategy."** This monotonic guarantee — "success at X implies success at everything larger" — is *exactly* the squat-weight analogy, and it's precisely what licenses binary searching over the capacity range instead of testing every single possible capacity value one by one (which would be a brute-force O(maxWeight · n) approach).

### Dry Run (Abbreviated)

```
weights = [1,2,3,4,5,6,7,8,9,10], days = 5
left = max(weights) = 10
right = sum(weights) = 55

mid = 10 + floor((55-10)/2) = 32. daysNeeded(32)?
  Load: 1+2+3+4+5+6+7 = 28 (adding 8 would exceed 32) -> day 1 done, 7 packages shipped
  Load: 8+9+10 = 27 -> day 2 done
  daysNeeded = 2. Is 2 <= 5? YES -> capacity 32 WORKS. Try smaller: right=32

... (binary search continues narrowing) ...

Eventually converges to left=right=15, the MINIMUM capacity satisfying the 5-day constraint.
```

### 🔥 Interview Tip: The Signal Phrases for "Binary Search on the Answer"

Train your instincts to recognize these phrasings: **"find the minimum/maximum X such that...", "find the smallest/largest value satisfying...", "minimize the maximum..." (or "maximize the minimum...")**. Whenever a problem asks you to optimize a single numeric quantity subject to some checkable constraint, and you can articulate *why* the constraint check is monotonic in that quantity, binary search on the answer is very likely the intended, optimal approach — often turning an O(n · maxValue) brute-force scan into an O(n log(maxValue)) solution.

### 16.4.2 Worked Example: Koko Eating Bananas (A Second, Simpler Illustration)

**The problem:** Koko has piles of bananas and `h` hours to eat them all; she eats at a constant speed of `k` bananas per hour, and if a pile has fewer than `k` bananas, she still spends a full hour on it (finishing early on that pile). Find the **minimum** integer eating speed `k` such that she finishes all piles within `h` hours.

```javascript
function minEatingSpeed(piles, h) {
  function hoursNeeded(speed) {
    return piles.reduce((total, pile) => total + Math.ceil(pile / speed), 0);
  }

  let left = 1;                          // slowest conceivable speed
  let right = Math.max(...piles);        // fastest speed that's ever USEFUL (finishes any single pile in 1 hour)

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);

    if (hoursNeeded(mid) <= h) {
      right = mid;    // speed `mid` WORKS — try slower (smaller)
    } else {
      left = mid + 1; // speed `mid` is TOO SLOW — need faster
    }
  }

  return left;
}

console.log(minEatingSpeed([3, 6, 7, 11], 8)); // 4
```

### 🎯 Interview Pattern: Recognizing the Structural Twin

Notice: this problem and the shipping-capacity problem (section 16.4.1) are **structurally identical** — both binary search over a numeric "rate/capacity" parameter, checking a monotonic "does this rate satisfy the time/day constraint" condition. **Once you've internalized one, you should immediately recognize the other as the same shape wearing different words** — this is exactly the kind of pattern-transfer skill this book has emphasized since Chapter 1 (recall Chapter 7's Happy Numbers / Find-the-Duplicate transferability lesson for fast/slow pointers — the same "same shape, different surface" recognition skill applies here).

---

## 16.5 Binary Search in 2D: Searching a Matrix

**The problem:** given an `m x n` matrix where each row is sorted left-to-right and each column is sorted top-to-bottom, search for a target value efficiently.

### Naive Approach

```javascript
function searchMatrixNaive(matrix, target) {
  for (const row of matrix) {
    for (const val of row) {
      if (val === target) return true;
    }
  }
  return false;
}
// Time: O(m * n) — a full scan, ignoring all the sorted structure entirely!
```

### Optimized: Treating the Matrix as a Single Sorted Array (When Fully Sorted, Row-Major)

If the matrix has the stronger property that **the last element of each row is smaller than the first element of the next row** (making it fully, globally sorted in row-major order), you can binary search it as if it were one long, flattened, sorted 1D array:

```javascript
function searchFullySortedMatrix(matrix, target) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  let left = 0;
  let right = rows * cols - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    const row = Math.floor(mid / cols);
    const col = mid % cols;
    const midValue = matrix[row][col];

    if (midValue === target) return true;
    if (midValue < target) left = mid + 1;
    else right = mid - 1;
  }

  return false;
}
// Time: O(log(m*n)) = O(log m + log n) — a genuine binary search speedup!
```

### 🧠 Memory Trick: The Index-Conversion Formula

`row = Math.floor(mid / cols)`, `col = mid % cols` — this is exactly the same "convert a flat index into 2D coordinates" arithmetic you'd use to flatten any 2D grid into a 1D array, and it's worth having as instant recall whenever a matrix problem could be treated as a disguised 1D array.

### Alternative: The "Staircase Search" for Matrices Sorted Per-Row-and-Column (But Not Fully Row-Major Sorted)

For the weaker guarantee (each row sorted, each column sorted, but *not* necessarily fully row-major sorted overall — so the previous technique doesn't apply), a different, genuinely clever O(m+n) technique exists:

```javascript
function searchMatrixStaircase(matrix, target) {
  let row = 0;
  let col = matrix[0].length - 1; // start at the TOP-RIGHT corner

  while (row < matrix.length && col >= 0) {
    if (matrix[row][col] === target) {
      return true;
    } else if (matrix[row][col] > target) {
      col--; // current value too big -> eliminate this whole COLUMN (move left)
    } else {
      row++; // current value too small -> eliminate this whole ROW (move down)
    }
  }

  return false;
}
```

### 🧠 Memory Trick: Why Starting at the Top-Right Corner Is the Key Insight

Starting at the top-right corner is deliberate and essential: **from this specific corner, moving left always decreases the value, and moving down always increases the value** — a clean, unambiguous "which direction do I eliminate" decision at every step, exactly like Chapter 3's two-pointer technique applied to two dimensions instead of one. Starting from the top-*left* or bottom-*right* corner doesn't give you this clean property (both directions from those corners can increase or both can decrease, depending on which axis you move along), which is precisely why the top-right (or equivalently, bottom-left) corner is the only valid starting point for this specific technique.

- **Time**: O(m + n) — at most `m` row-moves and `n` column-moves before falling off an edge.
- **Space**: O(1).

### 🎯 Interview Pattern

This is technically not a pure O(log(mn)) binary search (it's O(m+n), a different, "linear-in-dimensions" bound), but it's grouped with binary search techniques because it shares the same "eliminate a whole region with one comparison" spirit as Chapter 3's two-pointer pattern and true binary search. **Always check which specific sorted-matrix guarantee a problem gives you** — fully row-major sorted (use the flattened-array binary search, genuinely O(log(mn))) versus merely row-and-column-sorted independently (use the staircase technique, O(m+n)) — conflating the two leads to either a broken algorithm or a missed optimization opportunity.

---

## 16.6 Edge Cases and Gotchas Checklist for Binary Search Problems

1. **Empty array.** Every variant should handle `left > right` immediately (the loop simply never executes) without crashing.
2. **Single-element array.** Verify boundary-finding and rotated-array variants behave correctly when `left === right` from the very first iteration.
3. **Target not present at all.** Boundary-finding functions must correctly return `-1` (or your chosen sentinel), not an incorrect nearby index.
4. **All elements identical.** Stress-tests first/last-occurrence logic specifically — does it correctly identify index `0` as first and `n-1` as last?
5. **Off-by-one in loop conditions and boundary updates** — always dry-run a tiny 2-3 element example by hand before trusting a binary search variant, since these bugs are notoriously easy to introduce and hard to spot by inspection alone.
6. **Confusing `left < right` (used in "binary search on the answer" convergence-style templates) with `left <= right` (used in "find exact match or -1" templates)** — these are genuinely different loop styles for genuinely different problem shapes; know which one your specific problem calls for.
7. **Forgetting to justify monotonicity explicitly** for "binary search on the answer" problems — always state, out loud, *why* the check function's result is monotonic in the search parameter, since this justification is what separates a correct application of the technique from a superficially similar but broken one.

---

## 16.7 Chapter Summary

This chapter took binary search from Chapter 1's "phone book halving" introduction and built it into a genuinely broad, high-leverage problem-solving framework. We began by nailing the precise mechanics that cause the most implementation bugs: the `left <= right` loop condition (not `<`), the overflow-safe midpoint formula (a piece of universal cross-language hygiene worth demonstrating even where JavaScript's number representation makes it non-critical), and the crucial distinction between basic search (stop immediately on any match) and boundary-finding search (treat a match as a candidate to record while continuing to narrow toward a specific first/last occurrence) — a template that underlies an enormous family of "lower bound / upper bound / count occurrences" interview problems.

We tackled rotated sorted arrays, building the key insight that **at least one half of any rotated sorted array is always properly ordered**, letting a single comparison determine which half to trust and recurse into. The heart of this chapter was **binary search on the answer** — the generalization that separates candidates who've memorized "binary search means array lookup" from those who understand it as a technique for **any monotonic answer space**: whenever a problem asks to minimize or maximize a numeric quantity subject to a checkable, monotonic constraint (illustrated via both the package-shipping-capacity problem and the structurally identical banana-eating-speed problem, deliberately paired to build the "same shape, different words" recognition skill), you can binary search over the *range of possible answers* rather than a literal array, checking `canAchieve(mid)` exactly as you'd check `arr[mid]`.

We closed with matrix search, carefully distinguishing two genuinely different sorted-matrix guarantees that call for genuinely different techniques: a fully row-major-sorted matrix can be treated as a flattened 1D array for true O(log(mn)) binary search, while a matrix merely sorted independently along rows and columns requires the "staircase search" starting deliberately from the top-right corner — the *only* corner from which every move unambiguously either increases or decreases the current value, achieving O(m+n), a genuinely different (linear-in-dimensions, not logarithmic-in-total-size) but still elegant complexity class, sharing the "eliminate a whole region per comparison" spirit of Chapter 3's two-pointer technique.

---

## 16.8 Revision Notes

- Basic binary search: `left <= right` loop condition, `left + Math.floor((right-left)/2)` midpoint (overflow-safe, universal habit).
- Boundary-finding (first/last occurrence): don't stop on a match — record it as a candidate and keep narrowing toward the desired boundary.
- Rotated sorted arrays: at least one half is always properly sorted; determine which via one comparison, then check if the target falls within that half's range.
- Binary search on the answer: applies whenever a "minimize/maximize X subject to a checkable constraint" problem has a monotonic `canAchieve(X)` function — search the answer range, not a literal array. Always state the monotonicity justification explicitly.
- The shipping-capacity and banana-eating-speed problems are structurally identical — recognizing "same shape, different words" is the core transferable skill.
- Fully row-major sorted matrices: treat as a flattened 1D array, true O(log(mn)) binary search.
- Matrices merely sorted per-row-and-column: use the staircase search from the top-right corner (the only corner giving an unambiguous eliminate-direction per comparison), O(m+n).

---

## 16.9 Mind Map (ASCII)

```
                        BINARY SEARCH PATTERNS
                                |
      +------------------+-----+-----+----------------------+
      |                  |           |                       |
  CORE MECHANICS    BOUNDARY     ROTATED SORTED      BINARY SEARCH ON
  (Ch.1 refined)     FINDING         ARRAYS           THE ANSWER
      |               (first/            |            (THE BIG GENERALIZATION)
  left <= right       last occ.)   At least ONE             |
  (not <)                |         half is ALWAYS      "minimize/maximize X
  overflow-safe     Don't stop on   properly sorted    subject to checkable,
  midpoint formula  match -- record  -- one comparison  MONOTONIC constraint"
  (universal        it, keep         determines which        |
  habit)            narrowing        half, check if     canAchieve(mid) instead
                    toward boundary  target's range      of arr[mid] -- SAME
                         |           fits there           halving logic!
                    Powers: lower                              |
                    bound, upper                          Shipping capacity
                    bound, count                          == Koko bananas
                    occurrences                           (SAME SHAPE,
                                                            different words!)
                                                                 |
                                                          MATRIX SEARCH
                                                                 |
                                                    +------------+------------+
                                              Fully row-major        Row+col sorted
                                              sorted -> flatten      independently ->
                                              to 1D, O(log(mn))      STAIRCASE from
                                                                     TOP-RIGHT corner,
                                                                     O(m+n)
```

---

## 16.10 Cheat Sheet

```
CORE TEMPLATE (exact match or -1)
=====================================
left=0, right=n-1
while left <= right:
    mid = left + floor((right-left)/2)
    if arr[mid]==target: return mid
    if arr[mid] < target: left = mid+1
    else: right = mid-1
return -1

BOUNDARY TEMPLATE (first/last occurrence)
=============================================
while left <= right:
    mid = left + floor((right-left)/2)
    if arr[mid] == target:
        result = mid
        (FIRST: right = mid-1)  OR  (LAST: left = mid+1)   <- keep searching!
    elif arr[mid] < target: left = mid+1
    else: right = mid-1

BINARY SEARCH ON THE ANSWER TEMPLATE
========================================
left = smallest possible answer, right = largest possible answer
while left < right:
    mid = left + floor((right-left)/2)
    if canAchieve(mid): right = mid       (mid works -- try smaller/better)
    else: left = mid + 1                   (mid fails -- need more)
return left

ALWAYS STATE: "canAchieve(X) is monotonic because ___" before using this template!

ROTATED ARRAY: determine which half [left,mid] or [mid,right] is properly
sorted (compare arr[left] vs arr[mid]), then check if target's value range
fits within that sorted half.

MATRIX SEARCH DECISION
==========================
Fully row-major sorted (last of row < first of next row) -> flatten to 1D, O(log(mn))
Row-sorted AND column-sorted independently (not globally)  -> staircase from
                                                                TOP-RIGHT corner, O(m+n)
```

---

## 16.11 Key Takeaways

1. Get the core mechanics right: `left <= right`, overflow-safe midpoint — these details cause most binary search bugs.
2. Boundary-finding (first/last occurrence) never stops on a match — it records and keeps narrowing toward the desired end.
3. Rotated sorted arrays always have at least one properly-sorted half, discoverable via one comparison.
4. Binary search on the answer is the chapter's central generalization: any "minimize/maximize X subject to a monotonic checkable constraint" problem can binary search the answer space directly — always justify the monotonicity explicitly.
5. Matrix search technique depends entirely on which sorted guarantee you're given: fully row-major sorted → flatten to 1D; row-and-column-sorted independently → staircase from the top-right corner.

---

## 16.12 20 Multiple Choice Questions

1. What loop condition should the basic binary search template use?
   a) `left < right`
   b) `left <= right`
   c) `left != right`
   d) `left > right`

2. Why is `left + Math.floor((right - left) / 2)` preferred over `Math.floor((left + right) / 2)` as a universal habit?
   a) It's faster in JavaScript specifically
   b) It avoids integer overflow in languages with fixed-width integers, a good cross-language habit
   c) JavaScript requires this exact formula
   d) It produces a different, more correct midpoint value

3. In boundary-finding binary search (first occurrence), what happens when a match is found?
   a) The function returns immediately
   b) The match is recorded as a candidate, and the search continues narrowing toward the desired boundary
   c) The search restarts from the beginning
   d) An error is thrown

4. What key property allows binary search to work on a rotated sorted array?
   a) The entire array is still fully sorted
   b) At least one of the two halves is always properly sorted
   c) Rotated arrays cannot be binary searched at all
   d) The rotation point is always at the exact middle

5. What is "binary search on the answer"?
   a) Searching for a value in a literal sorted array only
   b) Binary searching over a range of possible answers using a monotonic checkable condition, rather than a literal array
   c) A technique that only works on numeric arrays
   d) An alternative name for linear search

6. What two questions should you ask to determine if binary search on the answer applies?
   a) Is the array sorted, and is it an array of numbers?
   b) Can I check a candidate answer cheaply, and is that check monotonic?
   c) Is the array empty, and does it have duplicates?
   d) Is the array 1D or 2D?

7. In the package-shipping-capacity problem, what is the monotonic property being exploited?
   a) None; it's not actually monotonic
   b) If capacity X allows shipping within D days, any larger capacity also allows it
   c) Larger capacities always take longer to ship
   d) The number of days is fixed regardless of capacity

8. What structural similarity exists between the shipping-capacity problem and the Koko-eating-bananas problem?
   a) They are unrelated problems
   b) Both binary search over a numeric rate/capacity parameter with a monotonic time-constraint check
   c) Both require sorting the input array first
   d) Both use recursion instead of binary search

9. For a fully row-major sorted matrix (last element of each row < first element of next row), what technique achieves O(log(mn)) search?
   a) A full O(m*n) scan
   b) Treating the matrix as a flattened 1D array and binary searching it
   c) The staircase search from the top-right corner
   d) Sorting the matrix again first

10. For a matrix merely sorted independently along rows and columns (not globally row-major sorted), what technique should be used?
    a) The flattened 1D array binary search
    b) The staircase search, starting from the top-right corner
    c) A full O(m*n) scan is the only option
    d) Binary search cannot be applied at all

11. Why does the staircase search start specifically at the TOP-RIGHT corner?
    a) It's an arbitrary choice; any corner works equally well
    b) From this corner, moving left always decreases value and moving down always increases value — an unambiguous elimination direction
    c) JavaScript arrays are indexed starting from the top-right
    d) It's required for the matrix to be valid

12. What is the time complexity of the staircase search technique?
    a) O(log(m*n))
    b) O(m + n)
    c) O(m * n)
    d) O(log m * log n)

13. What must you explicitly justify before applying "binary search on the answer" to a problem?
    a) That the array is sorted
    b) That the checkable condition is monotonic in the search parameter
    c) That the array has no duplicates
    d) That the array is 2D

14. What is the correct loop condition style typically used in "binary search on the answer" templates, as opposed to exact-match search?
    a) `left <= right` in both cases, no difference
    b) `left < right` (converging style), differing from exact-match search's `left <= right`
    c) `left != right`
    d) There is no loop; it's purely recursive

15. In first-occurrence binary search, which direction do you continue searching after finding a match?
    a) Right (toward `left = mid + 1`)
    b) Left (toward `right = mid - 1`)
    c) You stop immediately
    d) Both directions simultaneously

16. In last-occurrence binary search, which direction do you continue searching after finding a match?
    a) Left (toward `right = mid - 1`)
    b) Right (toward `left = mid + 1`)
    c) You stop immediately
    d) Neither; the search restarts

17. What common bug results from using `left < right` when `left <= right` was needed (or vice versa)?
    a) An infinite loop always
    b) Off-by-one errors that silently miss valid boundary elements
    c) A syntax error
    d) The array gets sorted incorrectly

18. What does "count occurrences of a target in a sorted array with duplicates" reduce to, using this chapter's techniques?
    a) A full linear scan is required; binary search doesn't help
    b) lastOccurrence(target) - firstOccurrence(target) + 1
    c) Sorting the array again
    d) A single basic binary search call

19. In the rotated array search, once you determine the left half [left, mid] is properly sorted, what do you check next?
    a) Whether mid equals the target
    b) Whether the target's value falls within that sorted half's range
    c) Whether the array is fully rotated
    d) Whether right equals left

20. What common thread connects the staircase matrix search to Chapter 3's two-pointer technique?
    a) Both require sorting first
    b) Both eliminate an entire region/direction with a single comparison, narrowing the search space efficiently
    c) Both use recursion
    d) Both only work on 1D arrays

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-b, 19-b, 20-b

---

## 16.13 20 Coding Problems

**Easy**

1. Implement the basic binary search template from memory (section 16.1).
2. Implement `findFirstOccurrence` and `findLastOccurrence` from memory (section 16.2), and derive `countOccurrences` from them.
3. Given a sorted array, find the smallest index where a target value could be inserted to keep the array sorted (the "lower bound" — a direct variant of first-occurrence logic).
4. Given a sorted array, determine if a target exists using iterative binary search, then implement the same logic recursively, and compare their space complexity.
5. Write a function to find the peak element in a bitonic array (increases then decreases) using a binary-search-style approach.

**Medium**

6. Implement `searchRotated` from memory (section 16.3), and extend it to handle a rotated array that MAY contain duplicate values (requiring a fallback to linear scanning in ambiguous cases).
7. Implement `shipWithinDays` from memory (section 16.4.1), explicitly writing out the monotonicity justification as a code comment.
8. Implement `minEatingSpeed` from memory (section 16.4.2), and write a comment explaining its structural similarity to problem 7.
9. Given a sorted array of integers, find the minimum element in a rotated version of it (without searching for a specific target — just the minimum).
10. Implement `searchFullySortedMatrix` and `searchMatrixStaircase` from memory (section 16.5), and write a test verifying they give consistent results on a matrix that happens to satisfy BOTH sorting guarantees.

**Hard**

11. Given an array of integers and a target sum, find the minimum length of a contiguous subarray whose sum is at least the target, using binary search on the answer (the subarray length) combined with a feasibility check.
12. Implement "split array largest sum": given an array and a number of subarrays `k`, split the array into `k` contiguous subarrays minimizing the largest subarray sum, using binary search on the answer.
13. Given two sorted arrays of possibly different sizes, find the median of the combined data in O(log(min(m,n))) time using a binary-search-based partitioning approach (a genuinely advanced, famous hard problem).
14. Given a mountain array (strictly increasing then strictly decreasing), find the peak index using binary search, then extend to search for a target value in either the ascending or descending portion.
15. Implement "Aggressive Cows" (or equivalently, "Magnetic Force Between Two Balls"): given positions and a count of items to place, maximize the minimum distance between any two placed items, using binary search on the answer.

**Interview Level**

16. **(Google-level)** Given a massive sorted dataset too large to fit in memory, accessible only via an API that returns `get(index)` (O(1) per call, but each call has real latency cost), design a binary search strategy that minimizes the total number of API calls needed to find a target value, and discuss the trade-offs.
17. **(Amazon-level)** Given a catalog of products with prices sorted in a specific known range, and a budget constraint, use binary search on the answer to find the maximum number of products purchasable without exceeding budget, given a discount structure that changes based on quantity purchased (requiring the feasibility check itself to be more complex).
18. **(Microsoft-level)** Given server load metrics over time (mostly increasing but with some noise), implement a modified binary search that handles minor non-monotonicity gracefully (discuss the trade-offs of applying binary search to "mostly monotonic" real-world data versus requiring strict monotonicity).
19. **(Meta-level)** Given a social network's friend-count distribution (sorted), use binary search to efficiently answer "how many users have between X and Y friends" using the boundary-finding technique (first/last occurrence generalized to a range count).
20. **(Netflix-level)** Design a video bitrate selection system: given available bandwidth and a set of possible bitrates with associated buffering-time costs, use binary search on the answer to find the maximum sustainable bitrate that keeps buffering under a target threshold, explicitly justifying the monotonicity of "higher bitrate implies more buffering risk."

---

## 16.14 5 Interview Questions

1. "Implement binary search, and walk me through the boundary conditions that most commonly cause bugs." (Tests precise mechanics — loop condition, midpoint formula.)
2. "How would you find the first and last occurrence of a target in a sorted array with duplicates?" (Tests the boundary-finding template specifically.)
3. "How would you search for a target in a rotated sorted array?" (Tests the "at least one half is always sorted" insight.)
4. "This problem asks to minimize/maximize a value subject to a constraint — how would binary search help here, even though there's no literal sorted array?" (Tests the central binary-search-on-the-answer generalization and monotonicity justification.)
5. "How would you search a matrix that's sorted by rows and columns?" (Tests the distinction between the two matrix-sorting guarantees and their corresponding techniques.)

---

## 16.15 3 Real Projects

1. **Complete Binary Search Toolkit**: Implement the basic template, boundary-finding functions, rotated-array search, and both matrix search variants in a single library, with a self-check script verifying correctness across randomized sorted arrays, rotated arrays, and matrices of both sorting-guarantee types.
2. **"Binary Search on the Answer" Problem Solver**: Build a small generic solver function taking a `canAchieve(x)` predicate and an answer range, returning the minimum/maximum satisfying value — then apply it to both the shipping-capacity and Koko-bananas problems, demonstrating the same generic solver handles both, reinforcing the "same shape, different words" lesson.
3. **API-Latency-Aware Search Simulator**: Build a simulation of coding problem #16 — a "remote dataset" with artificial per-access latency — and compare a naive linear scan against binary search in terms of total simulated latency, empirically demonstrating why minimizing comparison count matters when each comparison has real-world cost.

---

## 16.16 Further Reading

- Jon Bentley's "Programming Pearls" essay on binary search, famously highlighting how many professional programmers get the implementation subtly wrong — a genuinely humbling, worthwhile read for internalizing this chapter's precision emphasis.
- Search "binary search on answer competitive programming" for extensive additional problem sets built entirely around this chapter's central generalization.
- LeetCode's "Binary Search" problem tag, specifically the "Search in Rotated Sorted Array," "Koko Eating Bananas," "Capacity to Ship Packages," and "Search a 2D Matrix" problems, for direct extensions of this chapter's worked examples.

---

*End of Chapter 16. Next: Chapter 17 will cover the Backtracking Masterclass — formalizing the "choose, explore, un-choose" rhythm previewed in Chapter 2 into a complete, systematic framework covering permutations, combinations, subsets, N-Queens, Sudoku solving, and the pruning techniques that make exponential search spaces tractable in practice.*

**Say "Continue to the next chapter" when ready.**
