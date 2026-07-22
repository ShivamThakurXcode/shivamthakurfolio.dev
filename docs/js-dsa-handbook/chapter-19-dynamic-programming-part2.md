# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 19: The Dynamic Programming Masterclass, Part 2 — Two-Dimensional DP

---

## 19.0 When One Dimension Isn't Enough

Chapter 18's entire framework hinged on defining `f(i)` — a sub-problem indexed by a single number. But many real problems have **two independent things varying simultaneously**: two strings being compared character by character, an item-selection decision combined with a running budget, a position on a grid needing both a row and a column. This chapter extends the exact same five-step framework from Chapter 18 into two dimensions: `f(i, j)`, a table instead of an array, but **the identical underlying discipline.**

---

## 19.1 Grid Path Counting: The Simplest Possible 2D DP

**The problem:** given an `m x n` grid, count the number of distinct paths from the top-left to the bottom-right corner, moving only right or down.

### Applying the Five-Step Framework

1. **Define the sub-problem**: `f(i, j)` = the number of distinct paths from the top-left corner to cell `(i, j)`.
2. **Recurrence**: to arrive at `(i, j)`, your last move was either from `(i-1, j)` (moving down) or `(i, j-1)` (moving right). **`f(i, j) = f(i-1, j) + f(i, j-1)`.**
3. **Base cases**: `f(0, j) = 1` for all `j` (only one way to reach any cell in the top row: move right the whole way). `f(i, 0) = 1` for all `i` (symmetric logic for the left column).
4. **Bottom-up**, filling the table row by row.
5. **Answer location**: `f(m-1, n-1)` — the bottom-right corner, directly.

```javascript
function uniquePaths(m, n) {
  const dp = Array.from({ length: m }, () => new Array(n).fill(1)); // top row & left column default to 1

  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    }
  }

  return dp[m - 1][n - 1];
}

console.log(uniquePaths(3, 3)); // 6
```

### ASCII Visualization: The Filled Table

```
For a 3x3 grid:

dp[0][0]=1  dp[0][1]=1  dp[0][2]=1
dp[1][0]=1  dp[1][1]=2  dp[1][2]=3
dp[2][0]=1  dp[2][1]=3  dp[2][2]=6

Each interior cell = the cell ABOVE it + the cell to its LEFT.
dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = 2
dp[2][2] = dp[1][2] + dp[2][1] = 3 + 3 = 6  <- FINAL ANSWER
```

### 🎯 Direct Callback to Chapter 11's Implicit-Graph Lesson

This is a direct continuation of Chapter 11's "a grid with adjacency movement is an implicit graph" insight — here, the grid is an implicit **DAG** (Chapter 13!), where each cell has edges only to its right and down neighbors (no cycles possible, since movement only ever goes in two fixed directions). Counting paths in a DAG via DP, where `f(i,j)` sums contributions from predecessor cells, is a genuinely important, transferable pattern — the same "sum over all ways to arrive here" recurrence reappears constantly in path-counting and combinatorics-adjacent DP problems.

### 🚀 Pro Tip: The 2D-to-1D Space Optimization

Just like Chapter 18's 1D space compression, notice `dp[i][j]` only ever depends on the row directly above and the current row so far — **you never need more than one row's worth of history**, compressible from O(m·n) to O(n) space:

```javascript
function uniquePathsOptimized(m, n) {
  let previousRow = new Array(n).fill(1);

  for (let i = 1; i < m; i++) {
    const currentRow = new Array(n).fill(1);
    for (let j = 1; j < n; j++) {
      currentRow[j] = previousRow[j] + currentRow[j - 1];
    }
    previousRow = currentRow;
  }

  return previousRow[n - 1];
}
```

---

## 19.2 Longest Common Subsequence (LCS): The Foundational 2D String DP

**The problem:** given two strings, find the length of their longest common subsequence (characters in the same relative order, but not necessarily contiguous).

### Applying the Five-Step Framework

