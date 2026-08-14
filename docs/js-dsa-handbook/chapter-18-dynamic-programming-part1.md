# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 18: The Dynamic Programming Masterclass, Part 1 — One-Dimensional DP

---

## 18.0 You Already Understand Dynamic Programming — You Just Haven't Named It Yet

Here is the single most reassuring, most important sentence in this chapter: **you built your first dynamic programming algorithm in Chapter 2, section 2.5, when you memoized Fibonacci.** Dynamic Programming (DP) is not a mysterious new universe of technique — it is the direct, systematic extension of exactly that insight: **recursive problems with overlapping sub-problems can be solved dramatically faster by never recomputing the same answer twice.** This chapter and the next formalize that single idea into a complete, repeatable framework, worked through a large family of classic problems.

---

## 18.1 The Formal Definition and the Two Required Properties

**Definition:** Dynamic Programming is a technique for solving problems by breaking them into overlapping sub-problems, solving each unique sub-problem exactly once, and storing (caching) its result for reuse.

A problem is a good candidate for DP if and only if it has **both** of these properties:

### 18.1.1 Optimal Substructure

**Definition:** A problem has optimal substructure if an optimal solution to the problem can be constructed from optimal solutions to its sub-problems.

### 18.1.2 Overlapping Sub-problems

**Definition:** A problem has overlapping sub-problems if a naive recursive solution solves the *exact same* sub-problem multiple times.

### 🧠 Memory Trick: Contrast With Divide and Conquer

You might notice this sounds similar to Merge Sort (Chapter 15) — recursively breaking a problem into smaller pieces. **The crucial distinguishing factor: Merge Sort's sub-problems (the left half and right half) never overlap — they're entirely disjoint.** DP is specifically for situations where the *same* sub-problem gets revisited repeatedly through different paths, which is precisely why caching pays off. If sub-problems don't overlap, memoization buys you nothing (there's nothing to reuse), and you're just doing plain divide-and-conquer.

### 🎯 Interview Pattern: The Diagnostic Test

Whenever you write a brute-force recursive solution to a problem, ask: **"if I drew the full recursion tree, would any node (representing a specific sub-problem, defined by its specific input parameters) appear more than once?"** If yes — DP applies, and memoizing will help. If every node in the tree is genuinely unique, DP offers no speedup (though the problem might still benefit from other techniques, like the divide-and-conquer chapters already covered).

---

## 18.2 The Five-Step DP Framework

This is the systematic recipe this chapter will apply to every problem, worth memorizing as a checklist you run through explicitly, every single time:

1. **Define the sub-problem.** What does `f(i)` (or `f(i, j)` for 2D — next chapter) actually *mean*, in plain English? Get this precise before writing any code.
2. **Write the recurrence relation.** How does `f(i)` relate to `f(i-1)`, `f(i-2)`, etc.? This is the "leap of faith" from Chapter 2, applied explicitly.
3. **Identify the base case(s).** What is `f(0)` or `f(1)` directly, with no further recursion needed?
4. **Decide: top-down (memoization) or bottom-up (tabulation)?** Both compute the same answer; the trade-offs are covered in section 18.3.
5. **Determine the final answer's location.** Is it `f(n)`? The maximum over all `f(i)`? Something else entirely? Don't assume — verify against the problem's actual question.

---

## 18.3 Top-Down (Memoization) vs. Bottom-Up (Tabulation)

### 18.3.1 Top-Down: Recursion Plus a Cache (Direct Extension of Chapter 2)

```javascript
function fibTopDown(n, memo = new Map()) {
  if (memo.has(n)) return memo.get(n);
  if (n <= 1) return n;

  const result = fibTopDown(n - 1, memo) + fibTopDown(n - 2, memo);
  memo.set(n, result);
  return result;
}
```

This is **exactly** Chapter 2's memoized Fibonacci, verbatim. Nothing new has been added yet — we're establishing that top-down DP is simply "recursion, with the five-step framework applied explicitly and consciously."

### 18.3.2 Bottom-Up: Building the Answer Iteratively From the Base Case Upward

```javascript
function fibBottomUp(n) {
  if (n <= 1) return n;

  const dp = new Array(n + 1);
  dp[0] = 0;
  dp[1] = 1;

  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2]; // the SAME recurrence relation, just computed FORWARD, not recursively
  }

  return dp[n];
}
```

### 🧠 Memory Trick: Same Recurrence, Opposite Direction

**Top-down starts at the answer you want (`n`) and recursively works backward toward the base case, caching results as a side effect of the recursion.** **Bottom-up starts at the base case and iteratively works forward toward the answer you want, building a table (`dp[]`) explicitly, one entry at a time.** Both use the *exact same* recurrence relation (`dp[i] = dp[i-1] + dp[i-2]`) — the only difference is direction and mechanism (recursive calls with a cache, versus an explicit loop filling an array).

### 📌 Quick Revision: Top-Down vs. Bottom-Up Trade-offs

