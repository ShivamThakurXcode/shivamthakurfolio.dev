# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 10: Tries — The Specialist Structure for Strings

---

## 10.0 Why We Need a Structure Beyond Hashing for This

Chapter 4 gave us `Map`/`Set` for O(1) average-case exact-match string lookup — "does this exact word exist?" But consider a genuinely different question: **"what words exist that *start with* this prefix?"** — the exact question behind autocomplete, spell-checkers, and IP routing tables. A hash table is fundamentally bad at this: it can tell you if `"cat"` exists, but to find every stored word starting with `"ca"`, you'd have to scan **every single key** in the entire table — O(n · k) where n is the number of stored strings and k is their length — because hashing deliberately *scrambles* similarity away (recall Chapter 4: a good hash function spreads similar inputs to *different* buckets, which is exactly what makes prefix-sharing invisible to it). This chapter introduces the **trie**, a structure purpose-built for exactly this prefix-shaped question.

---

## 10.1 What Is a Trie?

**Definition:** A trie (pronounced "try," from re**trie**val, though many engineers pronounce it "tree" — both are common) is a tree structure in which each node represents a single character, and paths from the root down through the tree spell out strings, with common prefixes naturally shared as common paths.

### Real-Life Analogy: A Dictionary Organized by Shared Beginnings

Imagine sorting every word in a dictionary not alphabetically on a shelf, but into a physical structure where **all words starting with "ca" branch off from one shared spot**, and within that, all words starting with "cat" branch off from an even more specific shared spot. Looking up whether "cat," "car," and "cats" exist means walking down largely the **same path** for their shared prefix "ca," only diverging where the words actually differ. This shared-path structure is exactly a trie, and it's precisely why prefix-based questions are so natural for it — the shared prefix is *literally* a shared, single path in the tree, not something you have to discover by comparing many separate strings against each other.

### ASCII Visualization: A Trie Storing "cat," "car," "card," "dog"

```
                        (root)
                       /        \
                     c            d
                     |            |
                     a            o
                    / \           |
                   t   r          g*
                   *   |          (end of "dog")
              (end    d
               of     *
              "cat")  (end of "card")
                       |
                  (also marks "car" as complete, at the 'r' node itself)

Let's draw this more precisely, with each node's "end of word" flag shown explicitly:

root
 ├─ c
 │   └─ a
 │       ├─ t  [END: "cat"]
 │       └─ r  [END: "car"]
 │           └─ d  [END: "card"]
 └─ d
     └─ o
         └─ g  [END: "dog"]

Notice: "cat", "car", and "card" all share the path root -> c -> a.
"car" and "card" additionally share root -> c -> a -> r.
This SHARED PATH is the entire mechanism that makes prefix search fast.
```

### 🧠 Memory Trick

Think of a trie as **a family tree of prefixes**: every node's "descendants" are exactly the set of words extending its own path as a prefix. Asking "what words start with 'ca'?" becomes "walk to the node representing 'ca', then explore its entire subtree" — a direct, mechanical translation of English into tree navigation, no scanning of unrelated words required.

---

## 10.2 Building a Trie From Scratch

### 10.2.1 The Node Structure

Each trie node needs: a way to reference its children (one per possible next character), and a flag marking "a complete word ends here."

```javascript
class TrieNode {
  constructor() {
    this.children = new Map();  // character -> TrieNode (Chapter 4's Map, used perfectly here!)
    this.isEndOfWord = false;
  }
}
```

### 🎯 Interview Pattern: Why `Map`, Not a Plain Array or Object

We use a `Map` here rather than, say, a fixed-size array of 26 slots (one per lowercase English letter) — a common alternative implementation you'll also see. The trade-off, worth stating explicitly if asked: **a fixed array (`new Array(26)`) gives O(1) child access with zero hashing overhead, but assumes a small, fixed, known alphabet** (breaks immediately for Unicode, mixed case, digits, or punctuation without significant rework). **A `Map` handles any character set uniformly** at the (still O(1) average-case, per Chapter 4) cost of a small hashing overhead, and avoids wasting memory on empty slots for characters that never appear. For general-purpose, production-quality code — and for any interview problem that doesn't explicitly guarantee "lowercase English letters only" — prefer the `Map`-based approach and state this reasoning proactively.

### 10.2.2 The Full Trie Class: Insert, Search, and StartsWith

