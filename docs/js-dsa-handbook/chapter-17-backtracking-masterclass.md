# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 17: The Backtracking Masterclass

---

## 17.0 Formalizing What We've Been Previewing Since Chapter 2

We first met backtracking in Chapter 2, section 2.8.3 (subset generation) with the mantra **"choose, explore, un-choose."** Chapter 10 previewed it again pruning a trie-guided grid search. This chapter promotes that rhythm from "a neat trick shown once" to a complete, systematic framework — the single technique responsible for solving nearly every "generate all X" or "find a valid arrangement satisfying constraints" problem you'll ever encounter.

---

## 17.1 The Formal Model: A Decision Tree With Pruning

**Definition:** Backtracking is a refinement of brute-force recursive search that builds candidate solutions incrementally, abandoning ("backtracking" out of) any partial candidate as soon as it can be determined that it cannot possibly lead to a valid, complete solution.

### 🧠 Memory Trick: The Maze-Walking Analogy

Imagine navigating a maze by trying a path, and the moment you hit a dead end, **walking back to the last decision point and trying a different direction** — never bulldozing through walls, never magically teleporting, just retracing your exact steps and making a different choice. This is backtracking, literally: explore a choice fully, and if it fails, undo it and try the next option, exactly as far back as necessary.

### ASCII Visualization: The Decision Tree

```
Generating all subsets of {1, 2}: at each element, CHOOSE to include it or not.

                          []
                    /            \
              exclude 1        include 1
                 /                  \
               []                   [1]
             /    \                /    \
        exclude 2 include 2   exclude 2 include 2
           /          \          /          \
         []          [2]       [1]        [1,2]

Every LEAF of this tree is one complete, valid output. The tree itself
IS the recursion; each level = one decision; each path root-to-leaf = one subset.
```

### 🎯 The Three-Part Anatomy of Every Backtracking Function

Every backtracking solution in this chapter shares an identical skeleton, worth memorizing as a template you can reproduce under pressure:

```javascript
function backtrack(pathSoFar, remainingChoices, results) {
  if (isCompleteSolution(pathSoFar)) {   // BASE CASE: a full candidate has been built
    results.push([...pathSoFar]);        // ALWAYS COPY — Chapter 2's critical lesson, revisited!
    return;
  }

  for (const choice of getValidChoicesAt(pathSoFar, remainingChoices)) {
    pathSoFar.push(choice);              // CHOOSE
    backtrack(pathSoFar, remainingChoices, results); // EXPLORE
    pathSoFar.pop();                     // UN-CHOOSE (the "backtrack" step itself)
  }
}
```

### ⚠ Common Mistake (Worth Repeating From Chapter 2, Because It's THAT Common)

**Forgetting `[...pathSoFar]` when pushing to `results`** is, without exaggeration, the single most common bug across every backtracking problem in existence. `pathSoFar` is one mutable array, reused and mutated throughout the *entire* recursive search (via push/pop, for O(1) per-operation cost instead of O(n) copying at every step). If you push the live reference instead of a snapshot, every entry in your final `results` array ends up pointing to the *same* underlying array, which will show whatever its state happens to be by the time the whole search finishes (usually empty, since everything gets popped back out). Always copy at the exact moment you commit a result.

---

## 17.2 Permutations: Choosing Order, Not Just Membership

**The problem:** given an array of distinct numbers, generate all possible orderings (permutations).

### Intuition: The Decision at Each Level Is "Which Unused Element Goes Here Next?"

Unlike subsets (where each level asks "include this specific element or not"), permutations ask **"which of the remaining unused elements should occupy this next position?"** — a genuinely different branching structure, worth explicitly contrasting.

```javascript
function permute(nums) {
  const results = [];

  function backtrack(pathSoFar, used) {
    if (pathSoFar.length === nums.length) {
      results.push([...pathSoFar]); // copy!
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue; // this element is already placed somewhere in pathSoFar — skip it

      used[i] = true;                    // CHOOSE
      pathSoFar.push(nums[i]);

      backtrack(pathSoFar, used);         // EXPLORE

      pathSoFar.pop();                    // UN-CHOOSE
      used[i] = false;
    }
  }

  backtrack([], new Array(nums.length).fill(false));
  return results;
}

console.log(permute([1, 2, 3]));
// [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
```

### Dry Run (Abbreviated, First Branch Only)

```
backtrack([], [F,F,F]):
  i=0 (nums[0]=1): not used. used=[T,F,F], path=[1]
    backtrack([1], [T,F,F]):
      i=0: used, skip.
      i=1 (nums[1]=2): not used. used=[T,T,F], path=[1,2]
        backtrack([1,2], [T,T,F]):
          i=0,1: used, skip. i=2 (nums[2]=3): not used. used=[T,T,T], path=[1,2,3]
            backtrack([1,2,3],...): length===3 -> results.push([1,2,3])  <- FIRST RESULT!
          UNDO: path=[1,2], used=[T,T,F]
      UNDO: path=[1], used=[T,F,F]
      i=2 (nums[2]=3): not used. used=[T,F,T], path=[1,3]
        ... (eventually produces [1,3,2]) ...
  UNDO: path=[], used=[F,F,F]
  i=1 (nums[1]=2): not used. ... (produces [2,1,3] and [2,3,1]) ...
  i=2 (nums[2]=3): not used. ... (produces [3,1,2] and [3,2,1]) ...
```

