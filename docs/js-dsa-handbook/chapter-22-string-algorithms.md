# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 22: String Algorithms — KMP, Rabin-Karp, and Suffix Structures

---

## 22.0 The Problem With Naive Substring Search

**The problem:** given a text `T` of length `n` and a pattern `P` of length `m`, find all occurrences of `P` within `T`.

```javascript
function naiveSearch(text, pattern) {
  const matches = [];

  for (let i = 0; i <= text.length - pattern.length; i++) {
    let j = 0;
    while (j < pattern.length && text[i + j] === pattern[j]) {
      j++;
    }
    if (j === pattern.length) {
      matches.push(i);
    }
  }

  return matches;
}
// Time: O(n * m) worst case — for EVERY starting position, we might compare up to m characters
```

### The Concrete Worst Case

```
text = "aaaaaaaaaaaaaaaaaaaaaaaab" (many 'a's, then 'b')
pattern = "aaaab"

At almost EVERY starting position, we match several 'a's before finally failing
at the last character. We repeatedly re-examine characters we've already
confirmed match, throwing away that work every time a match attempt fails.

This is EXACTLY the same "wasted redundant work" signature we've seen before:
Chapter 2's naive Fibonacci recomputing shared sub-problems, Chapter 8's naive
isBalanced recomputing shared subtree heights. The fix follows the same
underlying philosophy: don't throw away information you've already learned.
```

This chapter builds two genuinely different, both extremely important, escape routes from O(n·m): **KMP** (which never re-examines a text character it doesn't have to, by precomputing pattern self-similarity) and **Rabin-Karp** (which uses Chapter 4's hashing to check candidate positions in O(1) amortized time each).

---

## 22.1 The Knuth-Morris-Pratt (KMP) Algorithm

### 22.1.1 The Core Insight: Never Waste a Failed Comparison's Information

**Definition:** KMP precomputes, for a given pattern, a "failure function" (also called the LPS array — Longest Proper Prefix which is also a Suffix) that tells the algorithm, upon a mismatch, exactly how far it can safely skip ahead in the pattern **without ever needing to re-examine already-matched text characters.**

### 🧠 Memory Trick: "The Pattern Already Told You Something About Itself"

Here's the key realization: **when a match attempt fails partway through, you already know exactly what the last several text characters were** (they matched part of the pattern before failing) — **because they matched part of the pattern.** If the pattern itself has some internal repetition (a prefix that reappears as a suffix somewhere within itself), you can use that self-knowledge to jump the pattern forward intelligently, reusing the matched text characters instead of re-scanning them from scratch.

### 22.1.2 Building the LPS (Longest Proper Prefix-Suffix) Array

**Definition:** `lps[i]` = the length of the longest proper prefix of `pattern[0..i]` that is *also* a proper suffix of `pattern[0..i]`. ("Proper" means the prefix/suffix cannot be the entire substring itself.)

```javascript
function buildLPS(pattern) {
  const lps = new Array(pattern.length).fill(0);
  let length = 0; // length of the previous longest prefix-suffix match
  let i = 1;

  while (i < pattern.length) {
    if (pattern[i] === pattern[length]) {
      length++;
      lps[i] = length;
      i++;
    } else if (length > 0) {
      length = lps[length - 1]; // fall back — DON'T reset to 0 immediately! (this IS the KMP insight, applied recursively to the pattern itself)
    } else {
      lps[i] = 0;
      i++;
    }
  }

  return lps;
}

console.log(buildLPS('aabaaab')); // [0,1,0,1,2,2,3]
```

### Dry Run: Building the LPS Array for `'aabaaab'`

```
pattern = a a b a a a b
index   = 0 1 2 3 4 5 6

lps[0] = 0 (always, by definition — a single character has no proper prefix)
length=0, i=1

i=1: pattern[1]='a', pattern[length=0]='a'. MATCH!
  length=1, lps[1]=1, i=2

i=2: pattern[2]='b', pattern[length=1]='a'. NO MATCH. length(1) > 0 -> fall back: length = lps[0] = 0
  (still no match: pattern[2]='b' vs pattern[length=0]='a', but length is now 0)
  length is 0 -> lps[2] = 0, i=3

i=3: pattern[3]='a', pattern[length=0]='a'. MATCH!
  length=1, lps[3]=1, i=4

i=4: pattern[4]='a', pattern[length=1]='a'. MATCH!
  length=2, lps[4]=2, i=5

i=5: pattern[5]='a', pattern[length=2]='b'. NO MATCH. length(2)>0 -> fall back: length=lps[1]=1
  pattern[5]='a' vs pattern[length=1]='a'. MATCH (after falling back)!
  length=2, lps[5]=2, i=6

i=6: pattern[6]='b', pattern[length=2]='b'. MATCH!
  length=3, lps[6]=3, i=7. Loop ends (i === pattern.length).

Final lps = [0,1,0,1,2,2,3]
```

