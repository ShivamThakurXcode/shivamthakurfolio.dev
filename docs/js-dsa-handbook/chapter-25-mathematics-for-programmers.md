# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 25: Mathematics for Programmers — Number Theory, Combinatorics, and Game Theory

---

## 25.0 The Quiet Foundation Underneath Everything

Several algorithms in this book have quietly relied on mathematical facts without stopping to prove them: Chapter 4's hash function used a "multiply by an odd prime" strategy, Chapter 14's Union-Find relied on a rank-height inequality, Chapter 22's Rabin-Karp needed modular arithmetic to avoid overflow. This chapter makes that mathematical foundation explicit, building the number theory, combinatorics, and introductory game theory that a genuinely complete DSA education requires — and, true to this book's philosophy, always explaining *why* before *how*.

---

## PART A: NUMBER THEORY

## 25.1 GCD and LCM: The Euclidean Algorithm

**Definition:** The Greatest Common Divisor (GCD) of two integers is the largest integer that divides both without a remainder. The Least Common Multiple (LCM) is the smallest positive integer divisible by both.

### 25.1.1 The Euclidean Algorithm

```javascript
function gcd(a, b) {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function lcm(a, b) {
  return (a / gcd(a, b)) * b; // divide FIRST, then multiply — avoids unnecessary overflow risk
}

console.log(gcd(48, 18)); // 6
console.log(lcm(4, 6));   // 12
```

### 🧠 Memory Trick: Why `gcd(a, b) === gcd(b, a % b)`

The core mathematical fact making this work: **any number that divides both `a` and `b` must also divide `a % b`** (since `a % b` is just `a` with multiples of `b` repeatedly subtracted out, and if a divisor divides both `a` and `b`, it divides that difference too). This means `gcd(a, b)` and `gcd(b, a % b)` are always exactly equal — repeatedly applying this reduction shrinks the numbers rapidly until one becomes `0`, at which point the other is the answer.

### Dry Run

```
gcd(48, 18):
  a=48, b=18: a%b = 48%18 = 12. [a,b] = [18, 12]
  a=18, b=12: a%b = 18%12 = 6.  [a,b] = [12, 6]
  a=12, b=6:  a%b = 12%6 = 0.   [a,b] = [6, 0]
  b=0 -> loop ends. return a=6 ✓
```

### 🧮 Complexity: O(log(min(a,b)))

This is a genuinely fast algorithm — a direct consequence of a deep number-theoretic fact: **consecutive remainders in the Euclidean algorithm shrink by at least a factor related to the golden ratio at every two steps** (the worst case, requiring the most steps for a given magnitude, occurs with consecutive Fibonacci numbers — a lovely, if advanced, connection back to Chapter 2's very first recursion example).

---

## 25.2 Primality Testing and the Sieve of Eratosthenes

### 25.2.1 Naive Primality Testing

```javascript
function isPrimeNaive(n) {
  if (n < 2) return false;
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}
// Time: O(n) — checks every number up to n-1
```

### 🚀 Pro Tip: The Square Root Optimization

```javascript
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) { // only check up to sqrt(n)!
    if (n % i === 0) return false;
  }
  return true;
}
// Time: O(sqrt(n))
```

### 🧮 Why Checking Only Up to `√n` Is Sufficient

**If `n` has a divisor greater than `√n`, it must also have a corresponding divisor smaller than `√n`** (since divisors pair up: if `n = a × b`, and `a > √n`, then `b` must be `< √n`, or their product would exceed `n`). This means if no divisor exists below `√n`, none can exist above it either — checking up to `√n` alone is provably sufficient, a genuinely elegant, high-leverage optimization from O(n) to O(√n).

### 25.2.2 The Sieve of Eratosthenes: Finding All Primes Up to N Efficiently

**The problem:** find all prime numbers up to `n`. Calling `isPrime` individually for every number up to `n` costs O(n√n) total — the Sieve does dramatically better.

```javascript
function sieveOfEratosthenes(n) {
  const isPrimeArr = new Array(n + 1).fill(true);
  isPrimeArr[0] = isPrimeArr[1] = false;

  for (let i = 2; i * i <= n; i++) {
    if (isPrimeArr[i]) {
      for (let multiple = i * i; multiple <= n; multiple += i) {
        isPrimeArr[multiple] = false; // mark every multiple of a found prime as NOT prime
      }
    }
  }

  const primes = [];
  for (let i = 2; i <= n; i++) {
    if (isPrimeArr[i]) primes.push(i);
  }

  return primes;
}

console.log(sieveOfEratosthenes(30));
// [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
```

### 🧠 Memory Trick: "Cross Out Every Multiple of Every Prime You Find"

Starting from 2 (the first prime), cross out every multiple of 2 (4, 6, 8, ...). The next number not crossed out (3) must be prime — cross out its multiples. Continue: **any number that survives to be checked without having been crossed out by a smaller prime must itself be prime**, since if it had any smaller factor, that factor's multiples would have already eliminated it.

### 🚀 Pro Tip: Why Start Crossing Out From `i * i`, Not `2 * i`

A genuinely valuable optimization worth understanding, not just copying: **by the time we're processing prime `i`, every smaller multiple of `i` (like `2i`, `3i`, ..., up to `(i-1) × i`) has *already* been crossed out by a smaller prime factor** (since any number less than `i²` that's a multiple of `i` must also be a multiple of some prime smaller than `i`). Starting the inner loop at `i*i` instead of `2*i` avoids redundant re-marking, a real (if modest) constant-factor speedup.