```javascript
class Trie {
  #root = new TrieNode();

  insert(word) {
    let current = this.#root;

    for (const char of word) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char);
    }

    current.isEndOfWord = true;
  }
  // Time: O(k), where k = word length — NOT dependent on how many words are already stored!
  // Space: O(k) worst case (if none of the word's characters/path already existed)

  search(word) {
    const node = this.#findNode(word);
    return node !== null && node.isEndOfWord === true;
  }
  // Time: O(k)

  startsWith(prefix) {
    return this.#findNode(prefix) !== null;
  }
  // Time: O(k)

  #findNode(str) {
    let current = this.#root;

    for (const char of str) {
      if (!current.children.has(char)) {
        return null; // path doesn't exist — str is not a prefix of anything stored
      }
      current = current.children.get(char);
    }

    return current; // the node representing the END of `str`'s path (may or may not be a full word)
  }
}

const trie = new Trie();
trie.insert('cat');
trie.insert('car');
trie.insert('card');
trie.insert('dog');

console.log(trie.search('car'));       // true  — "car" was explicitly inserted
console.log(trie.search('ca'));        // false — "ca" was never inserted as a complete word
console.log(trie.startsWith('ca'));    // true  — "ca" IS a valid prefix of stored words
console.log(trie.startsWith('cx'));    // false — no stored word starts with "cx"
```

### ⚠ Common Mistake: Confusing `search` and `startsWith`

This is the single most common bug in trie implementations, and it's worth internalizing the distinction precisely: **`search` must additionally check `isEndOfWord`, while `startsWith` only needs to confirm the path exists.** Both walk the exact same path-following logic (`#findNode`), but `search("ca")` correctly returns `false` in our example (because "ca" itself was never inserted as a complete word, even though it's a valid path leading to "cat" and "car"), while `startsWith("ca")` correctly returns `true` (because the path exists, regardless of whether "ca" itself is a complete stored word). Forgetting the `isEndOfWord` check in `search` is an extremely common, easy-to-overlook bug that silently makes `search` behave like `startsWith`.

### Dry Run: Inserting "cat" Then Searching

```
insert('cat'):
  current = root
  char='c': root.children has no 'c' -> create new TrieNode, set it. current = that node.
  char='a': current(c-node).children has no 'a' -> create new TrieNode. current = that node.
  char='t': current(a-node).children has no 't' -> create new TrieNode. current = that node.
  Loop ends. current(t-node).isEndOfWord = true.

Trie now: root -> c -> a -> t[END]

search('cat'):
  #findNode('cat'): walk root->c->a->t, following existing paths the whole way. Returns t-node.
  t-node.isEndOfWord is true -> search returns TRUE ✓

search('ca'):
  #findNode('ca'): walk root->c->a. Returns a-node.
  a-node.isEndOfWord is FALSE (only 't' after it was ever marked as an end) -> search returns FALSE ✓

startsWith('ca'):
  #findNode('ca') returns a-node (not null) -> startsWith returns TRUE ✓ (path exists, regardless of isEndOfWord)
```

### 📌 Quick Revision: Trie Complexity Table

| Operation | Complexity | Key Insight |
|---|---|---|
| `insert(word)` | O(k), k = word length | Independent of how many words are already stored! |
| `search(word)` | O(k) | Same — independent of total trie size |
| `startsWith(prefix)` | O(k), k = prefix length | Same |
| Space (total trie) | O(total characters across all inserted words, with shared prefixes deduplicated) | Shared prefixes cost memory only *once* |

### 🔥 Interview Tip

The single most impressive, precise thing you can say about trie complexity: **"insert and search are O(k), where k is the length of the word — this is genuinely independent of n, the total number of words already stored in the trie, unlike a hash table's O(k) *average* case, which can degrade under heavy hash collisions (Chapter 4), or a sorted array's O(k log n) binary search."** This distinction — complexity depending only on the *query's own length*, not on the size of the stored collection at all — is the trie's single most valuable and most quotable property.

---

## 10.3 The Killer Feature: Prefix-Based Queries

This is where the trie's design pays off in ways a hash table fundamentally cannot match.

### 10.3.1 Autocomplete: Finding All Words With a Given Prefix

```javascript
class TrieWithAutocomplete extends Trie {
  getAllWordsWithPrefix(prefix) {
    const results = [];
    const prefixNode = this._findNodeForAutocomplete(prefix);

    if (prefixNode === null) return results; // no words share this prefix at all

    this.#collectAllWords(prefixNode, prefix, results);
    return results;
  }

  _findNodeForAutocomplete(str) {
    let current = this._root ?? this.root; // (illustrative — see note below on private field access)
    for (const char of str) {
      if (!current.children.has(char)) return null;
      current = current.children.get(char);
    }
    return current;
  }

  #collectAllWords(node, currentPrefix, results) {
    if (node.isEndOfWord) {
      results.push(currentPrefix);
    }

    for (const [char, childNode] of node.children) {
      this.#collectAllWords(childNode, currentPrefix + char, results);
    }
  }
}
```

