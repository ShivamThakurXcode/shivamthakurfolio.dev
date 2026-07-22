# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 11: Graphs — The Most General Structure in This Book

---

## 11.0 Why Graphs Come After Everything Else

Here's a genuine, useful realization to open this chapter with: **every data structure in this book so far is secretly a special case of a graph.** A linked list (Chapter 5) is a graph where every node has at most one outgoing connection. A tree (Chapter 8) is a graph with no cycles and exactly one path between any two nodes. Even an array can be viewed as a graph where each index connects to the next. Graphs are the most **general** way to represent "things and the relationships between them" — which is why this chapter comes last among the core structures: everything before it has been building the specific vocabulary and traversal instincts (BFS from Chapter 6's queue, DFS from Chapter 8's stack-based traversal) that graphs now generalize to their fullest extent.

### Real-Life Analogy: Everything Is a Graph

Social networks (people = nodes, friendships = edges), road maps (intersections = nodes, roads = edges), the internet (web pages = nodes, hyperlinks = edges), dependency systems (packages = nodes, "depends on" relationships = edges), and even this book's own chapter structure (each chapter builds on others — a dependency graph!) are all graphs. Once you can think in graphs, you have a genuinely general-purpose lens for modeling relationships in almost any system.

---

## 11.1 Graph Vocabulary and Types

**Definition:** A graph is a collection of **vertices** (also called nodes) connected by **edges**, representing relationships between them.

### 11.1.1 Directed vs. Undirected

```
UNDIRECTED graph (edges have no direction — a symmetric relationship):

    A --- B          "A and B are connected" — you can travel A->B or B->A equally.
    |     |          Example: Facebook friendships (mutual by definition).
    C --- D


DIRECTED graph (edges have a direction — an asymmetric relationship):

    A --> B          "A points to B" does NOT imply B points to A.
    ^     |          Example: Twitter/X follows (you can follow someone who doesn't follow back),
    |     v          or a "depends on" relationship between software packages.
    D <-- C
```

### 11.1.2 Weighted vs. Unweighted

```
UNWEIGHTED graph: edges just represent "connected or not."
Example: "these two people are friends" — no notion of HOW connected.

WEIGHTED graph: edges carry a numeric cost/distance/capacity.

    A --5-- B        Example: road network, where the weight is the
    |       |        distance or travel time between intersections —
    3       2        crucial for the shortest-path algorithms in the
    |       |        very next chapter (Chapter 12).
    C --1-- D
```

### 11.1.3 Cyclic vs. Acyclic

**Definition:** A cycle is a path that starts and ends at the same vertex without repeating any edge. A graph with no cycles is called **acyclic**. A **Directed Acyclic Graph (DAG)** — directed, with no cycles — is an extremely important special case, powering topological sort (Chapter 13) and representing any system of "dependencies" or "prerequisites" (build systems, course prerequisites, task scheduling) where circular dependencies would be a logical error.

### 📌 Quick Revision: Graph Vocabulary

| Term | Meaning |
|---|---|
| Vertex/Node | A single entity in the graph |
| Edge | A connection between two vertices |
| Degree | The number of edges connected to a vertex (undirected); split into **in-degree** and **out-degree** for directed graphs |
| Path | A sequence of vertices connected by edges |
| Cycle | A path that returns to its starting vertex |
| Connected (undirected) | Every vertex is reachable from every other vertex |
| Strongly Connected (directed) | Every vertex is reachable from every other vertex, **respecting edge direction** |
| DAG | Directed Acyclic Graph — no cycles, direction matters |

---

## 11.2 Representing Graphs in Code: Adjacency List vs. Adjacency Matrix

This is a foundational decision that affects every algorithm in this and the next several chapters — get it right, and worked correctly, the same intuition transfers cleanly across DFS, BFS, shortest-path, and MST algorithms.

### 11.2.1 Adjacency List (The Overwhelmingly Common Default)

**Definition:** An adjacency list represents a graph as a `Map` (or array) where each vertex maps to a list of its directly connected neighbors.

```javascript
// Using a Map (Chapter 4!) of vertex -> array of neighbors
class Graph {
  #adjacencyList = new Map();

  addVertex(vertex) {
    if (!this.#adjacencyList.has(vertex)) {
      this.#adjacencyList.set(vertex, []);
    }
  }

  addEdge(vertex1, vertex2, directed = false) {
    this.addVertex(vertex1);
    this.addVertex(vertex2);

    this.#adjacencyList.get(vertex1).push(vertex2);

    if (!directed) {
      this.#adjacencyList.get(vertex2).push(vertex1); // undirected: add BOTH directions
    }
  }

  getNeighbors(vertex) {
    return this.#adjacencyList.get(vertex) || [];
  }

  getAllVertices() {
    return [...this.#adjacencyList.keys()];
  }
}

const graph = new Graph();
graph.addEdge('A', 'B');
graph.addEdge('A', 'C');
graph.addEdge('B', 'D');

console.log(graph.getNeighbors('A')); // ['B', 'C']
```

### ASCII Visualization

```
Graph:        A --- B
              |     |
              C     D

Adjacency List representation:
A -> [B, C]
B -> [A, D]
C -> [A]
D -> [B]
```

### 11.2.2 Adjacency Matrix