### 🧮 Complexity: O(n log log n) — A Genuinely Remarkable Bound

This complexity is worth knowing and being able to explain at a high level: **the total work across all the inner loops sums to `n/2 + n/3 + n/5 + n/7 + ...` (harmonic-like series over primes), which is proven, via a deep number-theoretic result, to converge to `O(n log log n)`** — a function that grows only marginally faster than `O(n)`, making the Sieve dramatically more efficient than checking each number individually.

### 🎯 Interview Pattern: The "Precompute Once, Query Many" Trade-off, Again

The Sieve is yet another instance of this book's recurring "pay a one-time setup cost, then answer many queries cheaply" family (Chapter 3's prefix sums, Chapter 10's tries, Chapter 22's suffix arrays, Chapter 23's segment/Fenwick trees) — if you need to check primality for **many** numbers up to some bound `n`, build the Sieve once in O(n log log n), then answer each individual "is X prime?" query in O(1) via a simple array lookup, rather than repeatedly paying O(√X) per query.

---

## 25.3 Modular Arithmetic: Why It's Everywhere in Competitive Programming

### 🎯 The Core Problem It Solves

Many problems ask for an answer "modulo `10^9 + 7`" (a common large prime) specifically because the true answer would be astronomically large (recall Chapter 1's factorial and exponential growth classes) and overflow any practical integer representation. **Modular arithmetic lets you compute with the "remainder" at every step, keeping numbers manageable, while still arriving at the mathematically correct final remainder.**

### 25.3.1 The Core Rules (Each Operation's Modular Equivalent)

```javascript
const MOD = 1_000_000_007n; // using BigInt for genuinely large intermediate products!

function modAdd(a, b, mod = MOD) {
  return ((a % mod) + (b % mod)) % mod;
}

function modMultiply(a, b, mod = MOD) {
  return ((a % mod) * (b % mod)) % mod;
}

function modPower(base, exponent, mod = MOD) {
  // This IS Chapter 2's "fast power" (exponentiation by squaring), combined with modular reduction!
  let result = 1n;
  base = base % mod;

  while (exponent > 0n) {
    if (exponent % 2n === 1n) {
      result = (result * base) % mod;
    }
    exponent = exponent / 2n;
    base = (base * base) % mod;
  }

  return result;
}
```

### 🎯 Direct Callback to Chapter 2's Fast Exponentiation

`modPower` is **exactly** the "fast power" (exponentiation by squaring) algorithm from Chapter 2, section 2.8.2, with modular reduction applied at every multiplication to keep numbers bounded. This is a genuinely satisfying reappearance: an algorithm learned in Chapter 2 for pure recursion practice turns out to be the exact real-world tool needed for a completely different, very practical problem (computing huge modular powers efficiently, essential for cryptography-adjacent and competitive-programming contexts).

### 🚀 Pro Tip: Why `BigInt`, Not Regular Numbers

Recall Chapter 1's note on `Number.MAX_SAFE_INTEGER` (`2^53 - 1`). **Modular multiplication's intermediate result — `(a % mod) * (b % mod)` — can exceed this safe integer limit even when both `a` and `b` are individually well within it**, since `mod` values like `10^9 + 7` squared already exceed `10^18`, well past `2^53 ≈ 9 × 10^15`. **This is precisely the scenario Chapter 4's brief `BigInt` mention was preparing you for** — using JavaScript's native `BigInt` type (denoted with the `n` suffix) is the correct, necessary tool whenever modular arithmetic involves a modulus anywhere near or above `10^9`, ensuring exact, non-lossy integer arithmetic regardless of intermediate product size.

### ⚠ Common Mistake: Forgetting Modular Reduction Mid-Calculation, Not Just at the End

```javascript
// WRONG — computes the full, potentially astronomically large product FIRST, THEN mods
function modMultiplyWrong(a, b, mod) {
  return (a * b) % mod; // a * b can overflow/lose precision BEFORE the mod is ever applied!
}
```

The entire point of modular arithmetic is to **keep every intermediate value bounded**, not just the final result — always apply `% mod` immediately after every single multiplication or addition, never accumulating a large unmodded value across multiple operations.

### 25.3.2 Modular Inverse (A Brief, Conceptual Introduction)

**Definition:** The modular inverse of `a` under modulus `m` is a number `a⁻¹` such that `(a × a⁻¹) % m === 1` — the modular equivalent of division, since regular division doesn't behave predictably under modular arithmetic.

```javascript
function modInverse(a, mod) {
  // Using Fermat's Little Theorem: if mod is PRIME, a^(mod-2) mod is the modular inverse of a!
  return modPower(a, mod - 2n, mod);
}
```

### 🎯 Interview Pattern

This is worth knowing exists at a conceptual level: **modular division (needed for problems involving modular combinatorics, covered next) requires computing a modular inverse, which — when the modulus is prime (as `10^9+7` conveniently is) — reduces directly to `modPower` via Fermat's Little Theorem**, another beautiful, concrete reappearance of Chapter 2's fast exponentiation.

---

## PART B: COMBINATORICS

## 25.4 Permutations and Combinations: The Formulas Behind Chapter 17's Backtracking

Recall Chapter 17's Backtracking Masterclass, which *generated* permutations and combinations via recursion. This section provides the **closed-form formulas** for *counting* them, without needing to generate every single one.

### 25.4.1 Permutations: `n! / (n-r)!`

**Definition:** The number of ways to arrange `r` items chosen from `n` distinct items, where order matters.

```javascript
function factorial(n) {
  let result = 1n;
  for (let i = 2n; i <= BigInt(n); i++) {
    result *= i;
  }
  return result;
}

function permutations(n, r) {
  return factorial(n) / factorial(n - r);
}

console.log(permutations(5, 2)); // 20n  (5 * 4)
```

### 🎯 Interview Pattern: Connecting the Formula to Chapter 17's Intuition

This formula is worth deriving intuitively, not just memorizing: **there are `n` choices for the first position, `n-1` remaining choices for the second (since one item is now used), `n-2` for the third, and so on, down to `n-r+1` choices for the `r`-th position.** Multiplying these together gives `n × (n-1) × ... × (n-r+1)`, which is exactly `n! / (n-r)!` (the `(n-r)!` cancels out everything below `n-r+1`). This is precisely the counting argument underlying Chapter 17's `O(n·n!)` complexity claim for full permutations (where `r = n`, making `(n-r)! = 0! = 1`).

### 25.4.2 Combinations: `n! / (r! × (n-r)!)`

**Definition:** The number of ways to choose `r` items from `n` distinct items, where order does **not** matter.

```javascript
function combinations(n, r) {
  return factorial(n) / (factorial(r) * factorial(n - r));
}

console.log(combinations(5, 2)); // 10n
```

### 🧠 Memory Trick: Combinations = Permutations, With Overcounting Removed

**Every combination of `r` items can be arranged in `r!` different orders, all of which the permutation formula counts as distinct, but the combination formula wants to count as just ONE.** Dividing the permutation count by `r!` exactly removes this overcounting — a direct, concrete illustration of *why* the combinations formula has that extra `r!` in the denominator, rather than an arbitrary difference to memorize.

### 🚀 Pro Tip: Pascal's Triangle and the Efficient DP Recurrence for Combinations

Computing `factorial(n)` for large `n` (especially combined with modular arithmetic, section 25.3) can be inefficient if done repeatedly from scratch. A classic, efficient alternative: **Pascal's Triangle's recurrence, `C(n, r) = C(n-1, r-1) + C(n-1, r)`**, computable via a direct 2D DP table — a genuine, concrete application of Chapter 19's 2D DP framework to a combinatorics problem.

```javascript
function buildPascalsTriangle(maxN) {
  const C = Array.from({ length: maxN + 1 }, () => new Array(maxN + 1).fill(0));

  for (let n = 0; n <= maxN; n++) {
    C[n][0] = 1; // choosing 0 items is always exactly 1 way
    for (let r = 1; r <= n; r++) {
      C[n][r] = C[n - 1][r - 1] + C[n - 1][r]; // Chapter 19's 2D DP recurrence, applied here!
    }
  }

  return C;
}
```

### 🧠 Memory Trick: Why Pascal's Recurrence Works — An "Include or Exclude" Argument, Again

This is worth deriving, since it directly reuses Chapter 18/19's central "include or exclude" DP framing: **to choose `r` items from `n`, consider one specific item — either it's included in the chosen set (leaving `r-1` more to choose from the remaining `n-1` items: `C(n-1, r-1)`), or it's excluded (leaving all `r` still to choose from the remaining `n-1` items: `C(n-1, r)`).** These two cases are mutually exclusive and cover every possibility, so their sum gives the total count — the exact same "include or exclude" decomposition that powered House Robber (Chapter 18) and 0/1 Knapsack (Chapter 19), now applied to pure counting rather than optimization.

---

## PART C: GAME THEORY

## 25.5 An Introduction to Combinatorial Game Theory: Nim and the Sprague-Grundy Theorem

### 25.5.1 The Game of Nim

**The rules:** several piles of objects exist; two players alternate turns, each removing any positive number of objects from any single pile; the player who removes the last object **wins**.

### 🧮 The Astonishing Result: The XOR of All Pile Sizes Determines the Winner

**Theorem:** the first player wins if and only if the XOR of all pile sizes is **non-zero**. If the XOR is zero, the second player wins (assuming optimal play from both sides).

```javascript
function nimWinner(piles) {
  const xorSum = piles.reduce((acc, pile) => acc ^ pile, 0); // Chapter 24's XOR toolkit, reused here!
  return xorSum !== 0 ? 'First player wins' : 'Second player wins';
}

console.log(nimWinner([3, 4, 5])); // 'First player wins' (3^4^5 = 2, non-zero)
console.log(nimWinner([1, 2, 3])); // 'Second player wins' (1^2^3 = 0)
```

### 🧠 Memory Trick: Why XOR, Specifically? A Glimpse of the Proof's Structure

The full formal proof (via induction on game states) is beyond this introductory treatment, but the core intuition is worth having: **a position with XOR-sum zero is called a "balanced" or "losing" position — any move from it necessarily creates an XOR-sum that's non-zero** (moving in any single pile changes that pile's contribution to the XOR, and since XOR-sum-zero means every "column" of bits has an even count of 1s, changing any one pile's bits must flip the overall XOR to non-zero). Conversely, **from any non-zero XOR-sum position, there always exists a move that restores the XOR-sum to zero**, handing the opponent a losing position. Since the game must eventually end (piles only shrink), and the *last* position (`[0,0,...,0]`, XOR-sum zero) is a loss for whoever is forced to move from it (they have no legal move, having just lost by the previous player taking the last object) — the entire game reduces to "always move the XOR-sum to zero, and you'll always be able to, and your opponent never can from a zero position."

### 🎯 Interview Pattern

Nim and its XOR-based solution is one of the most famous results in combinatorial game theory, and it's a favorite "surprising elegance" interview question specifically because the connection between "a turn-based removal game" and "XOR of pile sizes" is genuinely non-obvious on first encounter — much like Chapter 24's XOR-based "find the single number" trick, it rewards recognizing XOR's cancellation/parity properties in an unexpected domain.

### 25.5.2 The Sprague-Grundy Theorem: Generalizing Nim to Other Games

### 🚀 Pro Tip: A Conceptual Introduction

**Definition (informal):** The Sprague-Grundy theorem states that **every impartial game** (a two-player game where both players have the same available moves from any position, and the last player to move wins) **is equivalent to a Nim pile of some specific size**, called its **Grundy number** (or "nimber"). The Grundy number of a position is computed as the **minimum excludant (mex)** — the smallest non-negative integer **not** present among the Grundy numbers of all positions reachable in one move.

```javascript
function mex(numbers) {
  const present = new Set(numbers); // Chapter 4's Set, used for O(1) membership checks!
  let candidate = 0;
  while (present.has(candidate)) {
    candidate++;
  }
  return candidate;
}

console.log(mex([0, 1, 3])); // 2 (0 and 1 are present, but 2 is the smallest MISSING non-negative integer)
```

### 🎯 Interview Pattern: A Genuine "Know It Exists" Topic

This theorem is genuinely advanced — full mastery requires computing Grundy numbers recursively across an entire game's state space (itself often requiring memoization, directly reusing Chapter 2 and Chapter 18's DP toolkit) and then combining multiple simultaneous sub-games via XOR (exactly Nim's rule, generalized). **Consistent with this book's established treatment of similarly advanced topics** (AVL rotations in Chapter 8, suffix tree construction in Chapter 22, lazy propagation in Chapter 23), the expected depth for the overwhelming majority of contexts is **conceptual fluency**: knowing that "any impartial game reduces to an equivalent Nim pile via its Grundy number, computed by the mex of reachable positions' Grundy numbers" is a genuine, powerful unifying idea in game theory, without needing full computational mastery for every possible game variant.

---

## 25.6 Edge Cases and Gotchas Checklist

1. **Integer overflow in factorial/combinatorics calculations** — always use `BigInt` once values could plausibly exceed `Number.MAX_SAFE_INTEGER`, per Chapter 1's original warning.
2. **Modular arithmetic: reducing only at the end, not after every operation** — always apply `% mod` immediately after every multiplication/addition, not just on the final result.
3. **GCD with zero or negative inputs** — verify your `gcd` function's behavior is explicitly defined for `gcd(0, n)` (should be `n`) and negative inputs (convention-dependent; state your choice).
4. **Sieve of Eratosthenes array sizing** — verify off-by-one correctness (`n+1` elements to include index `n` itself).
5. **Modular inverse requires a PRIME modulus** for the Fermat's Little Theorem shortcut shown here — a different technique (the Extended Euclidean Algorithm) is needed for non-prime moduli, worth mentioning as a caveat if the modulus isn't guaranteed prime.
6. **Nim's XOR rule assumes standard Nim rules exactly** — variants (misère Nim, where taking the last object *loses*; games with move restrictions) require different analysis; never assume the plain XOR rule applies to every "looks like Nim" game without verifying the exact rules.

---

## 25.7 Chapter Summary

This chapter made explicit the mathematical foundation several earlier chapters quietly relied upon. We built the Euclidean algorithm for GCD (and derived LCM from it), understanding *why* `gcd(a,b) = gcd(b, a%b)` holds via the "any common divisor of a and b also divides a%b" argument, and covered primality testing's `√n` optimization (any factor above `√n` implies a paired factor below it) before scaling up to the Sieve of Eratosthenes — yet another instance of this book's recurring "precompute once in O(n log log n), then answer each primality query in O(1)" trade-off family, directly alongside Chapter 3's prefix sums, Chapter 10's tries, and Chapter 23's segment/Fenwick trees.

We built modular arithmetic's core rules, and delivered a genuinely satisfying callback: **modular exponentiation (`modPower`) is exactly Chapter 2's fast-power algorithm, with modular reduction folded in at every step** — a concrete, memorable demonstration that a technique learned for pure recursion practice turns out to be the essential real-world tool for a completely different, very practical problem. We flagged the critical, easy-to-miss requirement that modular reduction must happen after *every* operation, not just at the end, and connected back to Chapter 4's `BigInt` mention as the necessary tool once intermediate products could exceed `Number.MAX_SAFE_INTEGER` — a genuinely common occurrence with moduli near `10^9`.

We provided the closed-form permutation and combination formulas underlying Chapter 17's backtracking-generated enumerations, deriving each one from first principles (permutations from the "n choices, then n-1, then n-2..." counting argument; combinations as permutations with the `r!` overcounting divided out), and connected Pascal's Triangle's efficient DP recurrence directly back to Chapter 18/19's "include or exclude" decomposition — the same fundamental decision structure that powered House Robber and 0/1 Knapsack, now counting rather than optimizing. Finally, we introduced combinatorial game theory via Nim's genuinely astonishing XOR-of-pile-sizes winner-determination rule (directly reusing Chapter 24's XOR toolkit in yet another unexpected domain) and the Sprague-Grundy theorem as its conceptual generalization to any impartial game — treated, consistent with this book's established pattern for genuinely advanced topics, at the level of conceptual fluency rather than full computational mastery.

