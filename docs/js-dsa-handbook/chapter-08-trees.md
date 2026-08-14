# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 8: Trees — Recursion Finally Meets Its Natural Home

---

## 8.0 Why Trees Feel Different From Everything Before Them

Every structure so far — arrays, linked lists, stacks, queues — has been fundamentally **linear**: one element follows another in a single line. Trees are the first genuinely **hierarchical** structure in this book, and they are where Chapter 2's recursion stops being "a clever technique you apply to arrays and numbers" and becomes "the single most natural language for describing the data itself." Recall the file-system example from Chapter 2, section 2.9 — "a folder contains files and/or more folders" — that *is* a tree, and every tree algorithm in this chapter will feel like a direct continuation of that exact idea.

---

## 8.1 What Is a Tree? (Definitions and Vocabulary)

**Definition:** A tree is a hierarchical data structure consisting of nodes connected by edges, where one node is designated the **root**, and every other node has exactly one **parent**, forming a structure with no cycles.

### ASCII Visualization: Anatomy of a Tree

```
                    (root)
                      10
                    /    \
                  5        20        <- 5 and 20 are CHILDREN of 10
                 / \      /  \
                3   8   15    25     <- 3, 8, 15, 25 are LEAF NODES (no children)

Vocabulary:
- ROOT: the top node (10) — the only node with no parent
- PARENT/CHILD: 10 is the parent of 5 and 20; 5 and 20 are children of 10
- SIBLINGS: 5 and 20 are siblings (same parent)
- LEAF: a node with no children (3, 8, 15, 25)
- EDGE: the connection between a parent and child
- SUBTREE: any node plus all of its descendants (e.g., the subtree rooted at 5 is {5,3,8})
- DEPTH of a node: number of edges from the root to that node (depth of 3 is 2)
- HEIGHT of a tree: the longest path from root to any leaf (height here is 2)
- DEGREE of a node: how many children it has (10 has degree 2)
```

### 🧠 Memory Trick: The Family Tree Analogy

You've called it a "family tree" your whole life for a reason — this vocabulary (parent, child, sibling, ancestor, descendant) maps directly onto genealogy. A "root" ancestor has descendants branching downward, exactly like this data structure, just drawn upside down (root at top, not bottom, by computer science convention).

### 8.1.1 Binary Trees: The Star of This Chapter

**Definition:** A binary tree is a tree in which every node has **at most two children**, conventionally called the **left child** and **right child**.

```javascript
class TreeNode {
  constructor(value, left = null, right = null) {
    this.value = value;
    this.left = left;
    this.right = right;
  }
}

const tree = new TreeNode(10,
  new TreeNode(5, new TreeNode(3), new TreeNode(8)),
  new TreeNode(20, new TreeNode(15), new TreeNode(25))
);
```

### 🎯 Interview Pattern: The Recursive Definition Is the Whole Point

Notice: **a `TreeNode`'s `left` and `right` properties are themselves either `null` or another `TreeNode`.** This is the recursive-data-shape idea from Chapter 2 made completely explicit: a binary tree is either empty (`null`), or a value plus **two smaller binary trees** (its left and right subtrees). Every single algorithm in this chapter will exploit this definition directly — write the base case for `null`, and write the recursive case in terms of "trust that the same operation already works correctly on `node.left` and `node.right`."

---

## 8.2 Tree Traversal: The Four Fundamental Orders

**Definition:** Traversal is the process of visiting every node in a tree exactly once, in some defined order. Because trees are hierarchical (not linear), there is no single "obvious" order — unlike an array, where "left to right" is the only sensible choice.

### 8.2.1 Depth-First Traversals: Preorder, Inorder, Postorder

All three of these share the same "go deep before going wide" character (recall Chapter 6's closing insight: DFS-style exploration is naturally stack/recursion-driven, LIFO in spirit) — they differ only in **when**, relative to visiting the children, you process the current node's own value.

```
                    10
                  /    \
                5        20
               / \      /  \
              3   8   15    25
```

**Preorder (Root → Left → Right):** process the node itself *first*, then recurse left, then recurse right.

```javascript
function preorder(node, result = []) {
  if (node === null) return result;   // BASE CASE

  result.push(node.value);             // ROOT first
  preorder(node.left, result);         // then LEFT
  preorder(node.right, result);        // then RIGHT

  return result;
}

console.log(preorder(tree)); // [10, 5, 3, 8, 20, 15, 25]
```

**Inorder (Left → Root → Right):** recurse left first, *then* process the node, then recurse right.

```javascript
function inorder(node, result = []) {
  if (node === null) return result;

  inorder(node.left, result);          // LEFT first
  result.push(node.value);             // then ROOT
  inorder(node.right, result);         // then RIGHT

  return result;
}

console.log(inorder(tree)); // [3, 5, 8, 10, 15, 20, 25]
```

**Postorder (Left → Right → Root):** recurse both children first, process the node *last*.

```javascript
function postorder(node, result = []) {
  if (node === null) return result;

  postorder(node.left, result);        // LEFT first
  postorder(node.right, result);       // then RIGHT
  result.push(node.value);             // then ROOT, LAST

  return result;
}

console.log(postorder(tree)); // [3, 8, 5, 15, 25, 20, 10]
```

### 🧠 Memory Trick: "Where Does the Root Fall in the Word?"

Look at the *names themselves* for the mnemonic: **Pre**order = root comes **before** (pre-) the children. **In**order = root comes **in between** (in the middle of) the children — which is exactly why, for a Binary *Search* Tree specifically (section 8.4), inorder traversal produces values in **sorted order** — a fact worth memorizing cold, since it's one of the most-tested facts about trees in interviews. **Post**order = root comes **after** (post-) the children.

### Dry Run: Preorder Step by Step

```
preorder(10):
  push 10                                 result=[10]
  preorder(5):
    push 5                                result=[10,5]
    preorder(3):
      push 3                              result=[10,5,3]
      preorder(null) -> base case, return
      preorder(null) -> base case, return
    preorder(8):
      push 8                              result=[10,5,3,8]
      preorder(null), preorder(null)
  preorder(20):
    push 20                               result=[10,5,3,8,20]
    preorder(15):
      push 15                             result=[10,5,3,8,20,15]
    preorder(25):
      push 25                             result=[10,5,3,8,20,15,25]

Final: [10, 5, 3, 8, 20, 15, 25]
```

### 🧮 Complexity of All Three DFS Traversals

- **Time**: O(n) — every node is visited exactly once, doing O(1) work per visit.
- **Space**: O(h) for the call stack, where `h` is the tree's **height**, not its total node count `n`. This distinction matters enormously: for a **balanced** tree, `h = O(log n)`, giving O(log n) space. For a completely **unbalanced**, "stick-shaped" tree (every node has only one child, degenerating into something that's structurally just a linked list), `h = O(n)`, giving O(n) space in the worst case.