1. **Define the sub-problem**: `f(i, j)` = the length of the LCS of `text1[0..i-1]` and `text2[0..j-1]` (the first `i` characters of `text1` and the first `j` characters of `text2`).
2. **Recurrence — the key insight, worth deep understanding**:
   - If `text1[i-1] === text2[j-1]` (the characters currently being considered **match**): this character can always be part of some LCS, so **`f(i, j) = 1 + f(i-1, j-1)`** — extend the LCS found using one fewer character from each string.
   - If they **don't match**: the LCS must come from either dropping the current character of `text1` or dropping the current character of `text2` — take the best of those two options: **`f(i, j) = max(f(i-1, j), f(i, j-1))`.**
3. **Base cases**: `f(0, j) = 0` and `f(i, 0) = 0` for all `i, j` (an empty string has an LCS of length 0 with anything).
4. **Bottom-up**, filling row by row.
5. **Answer location**: `f(text1.length, text2.length)`.

```javascript
function longestCommonSubsequence(text1, text2) {
  const m = text1.length;
  const n = text2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i][j] = 1 + dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

console.log(longestCommonSubsequence('abcde', 'ace')); // 3 ("ace")
```

### Dry Run

```
text1='abcde', text2='ace'

     ""  a   c   e
""  [0,  0,  0,  0]
a   [0,  1,  1,  1]
b   [0,  1,  1,  1]
c   [0,  1,  2,  2]
d   [0,  1,  2,  2]
e   [0,  1,  2,  3]

Building row for 'a' (i=1): text1[0]='a'
  j=1 (text2[0]='a'): MATCH! dp[1][1] = 1 + dp[0][0] = 1+0 = 1
  j=2 (text2[1]='c'): no match. dp[1][2] = max(dp[0][2], dp[1][1]) = max(0,1) = 1
  j=3 (text2[2]='e'): no match. dp[1][3] = max(dp[0][3], dp[1][2]) = max(0,1) = 1

Building row for 'c' (i=3): text1[2]='c'
  j=2 (text2[1]='c'): MATCH! dp[3][2] = 1 + dp[2][1] = 1+1 = 2

Building row for 'e' (i=5): text1[4]='e'
  j=3 (text2[2]='e'): MATCH! dp[5][3] = 1 + dp[4][2] = 1+2 = 3

Final: dp[5][3] = 3 ✓ (LCS is "ace")
```

### 🧠 Memory Trick: "Match — Extend Diagonally. No Match — Best of Above or Left."

The entire LCS recurrence compresses into one memorable sentence: **when characters match, look diagonally up-left and add one; when they don't, take the better of directly above or directly to the left.** This exact recurrence shape (diagonal-on-match, max-of-neighbors-otherwise) is the direct ancestor of nearly every string-comparison DP problem you'll encounter, including Edit Distance next.

### 🎯 Interview Pattern: LCS Is a "Foundational" Problem — Recognize Its Disguises