### ⚠ A Note on the Illustrative Code Above

The snippet above hints at a real design tension: private class fields (`#root`) are not accessible from a subclass, so a genuinely clean implementation would either expose a protected-style accessor, or (more idiomatically in production code) implement `getAllWordsWithPrefix` as a method directly on the main `Trie` class rather than via subclassing. We show the subclass version here only to illustrate the *algorithm*; in real code, prefer adding this method directly to the `Trie` class from section 10.2.2 using its private `#root` field directly, avoiding the awkward private-field-across-subclass issue entirely.

```javascript
// The cleaner, production-quality version, added directly to the Trie class:
class Trie {
  #root = new TrieNode();

  // ... insert, search, startsWith as before ...

  getAllWordsWithPrefix(prefix) {
    const results = [];
    let current = this.#root;

    for (const char of prefix) {
      if (!current.children.has(char)) {
        return results; // empty — no stored word has this prefix
      }
      current = current.children.get(char);
    }

    this.#collectAllWords(current, prefix, results);
    return results;
  }

  #collectAllWords(node, currentWord, results) {
    if (node.isEndOfWord) {
      results.push(currentWord);
    }

    for (const [char, childNode] of node.children) {
      this.#collectAllWords(childNode, currentWord + char, results);
    }
  }
}

const trie = new Trie();
['cat', 'car', 'card', 'care', 'dog'].forEach(word => trie.insert(word));

console.log(trie.getAllWordsWithPrefix('ca'));  // ['cat', 'car', 'card', 'care']
console.log(trie.getAllWordsWithPrefix('do'));  // ['dog']
console.log(trie.getAllWordsWithPrefix('z'));   // []
```

### Dry Run: `getAllWordsWithPrefix('ca')`

```
Trie contains: cat, car, card, care, dog

Step 1: walk 'c' -> 'a' from root. current = the 'a' node (shared by cat/car/card/care).

Step 2: #collectAllWords(a-node, 'ca', results):
  a-node.isEndOfWord? false (no complete word is JUST "ca")
  for each child of a-node: 't' and 'r'

  #collectAllWords(t-node, 'cat', results):
    t-node.isEndOfWord? TRUE -> results.push('cat')   results=['cat']
    t-node has no children -> done with this branch

  #collectAllWords(r-node, 'car', results):
    r-node.isEndOfWord? TRUE -> results.push('car')   results=['cat','car']
    r-node has children: 'd' and 'e'

    #collectAllWords(d-node, 'card', results):
      d-node.isEndOfWord? TRUE -> results.push('card')  results=['cat','car','card']

    #collectAllWords(e-node, 'care', results):
      e-node.isEndOfWord? TRUE -> results.push('care')  results=['cat','car','card','care']

Final: ['cat', 'car', 'card', 'care']  ✓ (order reflects DFS exploration order of children)
```

### 🧮 Complexity Analysis

- **Time**: O(p + m), where `p` is the prefix length (time to walk down to the shared prefix node) and `m` is the total number of characters across all matching words (time to collect them all via DFS — this is exactly a preorder traversal from Chapter 8, applied to a trie instead of a binary tree).
- **Space**: O(m) for the results themselves.

### 🎯 Interview Pattern

Compare this to the hash-table alternative directly, since this contrast is the entire justification for this chapter existing: **finding all words with a given prefix using a `Map`/`Set` requires scanning every single stored key — O(n · k) where n is the total word count — because hashing gives you no way to jump directly to "the region of the structure containing this prefix."** The trie's O(p + m) is asymptotically unrelated to `n` (the *total* number of stored words) in the same way insert/search were — it only cares about the prefix length and the size of the *matching* result set. This is precisely why every real autocomplete system (search engines, IDEs, phone keyboards) uses trie-like structures rather than hash tables.

---

## 10.4 Word Break and Other Trie-Adjacent Recursion Problems

Tries frequently pair with recursion/backtracking (Chapter 2, formalized further in the upcoming Backtracking Masterclass) for problems involving decomposing a string using a dictionary.

### 10.4.1 Word Search II Preview: Combining Tries With Grid DFS