---

## 25.8 Revision Notes

- The Euclidean algorithm (gcd(a,b) = gcd(b, a%b)) runs in O(log(min(a,b))), justified by the "common divisors of a and b also divide a%b" argument.
- Primality testing only needs checking up to √n, since factors pair up around the square root; the Sieve of Eratosthenes extends this to O(n log log n) for finding all primes up to n — another "precompute once, query O(1) many times" structure.
- Modular exponentiation (`modPower`) is literally Chapter 2's fast-power algorithm with modular reduction folded in — reduce after every operation, not just at the end, and use BigInt once products could exceed Number.MAX_SAFE_INTEGER.
- Permutations (`n!/(n-r)!`) and combinations (`n!/(r!(n-r)!)`) derive from direct counting arguments; combinations are permutations with the r! overcounting divided out.
- Pascal's Triangle's recurrence is Chapter 18/19's "include or exclude" DP decomposition applied to counting rather than optimization.
- Nim's win/loss determination via XOR of pile sizes is a genuinely astonishing result, directly reusing Chapter 24's XOR toolkit in a new domain.
- The Sprague-Grundy theorem generalizes Nim to any impartial game via Grundy numbers (computed by mex of reachable positions), combined via XOR — treated here at a conceptual level, consistent with this book's handling of other advanced topics.