Many seemingly different problems are LCS wearing a costume: **"Longest Common Substring"** (a variant requiring *contiguous* matches, not just order-preserving — a different, simpler recurrence, included in this chapter's coding problems), **"Shortest Common Supersequence"**, and **"Delete Operations for Two Strings"** (minimum deletions to make two strings equal) are all directly solvable using LCS as a building block or a near-identical recurrence. Recognizing "this is secretly asking about a common subsequence" is a genuinely valuable, transferable pattern-recognition skill.

---

## 19.3 Edit Distance (Levenshtein Distance): Three-Way Recurrence

**The problem:** given two strings, find the minimum number of operations (insert, delete, or replace a single character) needed to transform one into the other.

### Applying the Five-Step Framework

1. **Define the sub-problem**: `f(i, j)` = the minimum number of operations to transform `word1[0..i-1]` into `word2[0..j-1]`.
2. **Recurrence**:
   - If `word1[i-1] === word2[j-1]`: no operation needed for this character pair — **`f(i, j) = f(i-1, j-1)`** (directly inherit the sub-problem's answer, unchanged).
   - If they **don't match**, we must perform exactly one operation, and we want the cheapest of the three options:
     - **Replace**: `1 + f(i-1, j-1)` (fix this character pair directly, then solve the rest).
     - **Delete** (from `word1`): `1 + f(i-1, j)` (remove this character from `word1`, then match the rest).
     - **Insert** (into `word1`, matching `word2`'s character): `1 + f(i, j-1)` (add a character, then match the remainder of `word2`).
   - **`f(i, j) = 1 + min(f(i-1, j-1), f(i-1, j), f(i, j-1))`**
3. **Base cases**: `f(0, j) = j` (transforming an empty string into a `j`-length string requires `j` insertions). `f(i, 0) = i` (symmetric — `i` deletions).
4. **Bottom-up.**
5. **Answer location**: `f(word1.length, word2.length)`.

```javascript
function minDistance(word1, word2) {
  const m = word1.length;
  const n = word2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j - 1], // replace
          dp[i - 1][j],     // delete
          dp[i][j - 1]      // insert
        );
      }
    }
  }

  return dp[m][n];
}

console.log(minDistance('horse', 'ros')); // 3
```

### 🧠 Memory Trick: Visualizing the Three Operations as Three Neighboring Cells

```
                    word2[j-1]
                        |
         dp[i-1][j-1]  dp[i-1][j]
              \           |
               \          | (DELETE from word1: come from directly ABOVE)
    (REPLACE:    \        |
    diagonal)      dp[i][j]  <- current cell being computed
                  /
                 / (INSERT into word1: come from directly LEFT)
           dp[i][j-1]

Three possible "parent" cells, each representing one of the three edit operations.
We always pick whichever parent gives the CHEAPEST total, plus 1 for the operation itself.
```

### 🔥 Interview Tip

Edit Distance is one of the most celebrated, most frequently asked "hard" DP problems precisely because it requires correctly reasoning about **three** simultaneous recurrence branches (not two, like LCS), each corresponding to a genuinely distinct real-world operation. Being able to explain, in plain English, *why* each of the three terms corresponds to insert/delete/replace — not just recite the formula — is what separates genuine understanding from memorization here. This algorithm has enormous real-world value beyond interviews too: it's the actual mechanism behind spell-checkers' "did you mean...?" suggestions, DNA sequence alignment in bioinformatics, and version-control diff algorithms.

---

## 19.4 The 0/1 Knapsack Problem: The Canonical Constrained-Optimization DP

**The problem:** given items with weights and values, and a weight capacity, maximize total value without exceeding the capacity — each item can be used **at most once** (hence "0/1": include it or don't, no fractional or repeated use).

### Applying the Five-Step Framework

1. **Define the sub-problem**: `f(i, w)` = the maximum value achievable using only the first `i` items, with a weight capacity of `w`.
2. **Recurrence — the "include or exclude" pattern from Chapter 18, now with a second dimension for the constraint:**
   - If including item `i` would exceed the current capacity (`weights[i-1] > w`): we **must** exclude it. `f(i, w) = f(i-1, w)`.
   - Otherwise, choose the better of **excluding** it (`f(i-1, w)`) or **including** it (`values[i-1] + f(i-1, w - weights[i-1])`).
   - **`f(i, w) = max(f(i-1, w), values[i-1] + f(i-1, w - weights[i-1]))`** (when the item fits).
3. **Base case**: `f(0, w) = 0` for all `w` (zero items considered means zero value, regardless of capacity).
4. **Bottom-up.**
5. **Answer location**: `f(n, capacity)`.

```javascript
function knapsack(weights, values, capacity) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      if (weights[i - 1] > w) {
        dp[i][w] = dp[i - 1][w]; // item doesn't fit — forced exclusion
      } else {
        dp[i][w] = Math.max(
          dp[i - 1][w],                                    // exclude item i
          values[i - 1] + dp[i - 1][w - weights[i - 1]]     // include item i
        );
      }
    }
  }

  return dp[n][capacity];
}

console.log(knapsack([1, 3, 4, 5], [1, 4, 5, 7], 7)); // 9 (items with weight 3+4=7, value 4+5=9)
```

### 🎯 Interview Pattern: The Direct Generalization of House Robber

Compare this recurrence directly to Chapter 18's House Robber: **both are "include or exclude" decisions, but Knapsack adds a second dimension (`w`, the remaining capacity) to track a *resource constraint* that House Robber's simpler "can't pick adjacent" rule didn't need.** This is the natural next step in DP sophistication: **1D "include or exclude" problems track just a position; 2D "include or exclude" problems additionally track a consumable resource (weight, budget, time) that choices deplete.** Recognizing Knapsack as "House Robber plus a resource budget" is a genuine, valuable generalization to internalize.

### 🚀 Pro Tip: The Space Optimization Requires Care (Iterate Backward!)

Since `dp[i][w]` only depends on the **previous row** (`i-1`), you can compress to a single 1D array — but with a genuinely important subtlety:

```javascript
function knapsackOptimized(weights, values, capacity) {
  const dp = new Array(capacity + 1).fill(0);

  for (let i = 0; i < weights.length; i++) {
    for (let w = capacity; w >= weights[i]; w--) { // MUST iterate BACKWARD!
      dp[w] = Math.max(dp[w], values[i] + dp[w - weights[i]]);
    }
  }

  return dp[capacity];
}
```

### ⚠ Common Mistake: Why the Inner Loop Must Go Backward

This is a genuinely subtle, important detail: **if the inner loop iterated forward (increasing `w`), `dp[w - weights[i]]` might already reflect an update made *earlier in this same pass* for item `i` — accidentally allowing item `i` to be counted more than once**, silently turning the 0/1 Knapsack (each item used at most once) into an "unbounded knapsack" (each item reusable unlimited times) — a completely different problem, computed by mistake. **Iterating backward guarantees `dp[w - weights[i]]` still reflects only the *previous* item's state**, correctly preserving the "at most once per item" constraint. This is one of the most commonly-missed subtleties in all of DP space optimization, directly parallel to Chapter 18's coin-change loop-order lesson — another case where the *direction* or *order* of iteration, not just the recurrence itself, determines correctness.

---

## 19.5 Edge Cases and Gotchas Checklist for 2D DP Problems

1. **Empty string/array inputs for either dimension.** Verify base cases (`f(0, j)` and `f(i, 0)`) are correctly initialized *before* the main double loop runs.
2. **Off-by-one indexing between the `dp` table's indices and the original string/array's indices** — this chapter's convention (`dp[i][j]` representing "first `i` characters") requires consistently using `text[i-1]` (not `text[i]`) inside the loop body; a very common, easy-to-miss source of bugs.
3. **2D-to-1D space optimization direction** — always verify whether the recurrence requires forward or backward inner-loop iteration once compressed to 1D (Knapsack needs backward; Unique Paths, relying only on the row above and current row so far, works forward).
4. **Confusing which two quantities the two dimensions represent** — always explicitly state, in your own words, what varies along each axis of the table before writing the recurrence.
5. **Reconstructing the actual sequence/path (not just its length/value)** — many 2D DP problems (LCS, Edit Distance) are frequently extended to ask for the actual subsequence or operations, requiring a backward walk through the completed `dp` table, tracing which recurrence branch was taken at each cell (included in this chapter's coding problems).

---

## 19.6 Chapter Summary

This chapter extended Chapter 18's five-step DP framework into two dimensions, and the throughline across all four worked problems is that **the framework itself never changed — only the number of quantities the sub-problem definition needs to track.** Grid path counting introduced the simplest possible 2D case, `f(i,j) = f(i-1,j) + f(i,j-1)`, directly connecting back to Chapter 11's implicit-graph insight (the grid as an implicit DAG, per Chapter 13's vocabulary) and Chapter 13's path-counting-via-summing-predecessors idea, while demonstrating the same space-compression instinct from Chapter 18 (only the immediately preceding row is ever needed, collapsing O(mn) to O(n) space).

Longest Common Subsequence established the foundational string-comparison recurrence — **match, extend diagonally; no match, take the best of above or left** — worth internalizing as a single memorable sentence, since it's the direct ancestor of an entire family of "secretly an LCS problem" variants (longest common substring, shortest common supersequence, minimum deletions to make two strings equal). Edit Distance extended this into a genuinely three-way recurrence, and we were careful to build real understanding (not just recite the formula) for why each of its three terms corresponds precisely to one of insert, delete, and replace — a distinction worth being able to explain in plain English, given the algorithm's outsized real-world importance in spell-checking, bioinformatics sequence alignment, and diff tooling.

The 0/1 Knapsack problem closed the chapter by making explicit a generalization worth carrying forward: **1D "include or exclude" DP (House Robber, Chapter 18) tracks just a position; 2D "include or exclude" DP additionally tracks a consumable resource that choices deplete** — the natural next step in DP sophistication once a simple positional constraint isn't enough. We closed with a genuinely important, easy-to-miss space-optimization subtlety: compressing Knapsack's 2D table to 1D **requires iterating the capacity dimension backward**, or the algorithm silently (and incorrectly) permits reusing the same item multiple times — a direct structural parallel to Chapter 18's coin-change loop-ordering lesson, reinforcing that in DP, the *direction and order* of iteration is often just as consequential to correctness as the recurrence relation itself.

---

## 19.7 Revision Notes

- The five-step DP framework from Chapter 18 extends unchanged into 2D — only the sub-problem's definition needs an extra dimension, not the process itself.
- Grid path counting (f(i,j) = f(i-1,j) + f(i,j-1)) is a grid-as-implicit-DAG path-counting problem, directly connecting Chapters 11 and 13; space-compressible from O(mn) to O(n) since only the previous row is needed.
- LCS recurrence: match → diagonal + 1; no match → max(above, left). This single sentence anchors an entire family of "secretly LCS" string problems.
- Edit Distance's three-way recurrence (replace/delete/insert) requires understanding, not just memorizing, why each term maps to its specific operation — real-world value in spell-checking, bioinformatics, and diff tools.
- 0/1 Knapsack generalizes House Robber's "include or exclude" pattern by adding a resource-budget dimension — the natural progression from 1D to 2D "include or exclude" DP.
- Knapsack's 1D space optimization requires iterating the capacity dimension BACKWARD, or items get incorrectly reused — a direct structural parallel to Chapter 18's coin-change loop-order lesson.

---

## 19.8 Mind Map (ASCII)

```
                    DYNAMIC PROGRAMMING (PART 2: 2D)
                                  |
      +------------------+-------+-------+------------------------+
      |                  |               |                        |
  GRID PATH          LCS (STRING       EDIT DISTANCE          0/1 KNAPSACK
  COUNTING            DP FOUNDATION)    (3-way recurrence)     (constrained
      |                    |                  |                 optimization)
  f(i,j)=f(i-1,j)    Match: diagonal    Match: inherit          |
  +f(i,j-1)          +1                 diagonally         "Include or exclude"
      |              No match: max      No match: 1+min(    + RESOURCE dimension
  = implicit DAG      (above, left)     replace-diag,        (generalizes Ch.18's
  path counting            |            delete-above,        House Robber!)
  (Ch.11/Ch.13         "Secretly LCS"   insert-left)               |
  callback)            family: longest       |                f(i,w)=max(exclude,
      |                common substring, Real-world:          include value+
  Space: O(mn)->        supersequence,    spell-check,         f(i-1,w-weight))
  O(n) (only prev       min deletions     bioinformatics,           |
  row needed)                             diff tools          Space opt: 1D array,
                                                                iterate w BACKWARD
                                                                (or items get
                                                                reused -- echoes
                                                                Ch.18 coin-change
                                                                loop-order lesson!)
```

---

## 19.9 Cheat Sheet

```
2D DP RECURRENCES QUICK REFERENCE
=====================================
Grid Paths:     f(i,j) = f(i-1,j) + f(i,j-1)
                base: f(0,j)=1, f(i,0)=1

LCS:            match:    f(i,j) = 1 + f(i-1,j-1)
                no match: f(i,j) = max(f(i-1,j), f(i,j-1))
                base: f(0,j)=0, f(i,0)=0

Edit Distance:  match:    f(i,j) = f(i-1,j-1)
                no match: f(i,j) = 1 + min(f(i-1,j-1), f(i-1,j), f(i,j-1))
                                        [replace]      [delete]   [insert]
                base: f(0,j)=j, f(i,0)=i

0/1 Knapsack:   f(i,w) = f(i-1,w)                                  if weight[i-1] > w
                f(i,w) = max(f(i-1,w), value[i-1]+f(i-1,w-weight[i-1]))  otherwise
                base: f(0,w) = 0

SPACE OPTIMIZATION DIRECTION CHECK
======================================
Grid Paths / LCS / Edit Distance: forward iteration OK (only need previous row)
0/1 Knapsack: MUST iterate capacity BACKWARD when compressed to 1D,
              or items get incorrectly reused (same bug class as Ch.18 coin-change
              loop order!)

PATTERN RECOGNITION
=======================
"two strings, common/matching structure"     -> LCS family
"transform one string into another, min ops" -> Edit Distance
"items with weight/value, capacity limit"     -> 0/1 Knapsack
"count/find paths on a grid"                  -> Grid DP (implicit DAG)
```

---

## 19.10 Key Takeaways

1. The five-step DP framework is unchanged in 2D — only the sub-problem definition grows an extra dimension.
2. LCS's "match diagonal, else max(above,left)" recurrence anchors an entire family of string-comparison DP problems.
3. Edit Distance's three-way recurrence must be understood term-by-term (replace/delete/insert), not just memorized — it has major real-world applications beyond interviews.
4. 0/1 Knapsack generalizes House Robber's include/exclude pattern with an added resource-budget dimension.
5. Knapsack's space optimization requires backward iteration over the capacity dimension — forgetting this silently turns 0/1 Knapsack into unbounded knapsack, a different, incorrect problem.

---

## 19.11 20 Multiple Choice Questions

1. What is the recurrence for counting unique paths in a grid (moving only right or down)?
   a) f(i,j) = f(i-1,j) * f(i,j-1)
   b) f(i,j) = f(i-1,j) + f(i,j-1)
   c) f(i,j) = max(f(i-1,j), f(i,j-1))
   d) f(i,j) = f(i-1,j-1)

2. What does f(i,j) represent in the Longest Common Subsequence DP formulation?
   a) The number of characters in text1
   b) The length of the LCS of the first i characters of text1 and first j characters of text2
   c) The total length of both strings combined
   d) The number of mismatches between the strings