A classic hard problem: given a 2D grid of letters and a list of words, find all words that can be constructed by tracing a path through adjacent grid cells. The naive approach checks each word against the grid independently (O(words × grid cells × 4^wordLength) for each word's DFS) — brutally slow. The trie-based optimization: **insert all words into a single trie, then do ONE combined DFS over the grid, following trie paths instead of committing to one word at a time**, allowing many words' searches to share work exactly the same way trie insertion shares prefixes.

```javascript
// Skeleton illustrating the KEY IDEA (full grid-DFS mechanics belong to
// the Backtracking Masterclass chapter, where this problem is treated in full):
function findWordsSkeleton(grid, words) {
  const trie = new Trie();
  words.forEach(word => trie.insert(word));

  // Conceptually: DFS from every grid cell, but at each step, only continue
  // exploring in directions where trie.startsWith(currentPathSoFar) is true.
  // This PRUNES the search dramatically — if "cx" isn't a prefix of ANY word,
  // we stop exploring that entire branch immediately, rather than continuing
  // to build a doomed-to-fail path character by character.
}
```

### 🚀 Pro Tip

This "use a trie to prune a search space during DFS/backtracking" technique — checking `startsWith` at every step to decide whether continuing down a path could *possibly* still succeed — is a genuinely powerful, reusable idea that appears across many hard interview problems involving dictionaries or word lists. The core insight worth internalizing now, ahead of the full Backtracking chapter: **a trie turns "is this partial string still potentially useful?" into an O(1)-per-character check**, letting you abandon hopeless branches immediately instead of discovering failure only at the very end of a doomed path.

---

## 10.5 Trie Variant: Compressed Tries (Radix Trees) — A Conceptual Introduction

### 🚀 Pro Tip: The Memory Problem With Plain Tries

Our `Trie` implementation creates one node **per character**, even along paths with no branching at all (e.g., storing only the single word "extraordinary" creates 13 separate single-child nodes in a row). For long words with little shared structure, this wastes significant memory compared to just storing the string directly.

**Definition:** A radix tree (also called a compressed trie or Patricia trie) merges chains of single-child nodes into a single node storing a **substring** instead of a single character, collapsing non-branching paths.

```
Plain Trie for "test" and "team" (assuming NOTHING else shares "te"):

root -> t -> e -> s -> t*
              -> a -> m*

Radix Tree (compressed) equivalent:

root -> "te" -> "st"*
             -> "am"*
```

### 🎯 Interview Pattern

You will rarely be asked to implement a full radix tree from scratch in a standard interview (it's a real, more involved undertaking, primarily relevant in systems-level contexts like IP routing tables and some database indexes) — but **knowing it exists, and being able to state the trade-off (less memory and fewer pointer-chases for sparse/long strings, at the cost of more complex insertion/deletion logic that must sometimes split or merge compressed segments) is exactly the kind of "I know the landscape beyond the textbook basics" signal that separates strong candidates.** If asked "how would you make a trie more memory-efficient," naming radix trees/compressed tries directly is the expected, specific answer.

---

## 10.6 Real-World Applications

### 🔥 Interview Tip: Naming Concrete Use Cases Unprompted

Being able to name specific, real production use cases for a trie — beyond just "autocomplete" — is a strong signal. Have these ready:

1. **Autocomplete/search suggestions** (search engines, IDE code completion, phone keyboards) — directly section 10.3.
2. **Spell checkers** — walking a trie of valid dictionary words to check if a typed word exists, and (a natural extension) finding "nearby" valid words for suggestions by exploring nodes close to the failed path.
3. **IP routing tables** — routers use compressed tries (radix trees, section 10.5) keyed by binary IP address prefixes to find the "longest matching prefix" route for a packet, an operation that must be blazingly fast and happens on every single packet a router processes.
4. **T9 predictive text** (older mobile phones) — mapping numeric keypad sequences to possible word completions, itself a trie-shaped prefix problem.
5. **Word games** (Boondggle/Scrabble solvers) — exactly the Word Search II pattern from section 10.4.1, using a trie to prune impossible letter paths during board exploration.

---

## 10.7 Edge Cases and Gotchas Checklist for Trie Problems

1. **Empty string insertion/search.** Does inserting `""` correctly mark the *root* itself as `isEndOfWord = true`? Does searching for `""` correctly return `true` in that case?
2. **Case sensitivity.** Decide and state whether `"Cat"` and `"cat"` should be treated as the same word (normalize with `.toLowerCase()`) or genuinely distinct paths.
3. **Confusing `search` and `startsWith`** — re-read section 10.2.2's warning; this is the single most common trie bug.
4. **Unicode/multi-byte characters** — per Chapter 3's lesson, iterate with `for...of` (which is code-point aware) rather than manual index-based character access if Unicode correctness matters, since a trie built character-by-character via naive indexing can silently split multi-byte characters incorrectly.
5. **Deletion from a trie** — removing a word requires care: you can only safely delete a node if it has no children AND isn't the end of some *other* still-valid word; deleting a shared-prefix node would corrupt other stored words. This is a common, trickier follow-up question worth practicing explicitly (included in the coding problems below).
6. **Memory usage awareness** — for very large dictionaries with little prefix sharing, be ready to discuss the radix tree/compressed trie alternative (section 10.5) if memory efficiency comes up.

---

## 10.8 Chapter Summary

This chapter introduced the trie as the direct, purpose-built answer to a question that Chapter 4's hash tables are structurally unable to answer efficiently: **"what stored strings share this prefix?"** We built the intuition that a trie's entire value proposition comes from **literally sharing tree paths for shared prefixes** — a mechanism that hashing deliberately destroys, since good hash functions are specifically designed to scatter similar inputs apart (recall Chapter 4's uniform-distribution requirement), making prefix-relatedness invisible to a hash table by design.

We implemented a complete trie from scratch using `Map`-based children (justified over a fixed-size array by its generality across arbitrary character sets, a direct callback to Chapter 4's `Map`-vs-plain-object reasoning), and carefully distinguished the chapter's single most common bug: **`search` must check `isEndOfWord`, while `startsWith` only needs the path to exist** — both share the same path-walking logic, differing only in this one final check. We established the trie's headline complexity claim, worth memorizing verbatim: insert, search, and startsWith are all **O(k), where k is the query's own length, genuinely independent of how many words are already stored** — a property neither a hash table (average-case O(k), degradable by collisions) nor a sorted array (O(k log n)) can match unconditionally.

We then demonstrated the trie's actual killer feature — prefix-based enumeration (autocomplete) — implemented as "walk to the prefix node, then DFS-collect every complete word in its subtree" (directly reusing Chapter 8's preorder traversal logic, just applied to a trie's variable-branching nodes instead of a binary tree's fixed two children), running in O(p + m) time where `p` is the prefix length and `m` is the total size of the matching results — again structurally independent of the total stored word count `n`. We previewed how tries combine with DFS/backtracking to dramatically prune impossible search branches in problems like Word Search II (full treatment deferred to the Backtracking Masterclass), introduced compressed tries (radix trees) as the memory-efficient answer to plain tries' single-child-chain waste, and closed with a grounded list of real production use cases — autocomplete, spell-checking, IP routing, and word-game solving — that make this chapter's structure far from a purely academic exercise.

---

## 10.9 Revision Notes

- Tries share tree paths for shared string prefixes — the exact mechanism hash tables (Chapter 4) cannot provide, since good hashing deliberately scatters similar inputs apart.
- Use `Map`-based children for generality across any character set; a fixed-size array only works for small, known, fixed alphabets.
- `search` requires checking `isEndOfWord`; `startsWith` only requires the path to exist — conflating these is the most common trie bug.
- Insert/search/startsWith are O(k), where k is the query's own length — independent of the total number of stored words, unlike hash tables (avg-case, collision-degradable) or sorted arrays (O(k log n)).
- Prefix enumeration (autocomplete) is O(p + m): walk to the prefix node, then DFS-collect all complete words in its subtree — structurally a preorder traversal (Chapter 8) over variable-branching nodes.
- Tries combine with DFS/backtracking to prune impossible search branches (Word Search II) — checking `startsWith` at each step avoids exploring doomed paths.
- Compressed tries (radix trees) merge non-branching single-child chains into substring-labeled nodes, trading implementation complexity for memory efficiency — know this exists even without implementing it.
- Real use cases: autocomplete, spell-checking, IP routing (longest-prefix match), word-game solvers.

---

## 10.10 Mind Map (ASCII)

```
                                     TRIES
                                       |
      +------------------+------------+------------+---------------------+
      |                  |                         |                     |
  WHY TRIES?         CORE STRUCTURE          KILLER FEATURE          VARIANTS &
  (vs hashing,       & OPERATIONS          (prefix enumeration)     APPLICATIONS
  Ch.4 callback)          |                       |                      |
      |              Map children          getAllWordsWithPrefix   Compressed Trie
  Hash scatters      (vs fixed array,       = walk to prefix node   (Radix Tree):
  similar inputs     Ch.4 Map-vs-object)    + DFS-collect subtree   merge single-child
  apart -> can't          |                 (= Ch.8 preorder        chains -> less
  find shared        insert/search/         traversal, variable    memory, harder
  prefixes           startsWith             branching)             insert/delete
      |              = O(k), k=word              |                      |
  Trie: shared       length, INDEPENDENT    O(p+m) time            Real applications:
  PATH for shared    of total words n!           |                 Autocomplete,
  prefix (literal        |                  DFS + Trie pruning     spell-check,
  tree structure)    search checks          (Word Search II        IP routing
                     isEndOfWord;           preview, full in        (longest prefix
                     startsWith doesn't     Backtracking chapter)   match), word games
                     (#1 common bug!)
```

---

## 10.11 Cheat Sheet

```
TRIE QUICK REFERENCE
=======================
insert(word)        O(k)  -- k = word length, independent of n (total stored words)
search(word)        O(k)  -- MUST check isEndOfWord at the final node
startsWith(prefix)   O(k)  -- only needs the path to exist, NOT isEndOfWord
getAllWithPrefix()   O(p + m) -- p=prefix length, m=total chars in matching results

TRIE vs HASH TABLE (Ch.4) FOR STRINGS
=========================================
Exact match lookup:        Hash table O(1) avg   vs  Trie O(k) -- hash table wins here
Prefix enumeration:        Hash table O(n*k)     vs  Trie O(p+m) -- TRIE wins decisively
Memory for shared prefixes: Hash table: none shared  vs  Trie: shared automatically

COMMON BUG CHECKLIST
========================
search() forgetting isEndOfWord check -> silently behaves like startsWith()
Case sensitivity not normalized -> "Cat" and "cat" treated as different paths (may be intended!)
Empty string "" -> should mark the ROOT node itself as isEndOfWord
Deletion -> only remove a node if childless AND not another word's endpoint

WHEN TO MENTION RADIX TREES (COMPRESSED TRIES)
==================================================
"How would you make this trie more memory-efficient?"
-> merge non-branching single-child chains into one substring-labeled node
-> trade-off: more complex insert/delete (may need to split/merge segments)
```

---

## 10.12 Key Takeaways

1. Tries share tree paths for shared prefixes — solving exactly what hash tables cannot: efficient prefix-based queries.
2. Insert/search/startsWith are O(k) — the query's own length, genuinely independent of how many words are stored.
3. `search` needs `isEndOfWord`; `startsWith` doesn't — the most common trie implementation bug.
4. Autocomplete (prefix enumeration) is O(p + m), reusing Chapter 8's preorder-traversal logic over variable-branching nodes.
5. Tries prune backtracking search spaces (Word Search II) by making "is this partial path still viable?" an O(1)-per-character check.
6. Compressed tries (radix trees) trade implementation complexity for memory efficiency — know they exist, know why.

---

## 10.13 20 Multiple Choice Questions

1. What problem does a trie solve that a hash table (Chapter 4) fundamentally struggles with?
   a) Exact-match lookup
   b) Prefix-based queries (finding all stored words sharing a prefix)
   c) Storing numbers
   d) Sorting data