### ⚠ Common Mistake

Beginners often report the space complexity of tree traversal as simply "O(log n)" out of habit, without checking whether the tree is actually balanced. **Always state the space complexity in terms of height `h`, and separately note that `h` ranges from O(log n) (balanced) to O(n) (completely unbalanced/degenerate)** — this is a precise, correct, and impressive thing to volunteer unprompted.

### 8.2.2 Iterative DFS Traversals (Using an Explicit Stack — Closing the Loop With Chapter 6)

Every recursive traversal can be rewritten iteratively using an explicit stack, directly exercising Chapter 6's lesson that "the call stack IS a stack" — here, we make that stack visible and manual.

```javascript
function preorderIterative(root) {
  if (root === null) return [];

  const result = [];
  const stack = [root]; // our Chapter 6 Stack, used via a plain array

  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node.value);

    // Push RIGHT first, so LEFT is popped and processed first (LIFO!)
    if (node.right !== null) stack.push(node.right);
    if (node.left !== null) stack.push(node.left);
  }

  return result;
}

console.log(preorderIterative(tree)); // [10, 5, 3, 8, 20, 15, 25] — matches recursive!
```

### ⚠ Common Mistake: Push Order Matters!

This is a frequent, subtle bug: because a stack is LIFO (Chapter 6), **whatever you push last gets processed first.** Since we want preorder's Left-before-Right processing, and the stack reverses order, you must push **right before left**, so that left ends up on *top* and gets popped (processed) first. Pushing them in the "intuitive" left-then-right order silently produces the wrong traversal order (right processed before left) — always double check this against a small dry run before trusting an iterative tree traversal implementation.

### 🚀 Pro Tip: Iterative Inorder Is Genuinely Harder — Know Why

Iterative inorder traversal is considerably trickier than iterative preorder, precisely because inorder needs to visit a node's value **between** processing its two children, which doesn't map as cleanly onto "pop and immediately process" stack semantics:

```javascript
function inorderIterative(root) {
  const result = [];
  const stack = [];
  let current = root;

  while (current !== null || stack.length > 0) {
    // Go as far left as possible, pushing each node along the way
    while (current !== null) {
      stack.push(current);
      current = current.left;
    }

    // Backtrack: pop the deepest unprocessed node, process it, then go right
    current = stack.pop();
    result.push(current.value);
    current = current.right;
  }

  return result;
}

console.log(inorderIterative(tree)); // [3, 5, 8, 10, 15, 20, 25]
```

### 🔥 Interview Tip

Being asked to convert a recursive tree traversal to an iterative one is an extremely common interview question, specifically because it tests whether you understand **why** recursion works (the call stack managing "where to come back to" automatically) well enough to **manually replicate that bookkeeping with an explicit stack**. This is Chapter 2's "the call stack is real memory" lesson and Chapter 6's "a stack IS the mechanism behind recursion" lesson, both cashed in directly.

### 8.2.3 Breadth-First Traversal: Level-Order (Closing the Loop With Chapter 6's Queue)

Recall Chapter 6's single most important forward-looking fact: **BFS uses a queue for FIFO, layer-by-layer exploration.** Level-order tree traversal is exactly BFS applied to a tree.

```javascript
function levelOrder(root) {
  if (root === null) return [];

  const result = [];
  const queue = [root]; // used as a Queue via a plain array (enqueue=push, dequeue=shift for clarity here;
                          // in production, prefer Chapter 6's proper O(1)-dequeue Queue class!)

  while (queue.length > 0) {
    const node = queue.shift(); // NOTE: O(n) with a plain array (Chapter 6's classic trap!)
    result.push(node.value);

    if (node.left !== null) queue.push(node.left);
    if (node.right !== null) queue.push(node.right);
  }

  return result;
}

console.log(levelOrder(tree)); // [10, 5, 20, 3, 8, 15, 25]
```

### ⚠ Common Mistake (A Direct Callback to Chapter 6)

The `queue.shift()` call above is **exactly** the O(n) trap from Chapter 6, section 6.2.1! Using a plain array with `.shift()` here silently makes this traversal **O(n²)** in the worst case instead of O(n). For interview whiteboard code, this is usually accepted for simplicity/clarity, but you should **proactively mention** the issue and how to fix it:

```javascript
function levelOrderOptimized(root) {
  if (root === null) return [];

  const result = [];
  let queue = [root];

  while (queue.length > 0) {
    const nextQueue = [];
    for (const node of queue) {
      result.push(node.value);
      if (node.left !== null) nextQueue.push(node.left);
      if (node.right !== null) nextQueue.push(node.right);
    }
    queue = nextQueue; // process one "level" at a time, no shift() needed at all!
  }

  return result;
}
```