### 🎯 What the LPS Array Actually Tells You

`lps[6] = 3` means: **the longest proper prefix of `'aabaaab'` that's also a proper suffix has length 3** — specifically, `'aab'` (the first 3 characters) equals the last 3 characters (`'aab'`, positions 4-6... let's verify: `aabaaab`, last 3 chars are `'a','a','b'` = `'aab'`. Yes, matches!). This self-similarity is exactly what lets KMP skip ahead intelligently upon a mismatch during actual text searching.

### 22.1.3 The Full KMP Search Algorithm

```javascript
function kmpSearch(text, pattern) {
  if (pattern.length === 0) return [];

  const lps = buildLPS(pattern);
  const matches = [];

  let i = 0; // pointer into TEXT
  let j = 0; // pointer into PATTERN

  while (i < text.length) {
    if (text[i] === pattern[j]) {
      i++;
      j++;

      if (j === pattern.length) {
        matches.push(i - j); // found a complete match!
        j = lps[j - 1]; // continue searching for OVERLAPPING matches, using the LPS to skip intelligently
      }
    } else if (j > 0) {
      j = lps[j - 1]; // MISMATCH: fall back using the LPS array — NEVER move `i` backward!
    } else {
      i++; // no partial match to fall back on — just advance the text pointer
    }
  }

  return matches;
}

console.log(kmpSearch('ababcababcababc', 'ababc')); // [0, 5, 10]
```

### 🧮 Why This Is O(n + m), Not O(n·m) — The Crucial Guarantee