### 🧮 Complexity: Why Permutations Are O(n · n!)

There are exactly `n!` total permutations of `n` distinct elements (n choices for the first position, `n-1` for the second, and so on — the classic factorial-counting argument), and building/copying each complete permutation costs O(n). **Time: O(n · n!). Space: O(n) for the recursion depth (plus O(n·n!) for storing all results, if required).** This is one of the clearest illustrations in this book of Chapter 1's factorial complexity class — not a bug to fix, but the honest, unavoidable cost of genuinely needing to enumerate every ordering.

### 🔥 Interview Tip: Handling Duplicate Elements in Permutations

A very common, trickier follow-up: **"generate all UNIQUE permutations when the input array contains duplicates."** The naive approach above would produce duplicate permutations when `nums` has repeated values. The standard fix: **sort the array first, and within the loop, skip a candidate if it equals the previous candidate at the same recursion level AND the previous one hasn't been used yet** (a subtle but crucial condition, since "previous one used" vs. "previous one not yet used" distinguishes a legitimate reuse of an equal-valued-but-different-position element from a genuine duplicate branch):

```javascript
function permuteUnique(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const results = [];
  const used = new Array(sorted.length).fill(false);

  function backtrack(pathSoFar) {
    if (pathSoFar.length === sorted.length) {
      results.push([...pathSoFar]);
      return;
    }

    for (let i = 0; i < sorted.length; i++) {
      if (used[i]) continue;
      // Skip duplicates: if this value equals the previous one, and the
      // previous one is NOT currently used, we've already explored this
      // exact branch via the previous occurrence — skip to avoid a duplicate result.
      if (i > 0 && sorted[i] === sorted[i - 1] && !used[i - 1]) continue;

      used[i] = true;
      pathSoFar.push(sorted[i]);
      backtrack(pathSoFar);
      pathSoFar.pop();
      used[i] = false;
    }
  }

  backtrack([]);
  return results;
}
```

### 🎯 Interview Pattern: The General "Skip Duplicates" Recipe

This exact "sort first, then skip `nums[i] === nums[i-1]` under a specific used/unused condition" recipe reappears across nearly every backtracking problem variant involving duplicate input values (subsets with duplicates, combination sum with duplicates — both covered below). **Memorize the recipe's shape, not just this one instance of it**: sort to group duplicates adjacently, then add a same-level duplicate-skip guard at the top of your choice loop.

---

## 17.3 Combinations: Choosing a Fixed-Size Subset

**The problem:** given `n` and `k`, generate all combinations of `k` numbers chosen from `1` to `n`.

```javascript
function combine(n, k) {
  const results = [];

  function backtrack(start, pathSoFar) {
    if (pathSoFar.length === k) {
      results.push([...pathSoFar]);
      return;
    }

    // PRUNING: if there aren't enough remaining numbers to reach length k, stop early!
    for (let i = start; i <= n - (k - pathSoFar.length) + 1; i++) {
      pathSoFar.push(i);
      backtrack(i + 1, pathSoFar); // i+1, NOT start+1 — never reuse or go backward!
      pathSoFar.pop();
    }
  }

  backtrack(1, []);
  return results;
}

console.log(combine(4, 2));
// [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]
```

### 🧠 Memory Trick: Why `i + 1`, Not `start + 1` or `0`

**Combinations don't care about order** ("1,2" and "2,1" are the same combination), so we must never allow a later choice to "go backward" and re-pick an earlier number — the `backtrack(i + 1, ...)` call ensures every recursive call only considers numbers *strictly after* the one just chosen, which is precisely what prevents both duplicate orderings of the same combination and re-selection of an already-used number, in one single mechanism.

### 🚀 Pro Tip: The Pruning Condition Is a Real Optimization, Not Decoration

The loop bound `i <= n - (k - pathSoFar.length) + 1` is a genuine pruning technique, not cosmetic: **it stops the loop from even attempting choices that mathematically cannot produce a complete, valid combination** (not enough remaining numbers left to fill out the required length). Without this bound, you'd still get correct results (the base case would simply never trigger for those doomed branches), but you'd waste time exploring paths destined to fail — exactly the kind of pruning insight that separates "technically correct but slow" backtracking from genuinely efficient backtracking.

### 🎯 Interview Pattern: Combinations vs. Permutations — the Decisive Question

**"Does order matter?"** is the single question that distinguishes these two problem families. If `[1,2]` and `[2,1]` should be counted as the *same* answer, you're solving a combinations problem (use the `start`/`i+1` non-reuse, non-backward technique). If they should be counted as *different* answers, you're solving a permutations problem (use the `used[]` array technique from section 17.2). Confusing these two is one of the most common, most avoidable backtracking mistakes.