**Definition:** An adjacency matrix represents a graph as a 2D array (or array of arrays) where `matrix[i][j]` indicates whether an edge exists between vertex `i` and vertex `j` (and, for weighted graphs, what that edge's weight is).

```javascript
class GraphMatrix {
  #matrix;
  #vertexIndex = new Map(); // maps vertex name -> row/column index

  constructor(vertices) {
    vertices.forEach((v, i) => this.#vertexIndex.set(v, i));
    const n = vertices.length;
    this.#matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  }

  addEdge(v1, v2, weight = 1, directed = false) {
    const i = this.#vertexIndex.get(v1);
    const j = this.#vertexIndex.get(v2);

    this.#matrix[i][j] = weight;
    if (!directed) {
      this.#matrix[j][i] = weight;
    }
  }

  hasEdge(v1, v2) {
    const i = this.#vertexIndex.get(v1);
    const j = this.#vertexIndex.get(v2);
    return this.#matrix[i][j] !== 0;
  }
}
```

### ASCII Visualization: Same Graph as a Matrix

```
Graph:        A --- B
              |     |
              C     D

Adjacency Matrix (0=no edge, 1=edge; order: A,B,C,D):

        A   B   C   D
    A [ 0,  1,  1,  0 ]
    B [ 1,  0,  0,  1 ]
    C [ 1,  0,  0,  0 ]
    D [ 0,  1,  0,  0 ]

hasEdge('A','B'): matrix[0][1] = 1 -> true (O(1) direct lookup!)
```

### 📌 Quick Revision: The Decisive Trade-off Table

| | Adjacency List | Adjacency Matrix |
|---|---|---|
| Space | **O(V + E)** — proportional to actual edges | **O(V²)** — always, regardless of actual edge count |
| Check if edge (u, v) exists | O(degree of u) — must scan u's neighbor list | **O(1)** — direct index lookup |
| Iterate all neighbors of a vertex | **O(degree of u)** — exactly as much work as needed | O(V) — must scan the entire row, even for sparse graphs |
| Best for | **Sparse graphs** (relatively few edges compared to V²) — the overwhelming majority of real-world graphs | **Dense graphs** (edges close to V²), or when O(1) edge-existence checks are the dominant operation |

### 🎯 Interview Pattern

**Default to an adjacency list unless given a specific reason to prefer a matrix.** The overwhelming majority of real-world graphs (social networks, road maps, dependency graphs, web page links) are **sparse** — the number of edges `E` is much closer to `V` than to `V²` (nobody is friends with a meaningful fraction of all Facebook users; most intersections connect to only a handful of roads). For sparse graphs, an adjacency list's O(V + E) space is dramatically better than a matrix's unconditional O(V²), and "iterate all neighbors" (the single most common graph operation, used in nearly every traversal and algorithm in this and the next several chapters) is O(degree) instead of O(V) — a real, often enormous, practical difference. **Choose a matrix only when you specifically need O(1) edge-existence checks and can tolerate O(V²) space**, or when the graph is known to be dense.

### 🔥 Interview Tip

If asked to represent a graph without further context, proactively state: **"I'll use an adjacency list, since it's O(V+E) space and gives O(degree) neighbor iteration — the right default for the sparse graphs that dominate real-world scenarios. I'd switch to a matrix only if I needed O(1) edge-existence checks or the graph were known to be dense."** This single sentence, delivered unprompted, signals genuine understanding of the trade-off rather than memorized syntax for either representation.

---

## 11.3 Depth-First Search (DFS): Formalizing Chapter 8's Instincts

**Definition:** Depth-First Search explores as far as possible along one path before backtracking, using either explicit recursion (Chapter 2's call stack) or an explicit stack (Chapter 6) to manage "where to backtrack to."

### 11.3.1 Recursive DFS

```javascript
function dfsRecursive(graph, startVertex, visited = new Set()) {
  visited.add(startVertex);
  console.log(startVertex); // "visit" the vertex — replace with real logic as needed

  for (const neighbor of graph.getNeighbors(startVertex)) {
    if (!visited.has(neighbor)) {
      dfsRecursive(graph, neighbor, visited);
    }
  }

  return visited;
}
```

### ⚠ Common Mistake: Forgetting the `visited` Set — Infinite Loops on Cyclic Graphs

Unlike a tree (Chapter 8), where recursion naturally terminates because there's no way back to an already-visited ancestor, **graphs can contain cycles**, and without a `visited` Set (Chapter 4!) tracking already-explored vertices, DFS on a cyclic graph will loop forever, bouncing between the same vertices indefinitely. **This `visited` tracking is not optional bookkeeping — it is the single most critical correctness requirement distinguishing graph traversal from tree traversal.**

### Dry Run

```
Graph: A -> [B, C], B -> [A, D], C -> [A], D -> [B]

dfsRecursive(graph, 'A'):
  visited={A}, print A
  neighbor 'B': not visited -> recurse
    visited={A,B}, print B
    neighbor 'A': ALREADY VISITED -> skip (this is exactly what prevents infinite looping!)
    neighbor 'D': not visited -> recurse
      visited={A,B,D}, print D
      neighbor 'B': already visited -> skip
  neighbor 'C': not visited -> recurse
    visited={A,B,C,D}, print C
    neighbor 'A': already visited -> skip

Output order: A, B, D, C
```

### 11.3.2 Iterative DFS (Directly Reusing Chapter 6's Stack + Chapter 8's Iterative Traversal Technique)

```javascript
function dfsIterative(graph, startVertex) {
  const visited = new Set();
  const stack = [startVertex];
  const result = [];

  while (stack.length > 0) {
    const vertex = stack.pop();

    if (visited.has(vertex)) continue; // may have been added multiple times before being processed

    visited.add(vertex);
    result.push(vertex);

    for (const neighbor of graph.getNeighbors(vertex)) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return result;
}
```

### ⚠ Common Mistake: Checking `visited` Only Before Pushing, Not Before Processing

Notice the iterative version checks `visited.has(vertex)` (and `continue`s) **immediately upon popping**, in addition to checking before pushing. This is necessary because a vertex can be pushed onto the stack **multiple times** (once by each of its unprocessed neighbors) before it's actually popped and processed — without the post-pop check, you'd process (and print) the same vertex more than once. This is a genuinely common, subtle bug in iterative graph traversal that doesn't arise in the recursive version (where the `visited.add` happens immediately upon entering the function, before any further exploration).

---

## 11.4 Breadth-First Search (BFS): Formalizing Chapter 6's Queue-Powered Instincts

**Definition:** Breadth-First Search explores all neighbors at the current distance from the start before moving to vertices farther away, using a queue (Chapter 6) to enforce this strict "layer by layer" ordering.

```javascript
function bfs(graph, startVertex) {
  const visited = new Set([startVertex]); // mark as visited IMMEDIATELY upon enqueueing!
  const queue = [startVertex];
  const result = [];

  while (queue.length > 0) {
    const vertex = queue.shift(); // NOTE: O(n) with a plain array — Chapter 6's classic trap!
                                    // Production code should use Chapter 6's proper Queue class.
    result.push(vertex);

    for (const neighbor of graph.getNeighbors(vertex)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor); // mark visited HERE, not when dequeued!
        queue.push(neighbor);
      }
    }
  }

  return result;
}
```

### ⚠ Common Mistake: Marking `visited` at the Wrong Time in BFS

This is the single most important, most commonly misplaced line in all of BFS: **you must mark a vertex as visited the moment you enqueue it, not when you dequeue it.** If you instead marked vertices visited only upon dequeuing (mirroring the DFS iterative pattern from section 11.3.2), the *same* vertex could be enqueued multiple times by different neighbors before any of those copies get dequeued and marked — leading to duplicate processing and wasted work (and in some algorithm variants, outright incorrect results). This is a genuinely different, important nuance versus DFS's iterative version, and worth stating explicitly if asked to compare the two implementations' `visited`-handling details.

### Dry Run

```
Graph: A -> [B, C], B -> [A, D], C -> [A], D -> [B]

bfs(graph, 'A'):
  visited={A}, queue=[A]

  dequeue A. result=[A]
    neighbor B: not visited -> visited={A,B}, queue=[B]
    neighbor C: not visited -> visited={A,B,C}, queue=[B,C]

  dequeue B. result=[A,B]
    neighbor A: already visited -> skip
    neighbor D: not visited -> visited={A,B,C,D}, queue=[C,D]

  dequeue C. result=[A,B,C]
    neighbor A: already visited -> skip

  dequeue D. result=[A,B,C,D]
    neighbor B: already visited -> skip

Final order: A, B, C, D  -- notice this is "layer by layer": A (distance 0),
then B and C (distance 1), then D (distance 2) — EXACTLY the FIFO discipline
from Chapter 6 enforcing this ordering.
```

### 📌 Quick Revision: DFS vs. BFS — The Complete Picture

| | DFS | BFS |
|---|---|---|
| Underlying structure | Stack (explicit or call stack) | Queue |
| Exploration shape | Deep first, then backtrack | Layer by layer (by distance from start) |
| Natural for | Detecting cycles, topological sort (Chapter 13), exploring all paths/connected components, backtracking-style problems | **Shortest path in an UNWEIGHTED graph**, level-by-level processing, "minimum number of steps" problems |
| Space complexity | O(V) worst case (visited set + stack/call stack depth) | O(V) worst case (visited set + queue, which can hold an entire "layer" at once) |

### 🎯 Interview Pattern: The Single Most Important BFS Fact

**BFS, and only BFS, guarantees finding the shortest path (measured in number of edges) in an unweighted graph**, precisely because of its layer-by-layer exploration order: by the time BFS first reaches any vertex, it must have done so via the shortest possible number of edges, since it exhaustively finishes every vertex at distance `d` before considering any vertex at distance `d+1`. DFS provides **no such guarantee** — it might stumble onto a needlessly long, winding path to a vertex before ever finding a much shorter one, since it commits to depth over breadth. **This single fact — "BFS for shortest unweighted path, DFS does not guarantee shortest path at all" — is one of the most frequently tested pieces of graph knowledge in the entire subject**, and directly sets up Chapter 12's need for specialized algorithms (Dijkstra's) once edge *weights* enter the picture.

### 11.4.1 Shortest Path in an Unweighted Graph, Fully Implemented

```javascript
function shortestPathUnweighted(graph, start, end) {
  const visited = new Set([start]);
  const queue = [[start]]; // queue of PATHS, not just vertices, to reconstruct the route

  while (queue.length > 0) {
    const path = queue.shift();
    const currentVertex = path[path.length - 1];

    if (currentVertex === end) {
      return path; // first time we reach `end` via BFS IS the shortest path, guaranteed!
    }

    for (const neighbor of graph.getNeighbors(currentVertex)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  return null; // no path exists
}
```

### 🚀 Pro Tip: A More Memory-Efficient Alternative

Storing full paths in the queue (as above) is simple to reason about but wastes memory (many overlapping path prefixes stored redundantly). The standard, more efficient production technique: track a `parent` map (Chapter 4's `Map` again!) during a plain vertex-only BFS, then reconstruct the path by walking backward through parents once `end` is reached.

```javascript
function shortestPathEfficient(graph, start, end) {
  const visited = new Set([start]);
  const parent = new Map();
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === end) {
      // Reconstruct path by walking backward through parent pointers
      const path = [];
      let step = end;
      while (step !== undefined) {
        path.unshift(step); // O(n) per call, but only happens ONCE at the very end
        step = parent.get(step);
      }
      return path;
    }

    for (const neighbor of graph.getNeighbors(current)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return null;
}
```

---

## 11.5 Connected Components

**Definition:** A connected component is a maximal set of vertices in an undirected graph where every vertex is reachable from every other vertex within that set.

```javascript
function countConnectedComponents(graph) {
  const visited = new Set();
  let componentCount = 0;

  for (const vertex of graph.getAllVertices()) {
    if (!visited.has(vertex)) {
      componentCount++;
      dfsRecursive(graph, vertex, visited); // reuse our DFS from section 11.3.1!
    }
  }

  return componentCount;
}
```

### 🧠 Memory Trick

Think of connected components as **separate "islands"** in the graph — DFS (or BFS) from any single starting vertex only ever explores its own island, never reaching a vertex on a different, disconnected island. **Looping over every vertex, and starting a fresh traversal from any not-yet-visited vertex, counts exactly how many separate islands exist** — each fresh traversal launch corresponds to discovering one new island.

### 🎯 Interview Pattern

"Count connected components," "find the number of islands" (a very common grid-based variant, where adjacent land cells form a graph implicitly), and "determine if a graph is fully connected" are all the exact same underlying technique: **loop through all vertices, launch a full DFS/BFS from each unvisited one, count launches.**

### 11.5.1 Number of Islands: The Grid-as-Implicit-Graph Pattern

```javascript
function numIslands(grid) {
  if (grid.length === 0) return 0;

  const rows = grid.length;
  const cols = grid[0].length;
  const visited = new Set();

  function key(r, c) {
    return `${r},${c}`; // encode 2D coordinates as a single string key for the Set
  }

  function dfs(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;      // out of bounds
    if (grid[r][c] === '0' || visited.has(key(r, c))) return;   // water or already visited

    visited.add(key(r, c));

    // Explore all 4 directions — these ARE the "graph edges" in this implicit graph!
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  }

  let islands = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1' && !visited.has(key(r, c))) {
        islands++;
        dfs(r, c);
      }
    }
  }

  return islands;
}

const grid = [
  ['1', '1', '0', '0'],
  ['1', '1', '0', '0'],
  ['0', '0', '1', '0'],
  ['0', '0', '0', '1'],
];

console.log(numIslands(grid)); // 3
```

### 🎯 Interview Pattern: Recognizing Implicit Graphs

This is one of the most valuable pattern-recognition skills in this entire chapter: **a 2D grid where you can move between adjacent cells is an implicit graph**, where each cell is a vertex and "adjacency" (up/down/left/right, sometimes including diagonals) defines the edges — no explicit `Graph`/adjacency-list object is ever built; the grid's own coordinate structure *is* the graph. Once you recognize this, every grid-traversal problem ("number of islands," "flood fill," "rotting oranges," "shortest path in a maze") becomes a direct, mechanical application of standard BFS/DFS, exactly as covered in this chapter — just with `(row, col)` pairs standing in for named vertices, and bounds-checking standing in for "does this neighbor exist."

---

## 11.6 Detecting Cycles

Cycle detection differs meaningfully between undirected and directed graphs — a subtlety worth being precise about.

### 11.6.1 Cycle Detection in an Undirected Graph

```javascript
function hasCycleUndirected(graph) {
  const visited = new Set();

  function dfs(vertex, parent) {
    visited.add(vertex);

    for (const neighbor of graph.getNeighbors(vertex)) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, vertex)) return true;
      } else if (neighbor !== parent) {
        // Found an already-visited neighbor that ISN'T our immediate parent —
        // that means there's another path back to it, i.e., a CYCLE.
        return true;
      }
    }

    return false;
  }

  for (const vertex of graph.getAllVertices()) {
    if (!visited.has(vertex)) {
      if (dfs(vertex, null)) return true;
    }
  }

  return false;
}
```

### ⚠ Common Mistake: Forgetting to Exclude the Parent

In an **undirected** graph, every edge is naturally "bidirectional" — if `A` connects to `B`, then DFS-ing from `A` to `B` will immediately see `A` again as one of `B`'s neighbors. **This is not a cycle** — it's just the trivial "the edge we just came from." You must track and exclude the immediate parent vertex specifically, or every single edge in an undirected graph would be incorrectly reported as a cycle.

### 11.6.2 Cycle Detection in a Directed Graph (A Genuinely Different Problem)

```javascript
function hasCycleDirected(graph) {
  const visited = new Set();
  const recursionStack = new Set(); // tracks vertices in the CURRENT DFS path

  function dfs(vertex) {
    visited.add(vertex);
    recursionStack.add(vertex);

    for (const neighbor of graph.getNeighbors(vertex)) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        // Found a neighbor that's part of the CURRENT path (not just visited
        // at some point in the past) — this IS a genuine directed cycle.
        return true;
      }
    }

    recursionStack.delete(vertex); // backtrack: no longer part of the current path
    return false;
  }

  for (const vertex of graph.getAllVertices()) {
    if (!visited.has(vertex)) {
      if (dfs(vertex)) return true;
    }
  }

  return false;
}
```

### 🧠 Memory Trick: Why Directed Cycle Detection Needs a Second Set

In a **directed** graph, "already visited" is no longer enough to signal a cycle, because a directed graph can have a vertex reachable via two entirely separate, non-cyclic paths (a "diamond" shape: `A -> B -> D` and `A -> C -> D`, with no cycle at all, but `D` gets visited twice via legitimate, different routes). The key distinction: **`visited` means "processed at some point, ever," while `recursionStack` means "currently an ancestor of me in this specific DFS branch, right now."** Only encountering a vertex that's in `recursionStack` (i.e., genuinely "on the path currently being explored," not just visited previously via an unrelated route) signals a real cycle. This `recursionStack` technique is exactly the "am I revisiting an ancestor on my current path" check, and it's a direct extension of Chapter 2's call-stack-as-real-state lesson: `recursionStack` is a manual, explicit mirror of what the actual call stack's contents represent at any given moment.

### 🔥 Interview Tip

This is a favorite "gotcha" interview distinction: **cycle detection algorithms for undirected and directed graphs are genuinely different, not just cosmetically**, because "have I seen this vertex before" means something structurally different in each case (a shared undirected edge back to your immediate parent vs. a genuine directed path looping back to an active ancestor). Conflating the two — applying the undirected "exclude only the immediate parent" logic to a directed graph, or vice versa — is a common, revealing mistake.

---

## 11.7 Edge Cases and Gotchas Checklist for Graph Problems

1. **Disconnected graphs.** Does your traversal correctly handle graphs where not all vertices are reachable from a single starting point? (This is exactly why connected-components-style code loops over *all* vertices, launching fresh traversals as needed — section 11.5.)
2. **Self-loops** (an edge from a vertex to itself). Does your cycle detection or traversal logic handle this degenerate case without crashing or infinite-looping?
3. **Directed vs. undirected confusion** — always double-check which the problem intends, since cycle detection, connectivity, and even basic neighbor-counting differ.
4. **Empty graph or single-vertex graph.** Verify BFS/DFS/component-counting handle these trivial cases correctly (0 or 1 component respectively).
5. **Weighted edges accidentally ignored** — if a graph is weighted, make sure a plain BFS/DFS (which only cares about connectivity/edge count) is actually the right tool; weighted shortest-path needs Chapter 12's algorithms instead.
6. **BFS `visited` marked at dequeue instead of enqueue time** — re-read section 11.4's warning; this causes duplicate processing.
7. **Grid problems: out-of-bounds checks** — always check row/column bounds *before* checking the grid value at that position, to avoid an out-of-bounds array access error.

---

## 11.8 Chapter Summary

This chapter formalized graphs as the most general structure in the entire book — one that every previous linear and hierarchical structure (linked lists, trees) can be viewed as a restricted special case of. We built the core vocabulary (directed/undirected, weighted/unweighted, cyclic/acyclic, DAGs) and made the single most consequential practical decision in all of graph programming: **adjacency lists (O(V+E) space, O(degree) neighbor iteration) as the correct default for the sparse graphs that dominate real-world scenarios, versus adjacency matrices (O(V²) space, O(1) edge-existence checks) for dense graphs or when direct edge lookups dominate** — a decision that shapes every algorithm in this and the following graph-focused chapters.

We formalized DFS and BFS not as new techniques but as **direct generalizations of instincts already built in Chapters 6 and 8** — DFS powered by a stack (explicit or the call stack itself), BFS powered by a queue — while being rigorous about the one genuinely new correctness requirement graphs introduce that trees never needed: **explicit `visited` tracking to prevent infinite loops on cycles**, plus the subtle but important distinction that BFS must mark vertices visited at *enqueue* time while iterative DFS must additionally re-check at *dequeue/pop* time, to avoid duplicate processing from a vertex being added to the frontier multiple times before being processed.

We established this chapter's single most tested fact: **BFS, and only BFS, guarantees the shortest path in an unweighted graph**, due to its strict layer-by-layer exploration order — a fact that directly motivates Chapter 12's need for specialized algorithms once edges carry weights. We covered connected components as "count how many separate DFS/BFS launches are needed to cover every vertex," and used this to introduce one of the most valuable pattern-recognition skills in the book: **recognizing that a 2D grid with adjacency-based movement is an implicit graph**, letting every "number of islands"-style problem become a direct, mechanical BFS/DFS application. Finally, we covered cycle detection, carefully distinguishing the genuinely different techniques required for undirected graphs (exclude only the immediate parent) versus directed graphs (track a `recursionStack` of currently-active-path ancestors, distinct from the broader `visited` set) — a distinction that trips up even experienced engineers who assume "seen before" always means the same thing regardless of edge direction.

---

## 11.9 Revision Notes

- Graphs are the most general structure in this book; linked lists and trees are graphs with structural restrictions (linear, or acyclic-with-unique-paths, respectively).
- Adjacency list (O(V+E) space, O(degree) neighbor iteration) is the correct default for sparse real-world graphs; adjacency matrix (O(V²) space, O(1) edge check) suits dense graphs or edge-existence-dominant workloads.
- DFS (stack/recursion) and BFS (queue) directly generalize Chapters 6 and 8 — graphs add the critical new requirement of explicit `visited` tracking to prevent infinite loops on cycles.
- BFS must mark `visited` at enqueue time; iterative DFS must additionally re-check `visited` at pop time — a subtle, important implementation difference between the two.
- BFS uniquely guarantees shortest path in unweighted graphs, due to strict layer-by-layer exploration — DFS provides no such guarantee.
- Connected components = count of fresh DFS/BFS launches needed to cover all vertices; a 2D grid with adjacency movement is an implicit graph, unlocking "number of islands"-style problems as direct BFS/DFS applications.
- Cycle detection differs fundamentally between undirected (exclude only the immediate parent) and directed (track a `recursionStack` of active-path ancestors, distinct from overall `visited`) graphs.

---

## 11.10 Mind Map (ASCII)

```
                                    GRAPHS
                                      |
      +------------------+-----------+-----------+----------------------+
      |                  |                       |                      |
  VOCABULARY        REPRESENTATION           TRAVERSAL              SPECIAL PROBLEMS
  directed/         (the KEY decision)             |                      |
  undirected,            |                    +----+----+          +-----+-----+
  weighted,       Adjacency List          DFS         BFS      Connected    Cycle
  DAG, cycle      O(V+E) space,       (Ch.6 stack/  (Ch.6      Components   Detection
                  O(degree) iter      Ch.2 call     Queue)          |            |
                  = SPARSE default    stack)            |      "count DFS/  Undirected:
                       vs.                |         guarantees   BFS island   exclude
                  Adjacency Matrix   needs explicit  SHORTEST     launches"   PARENT only
                  O(V^2) space,      visited Set!    path in           |     Directed:
                  O(1) edge check    (NEW vs trees   UNWEIGHTED   Grid = implicit  needs
                  = DENSE graphs     -- cycles!)     graph!       graph (rows/  recursionStack
                                          |               |       cols = vertices, (active path,
                                    iterative DFS:    visited marked  adjacency =  NOT just
                                    check visited     at ENQUEUE,     movement)    visited-ever)
                                    AGAIN at pop      not dequeue!
                                    (multi-push bug)       |
                                                    parent-map path
                                                    reconstruction
```

---

## 11.11 Cheat Sheet

```
GRAPH REPRESENTATION DECISION
================================
Sparse graph (most real-world cases)  -> Adjacency List: O(V+E) space, O(degree) neighbor iter
Dense graph / need O(1) edge checks    -> Adjacency Matrix: O(V^2) space, O(1) edge lookup
DEFAULT TO ADJACENCY LIST unless given a specific reason not to.

DFS vs BFS
=============
DFS: stack (explicit or recursive call stack) -- deep first, then backtrack
     Use for: cycle detection, connected components, exploring all paths, topological sort (Ch.13)
BFS: queue -- layer by layer, by distance from start
     Use for: SHORTEST PATH IN UNWEIGHTED GRAPH (the #1 most-tested graph fact), level-order problems

CRITICAL GRAPH-SPECIFIC RULE (doesn't apply to trees!)
==========================================================
ALWAYS track a `visited` Set. Graphs can have cycles; trees can't loop back to an ancestor.
BFS: mark visited at ENQUEUE time (prevents duplicate enqueues)
Iterative DFS: mark visited at POP time too (a vertex can be pushed multiple times before popping)

CYCLE DETECTION
==================
Undirected: DFS, skip only the IMMEDIATE PARENT; any other already-visited neighbor = cycle
Directed:   DFS with a SEPARATE recursionStack (current path's ancestors);
            hitting a recursionStack member = cycle. Hitting a merely-visited
            (but not on current path) vertex is NORMAL, not a cycle (diamond shapes).

IMPLICIT GRAPHS
==================
A 2D grid with adjacency-based movement (up/down/left/right) IS a graph:
  vertex = (row, col) pair,  edge = valid adjacent move
  "Number of islands," "flood fill," "rotting oranges" = standard BFS/DFS in disguise
```

---

## 11.12 Key Takeaways

1. Graphs generalize every structure before them; adjacency list vs. matrix is the single most consequential representation decision, defaulting to lists for the sparse graphs common in the real world.
2. DFS and BFS are Chapters 6/8's instincts generalized, with one critical new requirement: explicit `visited` tracking to survive cycles.
3. BFS uniquely guarantees shortest path in unweighted graphs — DFS does not, setting up Chapter 12's weighted shortest-path algorithms.
4. Connected components and grid-based "island" problems are the same technique: count fresh traversal launches across unvisited vertices/cells.
5. Cycle detection is genuinely different for undirected (skip only the immediate parent) versus directed (track an active-path `recursionStack`) graphs.

---

## 11.13 20 Multiple Choice Questions

1. Why are linked lists and trees considered special cases of graphs?
   a) They aren't related to graphs at all
   b) They are graphs with structural restrictions (linear connectivity, or acyclic unique-path hierarchy)
   c) Graphs are a special case of trees
   d) Only trees are related to graphs, not linked lists