| | Top-Down (Memoization) | Bottom-Up (Tabulation) |
|---|---|---|
| Mechanism | Recursion + cache (`Map`, Chapter 4) | Iterative loop + array (`dp[]`) |
| Space | O(n) cache + **O(n) call stack** (Chapter 2's lesson!) | O(n) array, **O(1) call stack** (no recursion at all) |
| Computes only what's needed? | **Yes** — only sub-problems actually reached by the recursion get computed | **No** — computes every `dp[i]` from `0` to `n`, even if some aren't strictly necessary for the final answer |
| Easier to write first? | **Often yes** — directly mirrors the natural recursive problem statement | Requires figuring out the correct iteration order upfront |
| Risk of stack overflow (Chapter 2!) | **Yes**, for very large `n` | **No** |

### 🔥 Interview Tip

The professional, complete answer to "which should I use?": **"I'll typically start by writing the top-down recursive solution first, since it directly mirrors the problem's natural recursive definition and is usually easier to get correct quickly. Once I've verified correctness, I'll convert to bottom-up if I'm concerned about call stack depth (Chapter 2's real JavaScript stack limit) or want to guarantee I'm not doing unnecessary work computing sub-problems the top-down version might skip."** Demonstrating fluency converting between both forms, and knowing precisely why you'd choose one over the other, is a stronger signal than only ever knowing one style.

---

## 18.4 Worked Problem 1: Climbing Stairs

**The problem:** you're climbing a staircase with `n` steps, and can climb either 1 or 2 steps at a time. How many distinct ways can you reach the top?

### Step 1: Define the Sub-problem

`f(i)` = the number of distinct ways to reach step `i`.

### Step 2: The Recurrence Relation

To reach step `i`, your very last move was either a 1-step (coming from step `i-1`) or a 2-step (coming from step `i-2`). Every distinct way to reach step `i` is accounted for by exactly one of these two cases, so: **`f(i) = f(i-1) + f(i-2)`.**

### 🎯 Interview Pattern: Recognizing "This Is Just Fibonacci in Disguise"

Notice the recurrence is *identical* to Fibonacci's! This is an extremely common, valuable pattern-recognition moment: **many DP problems, once you correctly define `f(i)`, reduce to a recurrence you've already seen.** Training your instinct to notice "wait, this recurrence looks familiar" is a genuine skill this chapter aims to build, directly extending Chapter 7's "same shape, different words" lesson from fast/slow pointers.

### Step 3: Base Cases

`f(0) = 1` (there's exactly one way to be at the ground: do nothing). `f(1) = 1` (exactly one way to reach step 1: a single 1-step).

```javascript
function climbStairs(n) {
  if (n <= 1) return 1;

  const dp = new Array(n + 1);
  dp[0] = 1;
  dp[1] = 1;

  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }

  return dp[n];
}

console.log(climbStairs(5)); // 8
```

### Dry Run

```
dp[0]=1, dp[1]=1
dp[2] = dp[1]+dp[0] = 1+1 = 2
dp[3] = dp[2]+dp[1] = 2+1 = 3
dp[4] = dp[3]+dp[2] = 3+2 = 5
dp[5] = dp[4]+dp[3] = 5+3 = 8

Final: 8 distinct ways to climb 5 stairs.
```

### 🚀 Pro Tip: The Space Optimization That Applies to Nearly Every 1D DP Problem

Notice `dp[i]` only ever depends on the **two most recent** previous values (`dp[i-1]` and `dp[i-2]`) — not the entire array history. This is an extremely common, high-value optimization: **you rarely need to store the entire `dp` array; often, tracking just the last one or two values in plain variables suffices.**

```javascript
function climbStairsOptimized(n) {
  if (n <= 1) return 1;

  let prev2 = 1; // represents f(0)
  let prev1 = 1; // represents f(1)

  for (let i = 2; i <= n; i++) {
    const current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }

  return prev1;
}
// Time: O(n)   Space: O(1) — down from O(n)!
```

### 🔥 Interview Tip

Always ask, after getting a correct O(n)-space bottom-up solution: **"does `dp[i]` only depend on a small, fixed number of previous entries, rather than the entire array so far?"** If yes, you can almost always compress the DP table down to O(1) space using a small, fixed number of tracking variables — a genuinely impressive, frequently-expected follow-up optimization in interviews.

---

## 18.5 Worked Problem 2: House Robber

**The problem:** given an array of non-negative integers representing money in houses along a street, determine the maximum amount you can rob **without robbing two adjacent houses** (an alarm triggers if two adjacent houses are both robbed).

### Step 1: Define the Sub-problem

`f(i)` = the maximum amount robbable considering only houses `0` through `i` (inclusive).

### Step 2: The Recurrence Relation — The "To Include or Exclude" Decision

At house `i`, you face exactly one binary decision, directly echoing Chapter 2's subset-generation "include or exclude" framing: **rob house `i`, or don't.**

- If you **rob** house `i`: you get `nums[i]` **plus** whatever the best result was up through house `i-2` (you *cannot* have also robbed house `i-1`, or the alarm triggers).
- If you **don't rob** house `i`: you get exactly `f(i-1)` (the best result achievable without touching house `i` at all).

**`f(i) = max(nums[i] + f(i-2), f(i-1))`**

```javascript
function rob(nums) {
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];

  const dp = new Array(nums.length);
  dp[0] = nums[0];
  dp[1] = Math.max(nums[0], nums[1]);

  for (let i = 2; i < nums.length; i++) {
    dp[i] = Math.max(nums[i] + dp[i - 2], dp[i - 1]);
  }

  return dp[nums.length - 1];
}

console.log(rob([2, 7, 9, 3, 1])); // 12  (rob houses 0, 2, 4: 2+9+1=12)
```

### Dry Run

```
nums = [2, 7, 9, 3, 1]

dp[0] = 2
dp[1] = max(2, 7) = 7
dp[2] = max(nums[2]+dp[0], dp[1]) = max(9+2, 7) = max(11, 7) = 11
dp[3] = max(nums[3]+dp[1], dp[2]) = max(3+7, 11) = max(10, 11) = 11
dp[4] = max(nums[4]+dp[2], dp[3]) = max(1+11, 11) = max(12, 11) = 12

Final: 12 ✓ (matches robbing houses at indices 0, 2, 4: values 2+9+1=12)
```

### 🎯 Interview Pattern: The "Include or Exclude" DP Family

House Robber is the canonical member of an entire family of DP problems built on exactly this "at each position, either include it (and skip some constrained neighborhood) or exclude it" decision — directly the same conceptual shape as Chapter 8's coding problem #19 (maximum influence sum in a tree, with no two adjacent selected), previewed there and now formally solved here. Recognizing this shared "include-or-exclude with a constraint" skeleton across seemingly different problems is exactly the pattern-transfer skill this book has built toward since Chapter 1.

### 🚀 Pro Tip: Space Optimization, Again

Exactly like Climbing Stairs, `dp[i]` only depends on `dp[i-1]` and `dp[i-2]` — compressible to O(1) space using two tracking variables, following the identical optimization pattern from section 18.4.

```javascript
function robOptimized(nums) {
  let prev2 = 0;
  let prev1 = 0;

  for (const num of nums) {
    const current = Math.max(num + prev2, prev1);
    prev2 = prev1;
    prev1 = current;
  }

  return prev1;
}
```

---

## 18.6 Worked Problem 3: Coin Change (Minimum Coins)

**The problem:** given coin denominations and a target amount, find the **minimum** number of coins needed to make that amount (or determine it's impossible).

### Step 1: Define the Sub-problem

`f(amount)` = the minimum number of coins needed to make exactly `amount`.

### Step 2: The Recurrence Relation

For each coin denomination `c`, if we use one of that coin, we need `f(amount - c)` more coins to cover the rest. We want the **minimum** over all possible first-coin choices: **`f(amount) = 1 + min(f(amount - c))` for every coin `c` where `c <= amount`.**

### Step 3: Base Case

`f(0) = 0` (zero coins needed to make an amount of zero).

```javascript
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let currentAmount = 1; currentAmount <= amount; currentAmount++) {
    for (const coin of coins) {
      if (coin <= currentAmount) {
        dp[currentAmount] = Math.min(dp[currentAmount], dp[currentAmount - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}

console.log(coinChange([1, 2, 5], 11)); // 3 (5+5+1)
```

### Dry Run (Abbreviated)

```
coins = [1,2,5], amount = 11
dp = [0, Inf, Inf, ..., Inf] (length 12)

currentAmount=1: coin=1(<=1): dp[1]=min(Inf, dp[0]+1)=1. coin=2,5: too big, skip.
currentAmount=2: coin=1: dp[2]=min(Inf,dp[1]+1)=2. coin=2: dp[2]=min(2,dp[0]+1)=min(2,1)=1. coin=5: skip.
currentAmount=3: coin=1: dp[3]=min(Inf,dp[2]+1)=2. coin=2: dp[3]=min(2,dp[1]+1)=min(2,2)=2. coin=5: skip.
...
currentAmount=5: coin=1: candidate dp[4]+1. coin=2: candidate dp[3]+1. coin=5: candidate dp[0]+1=1.
  dp[5] = 1 (using a single 5-coin!)
...
currentAmount=10: dp[10] = 2 (5+5)
currentAmount=11: coin=1: dp[10]+1=3. coin=2: dp[9]+1. coin=5: dp[6]+1.
  Best turns out to be dp[10]+1 = 3 (5+5+1) -- matches!

Final: dp[11] = 3 ✓
```

### ⚠ Common Mistake: Confusing "Minimum Coins" With "Number of Ways" (Two Genuinely Different Recurrences!)

This is an extremely common, important distinction. **"Minimum coins to make amount X" and "number of DIFFERENT ways to make amount X" are structurally different problems requiring different recurrences and, crucially, different loop nesting order:**

```javascript
// COIN CHANGE 2: Count the NUMBER OF WAYS (not minimum coins) to make `amount`
function coinChangeWays(coins, amount) {
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1; // exactly ONE way to make amount 0: use no coins at all

  // CRITICAL: coins on the OUTER loop, amount on the INNER loop!
  for (const coin of coins) {
    for (let currentAmount = coin; currentAmount <= amount; currentAmount++) {
      dp[currentAmount] += dp[currentAmount - coin];
    }
  }

  return dp[amount];
}

console.log(coinChangeWays([1, 2, 5], 5)); // 4 ways: (1,1,1,1,1), (1,1,1,2), (1,2,2), (5)
```

### 🧠 Memory Trick: Why the Loop Order Flips for "Counting Ways"

This is genuinely subtle and worth internalizing carefully: **for "minimum coins," the order of coins tried doesn't matter — we just want the best result, regardless of which coin was considered "first."** But **for "counting distinct ways," if `amount` were the outer loop and `coins` the inner loop, we'd count the same *combination* of coins multiple times in different orders** (e.g., counting "1 then 2" and "2 then 1" as different ways to make 3, when they represent the *same combination* of coins used). **Putting coins on the outer loop ensures each coin denomination is "locked in" as available before moving to the next, counting combinations, not permutations of combinations** — directly echoing Chapter 17's combinations-vs-permutations distinction (does order matter?), now appearing inside a DP loop-ordering decision rather than a backtracking loop structure.

### 🔥 Interview Tip

This exact loop-order subtlety is one of the most commonly tested "gotcha" details in coin-change-family DP problems. **Always explicitly ask yourself: "am I counting ways (where reordering the same coins shouldn't create new counted possibilities) or finding an optimal value (where order genuinely doesn't matter to the final answer)?"** — and adjust your loop nesting accordingly, stating the reasoning out loud.

---

## 18.7 Worked Problem 4: Longest Increasing Subsequence (LIS)

**The problem:** given an array of integers, find the length of the longest strictly increasing subsequence (elements need not be contiguous, but must maintain their original relative order).

### Step 1: Define the Sub-problem

`f(i)` = the length of the longest increasing subsequence **that ends exactly at index `i`.**

### ⚠ Common Mistake: A Subtle But Critical Definition Detail

Notice the careful phrasing: "ending **exactly** at index `i`," not "considering only elements up to index `i`." **This distinction matters enormously** — unlike House Robber or Coin Change, where `f(i)` naturally represents "the best answer using only the first `i` elements," LIS requires anchoring the definition to sequences that specifically terminate at position `i`, because the *final answer* isn't simply `f(n-1)` — it's the **maximum** of `f(i)` across **all** indices `i` (since the longest increasing subsequence overall might end anywhere, not necessarily at the very last element).

### Step 2: The Recurrence Relation

`f(i) = 1 + max(f(j))` for every `j < i` where `nums[j] < nums[i]` (extend the best subsequence ending at any earlier, smaller element) — or just `1` alone, if no such `j` exists (the element starts its own subsequence).

```javascript
function lengthOfLIS(nums) {
  const dp = new Array(nums.length).fill(1); // every element is, at minimum, a subsequence of length 1 (itself)

  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }

  return Math.max(...dp); // the answer is the MAXIMUM across ALL dp[i], not just dp[n-1]!
}

console.log(lengthOfLIS([10, 9, 2, 5, 3, 7, 101, 18])); // 4 ([2,3,7,101] or [2,3,7,18])
```

### Dry Run (Abbreviated)

```
nums = [10, 9, 2, 5, 3, 7, 101, 18]
dp = [1, 1, 1, 1, 1, 1, 1, 1]  initially

i=1 (9): j=0 (10): 10<9? No. dp[1] stays 1.
i=2 (2): j=0(10),j=1(9): neither < 2. dp[2] stays 1.
i=3 (5): j=0(10)No, j=1(9)No, j=2(2): 2<5 YES -> dp[3]=max(1,dp[2]+1)=max(1,2)=2
i=4 (3): j=2(2): 2<3 YES -> dp[4]=max(1,dp[2]+1)=2. j=3(5): 5<3? No.
i=5 (7): j=2(2):2<7->dp[5]=2. j=3(5):5<7->dp[5]=max(2,dp[3]+1)=max(2,3)=3. j=4(3):3<7->dp[5]=max(3,dp[4]+1)=max(3,3)=3
i=6 (101): every earlier element is < 101! dp[6] = max(dp[0..5]) + 1 = max(1,1,1,2,2,3)+1 = 3+1 = 4
i=7 (18): j=0..5 all < 18 except maybe... 10<18,9<18,2<18,5<18,3<18,7<18 all YES, 101<18 NO
  dp[7] = max(dp[0..5])+1 = 3+1 = 4

Final dp = [1,1,1,2,2,3,4,4]
Answer = max(dp) = 4 ✓
```

- **Time**: O(n²) — the nested loop, exactly Chapter 1's "nested loops multiply" rule.
- **Space**: O(n) for the `dp` array.

### 🚀 Pro Tip: An O(n log n) Optimization Exists (Binary Search on the Answer, Revisited From Chapter 16!)

There's a genuinely more advanced O(n log n) technique for LIS using a cleverly-maintained array of "smallest tail values for increasing subsequences of each length," combined with **binary search (Chapter 16!)** to find where each new element belongs. This is worth knowing exists — it's a favorite "can you do better than O(n²)" follow-up question — even though the O(n²) DP version is the expected baseline solution and the one worth having fully internalized first.

---

## 18.8 Edge Cases and Gotchas Checklist for 1D DP Problems

1. **Empty input array.** Verify your base cases handle `nums.length === 0` gracefully (often returning `0` directly, before the DP loop even begins).
2. **Single-element input.** Verify `dp[0]` (or equivalent) is set correctly and directly, without relying on a recurrence that would need a non-existent `dp[-1]`.
3. **Confusing "count the ways" with "find the optimal value"** — these require genuinely different recurrences and, in coin-change-style problems, different loop nesting orders (section 18.6).
4. **Forgetting the final answer isn't always `dp[n-1]`** — LIS (section 18.7) is the canonical example where the answer is `max(dp)` across all indices, not the last computed entry.
5. **Off-by-one errors in array sizing** — should your `dp` array be size `n` or `n+1`? This depends entirely on whether index `0` represents "zero items considered" (needing an extra slot) or "the first item itself."
6. **Missing the space-optimization opportunity** — always check whether `dp[i]` depends on only a small, fixed window of previous entries (nearly always true for the "linear chain" problems in this chapter), enabling an O(1)-space rewrite.
7. **Negative numbers or zero in the input** — for House-Robber-style and Coin-Change-style problems specifically, verify your recurrence and base cases still behave correctly if the input includes zero values or (where the problem allows) negative values.

---

## 18.9 Chapter Summary

This chapter delivered on the promise made in its opening line: dynamic programming is not a new universe of technique, but the direct, systematic formalization of the memoization insight first built in Chapter 2. We established the two required properties — **optimal substructure** and **overlapping sub-problems** — and a genuinely useful diagnostic test: draw the naive recursion tree, and ask whether any node (any specific sub-problem input) repeats; if so, DP applies. We contrasted this precisely against divide-and-conquer (Merge Sort, Chapter 15), whose sub-problems are disjoint by design, making memoization structurally useless there — a distinction worth being crisp about, since conflating "recursive" with "DP-applicable" is a common conceptual error.

We built the **five-step DP framework** (define the sub-problem in plain English, write the recurrence, identify base cases, choose top-down or bottom-up, locate the final answer) as a repeatable checklist, and worked it explicitly across four canonical problems. We formalized **top-down (memoization)** versus **bottom-up (tabulation)** as two mechanisms computing the identical recurrence in opposite directions — recursion-plus-cache versus an explicit forward-filled table — with top-down's genuine risk of Chapter 2's call-stack depth limit weighed against its "only computes what's actually needed" efficiency, and bottom-up's guaranteed stack safety weighed against computing every sub-problem regardless of necessity.

Working through Climbing Stairs, we discovered its recurrence is literally Fibonacci in disguise — a direct, concrete lesson in pattern transfer across superficially different problem statements — and introduced the **O(1) space optimization** (tracking only the last one or two values in plain variables rather than a full array) that applies whenever `dp[i]` depends on only a small, fixed window of prior entries, which we then reapplied identically to House Robber. House Robber itself introduced the **"include or exclude" DP family**, directly connecting back to Chapter 2's subset-generation framing and Chapter 8's tree-shaped preview of the same idea. Coin Change surfaced one of this chapter's most important, most commonly-tested distinctions: **counting the number of ways** versus **finding an optimal (minimum/maximum) value** are genuinely different recurrences, and for coin-counting problems specifically, require a different loop nesting order — coins outer, amount inner — to avoid over-counting reordered-but-identical combinations, a subtlety directly echoing Chapter 17's combinations-versus-permutations distinction now appearing inside DP loop structure. Finally, Longest Increasing Subsequence taught the critical lesson that a sub-problem's definition must sometimes be anchored precisely ("ending exactly at index i," not "considering the first i elements"), and that the final answer is not always `dp[n-1]` — sometimes it's the maximum across the entire table — while previewing an O(n log n) binary-search-based optimization (Chapter 16, once again) worth knowing exists beyond the O(n²) baseline.

---

## 18.10 Revision Notes

- DP requires optimal substructure AND overlapping sub-problems; if the recursion tree has no repeated nodes, DP offers no benefit (contrast with disjoint-subproblem divide-and-conquer, e.g. Merge Sort).
- The five-step framework: define the sub-problem precisely, write the recurrence, identify base cases, choose top-down/bottom-up, locate where the final answer actually lives.
- Top-down (memoization) risks Chapter 2's call-stack depth limit but only computes needed sub-problems; bottom-up (tabulation) is stack-safe but computes the full table regardless of necessity.
- Climbing Stairs' recurrence is literally Fibonacci — train the instinct to recognize familiar recurrences in new problem clothing.
- Many 1D DP problems (Climbing Stairs, House Robber) can be space-optimized from O(n) to O(1) by tracking only the last one or two values, since dp[i] depends on only a small fixed window of prior entries.
- House Robber is the canonical "include or exclude" DP problem, directly connecting to Chapter 2's subset generation and Chapter 8's tree-DP preview.
- Coin Change: "minimum coins" and "count the ways" are different recurrences; counting ways requires coins as the OUTER loop (amount inner) to avoid counting reordered-but-identical combinations — directly echoing Chapter 17's combinations-vs-permutations distinction.
- LIS requires precisely anchoring the sub-problem definition ("ending exactly at index i") and taking the maximum across the whole dp table as the final answer, not dp[n-1] — plus an O(n log n) binary-search-based optimization exists beyond the O(n²) baseline.

---

## 18.11 Mind Map (ASCII)

```
                        DYNAMIC PROGRAMMING (PART 1: 1D)
                                       |
        +------------------+----------+----------+-----------------------+
        |                  |                     |                       |
  TWO REQUIRED        FIVE-STEP              TOP-DOWN vs             WORKED PROBLEMS
  PROPERTIES          FRAMEWORK              BOTTOM-UP                    |
        |                  |                     |               Climbing Stairs
  Optimal          1. Define f(i)        Memoization: recursion   = Fibonacci in
  substructure     2. Recurrence          + cache (Ch.2/Ch.4)     disguise! ->
  Overlapping      3. Base cases          Ch.2 stack-depth risk   O(1) space trick
  sub-problems     4. Top-down or             |                       |
  (diagnostic:      bottom-up?           Tabulation: iterative    House Robber =
  does the naive   5. Where's the         table-fill, forward     "include or
  recursion tree    ANSWER? (not          direction, NO stack      exclude" family
  repeat nodes?)    always dp[n-1]!       risk, computes ALL       (Ch.2/Ch.8 tie-in)
        |                                 sub-problems                  |
  Contrast w/                                                    Coin Change:
  Merge Sort's                                                   MIN coins vs
  DISJOINT                                                       COUNT ways =
  sub-problems                                                   DIFFERENT recurrence
  (Ch.15) --                                                     + loop order matters!
  no overlap =                                                   (coins OUTER for
  no DP benefit                                                  counting -- echoes
                                                                  Ch.17 combos!)
                                                                        |
                                                                  LIS: f(i) = ending
                                                                  AT i specifically;
                                                                  answer = max(dp),
                                                                  NOT dp[n-1]!
                                                                  O(n^2) baseline,
                                                                  O(n log n) via
                                                                  binary search (Ch.16)
```

---

## 18.12 Cheat Sheet

```
DP QUALIFICATION TEST
=========================
Optimal substructure?  Can an optimal answer be built from optimal sub-answers?
Overlapping subproblems? Does the naive recursion tree repeat the SAME sub-problem?
BOTH required -- if subproblems are disjoint (like Merge Sort), DP offers nothing.

FIVE-STEP FRAMEWORK
========================
1. Define f(i) in PLAIN ENGLISH first.
2. Write the recurrence: f(i) = ___ in terms of f(i-1), f(i-2), etc.
3. Base case(s): f(0) = ?, f(1) = ?
4. Top-down (recursion+cache) or bottom-up (iterative table)?
5. WHERE is the final answer? f(n)? max(all f(i))? Something else? VERIFY, don't assume.

TOP-DOWN vs BOTTOM-UP
=========================
Top-down:  easier to write from the recursive definition, only computes NEEDED
           subproblems, but risks Ch.2's call stack depth limit for large n.
Bottom-up: always stack-safe, but computes the WHOLE table regardless of need.

SPACE OPTIMIZATION CHECK (do this for EVERY 1D DP solution)
================================================================
"Does dp[i] depend on only the last 1-2 entries?" If yes -> compress to O(1)
space using plain tracking variables instead of a full array.

CLASSIC RECURRENCES
=======================
Climbing Stairs:  f(i) = f(i-1) + f(i-2)                    [Fibonacci!]
House Robber:     f(i) = max(nums[i] + f(i-2), f(i-1))       [include/exclude]
Coin Change (min):f(amt) = 1 + min(f(amt-c)) for each coin c
Coin Change (ways): coins OUTER loop, amount INNER loop (order matters!)
LIS:              f(i) = 1 + max(f(j)) for j<i where nums[j]<nums[i]
                  ANSWER = max(f(i)) across ALL i, not f(n-1)!
```

---

## 18.13 Key Takeaways

1. DP requires both optimal substructure and overlapping sub-problems — the "repeated node in the recursion tree" test is the practical diagnostic.
2. The five-step framework (define, recur, base case, top-down/bottom-up, locate the answer) applies systematically to every DP problem in this chapter and the next.
3. Top-down risks stack depth but computes only needed sub-problems; bottom-up is stack-safe but computes everything — know both and when to prefer each.
4. Always check whether dp[i] depends on only a small fixed window of prior entries, enabling an O(n)-to-O(1) space optimization.
5. "Count the ways" and "find the optimal value" require genuinely different recurrences and sometimes different loop orders — never assume they're interchangeable.

---

## 18.14 20 Multiple Choice Questions

1. What two properties must a problem have for Dynamic Programming to apply effectively?
   a) Sortedness and uniqueness
   b) Optimal substructure and overlapping sub-problems
   c) Recursion and iteration
   d) Symmetry and monotonicity