---

## 17.4 The N-Queens Problem: Backtracking With Real Constraint Checking

**The problem:** place `N` queens on an `N×N` chessboard such that no two queens threaten each other (no two share a row, column, or diagonal).

```javascript
function solveNQueens(n) {
  const results = [];
  const columns = new Set();
  const diagonals = new Set();      // row - col is constant along one diagonal direction
  const antiDiagonals = new Set();  // row + col is constant along the OTHER diagonal direction

  function backtrack(row, board) {
    if (row === n) {
      results.push([...board]);
      return;
    }

    for (let col = 0; col < n; col++) {
      if (columns.has(col) || diagonals.has(row - col) || antiDiagonals.has(row + col)) {
        continue; // PRUNING: this position is under attack, don't even try it
      }

      // CHOOSE
      columns.add(col);
      diagonals.add(row - col);
      antiDiagonals.add(row + col);
      board.push('.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1));

      backtrack(row + 1, board); // EXPLORE

      // UN-CHOOSE
      columns.delete(col);
      diagonals.delete(row - col);
      antiDiagonals.delete(row + col);
      board.pop();
    }
  }

  backtrack(0, []);
  return results;
}
```

### 🧠 Memory Trick: The Diagonal Math

This is worth understanding deeply, not just copying: **every cell on the same "\\"-direction diagonal shares the same value of `row - col`** (moving one step down-right increases both row and col by 1, so their difference stays constant). **Every cell on the same "/"-direction diagonal shares the same value of `row + col`** (moving one step down-left increases row by 1 and decreases col by 1, so their sum stays constant). Tracking these two derived values in `Set`s (Chapter 4!) gives O(1) attack-detection for both diagonal directions, turning what could be an O(n) per-position scan into O(1).

### 🎯 Interview Pattern: Why This Is "Real" Backtracking, Not Just Enumeration

N-Queens is a step up from pure enumeration (subsets, permutations, combinations) because it introduces **genuine constraint checking as the pruning mechanism itself** — we don't generate every possible board configuration and filter afterward (which would be catastrophically wasteful, `n^n` configurations for an n×n board); we **prune invalid placements the instant they become invalid**, often eliminating entire subtrees of the search space with a single O(1) check. This "prune as early as possible" discipline is the single biggest differentiator between naive brute-force recursion and genuinely effective backtracking, and it's worth explicitly naming as your strategy whenever attacking a new backtracking problem: **"what's the earliest point at which I can detect a partial solution is already doomed, and how cheaply can I check that?"**

---

## 17.5 Sudoku Solver: Backtracking on a Grid With Multiple Simultaneous Constraints

```javascript
function solveSudoku(board) {
  function isValid(row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num) return false;                              // row constraint
      if (board[i][col] === num) return false;                              // column constraint
      const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
      const boxCol = 3 * Math.floor(col / 3) + (i % 3);
      if (board[boxRow][boxCol] === num) return false;                      // 3x3 box constraint
    }
    return true;
  }

  function backtrack() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] !== '.') continue; // already filled — move on

        for (let num = 1; num <= 9; num++) {
          const numStr = String(num);
          if (isValid(row, col, numStr)) {
            board[row][col] = numStr;    // CHOOSE

            if (backtrack()) return true; // EXPLORE — if this leads to a full solution, propagate success!

            board[row][col] = '.';        // UN-CHOOSE
          }
        }

        return false; // no valid number worked for this cell — this WHOLE PATH fails, backtrack further up!
      }
    }

    return true; // no empty cells left — the board is completely, validly filled!
  }

  backtrack();
  return board;
}
```

### 🧠 Memory Trick: Boolean-Returning Backtracking for "Find ONE Valid Solution"

Notice this function's backtracking returns a **boolean** (`true`/`false`), unlike the earlier examples that collected *all* solutions into a `results` array. This is a genuinely important variant worth distinguishing explicitly: **when a problem asks for "find ONE valid solution" (or "determine IF a solution exists") rather than "find ALL solutions," structure your backtracking function to return a boolean signaling success, and propagate that success immediately up the call stack (`if (backtrack()) return true;`) the moment a working path is found** — this lets the search stop the instant success is achieved, rather than exhaustively continuing to explore already-irrelevant alternatives.

### 🎯 Interview Pattern: "Find All" vs. "Find One" — A Fundamental Backtracking Fork