**The single most important property to internalize: `i` (the text pointer) NEVER moves backward, ever, at any point in the entire algorithm.** Every single character in the text is examined a bounded number of times (in practice, `i` only ever increases), while `j` (the pattern pointer) can fall back, but only using the precomputed LPS array — an O(1) lookup, not a re-scan. **Building the LPS array itself is O(m)** (a single pass, using the same "amortized, total movement bounded" argument as Chapter 21's monotonic stack — `length` in `buildLPS` also never needs to redo work). Combined: **O(n) for the search pass + O(m) for LPS construction = O(n + m) total** — a dramatic, guaranteed improvement over the naive O(n·m), with **zero risk of the pathological worst case** that plagues the naive approach.

### 🔥 Interview Tip

KMP's headline, quotable fact: **"KMP guarantees O(n + m) time by ensuring the text pointer never moves backward — any information learned from a partial match is never thrown away, unlike the naive approach, which can redundantly re-examine the same text characters across multiple failed match attempts."** This is precisely the same "don't recompute what you already know" philosophy underlying memoization (Chapter 2) and monotonic stacks (Chapter 21), now applied to string matching specifically.

---

## 22.2 The Rabin-Karp Algorithm: Hashing to the Rescue

### 22.2.1 The Core Insight: Compare Hashes First, Characters Only on a Hash Match

**Definition:** Rabin-Karp computes a rolling hash of the pattern and of every equal-length substring ("window") of the text, comparing hashes first (O(1) each, after setup) and only falling back to a full character-by-character comparison when hashes match (as a safeguard against hash collisions — directly recalling Chapter 4's collision discussion).

### 🧠 Memory Trick: "A Fingerprint Check Before a Full ID Check"

Think of hash comparison as a quick fingerprint scan at a building's entrance: **most people are correctly identified instantly via the fingerprint (hash match). Only in the rare case of an ambiguous or unclear scan (a hash collision) do you pull out their full ID for a detailed character-by-character check.** This two-tier "fast check first, slow verification only when needed" strategy is exactly Rabin-Karp's mechanism, and it's a genuinely reusable pattern beyond just string matching.

### 22.2.2 The Rolling Hash: Updating in O(1) as the Window Slides

The key technical trick that makes Rabin-Karp efficient: **as the comparison window slides one position to the right, we can compute the new window's hash from the old window's hash in O(1), without rehashing the entire substring from scratch** — directly the same "subtract what leaves, add what enters" idea as Chapter 3's sliding window sum optimization.

```javascript
function rabinKarpSearch(text, pattern) {
  const n = text.length;
  const m = pattern.length;
  if (m > n) return [];

  const BASE = 256; // treating characters as base-256 "digits"
  const MOD = 1_000_000_007; // a large prime, to keep hash values manageable and reduce collisions

  let patternHash = 0;
  let windowHash = 0;
  let highOrderMultiplier = 1; // BASE^(m-1) % MOD, needed to "remove" the leftmost character when sliding

  for (let i = 0; i < m - 1; i++) {
    highOrderMultiplier = (highOrderMultiplier * BASE) % MOD;
  }

  for (let i = 0; i < m; i++) {
    patternHash = (patternHash * BASE + pattern.charCodeAt(i)) % MOD;
    windowHash = (windowHash * BASE + text.charCodeAt(i)) % MOD;
  }

  const matches = [];

  for (let i = 0; i <= n - m; i++) {
    if (patternHash === windowHash) {
      // Hash matches — but VERIFY character-by-character to guard against collisions!
      if (text.substring(i, i + m) === pattern) {
        matches.push(i);
      }
    }

    if (i < n - m) {
      // ROLL the hash forward: remove the leftmost character's contribution, add the new rightmost character
      windowHash = (
        (windowHash - text.charCodeAt(i) * highOrderMultiplier) * BASE +
        text.charCodeAt(i + m)
      ) % MOD;

      if (windowHash < 0) windowHash += MOD; // JavaScript's % can return negative results — normalize!
    }
  }

  return matches;
}

console.log(rabinKarpSearch('ababcababcababc', 'ababc')); // [0, 5, 10]
```

### ⚠ Common Mistake: Forgetting to Verify After a Hash Match

This is the single most important correctness detail in Rabin-Karp, worth its own dedicated warning: **a hash match is NOT proof of an actual string match — it's only a strong *suggestion*.** Two genuinely different substrings can, by unlucky coincidence, produce the exact same hash value (a collision — directly recalling Chapter 4's pigeonhole-principle guarantee that collisions are mathematically inevitable given enough possible inputs). **Always verify with an actual character-by-character comparison after a hash match, before reporting it as a confirmed result.** Skipping this verification step is a subtle bug that produces *usually*-correct-but-occasionally-wrong results — a genuinely dangerous failure mode, since it can pass casual testing while still being fundamentally incorrect.

### ⚠ Common Mistake: JavaScript's Modulo Operator Can Return Negative Numbers

```javascript
console.log(-7 % 3); // -1 in JavaScript, NOT 2 (as it would be in Python, for example)!
```

This is a genuine, JavaScript-specific gotcha worth knowing cold: **JavaScript's `%` operator returns a result with the same sign as the dividend**, unlike some other languages' modulo operators, which always return a non-negative result for a positive modulus. In rolling-hash calculations, subtraction can produce a temporarily negative intermediate value, and failing to normalize it (`if (windowHash < 0) windowHash += MOD;`) introduces subtle, hard-to-diagnose bugs. Always explicitly normalize after any subtraction-involving modular arithmetic in JavaScript.

### 🧮 Complexity Analysis

- **Average case**: **O(n + m)** — assuming a well-distributed hash function (Chapter 4's requirements, again) with few collisions, most windows are rejected via an O(1) hash comparison, with the O(m) verification step happening rarely.
- **Worst case**: **O(n·m)** — if the hash function performs poorly (many collisions), every window might require full verification, degrading to the same complexity as naive search. This mirrors Chapter 4's honest "O(1) average case, O(n) worst case with a poor hash function" caveat for hash tables — the exact same nuance, applied here.

### 📌 Quick Revision: KMP vs. Rabin-Karp

| | KMP | Rabin-Karp |
|---|---|---|
| Worst-case time | **O(n + m), guaranteed** | O(n·m) (rare, poor-hash-function dependent) |
| Average-case time | O(n + m) | O(n + m) |
| Core mechanism | Precomputed pattern self-similarity (LPS array) | Rolling hash + occasional verification |
| Genuinely useful for | Single-pattern search with a hard guarantee needed | **Multi-pattern search** (compute multiple pattern hashes upfront, check each window against all of them cheaply) |
| Conceptual root | "Never re-examine text you've already matched" | Chapter 4's hashing, applied to substrings via a rolling update |

### 🔥 Interview Tip

The clean decision framework: **"KMP guarantees O(n+m) worst case unconditionally, making it the safer choice for a single pattern where predictable performance matters. Rabin-Karp's real strength is multi-pattern search — hashing multiple patterns upfront lets you check each text window against many patterns in roughly the same O(1)-per-window cost as checking against one, which KMP doesn't naturally offer."**

---

## 22.3 A Conceptual Introduction to Suffix Arrays and Suffix Trees

### 🚀 Pro Tip: Why These Structures Exist

KMP and Rabin-Karp both answer **"does this ONE specific pattern occur in this text?"** efficiently. Suffix arrays and suffix trees answer a more general, more powerful question: **"precompute a structure ONCE for a text, then answer MANY different pattern queries against it extremely fast"** — directly analogous to Chapter 3's prefix sums (pay a one-time setup cost, then answer many queries cheaply) and Chapter 10's tries (built once, queried repeatedly for many different prefixes).

### 22.3.1 Suffix Arrays

**Definition:** A suffix array of a string is a sorted array of all of that string's suffixes (or, more precisely and efficiently, an array of the *starting indices* of all suffixes, sorted according to the suffixes' lexicographic order).

```javascript
function buildSuffixArray(text) {
  const n = text.length;
  const suffixes = [];

  for (let i = 0; i < n; i++) {
    suffixes.push({ index: i, suffix: text.substring(i) });
  }

  suffixes.sort((a, b) => (a.suffix < b.suffix ? -1 : a.suffix > b.suffix ? 1 : 0));

  return suffixes.map(s => s.index);
}

console.log(buildSuffixArray('banana'));
// Suffixes: "banana"(0), "anana"(1), "nana"(2), "ana"(3), "na"(4), "a"(5)
// Sorted:   "a"(5), "ana"(3), "anana"(1), "banana"(0), "na"(4), "nana"(2)
// Suffix array: [5, 3, 1, 0, 4, 2]
```

### ⚠ Common Mistake: This Naive Construction Is O(n² log n), Not Production-Grade

Building the suffix array this way — generating every suffix as an actual substring, then sorting with a generic comparator — costs O(n²) just to create all the substrings (each of average length O(n)), plus O(n log n) comparisons each potentially costing O(n) to compare two long strings, giving roughly **O(n² log n)** total. **Real production suffix array construction uses specialized O(n log n) (or even O(n)) algorithms** (like the SA-IS algorithm, mentioned in Further Reading) that avoid ever materializing full substrings. **The naive version shown here is for conceptual clarity only** — know this limitation and state it explicitly if implementing suffix arrays in an interview setting, exactly the same "naive vs. production-grade" honesty this book has modeled throughout (recall Chapter 14's naive-vs-optimized Union-Find, Chapter 9's naive-vs-heapify construction).

### 🎯 Interview Pattern: What Suffix Arrays Enable

Once built, a suffix array enables **O(m log n) pattern search** (binary search — Chapter 16! — over the sorted suffixes, since any occurrence of the pattern must be a prefix of some suffix, and sorted suffixes group matching prefixes together), finding the **longest repeated substring** in a text, and computing the **longest common substring** between multiple texts (by concatenating them with a separator and analyzing the combined suffix array) — all reusing the *same* precomputed structure for many different queries, exactly the "pay once, query cheaply many times" trade-off family this book has built repeatedly (Chapter 3's prefix sums, Chapter 10's tries, Chapter 23's upcoming segment trees).

### 22.3.2 Suffix Trees (Conceptual Overview)

**Definition:** A suffix tree is a compressed trie (recall Chapter 10's radix tree / compressed trie preview!) containing every suffix of a string, enabling extremely fast substring queries — pattern search in O(m) time, independent of the text's length `n`, after an O(n) construction.

### 🎯 Interview Pattern: The Direct Callback to Chapter 10

A suffix tree is, quite literally, **Chapter 10's trie concept, applied to every suffix of a text rather than every word in a dictionary, and compressed (per Chapter 10's radix-tree preview) to save memory on the long, often non-branching suffix chains.** This is worth stating explicitly as a genuine "aha" connection: you already understand tries deeply from Chapter 10; a suffix tree is that exact same tool, retargeted at a different kind of input (all suffixes of one string, instead of a curated word list).

### 🔥 Interview Tip

Full suffix tree *construction* algorithms (like Ukkonen's algorithm, achieving O(n) construction time) are genuinely advanced, rarely implemented from scratch even in difficult interviews. **The expected depth for the overwhelming majority of interviews is conceptual fluency**: knowing that suffix trees/arrays exist, what problem they solve (many pattern queries against one fixed text, extremely fast, after a one-time construction cost), and how they relate to structures you already know deeply (tries, compressed tries) — exactly the same "conceptual introduction, not full implementation" treatment this book gave AVL/Red-Black trees in Chapter 8.

---

## 22.4 Edge Cases and Gotchas Checklist for String Algorithm Problems

1. **Empty pattern or empty text.** Verify each algorithm's behavior is explicitly defined and sensible (an empty pattern typically "matches" at every position, or is defined as a special no-op case — state your convention).
2. **Pattern longer than text.** Should immediately return no matches, without attempting any comparisons.
3. **Pattern equals the entire text.** A boundary case worth verifying explicitly for both KMP and Rabin-Karp.
4. **Overlapping matches** (e.g., searching for `"aa"` in `"aaaa"`) — verify your algorithm correctly finds all overlapping occurrences, not just non-overlapping ones (KMP's `j = lps[j-1]` continuation after a match, shown in section 22.1.3, is specifically what enables this).
5. **Hash collisions in Rabin-Karp** — always include the character-by-character verification step; never skip it as a "probably fine" optimization.
6. **JavaScript's modulo operator returning negative values** in rolling hash calculations — always explicitly normalize.
7. **Unicode/multi-byte characters** — per Chapter 3's lesson, `charCodeAt` operates on UTF-16 code units, not full Unicode code points; be aware of this if pattern matching needs to be correct across the full Unicode range, not just ASCII/BMP text.

---

## 22.5 Chapter Summary

This chapter tackled substring search, opening with a concrete demonstration that naive O(n·m) search wastes exactly the same kind of redundant, already-known information that Chapter 2's naive Fibonacci and Chapter 8's naive `isBalanced` wasted — a recurring theme throughout this book that "the fix is almost always: don't recompute what you already know." We built **KMP** around the precomputed LPS (Longest Proper Prefix-Suffix) array, which encodes a pattern's internal self-similarity, letting the search phase guarantee that the text pointer **never moves backward** — a genuinely powerful, unconditional O(n+m) guarantee with zero pathological worst case, achieved by ensuring every failed comparison's partial-match information gets reused via an O(1) LPS lookup rather than discarded.

We built **Rabin-Karp** as a fundamentally different escape route, directly extending Chapter 4's hashing philosophy and Chapter 3's sliding-window rolling-update technique: compute a rolling hash for each text window in O(1) per slide, compare hashes cheaply, and fall back to full character verification only on a hash match — with the crucial, non-negotiable correctness requirement (directly recalling Chapter 4's collision guarantee) that a hash match must **always** be verified character-by-character before being reported as a confirmed result, since collisions are mathematically inevitable, not a remote theoretical concern. We flagged a specifically JavaScript gotcha along the way: the `%` operator can return negative results for negative dividends, requiring explicit normalization in rolling-hash arithmetic — a subtle, real bug source worth knowing cold.

We closed with a conceptual (not full-implementation) introduction to suffix arrays and suffix trees, framed explicitly around the "pay a one-time construction cost, then answer many queries cheaply" trade-off family this book has built repeatedly since Chapter 3's prefix sums and Chapter 10's tries — and made the connection to Chapter 10 as concrete as possible: **a suffix tree is literally Chapter 10's trie/compressed-trie concept, retargeted at every suffix of a single text rather than a curated word dictionary.** We were honest, in the same spirit as this book's treatment of AVL/Red-Black trees (Chapter 8) and Union-Find's amortized bound (Chapter 14), that genuinely efficient suffix structure construction is an advanced topic beyond typical interview implementation expectations, while conceptual fluency — knowing what these structures enable and why — remains a valuable, realistic, and expected level of depth.

---

## 22.6 Revision Notes

- Naive substring search is O(n·m), wasting redundant information exactly like naive Fibonacci (Chapter 2) or naive isBalanced (Chapter 8) — the fix is the same underlying philosophy: don't recompute what you already know.
- KMP's LPS array encodes a pattern's internal self-similarity, guaranteeing the text pointer never moves backward during search — an unconditional O(n+m), with zero pathological worst case.
- Rabin-Karp uses a rolling hash (directly extending Chapter 3's sliding-window update and Chapter 4's hashing) for O(1)-per-window comparison, but MUST verify character-by-character on every hash match — collisions are mathematically inevitable (Chapter 4's pigeonhole principle), not a remote concern.
- JavaScript's `%` can return negative results for negative dividends — always normalize in rolling-hash arithmetic.
- KMP guarantees O(n+m) worst case unconditionally; Rabin-Karp's real strength is efficient multi-pattern search via precomputed hashes.
- Suffix arrays/trees enable "build once, query many times cheaply" pattern search — a suffix tree is literally Chapter 10's trie/compressed-trie concept applied to every suffix of a text.
- Genuinely efficient suffix structure construction (SA-IS, Ukkonen's algorithm) is advanced and beyond typical interview implementation expectations; conceptual fluency is the expected depth.

---

## 22.7 Mind Map (ASCII)

```
                              STRING ALGORITHMS
                                       |
      +------------------+------------+------------+----------------------+
      |                  |                         |                      |
  NAIVE O(n*m)         KMP                    RABIN-KARP            SUFFIX ARRAYS/TREES
  SEARCH               (LPS array)            (rolling hash)        (build ONCE,
      |                     |                       |                query MANY times)
  Wastes redundant     "Never re-examine      Ch.3 sliding window        |
  info -- SAME          text you've           rolling update         Suffix Array:
  pattern as naive       already matched"      + Ch.4 hashing         sorted suffixes,
  Fibonacci (Ch.2),           |                     |                 O(m log n) search
  naive isBalanced      i NEVER moves         MUST verify on         via binary search
  (Ch.8)                backward -- LPS       hash match! (Ch.4      (Ch.16)
                         gives O(1) fallback   collisions are             |
                         on mismatch           MATHEMATICALLY         Suffix Tree =
                              |                INEVITABLE)            Ch.10's trie/
                        O(n+m) GUARANTEED           |                 compressed trie,
                        (unconditional,        JS gotcha: %          retargeted at
                        no pathological        can return            EVERY SUFFIX of
                        worst case)            NEGATIVE! Must         one text
                              |                normalize                   |
                        Best for: SINGLE            |                O(m) search after
                        pattern, hard          O(n+m) avg,           O(n) construction
                        guarantee needed       O(n*m) worst          (Ukkonen's algo --
                                               (poor hash fn)         ADVANCED, conceptual
                                                    |                 knowledge expected,
                                               Best for: MULTI-       not implementation)
                                               PATTERN search
```

---

## 22.8 Cheat Sheet

```
COMPLEXITY COMPARISON
=========================
Naive search:    O(n*m) worst case
KMP:             O(n+m) GUARANTEED (unconditional, no worst-case degradation)
Rabin-Karp:      O(n+m) average, O(n*m) worst (poor hash function)
Suffix Array:    O(n log n) or better construction (specialized algo), O(m log n) per query
Suffix Tree:     O(n) construction (Ukkonen's, advanced), O(m) per query

KMP LPS ARRAY
================
lps[i] = length of longest proper prefix of pattern[0..i] that's also a proper suffix
Build: if match, extend; if mismatch, fall back using lps[length-1] (DON'T reset to 0 directly!)
Search: on mismatch, j = lps[j-1] (fall back in PATTERN); i NEVER moves backward in TEXT

RABIN-KARP ROLLING HASH
===========================
newHash = ((oldHash - leftChar*highOrderMultiplier) * BASE + newRightChar) % MOD
ALWAYS verify character-by-character after a hash match (collisions are real!)
ALWAYS normalize negative results: if (hash < 0) hash += MOD;  (JS % can be negative!)

DECISION GUIDE
=================
Single pattern, need guaranteed worst-case performance -> KMP
Multiple patterns to search simultaneously             -> Rabin-Karp (hash all patterns upfront)
Many DIFFERENT queries against the SAME fixed text      -> Suffix Array / Suffix Tree
```

---

## 22.9 Key Takeaways

1. Naive substring search wastes redundant match information — the same underlying inefficiency pattern as naive Fibonacci and naive isBalanced, fixed by the same "don't recompute what you know" philosophy.
2. KMP's LPS array guarantees the text pointer never moves backward, achieving unconditional O(n+m) with zero pathological worst case.
3. Rabin-Karp's rolling hash gives O(1)-per-window comparison, but character-by-character verification after every hash match is non-negotiable — collisions are mathematically inevitable, not a remote concern.
4. JavaScript's `%` can return negative values — always normalize in rolling-hash arithmetic.
5. Suffix arrays and suffix trees trade a one-time construction cost for fast repeated queries; a suffix tree is literally Chapter 10's trie concept retargeted at every suffix of a text.

---

## 22.10 20 Multiple Choice Questions

1. What is the time complexity of naive substring search in the worst case?
   a) O(n + m)
   b) O(n * m)
   c) O(log n)
   d) O(n log n)

2. What does the KMP LPS array represent?
   a) The number of vowels in the pattern
   b) The length of the longest proper prefix of pattern[0..i] that is also a proper suffix
   c) A sorted list of all suffixes
   d) A hash of the pattern