2. What is the practical diagnostic test for "overlapping sub-problems"?
   a) Check if the array is sorted
   b) Draw the naive recursion tree and check if any specific sub-problem (node) repeats
   c) Check if the problem uses a loop
   d) Check if the input is an array or a string

3. Why doesn't Merge Sort (Chapter 15) benefit from memoization/DP?
   a) Merge Sort doesn't use recursion
   b) Its sub-problems (left half, right half) are disjoint and never overlap
   c) Merge Sort is already O(1)
   d) DP only applies to string problems

4. What is "top-down" DP also known as?
   a) Tabulation
   b) Memoization
   c) Backtracking
   d) Greedy algorithms

5. What is "bottom-up" DP also known as?
   a) Memoization
   b) Tabulation
   c) Recursion
   d) Divide and conquer

6. What is a genuine risk of top-down DP that bottom-up DP avoids?
   a) Incorrect results
   b) Call stack depth limits for large inputs (Chapter 2's real JavaScript constraint)
   c) Higher time complexity
   d) Inability to handle negative numbers

7. What is a genuine inefficiency of bottom-up DP that top-down avoids?
   a) It's always slower
   b) It computes every sub-problem in the table, even ones not strictly needed for the final answer
   c) It cannot be implemented in JavaScript
   d) It requires more code