---

## 25.9 Mind Map (ASCII)

```
                    MATHEMATICS FOR PROGRAMMERS
                                  |
      +------------------+-------+-------+------------------------+
      |                  |               |                        |
  NUMBER THEORY      MODULAR          COMBINATORICS           GAME THEORY
      |               ARITHMETIC           |                       |
  Euclidean GCD           |          Permutations n!/(n-r)!     NIM: XOR of pile
  (a%b divides            |          (n choices, n-1,...)       sizes determines
  common divisors)   modPower = Ch.2      |                     winner (Ch.24's
      |               FAST POWER      Combinations               XOR toolkit,
  Primality: only     + mod reduction  n!/(r!(n-r)!)             REUSED here!)
  check up to sqrt(n) at EVERY step   (perms / r! to                  |
  (factors pair up)       |            remove overcounting)     Sprague-Grundy:
      |               BigInt needed        |                    generalizes Nim
  Sieve of            once products    Pascal's Triangle:        to ANY impartial
  Eratosthenes:       exceed MAX_SAFE_ C(n,r)=C(n-1,r-1)         game via
  O(n log log n),     INTEGER          +C(n-1,r) = Ch.18/19's    GRUNDY NUMBERS
  ANOTHER "precompute      |           "include or exclude"      (mex of reachable
  once, query O(1)"   modInverse via  DP decomposition,           positions,
  structure (like      Fermat's        now COUNTING not          combined via XOR)
  Ch.3/10/23!)         Little Thm      optimizing                     |
                       (needs PRIME                              CONCEPTUAL depth
                       modulus)                                  expected, like
                                                                  Ch.8 AVL, Ch.22
                                                                  suffix trees
```