3. In LCS, what happens when the current characters being compared MATCH?
   a) f(i,j) = max(f(i-1,j), f(i,j-1))
   b) f(i,j) = 1 + f(i-1,j-1)
   c) f(i,j) = 0
   d) f(i,j) = f(i-1,j) - f(i,j-1)

4. In LCS, what happens when the current characters DON'T match?
   a) f(i,j) = 1 + f(i-1,j-1)
   b) f(i,j) = max(f(i-1,j), f(i,j-1))
   c) f(i,j) = 0
   d) f(i,j) = f(i-1,j-1)

5. What are the three operations considered in Edit Distance's recurrence?
   a) Sort, search, merge
   b) Insert, delete, replace
   c) Push, pop, peek
   d) Union, find, compress

6. In Edit Distance, what is the recurrence when characters match?
   a) f(i,j) = 1 + min(three options)
   b) f(i,j) = f(i-1,j-1), directly inherited with no added cost
   c) f(i,j) = 0
   d) f(i,j) = max(f(i-1,j), f(i,j-1))

7. In Edit Distance, what is the recurrence when characters don't match?
   a) f(i,j) = f(i-1,j-1)
   b) f(i,j) = 1 + min(f(i-1,j-1), f(i-1,j), f(i,j-1))
   c) f(i,j) = 0
   d) f(i,j) = f(i-1,j) * f(i,j-1)