This "swap to a fresh array per level" technique sidesteps the `.shift()` problem entirely while *also* naturally giving you level-by-level grouping for free — useful for problems that specifically ask for "return the values grouped by level" (a very common variant, included in this chapter's coding problems).

### 🎯 Interview Pattern: When to Choose Which Traversal

| Traversal | Use When |
|---|---|
| Preorder | You need to process a node before its children (e.g., copying/serializing a tree, since you need the root's info before you can even construct the children in some formats) |
| Inorder | You're working with a **Binary Search Tree** and need sorted output (section 8.4) |
| Postorder | You need to process children before the node itself (e.g., safely deleting a tree bottom-up, computing subtree sizes/heights where each node needs its children's answers first — directly the "leap of faith" recursion pattern from Chapter 2) |
| Level-order (BFS) | You need to process nodes by depth/distance from the root (e.g., "find the minimum depth," "print the tree row by row," anything about levels) |

---

## 8.3 Common Tree Metrics and Recursive Patterns

### 8.3.1 Height of a Tree

```javascript
function height(node) {
  if (node === null) return -1; // convention: an empty tree has height -1 (a single node has height 0)

  const leftHeight = height(node.left);   // "leap of faith" (Chapter 2): trust this is correct
  const rightHeight = height(node.right);

  return 1 + Math.max(leftHeight, rightHeight);
}
```

### ⚠ Common Mistake: Height Convention Inconsistency

Some textbooks define an empty tree's height as `0` and a single-node tree's height as `1`; others (as used here) define empty as `-1` and single-node as `0`. **Neither is "more correct" — but you must be consistent and explicit about your convention**, especially in an interview, because it changes every downstream calculation by exactly one. State your convention out loud before diving into code.

### 8.3.2 Counting Nodes

```javascript
function countNodes(node) {
  if (node === null) return 0;                          // BASE CASE
  return 1 + countNodes(node.left) + countNodes(node.right); // RECURSIVE CASE
}
```

This is structurally identical to the `getTotalSize` file-system example from Chapter 2 — "1 (myself) plus the count of everything in my subtrees" is the exact same shape as "my size plus the size of everything in my subfolders."

### 8.3.3 Checking If a Tree Is Balanced

**Definition:** A tree is height-balanced if, for every node, the heights of its left and right subtrees differ by at most 1.

**Naive approach — compute height separately at every node:**

```javascript
function isBalancedNaive(node) {
  if (node === null) return true;

  const leftHeight = height(node.left);   // O(n) EVERY time this is called!
  const rightHeight = height(node.right); // O(n) EVERY time this is called!

  if (Math.abs(leftHeight - rightHeight) > 1) return false;

  return isBalancedNaive(node.left) && isBalancedNaive(node.right);
}
// Time: O(n²) worst case — recomputing height() redundantly at every node,
// eerily similar to naive Fibonacci's overlapping sub-problems from Chapter 2!
```

**Optimized — compute height and check balance in a single traversal:**

```javascript
function isBalanced(node) {
  function checkHeight(current) {
    if (current === null) return 0;

    const leftHeight = checkHeight(current.left);
    if (leftHeight === -1) return -1; // propagate "unbalanced" signal upward immediately

    const rightHeight = checkHeight(current.right);
    if (rightHeight === -1) return -1;

    if (Math.abs(leftHeight - rightHeight) > 1) return -1; // found imbalance HERE

    return 1 + Math.max(leftHeight, rightHeight); // normal height calculation otherwise
  }

  return checkHeight(node) !== -1;
}
// Time: O(n) — each node's height is computed exactly ONCE, sharing results
//              up the call stack instead of recomputing — the tree-shaped
//              analogue of Chapter 2's memoization insight!
```

### 🎯 Interview Pattern

This exact "naive O(n²) → optimized O(n) by avoiding redundant recomputation" shape should feel deeply familiar: it's the **same underlying insight as memoized Fibonacci from Chapter 2** — overlapping, redundantly-recomputed sub-problems (here, "the height of this subtree," computed once per ancestor asking about it) collapsed into a single computation via careful design (here, using a special sentinel return value, `-1`, to short-circuit and propagate "already found a problem" up through the recursion, rather than a separate cache). Recognizing "naive recursive tree algorithm recomputes shared sub-results" as the *same shape* as "naive recursive Fibonacci recomputes shared sub-results" is exactly the kind of cross-chapter pattern transfer this book is built to train.

### 8.3.4 Diameter of a Binary Tree (A Slightly Harder, Very Common Variant)

**The problem:** find the length (number of edges) of the longest path between any two nodes in the tree — the path does **not** need to pass through the root.

```javascript
function diameter(root) {
  let maxDiameter = 0;

  function height(node) {
    if (node === null) return 0;

    const leftHeight = height(node.left);
    const rightHeight = height(node.right);

    // The longest path THROUGH this node = leftHeight + rightHeight (in edges)
    maxDiameter = Math.max(maxDiameter, leftHeight + rightHeight);

    return 1 + Math.max(leftHeight, rightHeight);
  }

  height(root);
  return maxDiameter;
}
```

### 🧠 Memory Trick: "Every Node Might Be the Bridge"

The key insight that trips up nearly everyone on first encounter: **the longest path might not pass through the root at all** — it could be entirely within a subtree, "bridging" across some node deep in the tree via its left and right children. The trick is computing height *and* checking "what's the longest path bridging through me" **simultaneously, in the same postorder pass**, updating a variable captured by closure (`maxDiameter`) as a side effect, rather than trying to return two pieces of information awkwardly. This "compute one thing, but track a second running answer via a closure variable during the same traversal" technique is extremely reusable — expect to see it again in later tree and graph problems.

- **Time**: O(n) — one traversal, height computed once per node (same avoid-redundant-recomputation insight as `isBalanced`).
- **Space**: O(h) — call stack.

---

## 8.4 Binary Search Trees (BSTs)

**Definition:** A Binary Search Tree is a binary tree with an additional ordering invariant: for every node, **all values in its left subtree are less than the node's value, and all values in its right subtree are greater.**

### ASCII Visualization

```
                20
              /    \
            10       30
           /  \      /  \
          5    15  25    35

Every node's LEFT subtree is entirely SMALLER, RIGHT subtree entirely LARGER.
This holds RECURSIVELY at every single node, not just the root.
```

### 🎯 Why This Invariant Is the Entire Point

This ordering invariant is precisely what makes BST operations resemble **binary search from Chapter 1** — at every node, you can eliminate an entire subtree from consideration with a single comparison, exactly like eliminating half the phone book with one glance.

### 8.4.1 BST Search

```javascript
function bstSearch(node, target) {
  if (node === null) return false;               // BASE CASE: not found
  if (node.value === target) return true;        // BASE CASE: found it

  if (target < node.value) {
    return bstSearch(node.left, target);          // eliminate the entire right subtree!
  } else {
    return bstSearch(node.right, target);         // eliminate the entire left subtree!
  }
}
```

### Dry Run: Searching for `15` in the Tree Above

```
bstSearch(20, 15): 15 < 20 -> go LEFT (entire right subtree {30,25,35} eliminated!)
bstSearch(10, 15): 15 > 10 -> go RIGHT (entire left subtree {5} eliminated!)
bstSearch(15, 15): MATCH! return true

Only 3 comparisons needed, out of 7 total nodes — exactly binary search's efficiency.
```

- **Time**: O(h) — proportional to height, **not** total node count directly. For a **balanced** BST, `h = O(log n)`, giving the famous O(log n) BST search. For a **degenerate** BST (values inserted in already-sorted order, producing a structure that's really just a linked list in disguise), `h = O(n)`, giving O(n) worst case.

### ⚠ Common Mistake (Extremely Important — This Is Tested Constantly)

Never state "BST search is O(log n)" as an unconditional fact. **It is O(log n) only if the tree is reasonably balanced.** A BST built by inserting `1, 2, 3, 4, 5, ...` in already-sorted order degenerates into a structure where every node has only a right child — a straight chain, structurally identical to a linked list, with height `h = n`. Searching such a "tree" is O(n), no better than linear search. This exact gap — "BSTs are *usually* fast, but can degrade to linear-list-like behavior without rebalancing" — is precisely the motivation for **self-balancing BSTs** (AVL trees, Red-Black trees), which we introduce conceptually at the end of this chapter.

### 8.4.2 BST Insertion

```javascript
function bstInsert(node, value) {
  if (node === null) {
    return new TreeNode(value); // BASE CASE: found the empty spot, create a new node here
  }

  if (value < node.value) {
    node.left = bstInsert(node.left, value);
  } else if (value > node.value) {
    node.right = bstInsert(node.right, value);
  }
  // if value === node.value, we do nothing (no duplicates in this convention)

  return node; // return the (possibly unchanged) node, rebuilding the path back up
}
```

### 🧠 Memory Trick

Notice the pattern: `node.left = bstInsert(node.left, value)`. This "reassign the child to the result of recursing into it" idiom is extremely common in tree-building recursive functions — it correctly handles both "the child already exists, recurse further down" and "the child was `null`, and the recursive call's base case just created the new node to attach right here" **using the exact same line of code**, no special-casing required. This is one of the cleanest illustrations in the whole book of Chapter 2's "leap of faith" philosophy: you don't need to think about *where* in the tree the new node ends up; you just trust the recursive call handles it correctly and reattach whatever it returns.

- **Time**: O(h) — same height-dependent complexity as search, for the same reason (we walk one path from root to the insertion point).

### 8.4.3 BST Deletion (The Trickiest BST Operation — Three Cases)

Deletion is where BSTs get genuinely tricky, because removing a node must **preserve the BST invariant** for all remaining nodes. There are three distinct cases.

**Case 1: Deleting a leaf node (no children).** Simply remove it.

**Case 2: Deleting a node with one child.** Replace the node with its single child.

**Case 3: Deleting a node with two children.** This is the hard case: you cannot simply remove it (which child would take its place?). The standard technique: **find the node's inorder successor** (the smallest value in its right subtree — equivalently, the leftmost node of the right subtree), copy that value into the node being "deleted," then recursively delete the successor from its original position (which is now guaranteed to be an easy Case 1 or Case 2 deletion, since the smallest value in a subtree can have at most a right child).

```javascript
function bstDelete(node, value) {
  if (node === null) return null; // value not found, nothing to do

  if (value < node.value) {
    node.left = bstDelete(node.left, value);
  } else if (value > node.value) {
    node.right = bstDelete(node.right, value);
  } else {
    // FOUND the node to delete

    // Case 1: leaf node (no children)
    if (node.left === null && node.right === null) {
      return null;
    }

    // Case 2: only a right child
    if (node.left === null) {
      return node.right;
    }

    // Case 2 (mirror): only a left child
    if (node.right === null) {
      return node.left;
    }

    // Case 3: two children — find inorder successor (smallest in right subtree)
    let successor = node.right;
    while (successor.left !== null) {
      successor = successor.left;
    }

    node.value = successor.value;                     // copy successor's value up
    node.right = bstDelete(node.right, successor.value); // remove the successor from its old spot
  }

  return node;
}
```

### Dry Run: Deleting `20` (Two Children) From Our Example Tree

```
                20                              15
              /    \                          /    \
            10       30      delete 20 -->  10       30
           /  \      /  \                  /        /  \
          5    15  25    35                5      25    35

Step 1: node.value(20) matches target -> found the node to delete
Step 2: it has TWO children (10-side and 30-side) -> Case 3
Step 3: find inorder successor: go to node.right (30), then leftmost: 25
Step 4: copy successor's value (25) into node -> node.value becomes 25... 

Wait — let's be precise: successor = 25 (leftmost of right subtree, which is 30 with left child 25).
node.value = 25.
node.right = bstDelete(30-subtree, 25) -> removes 25 from its original spot (a Case 1 leaf deletion,
             since 25 has no children) -> 30-subtree becomes: 30 with left=null, right=35

Final tree:
                25
              /    \
            10       30
           /  \         \
          5    15        35
```

### 🔥 Interview Tip

BST deletion's Case 3 (two children) is, without exaggeration, one of the most commonly botched interview implementations, because candidates try to handle it with ad-hoc pointer surgery instead of the clean "copy successor's value up, then recursively delete the successor from its original (now-simpler) position" technique. Memorize this technique as a named recipe, not something to re-derive under pressure. Also note: **using the inorder *predecessor* (largest value in the left subtree) instead of the successor works equally well** — both are valid, symmetric choices; pick one and be consistent.

### 📌 Quick Revision: BST Operation Complexities

| Operation | Time (balanced) | Time (degenerate/worst case) |
|---|---|---|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Find min/max | O(log n) (walk all the way left/right) | O(n) |
| Inorder traversal (sorted output) | O(n) always | O(n) always |

### 🚀 Pro Tip: Validating a BST

A classic, deceptively tricky interview question: "given a binary tree, determine if it's a valid BST." The naive mistake: checking only that `node.left.value < node.value < node.right.value` **locally** at each node — this is **insufficient**, because it misses violations from grandchildren or deeper descendants.

```javascript
// WRONG — only checks immediate children, misses deeper violations
function isValidBSTWrong(node) {
  if (node === null) return true;
  if (node.left && node.left.value >= node.value) return false;
  if (node.right && node.right.value <= node.value) return false;
  return isValidBSTWrong(node.left) && isValidBSTWrong(node.right);
}

// Example that FOOLS the wrong version:
//         10
//        /  \
//       5    15
//           /  \
//          6    20      <- 6 is in 10's RIGHT subtree but 6 < 10! INVALID BST,
//                           but the wrong version above would say "valid" because
//                           it only checks 15 vs its immediate children (6 and 20),
//                           never checking 6 against the ORIGINAL root (10).
```

**Correct approach — pass down a valid range (min, max) that narrows at each level:**

```javascript
function isValidBST(node, min = -Infinity, max = Infinity) {
  if (node === null) return true;

  if (node.value <= min || node.value >= max) return false;

  return (
    isValidBST(node.left, min, node.value) &&   // left subtree's values must stay BELOW node.value
    isValidBST(node.right, node.value, max)     // right subtree's values must stay ABOVE node.value
  );
}
```

### 🧠 Memory Trick

Think of each recursive call as being handed a "fence" — a `(min, max)` range it's not allowed to cross. As you go left, the **upper fence tightens** to the current node's value (nothing in the left subtree, at any depth, may equal or exceed it). As you go right, the **lower fence tightens** similarly. This is a genuinely important generalization of the "leap of faith" recursion pattern: instead of only trusting the recursive call to solve a *smaller* problem, you're also passing it *additional context* (the narrowing range) that the naive local-only check was missing entirely.

---

## 8.5 Self-Balancing Trees: A Conceptual Introduction

We've now established, repeatedly, that BST operations are only O(log n) when the tree is **balanced** — and that naive insertion can produce a badly degenerate, linked-list-shaped tree. Self-balancing trees solve this by **automatically restructuring themselves during insertion/deletion** to maintain a height guarantee.

### 8.5.1 AVL Trees (Conceptual Overview)

**Definition:** An AVL tree is a self-balancing BST where, for every node, the heights of the left and right subtrees differ by at most 1 (exactly the `isBalanced` condition from section 8.3.3, but enforced continuously, not just checked after the fact).

When an insertion or deletion would violate this invariant, the tree performs **rotations** — local restructuring operations that fix the imbalance in O(1) time per rotation, with at most O(log n) rotations needed per insertion.

### ASCII Visualization: A Right Rotation (Fixing a Left-Heavy Imbalance)

```
Before (imbalanced — "left-left" case, height difference > 1):

        30
       /
      20
     /
    10

After a RIGHT ROTATION around 30:

        20
       /  \
      10    30

The tree is now perfectly balanced, and the BST ordering invariant
(everything left of 20 is smaller, everything right is larger) is preserved.
```

### 🧠 Memory Trick

There are four classic imbalance shapes (Left-Left, Right-Right, Left-Right, Right-Left), each requiring a specific rotation (or pair of rotations) to fix. You do not need to memorize the full rotation implementation for most interviews — **conceptual fluency** ("AVL trees maintain O(log n) height via rotations after every insert/delete, guaranteeing O(log n) search/insert/delete even in the worst case, unlike a plain BST") is the expected depth for the vast majority of interviews. Full rotation implementation is occasionally asked at companies with unusually deep DSA bars, but knowing *why* they exist and *what problem they solve* is the universally expected baseline.

### 8.5.2 Red-Black Trees (Conceptual Overview)

**Definition:** A Red-Black tree is another self-balancing BST, using a different balancing strategy: each node is colored red or black, and a set of coloring rules (no two consecutive red nodes, every path from root to a null leaf has the same number of black nodes, etc.) guarantees the tree's height never exceeds roughly `2 log(n+1)`.

### 🔥 Interview Tip

Red-Black trees are famously the underlying structure behind many real-world "ordered map/set" implementations — for instance, C++'s `std::map` and Java's `TreeMap` are typically Red-Black trees internally. **JavaScript's native `Map` and `Set` are hash-based (Chapter 4), not tree-based**, and JavaScript has no built-in self-balancing BST in its standard library — a genuinely useful piece of trivia, and a great answer to "does JavaScript have a built-in sorted map?" (Answer: no, natively — you'd need a library, or to build one, if you needed guaranteed sorted-order iteration with O(log n) operations rather than `Map`'s O(1)-but-insertion-ordered-only guarantees.)

### 📌 Quick Revision: AVL vs. Red-Black

| | AVL Tree | Red-Black Tree |
|---|---|---|
| Balance strictness | Stricter (height diff ≤ 1 everywhere) | Looser (height diff can be up to ~2x) |
| Lookup speed | Slightly faster (more strictly balanced) | Slightly slower |
| Insertion/deletion speed | More rotations needed (stricter to maintain) | Fewer rotations needed |
| Common real-world use | Read-heavy workloads | Write-heavy workloads (used in Linux kernel schedulers, many language standard libraries) |

---

## 8.6 Edge Cases and Gotchas Checklist for Tree Problems

1. **Empty tree (`root === null`).** Does every function handle this as a clean base case?
2. **Single-node tree.** Height, diameter, and balance functions should all produce sensible values (height 0, diameter 0, balanced true).
3. **Skewed/degenerate trees** (every node has only one child). Verify your complexity claims — this is when O(log n) silently becomes O(n).
4. **Duplicate values in a BST.** Decide and state your convention (ignore duplicates, allow them in the right subtree only, etc.) — this affects search, insert, and delete correctness.
5. **BST validation with `Infinity`/`-Infinity` boundaries** — make sure your min/max range check uses strict inequalities (`<=`/`>=`) if duplicates should be rejected, matching your stated convention.
6. **Height convention (-1 vs. 0 for empty tree)** — pick one, state it, stay consistent throughout a solution.
7. **Iterative traversal push order** — always dry-run a small 3-node example to verify your stack-based iterative traversal produces the same order as the recursive version.

---

## 8.7 Chapter Summary

This chapter was where recursion, introduced as an abstract technique in Chapter 2, finally met the data structure it was born to describe. We built the vocabulary of trees (root, parent, child, leaf, depth, height, subtree) and formalized the binary tree as a genuinely recursive definition — a node plus two smaller binary trees, or `null` — which directly powers every algorithm in the chapter via the same "base case for `null`, recursive case trusting the children are already handled correctly" rhythm from Chapter 2.

We mastered the three depth-first traversal orders (preorder, inorder, postorder), anchoring the mnemonic directly to where the root falls in each name, and specifically flagging that **inorder traversal of a BST yields sorted output** — one of the most tested single facts in this entire chapter. We converted these to iterative form using an explicit stack, directly cashing in Chapter 6's "the call stack IS a stack" lesson, and carefully noted the push-order subtlety that trips up most first attempts. We covered level-order (BFS) traversal, directly reusing Chapter 6's queue, and specifically flagged the classic `.shift()` performance trap from that same chapter, offering the "swap to a fresh array per level" fix that also naturally solves the common "group by level" variant.

We built the core recursive tree metrics — height, node count, balance checking, and diameter — using each as an opportunity to reinforce a recurring theme: naive recursive tree algorithms can silently hide redundant recomputation (an O(n²) trap structurally identical to naive Fibonacci from Chapter 2), fixable by computing shared sub-results exactly once per node and threading them upward, sometimes via closure-captured "running answer" variables (as in the diameter problem) rather than an explicit return value alone.

We then built the Binary Search Tree, whose entire value proposition is the ordering invariant that makes its operations resemble Chapter 1's binary search — but we were rigorous about the honest complexity claim: **O(log n) only when balanced; O(n) worst case when degenerate**, exactly mirroring Chapter 4's honest treatment of hash table complexity. We worked through BST insertion's elegant "reassign child to recursive result" idiom, and BST deletion's three cases in full, including the classic two-children case's inorder-successor technique. We closed with the correct range-narrowing technique for BST validation (contrasted against the common, insufficient "check only immediate children" mistake), and a conceptual (not implementation-level) introduction to self-balancing trees — AVL and Red-Black — as the direct answer to the degeneracy problem, closing the loop on "how do we actually guarantee O(log n), not just hope for it."

---

## 8.8 Revision Notes

- A binary tree is recursively defined: `null`, or a value plus two binary trees (left and right) — every algorithm here exploits this directly.
- Preorder (root-left-right), Inorder (left-root-right), Postorder (left-right-root) — mnemonic: where does "root" fall in the name?
- Inorder traversal of a BST produces sorted output — one of the most-tested single facts about trees.
- DFS traversal space complexity is O(h) (height), not O(log n) unconditionally — h ranges from O(log n) balanced to O(n) degenerate.
- Iterative traversals use an explicit stack (DFS) or queue (BFS/level-order) — directly Chapter 6's structures made visible.
- Naive recursive tree algorithms can hide O(n²) redundant recomputation (isBalancedNaive) — the same shape as naive Fibonacci; fix by computing shared results once per node.
- BST search/insert/delete are O(log n) only when balanced — O(n) worst case on a degenerate (linked-list-shaped) tree; never claim O(log n) unconditionally.
- BST deletion's hardest case (two children): copy the inorder successor's value up, then recursively delete the successor from its original position.
- BST validation must track a narrowing (min, max) range across the whole recursion, not just check immediate children.
- AVL and Red-Black trees solve BST degeneracy via automatic rebalancing (rotations); JavaScript has no built-in self-balancing tree — `Map`/`Set` are hash-based, not tree-based.

---

## 8.9 Mind Map (ASCII)

```
                                    TREES
                                      |
      +------------------+-----------+-----------+------------------------+
      |                  |                       |                        |
  VOCABULARY         TRAVERSAL              TREE METRICS            BINARY SEARCH TREE
  root/parent/            |               (recursive patterns)             |
  child/leaf/    +--------+--------+              |                Ordering invariant:
  depth/height   |        |        |         Height, Count,        left < node < right
      |        DFS       DFS    BFS/Level    Balance, Diameter       (RECURSIVELY)
  Recursive   (recursive) (iterative  (Ch.6 Queue,       |                  |
  definition:      |     w/ Ch.6      "swap array   Naive = O(n^2)   Search/Insert/Delete
  null OR      Pre/In/Post  Stack)    per level" fix  redundant       = O(log n) BALANCED
  {value,           |         |            |          recompute       O(n) DEGENERATE
  left, right}  mnemonic: push order   groups by      (same shape          |
                where root   matters!    level free    as naive       Validation needs
                falls in name                          Fibonacci!)    (min,max) range,
                     |                                                 not local check
              Inorder on BST                                                |
              = SORTED OUTPUT                                    SELF-BALANCING TREES
                                                                   AVL (rotations, strict)
                                                                   Red-Black (looser, JS
                                                                   has NEITHER built-in —
                                                                   Map/Set are hash-based)
```

---

## 8.10 Cheat Sheet

```
TRAVERSAL ORDERS
==================
Preorder:  Root, Left, Right   -> use for copying/serializing
Inorder:   Left, Root, Right   -> use for SORTED BST output
Postorder: Left, Right, Root   -> use for bottom-up (delete tree, compute subtree info)
Level-order (BFS): row by row  -> use for "by depth/level" questions

COMPLEXITY REFERENCE
=======================
DFS traversal:        O(n) time, O(h) space (h = height, NOT log n unconditionally)
BST search/insert/del: O(h) -> O(log n) balanced, O(n) degenerate — ALWAYS state both

RECURSIVE TREE FUNCTION TEMPLATE
====================================
function solve(node) {
  if (node === null) return /* base case answer */;
  const leftResult = solve(node.left);    // leap of faith
  const rightResult = solve(node.right);  // leap of faith
  return /* combine leftResult, rightResult, and node.value */;
}

BST DELETE — THE THREE CASES
================================
1. Leaf (no children)       -> remove it (return null)
2. One child                -> replace node with that child
3. Two children              -> copy inorder successor's value up,
                                 then recursively delete successor
                                 from its (now simple) original spot

BST VALIDATION — CORRECT APPROACH
=====================================
Pass down (min, max) range, narrowing at every level:
  going LEFT:  max tightens to current node's value
  going RIGHT: min tightens to current node's value
  NEVER just check a node against its immediate children only!
```

---

## 8.11 Key Takeaways

1. Binary trees are recursively defined; every algorithm in this chapter is the Chapter 2 "leap of faith" applied to `node.left` and `node.right`.
2. Know the traversal mnemonic cold: root's position in the name (Pre/In/Post) tells you exactly when it's processed — and inorder-on-a-BST-equals-sorted is one of the most tested facts in this book.
3. Tree space complexity is O(height), and height ranges from O(log n) to O(n) — never state O(log n) unconditionally for any tree operation.
4. Naive recursive tree algorithms can hide redundant recomputation exactly like naive Fibonacci — always check whether a "compute once, share the result" restructuring is available.
5. BST operations are only O(log n) when balanced; self-balancing trees (AVL, Red-Black) exist specifically to guarantee this, and JavaScript's native `Map`/`Set` do not provide this (they're hash-based, not tree-based).

---

## 8.12 20 Multiple Choice Questions

1. What is the recursive definition of a binary tree?
   a) An array of values
   b) `null`, or a value plus a left binary tree and a right binary tree
   c) A linked list with two next pointers
   d) A hash table with ordered keys