---

## 25.10 Cheat Sheet

```
NUMBER THEORY
================
gcd(a,b):  while b!=0: [a,b] = [b, a%b]; return a       O(log(min(a,b)))
lcm(a,b):  (a/gcd(a,b)) * b
isPrime(n): check divisors only up to sqrt(n)            O(sqrt(n))
Sieve of Eratosthenes: mark multiples of each found prime, starting from i*i  O(n log log n)

MODULAR ARITHMETIC
======================
modAdd(a,b,mod):      ((a%mod)+(b%mod))%mod
modMultiply(a,b,mod):  ((a%mod)*(b%mod))%mod
modPower(base,exp,mod): Chapter 2's fast power + mod reduction at EVERY step
modInverse(a,mod):     modPower(a, mod-2, mod)   [ONLY valid if mod is PRIME -- Fermat's Little Theorem]
ALWAYS use BigInt once products could exceed Number.MAX_SAFE_INTEGER (~9x10^15)
ALWAYS reduce mod after EVERY operation, not just at the end

COMBINATORICS
================
Permutations P(n,r) = n! / (n-r)!    [order MATTERS]
Combinations C(n,r) = n! / (r! * (n-r)!)  [order does NOT matter]
Pascal's Triangle: C(n,r) = C(n-1,r-1) + C(n-1,r)   [include-or-exclude DP, Ch.18/19 style]

GAME THEORY
==============
NIM: XOR all pile sizes. Non-zero -> first player wins. Zero -> second player wins.
Sprague-Grundy: any impartial game reduces to an equivalent Nim pile via its
Grundy number = mex(Grundy numbers of all positions reachable in one move)
mex(set) = smallest non-negative integer NOT in the set
```