| | "Find All Solutions" | "Find One Valid Solution" |
|---|---|---|
| Return type | Populate a `results` array; function itself often returns `void` | Return a `boolean` (or the solution itself, with a sentinel for "not found") |
| Base case behavior | Record the solution, then **continue** exploring other branches | Record the solution, then **stop immediately** (propagate `true` upward) |
| Un-choose behavior | Always un-choose after exploring, to correctly try the next sibling option | Only un-choose if the current choice did NOT lead to success (skip un-choosing on a successful return, since you're propagating success and exiting) |

This table is worth internalizing as a genuine fork in how you structure *any* backtracking solution — always ask, at the very start, "does this problem want every valid arrangement, or just confirmation/production of a single one?" before writing a single line of code.

---

## 17.6 Combination Sum: Backtracking With Reusable Choices

**The problem:** given an array of candidate numbers (possibly reused unlimited times) and a target, find all unique combinations that sum to the target.

```javascript
function combinationSum(candidates, target) {
  const results = [];
  const sorted = [...candidates].sort((a, b) => a - b); // sorting enables an important pruning trick below

  function backtrack(start, remaining, pathSoFar) {
    if (remaining === 0) {
      results.push([...pathSoFar]);
      return;
    }

    for (let i = start; i < sorted.length; i++) {
      if (sorted[i] > remaining) break; // PRUNING: since sorted ascending, everything after is ALSO too big!

      pathSoFar.push(sorted[i]);
      backtrack(i, remaining - sorted[i], pathSoFar); // NOTE: `i`, not `i+1` — REUSE is allowed!
      pathSoFar.pop();
    }
  }

  backtrack(0, target, []);
  return results;
}

console.log(combinationSum([2, 3, 6, 7], 7)); // [[2,2,3],[7]]
```

### 🧠 Memory Trick: The Single Character That Changes Everything — `i` vs. `i + 1`

Compare this directly against section 17.3's `combine` function: **the only structural difference is `backtrack(i, ...)` here versus `backtrack(i + 1, ...)` there.** Passing `i` (not `i+1`) into the recursive call means **the same element can be chosen again** in the next recursive step — exactly the mechanism that allows unlimited reuse. This is a genuinely important, easy-to-miss detail: a single character's difference (`i` vs `i+1`) is the entire distinction between "each element usable once" and "each element usable unlimited times," and it's worth explicitly testing your own understanding by predicting this difference *before* looking at two similar-looking backtracking solutions side by side.

### 🚀 Pro Tip: The `break` vs. `continue` Pruning Distinction

Notice `if (sorted[i] > remaining) break;` — using `break`, not `continue`. This is only correct **because the array is sorted ascending first**: if the current candidate already exceeds the remaining target, every subsequent candidate (being larger, since the array is sorted) will *also* exceed it, so we can safely abandon the entire rest of this loop level immediately, not just skip this one candidate. Using `continue` here would still be *correct* (just slightly less efficient, checking every remaining candidate individually instead of bailing out early) — but recognizing when `break` is valid (sorted input, monotonically worsening candidates) versus when only `continue` is safe (unsorted input, no such guarantee) is a genuine, testable pruning-efficiency insight.

---

## 17.7 Word Search: Backtracking on a Grid (Closing the Loop With Chapter 10's Trie Preview)

**The problem:** given a 2D grid of letters and a word, determine if the word can be constructed from letters of sequentially adjacent cells.

```javascript
function exist(board, word) {
  const rows = board.length;
  const cols = board[0].length;

  function backtrack(row, col, index) {
    if (index === word.length) return true; // matched every character — success!

    if (
      row < 0 || row >= rows || col < 0 || col >= cols ||
      board[row][col] !== word[index]
    ) {
      return false; // out of bounds, or this cell doesn't match the needed character
    }

    const temp = board[row][col];
    board[row][col] = '#'; // CHOOSE: mark as visited (avoid reusing the same cell in this path)

    const found = (
      backtrack(row + 1, col, index + 1) ||
      backtrack(row - 1, col, index + 1) ||
      backtrack(row, col + 1, index + 1) ||
      backtrack(row, col - 1, index + 1)
    ); // EXPLORE all 4 directions

    board[row][col] = temp; // UN-CHOOSE: restore the original character for other search paths

    return found;
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (backtrack(row, col, 0)) return true;
    }
  }

  return false;
}
```

### 🧠 Memory Trick: Marking Cells as Visited IN PLACE, Then Restoring — A Space-Efficient Alternative to a Separate `visited` Set

Instead of maintaining a separate `visited` Set (Chapter 4) or 2D boolean array, this solution **temporarily mutates the board itself** (`board[row][col] = '#'`) as its "choose" step, and **restores the original value** as its "un-choose" step. This is a genuinely clever, commonly-used space optimization: it achieves the exact same "don't revisit this cell in the current path" guarantee as an external visited-tracking structure, but with **zero extra memory**, at the small cost of temporarily mutating (and needing to carefully restore) the input. **Always restore the mutation during un-choose** — forgetting this restoration step is a subtle, easy-to-miss bug that corrupts subsequent, unrelated search paths.

### 🎯 Interview Pattern: Direct Callback to Chapter 10

Recall Chapter 10's Word Search II preview: for searching *many* words simultaneously against the same grid, insert all words into a single **trie** first, and let the DFS check `startsWith` at every step to prune impossible branches early, sharing work across all the words' searches simultaneously rather than repeating this exact single-word DFS once per word (which would be correct but wasteful for large word lists). This chapter's single-word version is the foundational building block that Chapter 10's trie-based optimization builds on top of.

---

## 17.8 Edge Cases and Gotchas Checklist for Backtracking Problems

1. **Forgetting to copy the result** (`[...pathSoFar]`) — the single most common bug in this entire chapter, worth its own permanent mental red flag.
2. **Forgetting the "un-choose" step entirely**, or un-choosing in the wrong order relative to other state changes (always undo in the exact reverse order you applied changes).
3. **Combinations vs. permutations confusion** — always ask "does order matter?" before choosing between the `start`/`i+1` technique and the `used[]` array technique.
4. **Reuse vs. no-reuse confusion** — `i` vs. `i+1` in the recursive call is the entire distinction; verify explicitly which the problem requires.
5. **Duplicate-skipping logic applied incorrectly** — the `nums[i] === nums[i-1] && !used[i-1]` (or equivalent `i > start` guard for combination-style duplicates) condition is subtle; always dry-run on a small duplicate-containing example before trusting it.
6. **"Find all" vs. "find one" confusion** — decide explicitly whether your function should return a boolean and stop early on success, or continue exhaustively collecting every result.
7. **Missing or incorrect pruning** — a backtracking solution that's *correct* but doesn't prune impossible branches early can be dramatically, sometimes unusably, slower than one that does; always ask "can I detect failure earlier?"
8. **In-place grid mutation without restoration** (Word Search-style problems) — always verify the "un-choose" step restores the exact original state.

---

## 17.9 Chapter Summary

This chapter formalized the "choose, explore, un-choose" rhythm first previewed in Chapter 2 into a complete, systematic framework, anchored by a reusable three-part function skeleton: a base case that records a complete solution (always via a defensive copy — the single most common bug in all of backtracking), a loop over valid next choices, and the choose/recurse/un-choose sequence around each one. We built genuine muscle memory by working through the canonical problem families side by side specifically to sharpen the boundaries between them: **permutations** (branching on "which unused element goes next," using a `used[]` tracking array, O(n·n!) by the honest factorial-counting argument) versus **combinations** (branching on "include this element or skip it, never looking backward," using the `start`/`i+1` non-reuse technique) — with "does order matter?" as the single decisive question separating the two, and a shared, transferable "sort first, then skip adjacent duplicates under a specific used/unused condition" recipe for handling duplicate input values in either family.

We stepped up to genuine constraint-based backtracking with N-Queens, where the pruning mechanism (O(1) diagonal/column attack detection via `Set`s tracking `row-col` and `row+col`) is the actual substance of the solution, not an afterthought — establishing "what's the earliest point at which a partial solution is detectably doomed, and how cheaply can I check that?" as the central strategic question for any new backtracking problem. We used the Sudoku solver to introduce a fundamental structural fork worth internalizing before writing any backtracking code: **"find all solutions"** (populate a results array, keep exploring after every success) versus **"find one solution"** (return a boolean, propagate success immediately upward, stop exploring the moment success is achieved) — genuinely different control-flow shapes for genuinely different problem requirements.

We covered Combination Sum's reusable-choice variant, isolating the single-character (`i` vs. `i+1`) difference that separates "each choice usable once" from "each choice usable unlimited times," alongside the `break`-vs-`continue` pruning distinction that only becomes valid once the input is sorted ascending. Finally, Word Search closed the loop with Chapter 10's trie preview and demonstrated the space-efficient technique of marking visited cells via temporary in-place mutation (with careful restoration during un-choose) rather than maintaining a separate visited-tracking structure — the same core rhythm, applied to grid-based exploration, that every problem in this chapter has now demonstrated in a genuinely different guise.

---

## 17.10 Revision Notes

- Every backtracking function shares the choose/explore/un-choose skeleton; always copy (`[...pathSoFar]`) when recording a result — the most common bug in the entire technique.
- Permutations (order matters, `used[]` array) vs. combinations (order doesn't matter, `start`/`i+1` non-reuse) — "does order matter?" is the decisive question.
- Duplicate-input handling recipe: sort first, then skip `nums[i] === nums[i-1]` under a specific used/unused (or `i > start`) guard — transferable across permutations, combinations, and combination sum.
- N-Queens demonstrates that real pruning (early, cheap detection of doomed partial solutions) is the actual substance of effective backtracking, not decoration.
- "Find all solutions" (results array, keep exploring) vs. "find one solution" (boolean return, stop immediately on success) is a fundamental structural fork — decide explicitly before coding.
- Combination Sum's `i` vs. `i+1` in the recursive call is the single-character distinction between "usable once" and "usable unlimited times"; `break` (not `continue`) is a valid pruning optimization only once input is sorted ascending.
- Word Search demonstrates marking visited cells via temporary in-place mutation (with restoration on un-choose) as a zero-extra-memory alternative to a separate visited-tracking structure.

---

## 17.11 Mind Map (ASCII)

```
                            BACKTRACKING MASTERCLASS
                                       |
        +------------------+----------+----------+-----------------------+
        |                  |                     |                       |
   CORE SKELETON      PERMUTATIONS vs      REAL PRUNING            FIND-ALL vs
   (Ch.2 formalized)   COMBINATIONS         (N-QUEENS)              FIND-ONE
        |                    |                    |                      |
   choose/explore/     "Does ORDER          O(1) attack check      Results array,
   un-choose            matter?"            via row-col/row+col    keep exploring
        |               PERMUTATIONS:       Set tracking                 vs
   ALWAYS COPY          used[] array        (Ch.4 callback)        Boolean return,
   on result!           O(n * n!)                |                 STOP on success
   (#1 bug)                  |              "Prune as early             |
        |               COMBINATIONS:        as possible" =        Sudoku: "find
   Skip-duplicates      start/i+1,           the actual            ONE" pattern
   recipe: SORT          non-reuse           STRATEGY, not              |
   first, then                |              decoration           COMBINATION SUM:
   nums[i]==nums[i-1]    Shared duplicate-                          i vs i+1 =
   && !used[i-1]         skip recipe                                REUSE vs no-reuse
   guard                                                             (single char!)
                                                                          |
                                                                    WORD SEARCH:
                                                                    in-place mutation
                                                                    as visited-tracking
                                                                    (mark '#', explore,
                                                                    RESTORE on un-choose)
                                                                    -- closes loop w/
                                                                    Ch.10 trie preview
```

---

## 17.12 Cheat Sheet

```
BACKTRACKING SKELETON
========================
function backtrack(pathSoFar, ...) {
  if (isComplete(pathSoFar)) {
    results.push([...pathSoFar]);   // ALWAYS COPY!
    return;                          // (or: return true; for find-ONE variants)
  }
  for (choice of validChoices) {
    pathSoFar.push(choice);          // CHOOSE
    backtrack(pathSoFar, ...);        // EXPLORE
    pathSoFar.pop();                  // UN-CHOOSE
  }
}

DECISION TABLE
==================
"Does order matter?"           YES -> Permutations (used[] array)
                                NO  -> Combinations (start/i+1, no backward reuse)
"Can elements repeat?"          YES -> pass `i` (not i+1) to recursive call
                                NO  -> pass `i+1`
"Duplicates in input?"          Sort first, skip nums[i]==nums[i-1] && !used[i-1]
"Find ALL solutions?"           results array, function returns void, keep exploring
"Find ONE solution?"            return boolean, propagate true immediately, stop early

PRUNING CHECKLIST (ask this for EVERY backtracking problem)
================================================================
"What's the earliest point I can detect this partial path is DOOMED?"
"Can I check that cheaply (O(1) via a Set/tracked value), rather than scanning?"
"If input is sorted, can I `break` instead of `continue` once a threshold is crossed?"

SPACE-EFFICIENT VISITED TRACKING
====================================
Instead of a separate visited Set/array: mutate the input IN PLACE as "choose"
(e.g., board[r][c] = '#'), then RESTORE the original value as "un-choose".
Zero extra memory, but MUST restore correctly or corrupt later search paths.
```

---

## 17.13 Key Takeaways

1. Every backtracking solution shares one skeleton: choose, explore, un-choose — and always copies results, never pushes a live mutable reference.
2. "Does order matter?" separates permutations (used[] array) from combinations (start/i+1 non-reuse) — know both techniques and when each applies.
3. A single character (`i` vs `i+1`) distinguishes "each choice usable once" from "usable unlimited times" (Combination Sum).
4. Real backtracking effectiveness comes from pruning — detecting doomed partial solutions as early and cheaply as possible (N-Queens' O(1) diagonal tracking is the model).
5. "Find all" (results array, keep exploring) versus "find one" (boolean return, stop on success) is a fundamental structural fork to decide before writing code.

---

## 17.14 20 Multiple Choice Questions

1. What are the three core steps of every backtracking function?
   a) Sort, search, return
   b) Choose, explore, un-choose
   c) Push, pop, shift
   d) Map, filter, reduce