3. What is the key guarantee that makes KMP achieve O(n+m) worst-case time?
   a) The pattern must be sorted first
   b) The text pointer never moves backward during the search phase
   c) The text must contain no repeated characters
   d) It uses a hash table internally

4. What happens when a mismatch occurs during KMP's search phase?
   a) The text pointer moves backward to retry
   b) The pattern pointer falls back using the precomputed LPS array, an O(1) lookup
   c) The entire search restarts from position 0
   d) An error is thrown

5. What is the core mechanism of the Rabin-Karp algorithm?
   a) Building a suffix tree
   b) Comparing rolling hashes of text windows against the pattern's hash, verifying on a match
   c) Using KMP's LPS array
   d) Sorting all substrings

6. What must ALWAYS happen after a hash match is found in Rabin-Karp?
   a) Nothing; the hash match is sufficient proof
   b) A character-by-character verification, since hash collisions are mathematically possible
   c) The hash function must be rebuilt
   d) The search must restart

7. Why are hash collisions in Rabin-Karp a genuine concern, not just theoretical?
   a) They never actually occur in practice
   b) The pigeonhole principle (Chapter 4) guarantees collisions are possible given enough distinct inputs
   c) JavaScript hash functions are broken
   d) Collisions only occur with very short patterns

8. What is a JavaScript-specific gotcha relevant to rolling hash calculations?
   a) JavaScript doesn't support the modulo operator
   b) The `%` operator can return negative results for negative dividends, requiring explicit normalization
   c) JavaScript numbers cannot exceed 100
   d) Modulo is always O(n) in JavaScript