2. What is the space complexity of an adjacency list representation?
   a) O(V²) always
   b) O(V + E)
   c) O(E²)
   d) O(1)

3. What is the space complexity of an adjacency matrix representation?
   a) O(V + E)
   b) O(V²), regardless of actual edge count
   c) O(E)
   d) O(log V)

4. What is the default, generally preferred graph representation for real-world (typically sparse) graphs?
   a) Adjacency matrix
   b) Adjacency list
   c) A sorted array of edges
   d) A binary search tree

5. What critical requirement do graphs introduce for traversal that trees (Chapter 8) never needed?
   a) A `visited` set to prevent infinite loops caused by cycles
   b) Recursion is required
   c) Sorting the vertices first
   d) Using a hash function

6. What underlying structure powers DFS?
   a) A queue
   b) A stack (explicit or the recursive call stack)
   c) A heap
   d) A hash table

7. What underlying structure powers BFS?
   a) A stack
   b) A queue
   c) A binary search tree
   d) A trie

8. What is the single most important guarantee that BFS provides which DFS does not?
   a) BFS uses less memory
   b) BFS guarantees the shortest path in an unweighted graph
   c) BFS always terminates while DFS doesn't
   d) BFS works on directed graphs only

9. In BFS, when should a vertex be marked as `visited`?
   a) When it's dequeued
   b) When it's enqueued
   c) It doesn't matter
   d) Only after the entire BFS completes