2. What is the single most common bug in backtracking implementations?
   a) Using recursion instead of loops
   b) Forgetting to copy the result (pushing a live mutable reference instead of a snapshot)
   c) Not using a Set
   d) Using `let` instead of `const`

3. What question determines whether a problem needs permutations or combinations?
   a) Is the array sorted?
   b) Does order matter in the result?
   c) Are there duplicates in the input?
   d) Is the array empty?

4. What technique tracks which elements have been used in a permutation generation?
   a) A `start` index parameter
   b) A `used[]` boolean array
   c) Sorting the array first
   d) A hash of the entire array

5. What technique prevents combinations from including the same element twice or considering reordered duplicates?
   a) A `used[]` array
   b) Passing `i + 1` (not `start` or `i`) to the recursive call, never looking backward
   c) Sorting is sufficient alone
   d) There is no such technique needed

6. What is the time complexity of generating all permutations of n distinct elements?
   a) O(n)
   b) O(2^n)
   c) O(n * n!)
   d) O(n log n)

7. What is the standard recipe for skipping duplicate results when the input contains duplicate values?
   a) Use a Set to deduplicate results afterward
   b) Sort the input first, then skip `nums[i] === nums[i-1]` under a specific used/unused condition
   c) Remove duplicates from the input before starting
   d) It's not possible to handle duplicates in backtracking