8. What recurrence does the Climbing Stairs problem share with an earlier chapter's example?
   a) Binary search's halving recurrence
   b) The Fibonacci recurrence (f(i) = f(i-1) + f(i-2))
   c) Merge Sort's divide step
   d) Union-Find's path compression

9. What space optimization applies to Climbing Stairs and House Robber?
   a) None; they require O(n) space always
   b) Since dp[i] depends only on the last 1-2 entries, track them in plain variables for O(1) space
   c) Convert to a hash table
   d) Use a heap instead of an array

10. What is the "include or exclude" decision at the heart of House Robber?
    a) Whether to sort the array first
    b) At each house, either rob it (plus the best result from i-2) or skip it (best result from i-1)
    c) Whether to use recursion or iteration
    d) Whether the array has an even or odd length

11. What earlier chapter previewed the "include or exclude" pattern that House Robber formalizes?
    a) Chapter 15 (Sorting)
    b) Chapter 2 (subset generation) and Chapter 8 (tree DP preview)
    c) Chapter 6 (Stacks and Queues)
    d) Chapter 11 (Graphs)

12. What is the key difference between "minimum coins" and "counting the number of ways" in Coin Change problems?
    a) There is no difference; they use the same recurrence
    b) They require genuinely different recurrences, and counting ways requires a specific loop order to avoid over-counting
    c) Minimum coins is always faster
    d) Counting ways doesn't require DP at all