2. In preorder traversal, when is the current node's value processed?
   a) After both children
   b) Before both children
   c) Between the two children
   d) Never — only leaves are processed

3. What special property does inorder traversal have when applied to a Binary Search Tree?
   a) It produces values in reverse order
   b) It produces values in sorted order
   c) It only visits leaf nodes
   d) It has no special property

4. What is the space complexity of recursive DFS traversal, expressed correctly?
   a) Always O(log n)
   b) O(h), where h is the tree's height
   c) Always O(n)
   d) Always O(1)

5. What data structure powers iterative DFS traversal, replacing the implicit call stack?
   a) A queue
   b) An explicit stack
   c) A hash map
   d) A heap

6. What data structure powers level-order (BFS) tree traversal?
   a) A stack
   b) A queue
   c) A binary search tree
   d) A linked list only

7. What common performance trap appears when implementing level-order traversal with a plain array and `.shift()`?
   a) It throws an error
   b) `.shift()` is O(n), making the traversal O(n²) in the worst case
   c) It produces the wrong order
   d) It only works for balanced trees

8. Why is the naive `isBalancedNaive` function O(n²) in the worst case?
   a) It uses an incorrect algorithm
   b) It redundantly recomputes height() at every node, similar to naive Fibonacci
   c) It doesn't use recursion
   d) JavaScript trees are always O(n²)