8. In N-Queens, what enables O(1) diagonal attack detection?
   a) A nested loop checking every cell
   b) Tracking `row - col` and `row + col` values in Sets, since these are constant along each diagonal direction
   c) Sorting the queens by position
   d) A separate recursive function per diagonal

9. What is the central strategic question to ask for any new backtracking problem, according to this chapter?
   a) Is the input sorted?
   b) What's the earliest point I can detect a partial solution is doomed, and how cheaply can I check that?
   c) How many recursive calls will this make?
   d) Should I use an array or a linked list?

10. What is the key structural difference between "find all solutions" and "find one solution" backtracking?
    a) There is no difference; the code is identical
    b) Find-all populates a results array and keeps exploring; find-one returns a boolean and stops immediately on success
    c) Find-one always uses more memory
    d) Find-all cannot use recursion

11. In the Sudoku solver, why does the function return a boolean rather than populate a results array?
    a) Sudoku has no valid solutions typically
    b) The problem asks for finding ONE valid solution, not enumerating all possible fillings
    c) JavaScript requires boolean returns for grid problems
    d) It's an arbitrary implementation choice with no reason

12. In Combination Sum, what single-character change allows elements to be reused unlimited times?
    a) Passing `i` instead of `i + 1` to the recursive call
    b) Using `used[]` instead of `start`
    c) Removing the base case
    d) Using `continue` instead of `break`