2. Why can't a hash table efficiently answer "what words share this prefix"?
   a) Hash tables don't support strings
   b) Good hash functions deliberately scatter similar inputs to different buckets, hiding prefix relationships
   c) Hash tables have a maximum size limit
   d) JavaScript's Map doesn't support iteration

3. What does each node in a trie typically represent?
   a) An entire word
   b) A single character, with children representing possible next characters
   c) A hash bucket
   d) A sorted range of values

4. Why is `Map` often preferred over a fixed-size array for a trie node's children?
   a) Map is always faster in every case
   b) Map handles any character set generally, without assuming a small fixed alphabet
   c) Arrays cannot store TrieNode objects
   d) Map uses less memory in all cases

5. What is the single most common bug when implementing trie `search`?
   a) Forgetting to check `isEndOfWord`, making it behave like `startsWith`
   b) Using recursion instead of iteration
   c) Not using a Map
   d) Checking `isEndOfWord` when it shouldn't

6. What is the time complexity of `trie.insert(word)` where the word has length k?
   a) O(n), where n is the number of words already stored
   b) O(k), independent of how many words are already stored
   c) O(k log n)
   d) O(n * k)

7. What is the time complexity of `trie.search(word)`?
   a) O(n)
   b) O(k), independent of the total number of stored words
   c) O(log n)
   d) O(n * k)