10. In iterative DFS, why must `visited` be checked again upon popping, not just before pushing?
    a) It's unnecessary; checking before pushing is sufficient
    b) A vertex can be pushed multiple times by different neighbors before being popped and processed
    c) JavaScript requires double-checking for arrays
    d) It prevents stack overflow

11. What defines a "connected component" in an undirected graph?
    a) A single vertex with no edges
    b) A maximal set of vertices where every vertex is reachable from every other vertex within the set
    c) The entire graph, always
    d) Any cycle in the graph

12. How do you count the number of connected components in a graph?
    a) Count the total number of edges
    b) Loop through all vertices, launching a fresh DFS/BFS from each unvisited one, counting launches
    c) Check if the graph has any cycles
    d) Divide the number of vertices by 2

13. In the "number of islands" problem, what plays the role of graph vertices and edges?
    a) Each row is a vertex; edges connect rows
    b) Each grid cell is a vertex; edges connect adjacent cells (up/down/left/right)
    c) There is no graph structure involved
    d) Only '1' cells count as vertices, with no edges

14. Why must undirected cycle detection specifically exclude the immediate parent vertex?
    a) It's an arbitrary implementation choice
    b) Every undirected edge is bidirectional, so the parent naturally appears as a neighbor, which is not a cycle
    c) Parent vertices are never part of cycles
    d) JavaScript requires this exclusion syntactically