---

## 25.11 Key Takeaways

1. The Euclidean algorithm's O(log(min(a,b))) GCD relies on the provable fact that common divisors of a and b also divide a%b.
2. Primality testing only needs checking divisors up to √n; the Sieve of Eratosthenes extends this to O(n log log n) for finding all primes up to n — yet another "precompute once, query O(1)" structure.
3. Modular exponentiation is literally Chapter 2's fast-power algorithm with reduction folded in at every step — never reduce only at the end, and use BigInt once products risk exceeding Number.MAX_SAFE_INTEGER.
4. Permutation and combination formulas derive directly from counting arguments; Pascal's Triangle's recurrence is Chapter 18/19's include-or-exclude DP decomposition, now counting rather than optimizing.
5. Nim's XOR-based winner determination and its Sprague-Grundy generalization are genuinely elegant results, directly reusing Chapter 24's XOR toolkit — treated here at a conceptual depth consistent with this book's handling of other advanced topics.

---

## 25.12 20 Multiple Choice Questions

1. What is the time complexity of the Euclidean algorithm for computing GCD?
   a) O(n)
   b) O(log(min(a,b)))
   c) O(n²)
   d) O(sqrt(n))

2. Why does gcd(a, b) equal gcd(b, a % b)?
   a) It's an arbitrary definition
   b) Any common divisor of a and b must also divide a % b
   c) Modulo always produces the GCD directly
   d) This is only true for prime numbers

3. Why is checking primality only up to √n sufficient?
   a) Numbers larger than √n are never prime
   b) Any factor larger than √n must have a corresponding paired factor smaller than √n
   c) It's a heuristic, not a proven guarantee
   d) √n is always the largest prime factor

4. What is the time complexity of the Sieve of Eratosthenes?
   a) O(n²)
   b) O(n log log n)
   c) O(n log n)
   d) O(n)

5. What earlier chapters' technique family does the Sieve of Eratosthenes belong to?
   a) Sorting algorithms
   b) The "precompute once, query many times cheaply" family (prefix sums, tries, segment/Fenwick trees)
   c) Backtracking algorithms
   d) Graph traversal algorithms

6. What earlier chapter's algorithm is modPower directly built from?
   a) Chapter 15's Merge Sort
   b) Chapter 2's fast power (exponentiation by squaring)
   c) Chapter 9's heap operations
   d) Chapter 11's BFS