8. What real-world applications rely on Edit Distance beyond coding interviews?
   a) Sorting algorithms only
   b) Spell-checkers, bioinformatics sequence alignment, and diff/version-control tools
   c) Binary search implementations
   d) Hash table collision resolution

9. What does the 0/1 in "0/1 Knapsack" refer to?
   a) The item's weight must be 0 or 1
   b) Each item can be used at most once (included or excluded, no repetition or fractions)
   c) The capacity must be a power of 2
   d) There are only two items total

10. What is the 0/1 Knapsack recurrence when an item's weight exceeds the current capacity?
    a) f(i,w) = f(i-1,w) — the item must be excluded
    b) f(i,w) = 0
    c) f(i,w) = value[i-1]
    d) The problem is unsolvable in this case

11. What earlier chapter's problem does 0/1 Knapsack directly generalize?
    a) Chapter 15's sorting algorithms
    b) Chapter 18's House Robber (the "include or exclude" pattern, plus a resource constraint)
    c) Chapter 9's heap operations
    d) Chapter 6's stack operations

12. What is the key difference between 0/1 Knapsack and House Robber's DP structure?
    a) There is no difference
    b) Knapsack adds a second dimension tracking a consumable resource (capacity), which House Robber didn't need
    c) House Robber is always faster
    d) Knapsack doesn't use recursion at all