8. What is the key structural difference between `search` and `startsWith` in a trie?
   a) They are identical in every way
   b) `search` additionally requires the final node to have `isEndOfWord === true`
   c) `startsWith` requires more memory
   d) `search` doesn't use recursion while `startsWith` does

9. What is the time complexity of enumerating all words with a given prefix, in terms of prefix length p and total matching result size m?
   a) O(n) always
   b) O(p + m)
   c) O(n log n)
   d) O(p * m)

10. What traversal technique from Chapter 8 is directly reused when collecting all words in a trie's subtree?
    a) Level-order (BFS)
    b) Preorder-style DFS
    c) Binary search
    d) Inorder traversal (since tries aren't BSTs, this wouldn't apply the same way)

11. What is a compressed trie (radix tree)?
    a) A trie that only stores numbers
    b) A trie that merges non-branching single-child node chains into substring-labeled nodes
    c) A hash table with tree-like properties
    d) A trie limited to a fixed depth

12. What is the main trade-off of using a compressed trie instead of a plain trie?
    a) No trade-off; it's strictly better in every way
    b) Reduced memory usage at the cost of more complex insertion/deletion logic
    c) Faster lookups but no memory benefit
    d) It only works for numeric data

13. Which real-world system commonly uses compressed tries (radix trees) for extremely fast lookups?
    a) Video codecs
    b) IP routing tables (longest-prefix match)
    c) Image compression algorithms
    d) Audio streaming buffers