7. Why must modular reduction happen after EVERY operation, not just at the end?
   a) It's a stylistic preference
   b) Intermediate values can exceed safe integer limits even if the final result wouldn't
   c) JavaScript requires this syntactically
   d) It only matters for small numbers

8. When should BigInt be used in modular arithmetic calculations?
   a) Never; regular numbers always suffice
   b) Once intermediate products could exceed Number.MAX_SAFE_INTEGER
   c) Only for negative numbers
   d) Only when the modulus is exactly 2

9. What theorem allows computing a modular inverse via modPower(a, mod-2, mod)?
   a) The Pythagorean theorem
   b) Fermat's Little Theorem (requires a PRIME modulus)
   c) The binomial theorem
   d) Bayes' theorem

10. What is the formula for the number of permutations of r items chosen from n?
    a) n! / (r! * (n-r)!)
    b) n! / (n-r)!
    c) n! * r!
    d) n / r

11. What is the formula for the number of combinations of r items chosen from n?
    a) n! / (n-r)!
    b) n! / (r! * (n-r)!)
    c) n! * (n-r)!
    d) n - r

12. Why does the combinations formula divide by an extra r! compared to the permutations formula?
    a) It's an arbitrary convention
    b) Each combination can be arranged in r! different orders, all counted separately by the permutation formula but as ONE by combinations
    c) r! represents the number of combinations directly
    d) There is no relationship between the two formulas

13. What is Pascal's Triangle's recurrence for combinations?
    a) C(n,r) = C(n,r-1) * C(n,r+1)
    b) C(n,r) = C(n-1,r-1) + C(n-1,r)
    c) C(n,r) = C(n-1,r) - C(n-1,r-1)
    d) C(n,r) = n * r

14. What earlier chapters' DP pattern does Pascal's Triangle's recurrence directly echo?
    a) Chapter 15's sorting
    b) Chapter 18/19's "include or exclude" decomposition (House Robber, 0/1 Knapsack)
    c) Chapter 11's graph traversal
    d) Chapter 6's stack operations

15. In the game of Nim, how is the winner determined (assuming optimal play)?
    a) The player with more piles always wins
    b) XOR all pile sizes together; non-zero means the first player wins, zero means the second player wins
    c) The player who moves first always wins
    d) It depends on the total number of objects only

16. What earlier chapter's toolkit does Nim's winner-determination rule directly reuse?
    a) Chapter 15's sorting algorithms
    b) Chapter 24's XOR bit-manipulation toolkit
    c) Chapter 9's heap operations
    d) Chapter 5's linked list techniques

17. What does the Sprague-Grundy theorem state, informally?
    a) All games are unsolvable
    b) Every impartial game is equivalent to a Nim pile of a specific size, its Grundy number
    c) Only Nim itself follows Grundy number rules
    d) Grundy numbers only apply to two-pile games

18. How is a position's Grundy number computed?
    a) By counting the total number of moves available
    b) As the mex (minimum excludant) of the Grundy numbers of all positions reachable in one move
    c) By summing all reachable Grundy numbers
    d) It's always equal to the number of pieces remaining

19. What is the mex (minimum excludant) of the set {0, 1, 3}?
    a) 0
    b) 2
    c) 4
    d) 3

20. What level of depth does this chapter recommend for the Sprague-Grundy theorem, consistent with its treatment of other advanced topics?
    a) Full implementation mastery for every possible game variant
    b) Conceptual fluency — knowing what it states and why, without full computational mastery of every application
    c) No knowledge is expected at all
    d) Only the formal proof, without any practical application

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-b, 19-b, 20-b

---

## 25.13 20 Coding Problems

**Easy**

1. Implement `gcd` and `lcm` from memory (section 25.1.1).
2. Implement `isPrime` with the √n optimization from memory (section 25.2.1).
3. Implement `sieveOfEratosthenes` from memory (section 25.2.2), and verify its output against `isPrime` called individually for each number.
4. Implement `factorial` using BigInt, and verify it correctly computes values that would overflow regular JavaScript numbers (e.g., 25!).
5. Implement `mex` from memory (section 25.5.2), testing it against several example sets.

**Medium**

6. Implement `modPower` from memory (section 25.3.1), and verify it matches `Math.pow(base, exponent) % mod` for small values where the naive approach doesn't overflow.
7. Implement `permutations` and `combinations` using the factorial-based formulas from memory (section 25.4), and verify against Chapter 17's actual generated permutation/combination COUNTS for small n.
8. Implement `buildPascalsTriangle` from memory (section 25.4.2), and verify `C[n][r]` matches the factorial-formula result for several values.
9. Implement `nimWinner` from memory (section 25.5.1), and verify it against a brute-force game-tree search for small pile configurations.
10. Given a large number, use the Sieve of Eratosthenes to find its prime factorization efficiently (by first sieving up to √n, then trial-dividing only by found primes).