15. What additional structure does directed cycle detection need beyond a simple `visited` set?
    a) A second graph
    b) A `recursionStack` tracking vertices on the CURRENT DFS path
    c) A priority queue
    d) A hash function

16. Why can a directed graph have a vertex visited via two different non-cyclic paths (a "diamond" shape)?
    a) This is impossible in directed graphs
    b) Directed edges allow multiple distinct paths to converge on the same vertex without forming a cycle
    c) It only happens in undirected graphs
    d) It indicates a bug, not a valid graph shape

17. What is the time complexity of checking if an edge exists using an adjacency matrix?
    a) O(V)
    b) O(E)
    c) O(1)
    d) O(V + E)

18. What is the time complexity of iterating all neighbors of a vertex using an adjacency list?
    a) O(V), always
    b) O(degree of that vertex)
    c) O(V²)
    d) O(1)

19. Why is a `Map` (Chapter 4) a natural fit for implementing an adjacency list?
    a) Maps can only store numbers
    b) Maps provide O(1) average-case lookup from vertex to its neighbor list, for any key type
    c) Maps automatically detect cycles
    d) Arrays cannot store lists of neighbors

20. What technique reconstructs the shortest path after running BFS, without storing full paths in the queue?
    a) Re-running BFS from the end vertex
    b) Tracking a `parent` map during BFS, then walking backward from the end vertex once found
    c) Sorting all vertices by distance
    d) Using a stack instead of a queue

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-a, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-c, 18-b, 19-b, 20-b