13. Why must the capacity dimension be iterated BACKWARD when space-optimizing 0/1 Knapsack to 1D?
    a) It's an arbitrary stylistic choice
    b) Forward iteration would let an item's own update affect itself within the same pass, incorrectly allowing reuse
    c) JavaScript requires backward loops for arrays
    d) Backward iteration is always faster regardless of correctness

14. What earlier chapter's lesson does the Knapsack backward-iteration requirement directly parallel?
    a) Chapter 15's sorting stability
    b) Chapter 18's coin-change loop-ordering lesson (order/direction of iteration affects correctness)
    c) Chapter 9's heap building
    d) Chapter 5's linked list reversal

15. What does grid path counting's DP have in common with earlier graph chapters?
    a) Nothing; it's unrelated to graphs
    b) The grid is an implicit DAG (Chapter 13), and the DP sums contributions from predecessor cells
    c) It requires Dijkstra's algorithm
    d) It requires Union-Find

16. What is the space complexity after optimizing grid path counting from a full 2D table to a compressed version?
    a) O(1)
    b) O(n), since only the previous row is ever needed
    c) O(m*n), no optimization is possible
    d) O(log n)

17. What is a "secretly LCS" problem, according to this chapter?
    a) A problem entirely unrelated to LCS
    b) A problem like "longest common substring" or "minimum deletions to make two strings equal" that builds on or closely resembles the LCS recurrence
    c) Any problem involving arrays
    d) Only problems with three or more strings