**Hard**

11. Implement modular combinations (`C(n,r) mod p`, for a prime `p`) using precomputed factorials and modular inverses, useful for combinatorics problems requiring answers modulo a large prime.
12. Given a large exponentiation problem where the exponent itself is enormous (e.g., represented as a string of digits), implement modular exponentiation handling this case correctly.
13. Implement Grundy number computation for a simple impartial game of your choosing (e.g., a single-pile Nim variant with restricted move sizes), verifying your computed Grundy numbers predict the correct winner via the Sprague-Grundy theorem.
14. Given a graph representing a game's state transitions, implement memoized Grundy number computation (directly reusing Chapter 2/18's memoization techniques) across all reachable states.
15. Implement the Extended Euclidean Algorithm (computing gcd(a,b) along with coefficients x,y such that ax+by=gcd(a,b)), and use it to compute modular inverses for NON-prime moduli (where Fermat's Little Theorem doesn't apply).

**Interview Level**

16. **(Google-level)** Given a cryptography-adjacent problem requiring RSA-style modular exponentiation with very large numbers, implement and benchmark your `modPower` function using BigInt, discussing performance characteristics for realistic key sizes.
17. **(Amazon-level)** Given an inventory system needing to compute "how many ways can we select r items from n available SKUs" for pricing/bundling calculations, implement efficient combination counting with memoized factorials.
18. **(Microsoft-level)** Given a load-balancing system needing to distribute n identical tasks among k servers such that the distribution is "fair" in a specific combinatorial sense, use combinatorics formulas to compute the total number of valid distributions.
19. **(Meta-level)** Given a game feature (e.g., a turn-based mini-game within a larger platform) that resembles Nim, implement the XOR-based winner detection, and extend it to determine the OPTIMAL move for the current player (not just who wins).
20. **(Netflix-level)** Design a content-recommendation "coverage" calculator using combinatorics: given n content categories and a requirement to show users combinations of exactly r categories per session, compute the total number of distinct sessions possible, and discuss how modular arithmetic would apply if this count needed to be reported modulo a large prime for very large n.

---

## 25.14 5 Interview Questions

1. "Implement the Euclidean algorithm for GCD, and explain why it works." (Tests both implementation and the underlying "common divisors also divide the remainder" argument.)
2. "How would you efficiently find all prime numbers up to n?" (Tests the Sieve of Eratosthenes and its O(n log log n) complexity.)
3. "How would you compute a very large power modulo a prime, efficiently?" (Tests modPower and its direct connection to Chapter 2's fast exponentiation.)
4. "Derive the formula for combinations from the formula for permutations." (Tests genuine understanding, not just formula recall.)
5. "Explain how the game of Nim's winner can be determined without simulating the entire game." (Tests the XOR-based result and at least a sketch of why it works.)

---

## 25.15 3 Real Projects

1. **Complete Math Utilities Library**: Implement GCD/LCM, primality testing, the Sieve of Eratosthenes, modular arithmetic (add/multiply/power/inverse), and permutation/combination counting in a single library, with a self-check script verifying correctness across a range of test values, including BigInt-requiring large inputs.
2. **Nim Game Simulator**: Build an interactive CLI implementing the game of Nim, where a human player competes against an AI using the XOR-based optimal-move strategy, verifying the AI wins every game where the XOR-based theory predicts it should.
3. **Modular Combinatorics Calculator**: Build a tool computing `C(n, r) mod p` for very large `n` and `r` (using precomputed factorials and modular inverses via Fermat's Little Theorem), benchmarked against a naive BigInt factorial-division approach to demonstrate the practical necessity of the modular technique at scale.

---

## 25.16 Further Reading

- G.H. Hardy and E.M. Wright, *An Introduction to the Theory of Numbers* — the classic, comprehensive reference for number theory underlying much of this chapter.
- Richard Guy and Elwyn Berlekamp's *Winning Ways for Your Mathematical Plays* — the definitive, genuinely delightful reference on combinatorial game theory, Nim, and the Sprague-Grundy theorem.
- Search "Extended Euclidean Algorithm" for the technique enabling modular inverse computation for non-prime moduli, previewed but not fully derived in this chapter.
- Competitive Programmer's Handbook (Antti Laaksonen), chapters on number theory and combinatorics, for extensive additional problem sets directly extending this chapter's foundations.

---

*End of Chapter 25. Next: Chapter 26 will cover Advanced Graph Theory and Network Flow — Bipartite Matching, the Ford-Fulkerson and Edmonds-Karp algorithms for maximum flow, and their surprising equivalence to minimum cut, rounding out this book's graph algorithm coverage with genuinely advanced, high-value techniques.*

**Say "Continue to the next chapter" when ready.**