---

## 11.14 20 Coding Problems

**Easy**

1. Implement a `Graph` class with `addEdge` and `getNeighbors`, from memory (section 11.2.1).
2. Implement recursive DFS from memory (section 11.3.1).
3. Implement BFS from memory (section 11.4), being careful about when `visited` is marked.
4. Write a function to count the total number of vertices and edges in a graph.
5. Write a function to check if two given vertices are directly connected by an edge.

**Medium**

6. Implement `countConnectedComponents` from memory (section 11.5).
7. Implement `numIslands` (the grid-as-implicit-graph pattern) from memory (section 11.5.1).
8. Implement `shortestPathEfficient` using the parent-map reconstruction technique from memory (section 11.4.1).
9. Implement both `hasCycleUndirected` and `hasCycleDirected` from memory (section 11.6), and write a comment explaining precisely why their logic differs.
10. Given a graph, write a function to determine if it is bipartite (can be colored with 2 colors such that no two adjacent vertices share a color), using BFS.

**Hard**

11. Given a grid representing a maze (open and blocked cells), find the shortest path from a start cell to an end cell using BFS, returning the path length or -1 if unreachable.
12. Implement "Rotting Oranges": given a grid where some cells are rotten oranges, some are fresh, and some are empty, determine the minimum time for all fresh oranges to rot (rot spreads to orthogonally adjacent fresh oranges each minute), using multi-source BFS (starting BFS from ALL rotten oranges simultaneously).
13. Given a directed graph representing a course prerequisite system, determine if it's possible to complete all courses (i.e., no circular dependencies) using the directed cycle detection technique from section 11.6.2.
14. Given an undirected graph, determine the minimum number of edges to add to make the entire graph connected (hint: relates directly to the connected components count).
15. Implement a function to clone a graph (deep copy every vertex and edge) given a reference to a single starting vertex, using BFS or DFS combined with a `Map` from original vertices to their clones.