18. What must be verified before assuming a 2D DP table's base cases are correct?
    a) That the array is sorted
    b) That f(0,j) and f(i,0) are initialized correctly BEFORE the main double loop runs
    c) That both input dimensions are equal in size
    d) That the table uses a Map instead of an array

19. What is a common indexing pitfall in 2D DP where dp[i][j] represents "first i characters"?
    a) There is no pitfall; indexing is always straightforward
    b) Using text[i] instead of text[i-1] inside the loop body, since dp indices are offset by one from string indices
    c) Using a 2D array instead of a Map
    d) Forgetting to sort the strings first

20. What should you do if a problem asks for the ACTUAL subsequence/path, not just its length/value?
    a) It's impossible to recover from a DP table
    b) Walk backward through the completed dp table, tracing which recurrence branch was taken at each cell
    c) Rerun the entire algorithm with a different recurrence
    d) Use a completely unrelated technique

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-a, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-b, 19-b, 20-b

---

## 19.12 20 Coding Problems

**Easy**

1. Implement `uniquePaths` from memory (section 19.1), then the O(n)-space optimized version.
2. Given a grid with some obstacles, adapt `uniquePaths` to count paths while treating obstacle cells as impassable (dp value 0).
3. Given a grid of costs, find the minimum cost path from top-left to bottom-right, moving only right or down.
4. Implement `longestCommonSubsequence` from memory (section 19.2).
5. Given two strings, determine if one is a subsequence of the other (a simpler special case related to LCS).

**Medium**

6. Implement `minDistance` (Edit Distance) from memory (section 19.3), and verify against a known example.
7. Implement `knapsack` (0/1 Knapsack, full 2D version) from memory (section 19.4).
8. Implement the space-optimized 1D version of Knapsack from memory, being careful about the backward iteration direction.
9. Given two strings, find the length of their longest common SUBSTRING (contiguous, unlike LCS), and contrast the recurrence with LCS's in a comment.
10. Given two strings, find the minimum number of deletions required to make them equal (hint: relates directly to LCS length).

**Hard**

11. Given the completed LCS dp table, write a function to reconstruct the ACTUAL longest common subsequence string (not just its length), by walking backward through the table.
12. Given the completed Edit Distance dp table, write a function to reconstruct the actual sequence of operations (insert/delete/replace) used to transform one string into the other.
13. Implement "Shortest Common Supersequence": given two strings, find the shortest string that has both as subsequences, building on your LCS implementation.
14. Given a set of numbers and a target sum, determine if the set can be partitioned into two subsets with equal sum (a direct application of the Subset Sum / Knapsack-style DP from Chapter 18/19).
15. Implement the "unbounded knapsack" variant (each item can be used unlimited times, unlike 0/1 Knapsack), and explicitly contrast its loop-order/iteration-direction requirements against the 0/1 version's backward-iteration requirement.