9. What is the honest, precise complexity claim for BST search?
   a) Always O(log n)
   b) O(h): O(log n) if balanced, O(n) if degenerate
   c) Always O(n)
   d) Always O(1)

10. What causes a BST to degenerate into O(n) operations?
    a) Too many duplicate values
    b) Inserting values in already-sorted order, producing a linked-list-shaped tree
    c) Using recursion instead of iteration
    d) Having more than 100 nodes

11. In BST deletion, what technique handles the case where the node to delete has two children?
    a) Delete both children first
    b) Copy the inorder successor's value up, then delete the successor from its original spot
    c) Simply remove the node and leave a gap
    d) Convert the tree to an array first

12. What is the inorder successor of a node in a BST?
    a) The node's parent
    b) The smallest value in the node's right subtree
    c) The largest value in the node's left subtree
    d) The root of the tree

13. Why is checking only a node against its immediate children insufficient for BST validation?
    a) It's actually sufficient and correct
    b) It misses violations from deeper descendants that violate an ancestor's range
    c) It's too slow
    d) JavaScript doesn't support this check

14. What is the correct approach for validating a BST?
    a) Check immediate children only
    b) Pass down a narrowing (min, max) range through the recursion
    c) Sort the tree first
    d) Use a hash map to track all values

15. What problem do self-balancing trees like AVL and Red-Black trees solve?
    a) They make trees use less memory
    b) They guarantee O(log n) height, avoiding BST degeneration to O(n)
    c) They eliminate the need for recursion
    d) They allow duplicate values