**Interview Level**

16. **(Google-level)** Given a graph representing web pages and hyperlinks, implement a basic web crawler simulation using BFS to explore pages up to a maximum depth, avoiding revisiting already-crawled pages.
17. **(Amazon-level)** Given a graph representing a delivery network (warehouses and roads, unweighted for this problem), find the minimum number of hops needed to deliver a package from a source warehouse to a destination, using BFS.
18. **(Microsoft-level)** Given a 2D grid representing an office floor plan, implement "flood fill" to simulate paint spreading from a clicked cell to all connected cells of the same color, using DFS or BFS.
19. **(Meta-level)** Given a social network graph, implement a "degrees of separation" feature that finds the shortest connection path between two users (a direct application of BFS shortest-path, with real product framing).
20. **(Netflix-level)** Design a content recommendation graph where videos are connected if users who watched one frequently watched the other; implement a function finding all videos reachable within N "hops" of a given video, using BFS with a depth limit, and discuss in comments how this connects to real recommendation-system design.

---

## 11.15 5 Interview Questions

1. "How would you represent a graph in code, and why would you choose that representation?" (Tests the adjacency-list-vs-matrix trade-off reasoning, the chapter's central decision.)
2. "Walk me through BFS and DFS, and tell me which one guarantees the shortest path — and why." (Tests the single most tested fact in the chapter.)
3. "Why does graph traversal need a `visited` set when tree traversal (Chapter 8) didn't strictly require one?" (Tests understanding of cycles as the new correctness concern graphs introduce.)
4. "How would you detect a cycle in a directed graph, and how is that different from an undirected graph?" (Tests the recursionStack-vs-parent-exclusion distinction.)
5. "How would you solve 'number of islands' on a 2D grid?" (Tests the implicit-graph recognition skill and direct BFS/DFS application.)

---

## 11.16 3 Real Projects

1. **Complete Graph Library**: Build a `Graph` class supporting both adjacency-list and adjacency-matrix backing (switchable), with DFS, BFS, connected-components, and both cycle-detection algorithms, plus a self-check script verifying correctness on hand-constructed cyclic/acyclic, directed/undirected test graphs.
2. **Maze Solver**: Build a Node.js CLI tool that takes a text-based maze (using characters for walls/open paths/start/end) and finds the shortest path using BFS, printing the path visually overlaid on the maze — a direct, satisfying application of section 11.4's shortest-path technique.
3. **Dependency Graph Validator**: Build a small tool that reads a list of package/module dependencies (e.g., from a simplified `package.json`-like format) and uses directed cycle detection (section 11.6.2) to detect and report circular dependencies — a genuinely practical, real-world-flavored application directly setting up Chapter 13's topological sort.

---

## 11.17 Further Reading

- MDN Web Docs: "Map" (revisited yet again) for the adjacency list's underlying storage guarantees.
- Steven Skiena, *The Algorithm Design Manual*, chapters on graph traversal, for extensive additional real-world graph modeling war stories.
- Search "graph theory Euler and Hamilton" for the historical origins of graph theory (Euler's Seven Bridges of Königsberg problem is the field's founding puzzle).
- LeetCode's "Graph," "Union Find," and "Breadth-First Search" problem tags, for extensive additional practice directly extending this chapter's patterns.

---

*End of Chapter 11. Next: Chapter 12 will cover Shortest Path Algorithms — Dijkstra's algorithm (leveraging Chapter 9's heap for weighted graphs), Bellman-Ford (handling negative weights), and Floyd-Warshall (all-pairs shortest paths), directly building on this chapter's BFS foundation for the unweighted case.*

**Say "Continue to the next chapter" when ready.**