13. In Coin Change (counting ways), why must coins be the OUTER loop and amount the INNER loop?
    a) It's an arbitrary stylistic choice
    b) This ordering "locks in" each coin before moving to the next, counting combinations rather than order-dependent permutations of the same combination
    c) JavaScript requires this loop order for correctness
    d) It makes the code run in O(1) time

14. What earlier chapter's distinction does the coin-counting loop-order subtlety directly echo?
    a) Chapter 9's heap operations
    b) Chapter 17's combinations vs. permutations distinction
    c) Chapter 5's linked list reversal
    d) Chapter 13's topological sort

15. In Longest Increasing Subsequence, how must the sub-problem f(i) be precisely defined?
    a) The LIS considering only the first i elements
    b) The LIS ending EXACTLY at index i
    c) The LIS of the entire array
    d) The number of increasing pairs up to index i

16. Where is the final answer located in the LIS DP table, and why is this notable?
    a) Always at dp[n-1], like most 1D DP problems
    b) At max(dp) across ALL indices, since the longest subsequence might not end at the last element
    c) At dp[0]
    d) It requires a separate second pass with no relation to the dp table

17. What is the time complexity of the standard O(n²) LIS DP solution?
    a) O(n)
    b) O(n log n)
    c) O(n²)
    d) O(2^n)