13. Why is `break` (not `continue`) valid as a pruning optimization in Combination Sum's loop?
    a) It's always valid regardless of array order
    b) Because the array is sorted ascending, once a candidate exceeds the remaining target, all subsequent candidates will too
    c) JavaScript requires break in for loops
    d) It's not actually valid; this is a bug

14. What technique does the Word Search problem use to track visited cells without extra memory?
    a) A separate visited Set
    b) Temporarily mutating the board in place (e.g., to '#'), then restoring the original value during un-choose
    c) A boolean 2D array
    d) Sorting the grid first

15. What must always happen after temporarily mutating a grid cell for visited-tracking in backtracking?
    a) Nothing; the mutation can remain permanent
    b) The original value must be restored during the un-choose step
    c) The entire grid must be rebuilt
    d) A new grid must be created

16. What does the diagonal `row - col` represent geometrically on a chessboard?
    a) A random value with no pattern
    b) A constant value along one diagonal direction (the "\\" direction)
    c) The row number only
    d) The total number of queens placed

17. What does the diagonal `row + col` represent geometrically on a chessboard?
    a) A constant value along the other diagonal direction (the "/" direction)
    b) The column number only
    c) A random value with no pattern
    d) The total number of queens placed

18. Why is copying the result (`[...pathSoFar]`) necessary before pushing to a results array?
    a) It's not necessary; pushing the reference works fine
    b) `pathSoFar` is one mutable array reused throughout the entire search; pushing its reference means all results would reflect only its final state
    c) JavaScript arrays cannot be pushed into other arrays
    d) It makes the code run faster

19. What is the relationship between Word Search (this chapter) and Word Search II (previewed in Chapter 10)?
    a) They are unrelated problems
    b) Word Search II extends this chapter's single-word DFS technique with a trie to efficiently search many words simultaneously
    c) Word Search II uses a completely different algorithm with no relation
    d) Word Search II only works on sorted grids

20. What should you verify before trusting a backtracking solution involving duplicate-skipping logic?
    a) That the array is not sorted
    b) Dry-run it on a small duplicate-containing example by hand
    c) That no Set is used anywhere
    d) That the recursion depth is exactly n

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-c, 7-b, 8-b, 9-b, 10-b, 11-b, 12-a, 13-b, 14-b, 15-b, 16-b, 17-a, 18-b, 19-b, 20-b

---

## 17.15 20 Coding Problems

**Easy**