16. Does JavaScript have a built-in self-balancing binary search tree?
    a) Yes, `Map` is implemented as a Red-Black tree
    b) No — `Map` and `Set` are hash-based, not tree-based
    c) Yes, `Set` is implemented as an AVL tree
    d) Yes, via `Array.prototype.sort()`

17. What is the height of a single-node tree, using the convention where an empty tree has height -1?
    a) -1
    b) 0
    c) 1
    d) Undefined

18. In the diameter-of-a-binary-tree problem, why might the longest path NOT pass through the root?
    a) It always passes through the root
    b) The longest path could be entirely within a subtree, bridging through some deeper node
    c) Diameter is undefined for trees without a root
    d) JavaScript doesn't support this calculation

19. When pushing children onto an explicit stack for iterative preorder traversal, in what order should you push left and right children?
    a) Left first, then right
    b) Right first, then left (so left is popped and processed first)
    c) Order doesn't matter
    d) Only push one child at a time

20. What real-world data structures are commonly implemented using Red-Black trees?
    a) JavaScript's `Map` and `Set`
    b) C++'s `std::map` and Java's `TreeMap`
    c) Python's `list` and `dict`
    d) JavaScript arrays

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-b, 19-b, 20-b

---

## 8.13 20 Coding Problems

**Easy**