9. What is the worst-case time complexity of Rabin-Karp?
   a) O(n + m), always
   b) O(n * m), if the hash function performs poorly with many collisions
   c) O(log n)
   d) O(1)

10. What is a key practical advantage of Rabin-Karp over KMP?
    a) It always runs faster
    b) It naturally extends to efficient multi-pattern search by hashing multiple patterns upfront
    c) It never has a worst case
    d) It doesn't require any preprocessing

11. What is a suffix array?
    a) An array of all substrings of a text
    b) A sorted array of the starting indices of all suffixes of a text, ordered lexicographically
    c) A hash table of character frequencies
    d) An array storing only the longest suffix

12. What is the complexity of the naive suffix array construction shown in this chapter?
    a) O(n log n), production-grade
    b) O(n² log n), due to materializing full substrings and comparing them
    c) O(n), optimal
    d) O(1)

13. What technique enables O(m log n) pattern search using a suffix array?
    a) A hash table lookup
    b) Binary search (Chapter 16) over the sorted suffixes
    c) A monotonic stack
    d) Dynamic programming

14. What is a suffix tree, in relation to concepts from Chapter 10?
    a) An entirely unrelated structure
    b) A compressed trie (Chapter 10's radix tree concept) containing every suffix of a text
    c) A binary search tree of suffixes
    d) A hash table of suffixes