**Interview Level**

16. **(Google-level)** Given a document similarity checker requirement, use Edit Distance to compute a similarity score between two text documents, and discuss in comments the practical limitations of character-level edit distance for genuinely semantic (not just textual) similarity.
17. **(Amazon-level)** Given a warehouse packing problem (items with weights/values, truck capacity), implement 0/1 Knapsack to maximize shipped value, and extend it to also report WHICH items were selected (not just the total value), using backward table reconstruction.
18. **(Microsoft-level)** Given a DNA sequence alignment task (two genetic sequences), use a variant of Edit Distance (with different costs for different mismatch types, a realistic bioinformatics requirement) to compute an optimal alignment score.
19. **(Meta-level)** Given two users' post histories (as sequences of topic tags), use LCS to compute a "content similarity" score between users, useful for a friend-suggestion or content-recommendation feature.
20. **(Netflix-level)** Design a "recommendation path" system: given a grid representing content categories a user could navigate through (browsing paths), use grid DP to count and find the highest-engagement path through the category grid, extending the basic path-counting DP to a path-optimization variant (maximum sum path, not just path count).

---

## 19.13 5 Interview Questions

1. "Implement Longest Common Subsequence, and explain the recurrence in plain English." (Tests the "match diagonal, else max of neighbors" understanding, not just code recall.)
2. "Walk me through Edit Distance's recurrence and explain what each of the three terms represents." (Tests genuine understanding of insert/delete/replace mapping, not memorization.)
3. "Implement 0/1 Knapsack, and tell me how it relates to House Robber from Chapter 18." (Tests the generalization insight — resource-constrained include/exclude DP.)
4. "If you space-optimize Knapsack to a 1D array, what direction must you iterate, and why?" (Tests the critical backward-iteration correctness subtlety.)
5. "How would you count the number of paths in a grid, and how does this relate to graph theory?" (Tests the implicit-DAG connection back to Chapters 11 and 13.)

---

## 19.14 3 Real Projects

1. **Complete 2D DP Problem Library**: Implement Grid Paths, LCS, Edit Distance, and 0/1 Knapsack (both full 2D and space-optimized 1D versions) in a single library, with a self-check script verifying the 1D and 2D versions of each produce identical results.
2. **Diff Tool**: Build a small Node.js CLI tool that takes two text files and uses Edit Distance's backward-table-reconstruction technique (coding problem #12) to report the actual sequence of insert/delete/replace operations needed to transform one into the other — a genuine, practical diff tool built entirely from this chapter's algorithm.
3. **Knapsack Packing Optimizer**: Build a tool implementing 0/1 Knapsack with item selection reporting (coding problem #17), taking a list of items with weights/values and a capacity, and reporting both the maximum achievable value AND the specific items chosen to achieve it.

---

## 19.15 Further Reading

- Vladimir Levenshtein's original 1965 paper introducing the edit distance metric that bears his name.
- Search "Wagner-Fischer algorithm" for the specific dynamic programming formulation of Edit Distance covered in this chapter, and its formal computational complexity history.
- Steven Skiena, *The Algorithm Design Manual*, chapters on dynamic programming and string algorithms, for additional real-world framing of LCS and Edit Distance applications in bioinformatics specifically.
- LeetCode's "Dynamic Programming" problem tag filtered to 2D DP problems (Unique Paths, Longest Common Subsequence, Edit Distance, and the various Knapsack-family problems), for extensive additional practice.

---

*End of Chapter 19. Next: Chapter 20 will cover Greedy Algorithms — the technique of making the locally optimal choice at each step, when and why it provably produces a globally optimal result, contrasted directly against this chapter's DP approach for the same problem families, including activity selection, Huffman coding, and the classic "greedy vs. DP" interval scheduling comparison.*

**Say "Continue to the next chapter" when ready.**