18. What more advanced technique can optimize LIS to O(n log n)?
    a) A hash table
    b) Binary search (Chapter 16) combined with a cleverly maintained tails array
    c) A different sorting algorithm
    d) Multithreading

19. What should you verify before assuming a DP problem's answer is simply the last computed table entry?
    a) Nothing; it's always the last entry
    b) Whether the problem's actual question corresponds to dp[n-1], or requires a max/min/sum across the whole table instead
    c) That the array is sorted
    d) That all values are positive

20. What is the recommended practical approach when unsure whether to use top-down or bottom-up DP?
    a) Always use bottom-up, never top-down
    b) Start with top-down (mirrors the natural recursive definition), then convert to bottom-up if stack depth or efficiency concerns arise
    c) Always use top-down, never bottom-up
    d) Use both simultaneously in the same function

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-c, 18-b, 19-b, 20-b

---

## 18.15 20 Coding Problems

**Easy**

1. Implement `climbStairs` both top-down (memoized) and bottom-up, from memory (section 18.4).
2. Implement the O(1)-space optimized version of Climbing Stairs, from memory.
3. Given an array, use DP to find the maximum sum of any non-empty contiguous subarray (Kadane's Algorithm — a foundational 1D DP problem not yet covered explicitly; derive its recurrence using the five-step framework).
4. Implement `rob` (House Robber) both with a full dp array and the O(1)-space optimized version, from memory (section 18.5).
5. Given a triangle of numbers, use DP to find the minimum path sum from top to bottom, moving only to adjacent numbers on the row below.

**Medium**

6. Implement `coinChange` (minimum coins) from memory (section 18.6).
7. Implement `coinChangeWays` (counting ways) from memory, explicitly commenting on why the loop order differs from problem 6.
8. Implement `lengthOfLIS` from memory (section 18.7), and verify the "ending exactly at index i" definition by tracing through a small example by hand.
9. Given a string, use DP to determine the minimum number of deletions needed to make it a palindrome (hint: relates to Longest Palindromic Subsequence, previewed here ahead of full treatment in Chapter 19's 2D DP).
10. Given a "House Robber II" variant where houses are arranged in a CIRCLE (first and last house are now also adjacent), adapt the standard House Robber solution to handle this new constraint (hint: solve it as two separate linear House Robber sub-problems).

**Hard**

11. Given an array of integers, find the maximum product of any contiguous subarray (a trickier variant of Kadane's Algorithm, requiring tracking BOTH a running max AND running min, since a negative number can flip a very negative product into a very positive one).
12. Implement "Word Break": given a string and a dictionary of words, determine if the string can be segmented into a space-separated sequence of dictionary words, using 1D DP (directly connecting to Chapter 10's Trie chapter for an optimized dictionary lookup).
13. Given a set of numbers, determine if there's a subset that sums to exactly a given target value (the "Subset Sum" problem), using 1D DP over achievable sums.
14. Given an array representing stock prices over time, and allowing at most one transaction (one buy, one sell), find the maximum profit achievable using a single-pass DP approach.
15. Given an array representing stock prices, allowing UNLIMITED transactions (but not holding more than one share at a time), find the maximum total profit using DP.

**Interview Level**

16. **(Google-level)** Given a string of digits representing an encoded message (where 'A'=1, 'B'=2, ..., 'Z'=26), use DP to count the number of ways the string could be decoded, handling the tricky edge cases around '0' digits.
17. **(Amazon-level)** Given a list of jobs with start times, end times, and profits, use DP (combined with binary search, Chapter 16, to efficiently find the next compatible job) to find the maximum profit achievable by scheduling non-overlapping jobs.
18. **(Microsoft-level)** Given a budget and a list of investment opportunities each with a cost and expected return, use DP to determine the maximum achievable return without exceeding the budget (a direct preview of the 0/1 Knapsack problem, formalized in full in Chapter 19's 2D DP).
19. **(Meta-level)** Given a social media post's "engagement" over consecutive days, use a Kadane's-Algorithm-style DP approach to find the most engaging consecutive period (maximum subarray sum), and extend it to report the actual start/end days, not just the sum.
20. **(Netflix-level)** Design a "binge-watching" optimizer: given episode watch-times and a limited available time budget per day, use DP to maximize the total number of episodes watchable without exceeding daily time limits, framing this explicitly as a House-Robber-adjacent "include or exclude" decision problem.

---

## 18.16 5 Interview Questions

1. "What makes a problem a good candidate for dynamic programming?" (Tests understanding of optimal substructure and overlapping sub-problems, not just "it uses recursion.")
2. "Walk me through converting a recursive solution to a bottom-up DP solution." (Tests fluency between top-down and bottom-up, and the mechanics of the conversion.)
3. "This problem's dp array only ever needs the last two values — can you optimize the space complexity?" (Tests the O(n)-to-O(1) space-optimization instinct, applicable across most of this chapter's problems.)
4. "How would you count the number of ways to make change for an amount, versus finding the minimum number of coins?" (Tests the genuinely different recurrence and loop-order distinction from section 18.6.)
5. "In Longest Increasing Subsequence, why isn't the final answer simply dp[n-1]?" (Tests the precise sub-problem definition and answer-location care emphasized throughout this chapter.)

---

## 18.17 3 Real Projects

1. **Complete 1D DP Problem Library**: Implement every problem from this chapter (Climbing Stairs, House Robber, Coin Change both variants, LIS) in both top-down and bottom-up forms, with a self-check script verifying both forms produce identical results, and benchmarking stack depth safety on large inputs.
2. **DP Framework Walkthrough Tool**: Build a small CLI tool that, given a problem name from this chapter, prints out the explicit five-step framework applied to it (sub-problem definition, recurrence, base cases, chosen approach, answer location) as structured output — a genuinely useful personal study aid reinforcing the systematic process this chapter teaches.
3. **Coin Change Loop-Order Visualizer**: Build a tool that runs both the "minimum coins" and "counting ways" versions of Coin Change side by side on the same input, printing the full dp table after each step, to visually demonstrate exactly why the loop order matters for the counting-ways variant and doesn't for the minimum-coins variant.

---

## 18.18 Further Reading

- Richard Bellman's foundational work introducing the term "Dynamic Programming" itself, for historical context on the field's origin (also, notably, the same Bellman behind Chapter 12's Bellman-Ford algorithm).
- Steven Skiena, *The Algorithm Design Manual*, chapter on dynamic programming, for extensive additional problem framing and the "DP is just smart recursion" philosophy this chapter shares.
- Search "patience sorting LIS" for the O(n log n) Longest Increasing Subsequence technique previewed but not fully implemented in section 18.7.
- LeetCode's "Dynamic Programming" problem tag, filtered to "Easy" and "Medium" difficulty, for extensive additional 1D DP practice directly extending this chapter's worked examples.

---

*End of Chapter 18. Next: Chapter 19 will continue the Dynamic Programming Masterclass with Part 2 — Two-Dimensional DP, covering the 0/1 Knapsack problem, Longest Common Subsequence, Edit Distance, and grid-based path-counting problems, extending this chapter's five-step framework into problems requiring two-dimensional state.*

**Say "Continue to the next chapter" when ready.**