15. What is the time complexity of pattern search using a fully-constructed suffix tree?
    a) O(n)
    b) O(m), independent of the text's length n
    c) O(n * m)
    d) O(log n)

16. What advanced algorithm achieves O(n) suffix tree construction?
    a) KMP
    b) Ukkonen's algorithm
    c) Rabin-Karp
    d) Dijkstra's algorithm

17. What is the expected level of depth for suffix trees/arrays in most technical interviews?
    a) Full from-scratch implementation of O(n) construction algorithms
    b) Conceptual fluency: knowing what they enable and how they relate to tries, not full implementation
    c) No knowledge is ever expected
    d) Only the naive O(n² log n) construction is acceptable

18. What underlying philosophy connects naive substring search's inefficiency to naive Fibonacci (Chapter 2) and naive isBalanced (Chapter 8)?
    a) They are all O(1) algorithms
    b) All three waste redundant, already-known information that could be reused instead of recomputed
    c) They all require a heap
    d) They are unrelated inefficiencies with different root causes

19. What trade-off do suffix arrays/trees share with Chapter 3's prefix sums and Chapter 10's tries?
    a) None; they are unrelated techniques
    b) Pay a one-time construction/setup cost to enable many fast repeated queries afterward
    c) They all require O(n²) space
    d) They all only work on numeric data