1. Implement subset generation from memory, referencing Chapter 2's original version (section 2.8.3).
2. Implement `permute` (all permutations of distinct elements) from memory (section 17.2).
3. Implement `combine(n, k)` from memory (section 17.3).
4. Write a function to generate all binary strings of length n using backtracking.
5. Write a function to generate all valid combinations of well-formed parentheses for n pairs (a direct callback to Chapter 2's coding problem #13).

**Medium**

6. Implement `permuteUnique` (permutations with duplicate handling) from memory (section 17.2), and verify it produces no duplicate results on an input with repeated values.
7. Implement `solveNQueens` from memory (section 17.4), and verify the count of solutions matches known values for small n (e.g., n=4 has 2 solutions, n=8 has 92).
8. Implement `combinationSum` from memory (section 17.6), and separately implement `combinationSum2` (each number usable at most once, with duplicate-skipping) — compare the two implementations directly.
9. Implement `exist` (Word Search) from memory (section 17.7).
10. Given a string, generate all possible letter-case permutations (e.g., "a1b" -> "a1b", "a1B", "A1b", "A1B").

**Hard**

11. Implement a Sudoku solver from memory (section 17.5), testing it on a real, solvable 9x9 puzzle.
12. Given a string, partition it into all possible groupings such that every substring in each grouping is a palindrome.
13. Implement the full Word Search II solution (Chapter 10 preview, fully realized here): given a grid and a list of words, find all words that can be constructed, using a trie combined with this chapter's grid backtracking technique.
14. Given a set of distinct integers, generate all possible subsets, then extend to handle a set WITH duplicates, producing only unique subsets (applying this chapter's duplicate-skipping recipe to subset generation specifically).
15. Implement a generalized "abbreviation" backtracking solution: given a word, generate all possible abbreviations (e.g., "word" -> "word", "1ord", "w1rd", "wo1d", "wor1", "2rd", "w2d", "wo2", "1o1d", ... etc.), a genuinely tricky combinatorial generation problem.

**Interview Level**

16. **(Google-level)** Given a phone number's digits (2-9), generate all possible letter combinations the number could represent (the classic "Letter Combinations of a Phone Number" problem), using backtracking over a digit-to-letters mapping.
17. **(Amazon-level)** Given a list of workers and a list of tasks with constraints (some workers can't do some tasks), use backtracking to find a valid complete assignment of workers to tasks, or determine none exists, framing it explicitly as a "find one solution" (boolean-returning) backtracking problem.
18. **(Microsoft-level)** Given a matrix representing a maze with some cells blocked, use backtracking to find ALL distinct paths from top-left to bottom-right (moving only right or down), and separately, find just ONE valid path efficiently, contrasting the two backtracking structures explicitly.
19. **(Meta-level)** Given a list of friend group size constraints for a social event, use backtracking to partition a list of attendees into valid groups satisfying all size constraints, exploring the search space efficiently with early pruning when a partial partition already violates a constraint.
20. **(Netflix-level)** Design a content scheduling backtracking solution: given a list of shows with runtime constraints and a total available broadcast time slot, find all valid combinations of shows that exactly fill the available time (a direct, real-world-framed variant of Combination Sum), discussing in comments how the "find all" vs. "find one" distinction would change if you only needed to confirm feasibility rather than enumerate every option.

---

## 17.16 5 Interview Questions

1. "Implement a function to generate all permutations of an array, and tell me its time complexity." (Tests the core technique and the honest O(n·n!) complexity claim.)
2. "How would you generate all permutations if the input array contains duplicates?" (Tests the sort-then-skip-duplicates recipe specifically.)
3. "Walk me through your pruning strategy for N-Queens — how do you avoid checking every possible board configuration?" (Tests understanding that pruning IS the substance of effective backtracking.)
4. "If I only need to find ONE valid solution rather than all of them, how does your backtracking function change?" (Tests the find-all vs. find-one structural fork.)
5. "How would you track visited cells in a grid-based backtracking search without using extra memory?" (Tests the in-place-mutation-and-restore technique from Word Search.)

---

## 17.17 3 Real Projects

1. **Complete Backtracking Problem Set Solver**: Implement subsets, permutations (with and without duplicates), combinations, combination sum (with and without reuse), N-Queens, and a Sudoku solver in a single library, with a self-check script verifying correctness (including exact expected counts for small N-Queens cases and no-duplicate-results checks for the duplicate-handling variants).
2. **N-Queens Visualizer**: Build a Node.js CLI tool that solves N-Queens for a given board size and prints each solution as an ASCII chessboard, along with the total solution count, empirically verifying against known values (n=4→2, n=8→92, etc.).
3. **Word Search Game Solver**: Build a tool that takes a letter grid and a list of target words, uses the trie-plus-backtracking technique from section 17.7 (extended per Chapter 10's Word Search II preview) to find all constructible words, and reports each word's exact path through the grid.

---

## 17.18 Further Reading

- Steven Skiena, *The Algorithm Design Manual*, chapter on backtracking, for additional real-world combinatorial search framing and war stories.
- Search "N-Queens problem history" for the puzzle's origins (first posed in 1848) and its enduring role as a benchmark for constraint-satisfaction algorithms.
- LeetCode's "Backtracking" problem tag, for extensive additional practice directly extending every technique in this chapter.
- Donald Knuth's work on "Dancing Links" (the DLX algorithm), for an advanced, highly optimized approach to exact-cover problems like Sudoku and N-Queens, worth knowing exists as a specialized alternative to straightforward backtracking.

---

*End of Chapter 17. Next: Chapter 18 will begin the Dynamic Programming Masterclass — Part 1, covering 1D DP: the memoization-to-tabulation transition, classic problems (climbing stairs, house robber, coin change), and the systematic framework for identifying and solving overlapping-subproblem recursions, building directly on Chapter 2's memoization foundation.*

**Say "Continue to the next chapter" when ready.**