14. In the Word Search II problem, how does a trie help prune the search space during DFS/backtracking?
    a) It doesn't help at all
    b) Checking `startsWith` at each step allows abandoning paths that can't possibly lead to any valid word
    c) It pre-sorts the grid
    d) It eliminates the need for DFS entirely

15. What should happen when inserting the empty string `""` into a trie?
    a) It should throw an error
    b) The root node itself should be marked `isEndOfWord = true`
    c) It should be silently ignored
    d) It creates an infinite loop

16. What must be verified before deleting a node during trie word-deletion?
    a) Nothing; any node can always be deleted safely
    b) The node has no children AND is not the endpoint of another still-valid word
    c) The node must be a leaf and part of the longest word only
    d) The entire trie must be rebuilt

17. Why does Unicode handling matter for trie implementations, per Chapter 3's lessons?
    a) It doesn't matter for tries specifically
    b) Naive index-based character access can incorrectly split multi-byte characters/surrogate pairs
    c) Tries cannot store Unicode characters at all
    d) Unicode characters always take exactly one byte

18. What is a genuine, real-world, non-academic application of tries mentioned in this chapter?
    a) Sorting large arrays of numbers
    b) Autocomplete/search suggestions
    c) Detecting cycles in linked lists
    d) Computing matrix multiplication

19. Why is a trie's insert/search complexity described as "independent of n" particularly notable?
    a) It isn't actually true
    b) Unlike hash tables (average-case, collision-degradable) or sorted arrays (O(k log n)), it depends only on the query's own length
    c) It only applies to very small tries
    d) It's the same as every other data structure's complexity behavior

20. What data structure combination is used in the Word Search II problem to efficiently search many words at once against a grid?
    a) A single trie built from all words, combined with grid DFS
    b) A separate hash table lookup for each word independently
    c) Sorting all words alphabetically first
    d) A heap of word lengths

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-a, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-b, 19-b, 20-a

---

## 10.14 20 Coding Problems

**Easy**