1. Implement preorder, inorder, and postorder traversal recursively, from memory.
2. Write a function to count the total number of nodes in a binary tree.
3. Write a function to find the maximum value in a binary tree (not necessarily a BST).
4. Write a function to check if two binary trees are structurally identical with the same values (a direct callback to Chapter 2's coding problem #19).
5. Write a function to invert (mirror) a binary tree — swap every node's left and right children.

**Medium**

6. Implement the optimized O(n) `isBalanced` function from memory (section 8.3.3).
7. Implement the diameter-of-a-binary-tree function from memory (section 8.3.4).
8. Implement BST search, insert, and delete from memory (section 8.4), including all three deletion cases.
9. Implement the correct `isValidBST` function using the (min, max) range technique from memory.
10. Given a binary tree, return the values grouped by level (a list of lists), using the "swap array per level" BFS technique.

**Hard**

11. Given a BST, find the k-th smallest element using inorder traversal, stopping early once the k-th element is found (don't traverse the whole tree if avoidable).
12. Given a binary tree, serialize it to a string and deserialize it back into an identical tree structure (use preorder with explicit null markers).
13. Given a binary tree, find the lowest common ancestor (LCA) of two given nodes, without assuming BST ordering (a general binary tree LCA).
14. Given a BST, find the lowest common ancestor of two given nodes, exploiting the BST ordering invariant for a more efficient solution than problem 13's general approach.
15. Convert a sorted array into a height-balanced BST (hint: recursively pick the middle element as the root, directly connecting back to Chapter 1's binary search intuition).

**Interview Level**

16. **(Google-level)** Given a binary tree, determine if it's symmetric (a mirror image of itself around its center), using recursive comparison of left and right subtrees.
17. **(Amazon-level)** Given a BST representing a product catalog sorted by price, implement a range query function returning all products with prices between `min` and `max`, in better than O(n) time by pruning subtrees that can't contain valid values.
18. **(Microsoft-level)** Given a binary tree, find the maximum path sum between any two nodes (the path doesn't need to pass through the root), directly extending the diameter problem's "closure variable tracks running answer" technique to sums instead of lengths.
19. **(Meta-level)** Given a binary tree representing a social network's follower hierarchy, find the maximum "influence sum" achievable by selecting nodes such that no two selected nodes are directly connected (parent-child) — the tree-shaped version of the classic "house robber" DP problem, previewed here and formalized in the Dynamic Programming chapters.
20. **(Netflix-level)** Design a BST-backed "content catalog" supporting efficient range queries (find all content released between two dates) and discuss, in comments, why a self-balancing tree (AVL or Red-Black) would be necessary in production to guarantee consistent O(log n) performance regardless of insertion order (e.g., content added in strict chronological order, a realistic degenerate-BST risk).

---

## 8.14 5 Interview Questions

1. "Walk me through the difference between preorder, inorder, and postorder traversal, and give a real use case for each." (Tests the mnemonic and practical application, not just definitions.)
2. "What is the time complexity of BST search, and under what conditions does that change?" (Tests the honest O(log n)-if-balanced, O(n)-if-degenerate distinction.)
3. "How would you delete a node with two children from a BST while preserving the ordering invariant?" (Tests the inorder-successor technique specifically.)
4. "Why is checking a node only against its immediate children insufficient to validate a BST?" (Tests understanding of the range-narrowing technique and its necessity.)
5. "What problem do self-balancing trees like AVL or Red-Black trees solve, and does JavaScript have one built in?" (Tests conceptual understanding plus a specific, correct piece of JavaScript trivia.)

---

## 8.15 3 Real Projects

1. **Complete BST Library**: Build a full `BinarySearchTree` class supporting search, insert, delete (all three cases), height, size, balance-checking, and all four traversal orders (including iterative versions), with a self-check script asserting correctness on both balanced and deliberately degenerate inputs.
2. **Tree Visualizer CLI**: Build a Node.js script that takes a small binary tree and prints an ASCII-art representation of its structure (similar to the diagrams in this chapter), plus reports its height, whether it's balanced, and whether it's a valid BST — a direct, practical reinforcement tool for this chapter's core concepts.
3. **Sorted Data Range-Query Service**: Build a BST-backed module (extending coding problem #17) that ingests timestamped records and supports efficient "give me all records between date A and date B" queries, benchmarked against a naive linear-scan approach at increasing dataset sizes to empirically demonstrate the O(log n)-vs-O(n) gap discussed throughout this chapter.

---

## 8.16 Further Reading

- Donald Knuth, *The Art of Computer Programming, Volume 1*, section on tree structures, for the formal historical treatment.
- MDN Web Docs and the V8 blog for confirmation that JavaScript's `Map`/`Set` are hash-based, not tree-based (search "V8 blog Map internals").
- Search "AVL tree rotations visualized" and "Red-Black tree insertion visualized" for interactive/animated deep dives into the rotation mechanics only conceptually introduced in this chapter.
- Steven Skiena, *The Algorithm Design Manual*, chapter on tree data structures, for additional real-world design discussion and further problem sets.

---

*End of Chapter 8. Next: Chapter 9 will cover Heaps & Priority Queues — the array-based complete binary tree representation, heapify operations, and the many "top-K," "median-finding," and scheduling problems that make heaps one of the most practically useful structures in the entire book.*

**Say "Continue to the next chapter" when ready.**