20. What should you verify when implementing KMP or Rabin-Karp for overlapping pattern matches (e.g., "aa" in "aaaa")?
    a) Overlapping matches are impossible to find with these algorithms
    b) That the algorithm correctly continues searching after a match (e.g., KMP's j = lps[j-1] after a match) rather than stopping
    c) That the pattern contains no repeated characters
    d) That the text is sorted first

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-b, 19-b, 20-b

---

## 22.11 20 Coding Problems

**Easy**

1. Implement naive substring search from memory, and identify its worst-case input by construction.
2. Implement `buildLPS` from memory (section 22.1.2), and verify against the book's dry run for `'aabaaab'`.
3. Given a string, use the LPS array concept to determine the shortest possible "period" of a repeating string (e.g., "abcabcabc" has period "abc").
4. Write a simple (non-rolling) hash function for strings, and verify it produces the same hash for identical strings.
5. Given two strings, determine if one is a rotation of the other (hint: check if the target is a substring of the source concatenated with itself).

**Medium**

6. Implement `kmpSearch` fully from memory (section 22.1.3), and verify it finds overlapping matches correctly.
7. Implement `rabinKarpSearch` fully from memory (section 22.2.2), including the negative-modulo normalization, and verify against a hand-constructed hash collision test case (two different strings you've confirmed hash to the same value with your specific BASE/MOD).
8. Given a list of multiple patterns and one text, implement multi-pattern search using Rabin-Karp (hash all patterns upfront, check each window against the set).
9. Implement the naive suffix array construction from memory (section 22.3.1), and use it to find the longest repeated substring in a text.
10. Given a string, determine the longest palindromic substring using an "expand around center" approach, and discuss in comments how this relates to (but differs from) the string-matching techniques in this chapter.

**Hard**

11. Implement a function to find all anagram substrings of a pattern within a text (hint: combine Chapter 4's frequency-counting with Chapter 3's sliding window, contrasting this approach against KMP/Rabin-Karp for this specific problem shape).
12. Given a text and a pattern with wildcard characters (where '?' matches any single character), adapt KMP or implement a DP-based approach (connecting back to Chapter 19) to find all matches.
13. Implement the "Z-function" (a related string-preprocessing technique to KMP's LPS array, computing for every position the length of the longest substring starting there that matches a prefix of the string), and use it to solve pattern matching as an alternative to KMP.
14. Given a very large text and a very large set of patterns (too many for practical individual Rabin-Karp hashing), describe (with a smaller simulated implementation) how the Aho-Corasick algorithm (combining Chapter 10's trie with KMP's failure-function concept) would efficiently solve simultaneous multi-pattern search.
15. Implement a basic longest common substring finder between two strings using the suffix-array-based approach (concatenate with a separator, build the combined suffix array, analyze adjacent sorted suffixes).

**Interview Level**

16. **(Google-level)** Given a massive log corpus and a need to repeatedly search for different error-message patterns, design a system choosing between KMP (single pattern, repeated searches) and Rabin-Karp (multiple patterns) based on the actual query pattern, justifying your choice in comments.
17. **(Amazon-level)** Given a product search feature needing substring matching across millions of product names, implement Rabin-Karp for efficient multi-keyword search, discussing hash collision mitigation strategies for production reliability.
18. **(Microsoft-level)** Given a plagiarism detection requirement (finding common substrings between two large documents), use the suffix-array-based longest-common-substring technique (problem 15) and discuss its scalability compared to a naive O(n²) character-by-character comparison approach.
19. **(Meta-level)** Given a content moderation system needing to detect banned phrases (including common obfuscated variants) in user posts, implement KMP for exact matching and discuss in comments what additional techniques (fuzzy matching, edit distance from Chapter 19) would be needed for the obfuscated-variant detection.
20. **(Netflix-level)** Design a subtitle search feature allowing users to search for a spoken line across an entire show's transcript (a large text corpus), using suffix array concepts to enable fast repeated substring queries, and discuss the trade-off between build-time cost (constructing the suffix array once per transcript) and query-time speed at scale.

---

## 22.12 5 Interview Questions

1. "Implement KMP's LPS array construction, and explain what it represents." (Tests both implementation and conceptual understanding of self-similarity encoding.)
2. "Why does KMP guarantee O(n+m) time, unlike naive search?" (Tests understanding of the "text pointer never moves backward" guarantee specifically.)
3. "Implement Rabin-Karp, and explain why you must verify after a hash match." (Tests both implementation and the non-negotiable collision-verification requirement.)
4. "When would you choose Rabin-Karp over KMP, or vice versa?" (Tests the single-pattern-guarantee vs. multi-pattern-efficiency decision framework.)
5. "What is a suffix array, and how does it relate to a trie (Chapter 10)?" (Tests conceptual fluency and cross-chapter connection-making, not implementation depth.)

---

## 22.13 3 Real Projects

1. **Complete String-Matching Library**: Implement naive search, KMP, and Rabin-Karp in a single library, with a self-check script verifying all three produce identical match results across randomized text/pattern pairs, and benchmarking their performance on both average-case and adversarially-constructed worst-case inputs (e.g., KMP's guaranteed performance versus naive search's pathological slowdown on repetitive text).
2. **Multi-Pattern Log Scanner**: Build a Node.js CLI tool that scans a log file for multiple error-message patterns simultaneously using Rabin-Karp's multi-pattern technique, reporting all matches with their line numbers.
3. **Plagiarism/Similarity Checker**: Build a tool implementing the suffix-array-based longest-common-substring technique to compare two text documents and report their longest shared passage, along with a simple "similarity score" based on the shared substring's length relative to document size.

---

## 22.14 Further Reading

- Donald Knuth, James Morris, and Vaughan Pratt's original 1977 paper introducing KMP, and Richard Karp and Michael Rabin's original paper introducing Rabin-Karp — both foundational, genuinely readable papers in the history of algorithm design.
- Search "Z-function algorithm" for the closely-related string-preprocessing technique mentioned in coding problem #13, often taught alongside KMP.
- Search "Aho-Corasick algorithm" for the trie-plus-failure-function combination (mentioned in coding problem #14) that efficiently generalizes KMP's single-pattern guarantee to simultaneous multi-pattern search.
- Search "SA-IS algorithm suffix array construction" and "Ukkonen's algorithm suffix tree" for the genuinely advanced, linear-time construction techniques referenced but not fully implemented in section 22.3.
- LeetCode's "String Matching" and "KMP Algorithm" tagged problems, for extensive additional practice.

---

*End of Chapter 22. Next: Chapter 23 will cover Segment Trees and Fenwick Trees (Binary Indexed Trees) — advanced structures for efficient range queries AND range updates simultaneously, extending Chapter 3's prefix sums and difference arrays into structures that support both operations together, dynamically, in O(log n).*

**Say "Continue to the next chapter" when ready.**