1. Implement `insert` and `search` for a basic trie, from memory (section 10.2.2).
2. Implement `startsWith`, and write a small test proving it behaves differently from `search` on a prefix that isn't itself a complete stored word.
3. Write a function to count the total number of complete words stored in a trie (traverse and count `isEndOfWord` flags).
4. Write a function to find the longest common prefix among an array of strings using a trie (insert all strings, then walk down while each node has exactly one child and isn't an end-of-word).
5. Write a function that checks if a trie is empty (no words stored at all).

**Medium**

6. Implement `getAllWordsWithPrefix` from memory (section 10.3.1), then verify against the book's dry run.
7. Implement trie-based word deletion, correctly handling the "only delete nodes that are childless and not another word's endpoint" rule from section 10.7.
8. Given a list of words, group them by shared prefixes of length 2 using a trie-based approach, and compare to a hash-map-based grouping approach (Chapter 4) in a comment.
9. Implement a simple autocomplete system that, given a prefix, returns up to the first 5 matching words found via trie DFS.
10. Given a trie storing a dictionary, implement a spell-checker function that returns `true`/`false` for whether a word is valid, and if invalid, suggests up to 3 valid words with the same prefix as the longest valid prefix of the input.

**Hard**

11. Implement a trie that supports wildcard search, where `.` matches any single character (e.g., searching `"c.t"` should match "cat," "cot," etc., if stored) — requires a modified DFS-based search instead of simple path-walking.
12. Given a 2D grid of letters and a list of words, implement the full Word Search II solution combining a trie with grid DFS/backtracking, including proper visited-cell tracking and backtracking cleanup (a full preview of the Backtracking Masterclass chapter's core techniques).
13. Implement a trie-based solution for "Replace Words" — given a dictionary of word roots and a sentence, replace all words in the sentence with their shortest matching root from the dictionary, if one exists.
14. Design and implement a simplified compressed trie (radix tree) supporting `insert` and `search`, where nodes can store multi-character substrings, handling the logic for splitting an existing compressed node when a new word diverges partway through it.
15. Given a stream of search queries with corresponding click-through counts, implement a trie-based "top search suggestions" system that returns the top 3 most popular completions for any given prefix (combining this chapter's trie with Chapter 9's heap/Top-K techniques).

**Interview Level**

16. **(Google-level)** Design an autocomplete system for a search engine that must return the top K most frequent completions for a prefix, efficiently updating frequencies as new searches occur — combine tries (this chapter) with heaps (Chapter 9) for the top-K aspect.
17. **(Amazon-level)** Given a product catalog, implement a trie-based "search-as-you-type" feature for an e-commerce search bar, returning matching product names as the user types each character, and discuss (in comments) the latency benefits of an incremental trie walk versus re-querying a database on every keystroke.
18. **(Microsoft-level)** Implement a trie-based solution to find all words in a dictionary that are valid "concatenated words" (formed entirely by concatenating at least two shorter words also present in the dictionary).
19. **(Meta-level)** Design a trie-based content moderation filter that efficiently checks if any substring of a user's post matches a list of banned phrases, discussing the complexity trade-offs versus a naive substring-search approach (a preview of the String Algorithms chapter's Rabin-Karp/KMP techniques for this exact problem shape).
20. **(Netflix-level)** Design a trie-based "search suggestions as you type" feature for a video search bar, supporting fuzzy matching for common typos (e.g., using the wildcard trie from problem 11 as a starting point), and discuss in comments how you'd balance suggestion relevance against query latency at scale.

---

## 10.15 5 Interview Questions

1. "Why would you use a trie instead of a hash table for this string problem?" (Tests understanding of prefix-query superiority, the chapter's central thesis.)
2. "What's the difference between `search` and `startsWith` in a trie, and why do they share almost identical code?" (Tests the single most common implementation bug and its underlying cause.)
3. "What is the time complexity of trie operations, and why is it described independent of the number of stored words?" (Tests the headline complexity claim and its justification.)
4. "How would you make a trie more memory-efficient for a large, sparse dictionary?" (Tests awareness of compressed tries/radix trees.)
5. "How would a trie help you efficiently solve a word-search-on-a-grid problem with many target words?" (Tests the trie-plus-backtracking pruning technique.)

---

## 10.16 3 Real Projects

1. **Complete Trie Library**: Build a full `Trie` class supporting insert, search, startsWith, prefix enumeration, and deletion (with correct childless/endpoint-safe removal), with a self-check script verifying correctness across randomized word sets.
2. **Autocomplete CLI Tool**: Build a Node.js CLI that loads a word list (e.g., a dictionary file), inserts it all into a trie, and provides an interactive "type a prefix, see live suggestions" experience — a direct, practical reinforcement of section 10.3's killer feature.
3. **Trie vs. Hash Table Benchmark**: Build a benchmark comparing trie-based prefix enumeration against a naive hash-table/Set-based full-scan approach (Chapter 4) at increasing dictionary sizes, empirically demonstrating the O(p+m) vs. O(n·k) gap that motivates this entire chapter.

---

## 10.17 Further Reading

- Edward Fredkin's original 1960 paper introducing the trie, for historical context on the structure's name and origin.
- Search "Patricia trie" and "radix tree implementation" for deeper, systems-level treatments of the compressed trie variant introduced conceptually in section 10.5.
- MDN Web Docs: "Map" (revisited from Chapter 4) for the exact iteration-order and performance guarantees relied upon in this chapter's `Map`-based trie node children.
- LeetCode's "Trie" problem tag, and specifically "Word Search II" and "Implement Trie (Prefix Tree)," for extensive additional practice directly extending this chapter's core implementations.

---

*End of Chapter 10. Next: Chapter 11 will cover Graphs — the most general data structure in this book, formalizing adjacency list/matrix representations, and building BFS and DFS graph traversal in full (directly reusing Chapter 6's queue/stack and Chapter 8's traversal instincts), setting up the entire cluster of graph algorithm chapters that follow.*

**Say "Continue to the next chapter" when ready.**
