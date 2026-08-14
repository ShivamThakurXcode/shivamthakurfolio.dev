# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 13: Topological Sort & Minimum Spanning Trees

---

## 13.0 Two Distinct Problems, One Chapter

This chapter covers two genuinely separate graph problems that happen to share a natural pairing in most DSA curricula: **topological sort** (ordering tasks that have dependencies — directly extending Chapter 11's directed-cycle-detection machinery) and **minimum spanning trees** (finding the cheapest way to connect every vertex in a weighted graph — a direct sibling of Chapter 12's shortest-path algorithms, but optimizing a genuinely different quantity). We treat them as two focused halves rather than forcing an artificial connection between them.

---

## PART A: TOPOLOGICAL SORT

## 13.1 The Problem: Ordering Things With Dependencies

**Definition:** A topological sort of a Directed Acyclic Graph (DAG) is a linear ordering of its vertices such that for every directed edge `u -> v`, vertex `u` comes before vertex `v` in the ordering.

### Real-Life Analogy: Getting Dressed in the Correct Order

You can't put on shoes before socks. You can't put on a jacket before a shirt. These are **dependency constraints** — "socks must come before shoes" is exactly a directed edge `socks -> shoes` in a dependency graph. Topological sort answers: **"given all these pairwise 'must come before' rules, what's a valid overall order that satisfies every single one simultaneously?"** This is precisely the same shape as course prerequisites ("Calculus I before Calculus II"), build systems (compile module A before module B that imports it), and task scheduling (step 3 needs the output of step 1).

### ASCII Visualization

```
Dependency graph (course prerequisites):

    Intro --> DataStructures --> Algorithms
      |                              ^
      +--------> Discrete Math ------+

Valid topological orderings (there can be MULTIPLE valid answers!):
  Intro, DataStructures, Discrete Math, Algorithms
  Intro, Discrete Math, DataStructures, Algorithms

Both are valid: every edge's "before" vertex genuinely appears earlier
in the list than its "after" vertex, in both orderings.
```

### ⚠ Common Mistake: Topological Sort Only Exists for DAGs

**A graph with a cycle has NO valid topological ordering — full stop.** If `A` must come before `B`, and `B` must come before `A` (a cycle), there is no linear order satisfying both simultaneously; it's a logical contradiction (exactly like a real-world circular dependency: "module A needs module B, but module B also needs module A" is an unbuildable system). This is precisely why **topological sort algorithms must detect cycles as a first-class outcome**, not an afterthought — directly reusing Chapter 11's directed cycle detection (section 11.6.2).

---

## 13.2 Kahn's Algorithm (BFS-Based Topological Sort)

**Definition:** Kahn's algorithm repeatedly removes vertices with **in-degree zero** (no remaining unprocessed prerequisites) from the graph, appending them to the result, until either every vertex is processed (success) or no zero-in-degree vertex remains while vertices are still unprocessed (a cycle exists).

### 🧠 Memory Trick: "Eat the Easiest Task First"

Think of in-degree as "number of unfinished prerequisites." Kahn's algorithm is exactly the natural human strategy for tackling a to-do list with dependencies: **repeatedly do whatever task currently has zero remaining blockers**, and doing it might unblock other tasks (decrementing their remaining-blocker count), which you then become eligible to do next.

```javascript
function topologicalSortKahn(graph) {
  // graph: Map<vertex, Array<neighbor>>  (directed edges: vertex -> neighbor)
  const inDegree = new Map();

  for (const vertex of graph.keys()) {
    inDegree.set(vertex, 0);
  }

  for (const [vertex, neighbors] of graph) {
    for (const neighbor of neighbors) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
    }
  }

  // Start with every vertex that has ZERO remaining prerequisites
  const queue = []; // Chapter 6's Queue, illustrated with a plain array here
  for (const [vertex, degree] of inDegree) {
    if (degree === 0) queue.push(vertex);
  }

  const result = [];

  while (queue.length > 0) {
    const current = queue.shift(); // O(n) with a plain array — use Ch.6's real Queue in production!
    result.push(current);

    for (const neighbor of graph.get(current) || []) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);

      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor); // this neighbor's LAST blocker was just resolved!
      }
    }
  }

  if (result.length !== graph.size) {
    throw new Error('Graph contains a cycle — no valid topological ordering exists');
  }

  return result;
}
```

### Dry Run

```
Graph: Intro -> [DataStructures, DiscreteMath]
       DataStructures -> [Algorithms]
       DiscreteMath -> [Algorithms]
       Algorithms -> []

In-degree calculation:
  Intro: 0 (nothing points TO it)
  DataStructures: 1 (from Intro)
  DiscreteMath: 1 (from Intro)
  Algorithms: 2 (from DataStructures AND DiscreteMath)

Initial queue (in-degree 0): [Intro]

Dequeue Intro. result=[Intro]
  neighbor DataStructures: inDegree 1->0. ZERO! queue=[DataStructures]
  neighbor DiscreteMath: inDegree 1->0. ZERO! queue=[DataStructures, DiscreteMath]

Dequeue DataStructures. result=[Intro, DataStructures]
  neighbor Algorithms: inDegree 2->1. NOT zero yet -> don't enqueue

Dequeue DiscreteMath. result=[Intro, DataStructures, DiscreteMath]
  neighbor Algorithms: inDegree 1->0. ZERO! queue=[Algorithms]

Dequeue Algorithms. result=[Intro, DataStructures, DiscreteMath, Algorithms]
  no neighbors

result.length (4) === graph.size (4) -> SUCCESS, no cycle.
Final order: [Intro, DataStructures, DiscreteMath, Algorithms]
```

### 🎯 Interview Pattern: Kahn's Algorithm Doubles as Cycle Detection, for Free

Notice the final check: **`if (result.length !== graph.size)`.** This is a genuinely elegant, important detail: **if a cycle exists somewhere in the graph, the vertices involved in (or downstream of) that cycle will never reach in-degree zero** (since their prerequisite chain never fully resolves — a cycle means each vertex is *always* waiting on another vertex that's *also* still waiting), so they never get added to `result`. **Kahn's algorithm doesn't need a separate cycle-detection pass (unlike Chapter 11's DFS-based approach, which needed an explicit `recursionStack`) — the length mismatch at the end IS the cycle detector, completely free of charge.** This is a strong, specific thing to mention if asked to compare topological sort approaches.

---

## 13.3 DFS-Based Topological Sort (The Alternative Approach)

**Definition:** DFS-based topological sort performs a standard DFS, and appends each vertex to the result **only after all of its descendants have been fully processed** (i.e., on the way back up, in postorder — directly reusing Chapter 8's postorder traversal concept), then reverses the final result.

```javascript
function topologicalSortDFS(graph) {
  const visited = new Set();
  const recursionStack = new Set(); // reused directly from Chapter 11's cycle detection!
  const result = [];

  function dfs(vertex) {
    visited.add(vertex);
    recursionStack.add(vertex);

    for (const neighbor of graph.get(vertex) || []) {
      if (recursionStack.has(neighbor)) {
        throw new Error('Graph contains a cycle — no valid topological ordering exists');
      }
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }

    recursionStack.delete(vertex);
    result.push(vertex); // POSTORDER: add AFTER all descendants are fully processed
  }

  for (const vertex of graph.keys()) {
    if (!visited.has(vertex)) {
      dfs(vertex);
    }
  }

  return result.reverse(); // reverse the postorder result to get the topological order!
}
```

### 🧠 Memory Trick: Why Postorder, Then Reverse?

This is the single trickiest conceptual leap in DFS-based topological sort, worth building real intuition for: **a vertex is only "finished" (pushed to `result`) after every single thing it depends on (its descendants in the DFS tree) has *already* been finished.** This means the very *last* vertex to finish overall must be a vertex with no remaining dependents relying on it further up the chain — i.e., it belongs at the very *end* of a valid topological order. Since DFS naturally finishes "deepest dependency chains" first (postorder means children finish before parents), the raw postorder result is the topological order **backward** — reversing it puts things right-side up: prerequisites first, dependents last.

### Dry Run (Same Graph as Section 13.2)

```
Graph: Intro -> [DataStructures, DiscreteMath]
       DataStructures -> [Algorithms]
       DiscreteMath -> [Algorithms]
       Algorithms -> []

dfs(Intro):
  visited={Intro}, recursionStack={Intro}
  neighbor DataStructures: not visited -> dfs(DataStructures)
    visited={Intro,DataStructures}, recursionStack={Intro,DataStructures}
    neighbor Algorithms: not visited -> dfs(Algorithms)
      visited={...,Algorithms}, recursionStack={...,Algorithms}
      no neighbors
      recursionStack removes Algorithms. result.push(Algorithms) -> result=[Algorithms]
    recursionStack removes DataStructures. result.push(DataStructures) -> result=[Algorithms, DataStructures]
  neighbor DiscreteMath: not visited -> dfs(DiscreteMath)
    visited={...,DiscreteMath}, recursionStack={Intro,DiscreteMath}
    neighbor Algorithms: ALREADY VISITED, and NOT in recursionStack (it was removed!) -> fine, skip
    recursionStack removes DiscreteMath. result.push(DiscreteMath) -> result=[Algorithms, DataStructures, DiscreteMath]
  recursionStack removes Intro. result.push(Intro) -> result=[Algorithms, DataStructures, DiscreteMath, Intro]

Reverse: [Intro, DiscreteMath, DataStructures, Algorithms]

This is a DIFFERENT valid ordering than Kahn's algorithm produced (Intro, DataStructures,
DiscreteMath, Algorithms) — and BOTH are correct! Remember: topological sort results
are not unique in general; multiple valid orderings can exist for the same DAG.
```

### 📌 Quick Revision: Kahn's vs. DFS-Based Topological Sort

| | Kahn's Algorithm (BFS-based) | DFS-Based |
|---|---|---|
| Underlying structure | Queue (in-degree zero vertices) | Stack/recursion (postorder, then reverse) |
| Cycle detection | Free — check if `result.length !== graph.size` | Needs explicit `recursionStack` tracking |
| Intuition | "Process whatever has no remaining blockers" | "Finish all dependents before yourself, then reverse" |
| Common use | Preferred when cycle detection is also needed | Preferred when already doing DFS for other reasons in the same pass |

### 🔥 Interview Tip

Both algorithms are equally valid and equally likely to be asked. **Kahn's algorithm is generally considered slightly more intuitive to explain out loud** ("process the currently-unblocked tasks, repeat"), and its free cycle detection is a genuine practical advantage worth mentioning. The DFS-based approach is worth knowing specifically because it reuses the exact `recursionStack` technique from Chapter 11 verbatim, reinforcing that pattern's reusability across problems.

---

## PART B: MINIMUM SPANNING TREES

## 13.4 The Problem: Connecting Everything as Cheaply as Possible

**Definition:** A spanning tree of a connected, undirected graph is a subgraph that includes every vertex, connected, with no cycles (exactly `V-1` edges for `V` vertices — the minimum possible to keep everything connected). A **Minimum Spanning Tree (MST)** is the spanning tree whose total edge weight is smallest among all possible spanning trees.

### Real-Life Analogy: Wiring a Neighborhood for Internet Access

Imagine an internet company needs to connect every house in a neighborhood with fiber cable, where the cost of laying cable between any two specific houses is known (and varies — some pairs are close together, cheap to connect; others are far apart, expensive). The company wants every house connected to the network **somehow** (not necessarily directly to every other house — indirect connections through other houses are fine), at the **lowest total cable cost.** This is exactly the MST problem: find the cheapest set of connections that links everything together, using no more connections than strictly necessary (any "extra" connection beyond a tree's `V-1` edges would only add cost without adding any new connectivity, since a spanning tree is already fully connected by definition).

### 🎯 Why This Is Genuinely Different From Shortest Path (Chapter 12)

This is worth being crisp about, since the two problems are frequently confused: **shortest path (Chapter 12) minimizes the total weight of a path between two SPECIFIC vertices. MST minimizes the total weight of connecting ALL vertices together, with no specific "start" or "end" in mind.** An MST doesn't promise the shortest route between any particular pair of vertices — it only promises the cheapest way to make sure everything is reachable from everything else, given the freedom to route however is globally cheapest.

---

## 13.5 Kruskal's Algorithm: Greedy Edge Selection

**Definition:** Kruskal's algorithm builds an MST by sorting all edges by weight (ascending), then greedily adding each edge to the growing MST **unless it would create a cycle**, until `V-1` edges have been added.

### 🧠 Memory Trick: "Cheapest First, Skip What Would Loop"

Kruskal's strategy in one sentence: **sort every possible connection from cheapest to most expensive, and greedily take each one, unless it would connect two things that are already connected (which would just waste money on a redundant, cycle-forming connection).**

```javascript
function kruskalMST(vertices, edges) {
  // edges: Array<[u, v, weight]>
  const sortedEdges = [...edges].sort((a, b) => a[2] - b[2]); // ascending by weight

  const parent = new Map(vertices.map(v => [v, v])); // Union-Find setup — full detail in Chapter 14!

  function find(v) {
    if (parent.get(v) !== v) {
      parent.set(v, find(parent.get(v))); // path compression (previewed here, formalized next chapter)
    }
    return parent.get(v);
  }

  function union(u, v) {
    const rootU = find(u);
    const rootV = find(v);
    if (rootU === rootV) return false; // already connected — adding this edge would create a CYCLE
    parent.set(rootU, rootV);
    return true;
  }

  const mstEdges = [];
  let totalWeight = 0;

  for (const [u, v, weight] of sortedEdges) {
    if (union(u, v)) {          // union() returns false if u and v are ALREADY connected
      mstEdges.push([u, v, weight]);
      totalWeight += weight;
    }

    if (mstEdges.length === vertices.length - 1) break; // MST is complete!
  }

  return { mstEdges, totalWeight };
}
```

### 🚀 Pro Tip: This Chapter Previews Chapter 14

Notice the `find`/`union` functions above — this is the **Union-Find (Disjoint Set Union)** data structure, which gets a full, dedicated chapter immediately after this one. We use a simplified version here specifically because **Kruskal's algorithm is the single most common, most natural motivating use case for Union-Find** — efficiently answering "are these two vertices already connected?" is precisely the question Union-Find is purpose-built to answer in near-constant time. Understanding *why* Kruskal's needs this capability now will make Chapter 14's deep dive feel like a natural continuation rather than an abrupt new topic.

### Dry Run

```
Vertices: A, B, C, D
Edges: [A,B,1], [B,C,4], [A,C,3], [C,D,2], [B,D,5]

Sorted by weight: [A,B,1], [C,D,2], [A,C,3], [B,C,4], [B,D,5]

parent = {A:A, B:B, C:C, D:D}  (each vertex is its own separate group initially)

Edge [A,B,1]: find(A)=A, find(B)=B. Different! union(A,B) -> parent={A:B,B:B,C:C,D:D}
  mstEdges=[[A,B,1]], totalWeight=1

Edge [C,D,2]: find(C)=C, find(D)=D. Different! union(C,D) -> parent={A:B,B:B,C:D,D:D}
  mstEdges=[[A,B,1],[C,D,2]], totalWeight=3

Edge [A,C,3]: find(A)=B (via A->B), find(C)=D (via C->D). Different! union(A,C) -> connects the two groups!
  parent={A:B,B:D,C:D,D:D}  (B's group now merged under D)
  mstEdges=[[A,B,1],[C,D,2],[A,C,3]], totalWeight=6
  mstEdges.length (3) === vertices.length-1 (3) -> DONE!

(Remaining edges [B,C,4] and [B,D,5] are never even checked — we already have
our V-1=3 edges, and adding more would only create cycles anyway.)

Final MST: A-B(1), C-D(2), A-C(3), total weight = 6
```

### 📌 Quick Revision: Kruskal's Complexity

- **Time**: **O(E log E)** — dominated by sorting the edges; the Union-Find operations themselves are nearly O(1) each (a "nearly constant" bound formalized precisely in Chapter 14 as the inverse Ackermann function).
- **Space**: O(V + E) for the Union-Find structure and edge list.

---

## 13.6 Prim's Algorithm: Greedy Vertex Expansion (A Direct Sibling of Dijkstra)

**Definition:** Prim's algorithm builds an MST by starting from an arbitrary vertex and repeatedly adding the **cheapest edge that connects the growing tree to a new, not-yet-included vertex**, until every vertex is included.

### 🎯 Why This Should Feel Extremely Familiar

Compare this description to Chapter 12's Dijkstra's algorithm: both use a min-heap (Chapter 9) to repeatedly select "the cheapest next thing" and expand a frontier outward. **The crucial difference:** Dijkstra tracks the cheapest **total distance from the source** to each vertex; Prim's tracks the cheapest **single edge connecting the current tree to each outside vertex**, with no notion of "total distance from a source" at all — a genuinely different quantity being greedily minimized, despite the nearly identical-looking code structure.

```javascript
function primMST(graph, startVertex) {
  // graph: Map<vertex, Array<[neighbor, weight]>>
  const visited = new Set([startVertex]);
  const minHeap = new Heap((a, b) => a.weight - b.weight); // Chapter 9's Heap, again!

  for (const [neighbor, weight] of graph.get(startVertex) || []) {
    minHeap.insert({ from: startVertex, to: neighbor, weight });
  }

  const mstEdges = [];
  let totalWeight = 0;

  while (minHeap.size > 0 && visited.size < graph.size) {
    const { from, to, weight } = minHeap.extract();

    if (visited.has(to)) continue; // this edge would connect to an ALREADY-included vertex — skip (cycle)

    visited.add(to);
    mstEdges.push([from, to, weight]);
    totalWeight += weight;

    for (const [neighbor, edgeWeight] of graph.get(to) || []) {
      if (!visited.has(neighbor)) {
        minHeap.insert({ from: to, to: neighbor, weight: edgeWeight });
      }
    }
  }

  return { mstEdges, totalWeight };
}
```

### Dry Run

```
Graph (same edges as Kruskal's example, undirected):
A -> [[B,1],[C,3]]
B -> [[A,1],[C,4]]
C -> [[A,3],[B,4],[D,2]]
D -> [[C,2]]

primMST(graph, 'A'):

visited={A}, heap gets A's edges: [{A,B,1}, {A,C,3}]

Extract {A,B,1}. B not visited. visited={A,B}. mstEdges=[[A,B,1]], weight=1
  B's edges: [A,1](A visited, skip adding—wait, we DO add it, filter happens on extraction)
  Actually we only push if neighbor not YET visited at push time: A IS visited, skip.
             C not visited -> push {B,C,4}
  heap now: [{A,C,3}, {B,C,4}]

Extract {A,C,3}. C not visited. visited={A,B,C}. mstEdges=[[A,B,1],[A,C,3]], weight=4
  C's edges: A visited-skip, B visited-skip, D not visited -> push {C,D,2}
  heap now: [{C,D,2}, {B,C,4}(now stale-ish, but harmless, will be skipped if C already visited on extraction)]

Extract {C,D,2}. D not visited. visited={A,B,C,D}. mstEdges=[[A,B,1],[A,C,3],[C,D,2]], weight=6
  visited.size(4) === graph.size(4) -> loop ends

Final MST: A-B(1), A-C(3), C-D(2), total weight = 6

SAME total weight as Kruskal's (6)! Different specific edge set in general is possible
(multiple valid MSTs can exist when weights tie), but the TOTAL weight of any valid
MST for a given graph is always the same, provably.
```

### 📌 Quick Revision: Prim's Complexity

- **Time**: **O(E log V)** with a binary heap — very similar to Dijkstra's O((V+E) log V), for the same underlying heap-based-frontier-expansion reason.
- **Space**: O(V + E).

### 🎯 Interview Pattern: Kruskal's vs. Prim's — When to Choose Which

| | Kruskal's | Prim's |
|---|---|---|
| Strategy | Sort ALL edges globally, greedily add if no cycle | Grow ONE connected tree outward, always taking the cheapest connecting edge |
| Best for | **Sparse graphs** (fewer edges — sorting cost dominates, and E is small) | **Dense graphs** (many edges — heap-based frontier expansion handles this well, closely tracking Dijkstra's structure) |
| Needs | Union-Find (Chapter 14) | Min-heap (Chapter 9) |
| Feels like | A generalization of "greedily pick cheapest, skip cycles" | A direct sibling of Dijkstra's algorithm (Chapter 12) |

### 🔥 Interview Tip

State this comparison explicitly and unprompted if asked to implement an MST algorithm without further specification: **"I'll use Kruskal's if the graph is sparse, since sorting E edges dominates and Union-Find keeps cycle-checking nearly constant-time; I'll use Prim's if the graph is dense, since it behaves like Dijkstra with a min-heap, more naturally scaling with vertex-degree rather than requiring a full edge sort upfront."** This is a genuine, meaningful engineering trade-off, not an arbitrary stylistic choice, and demonstrating awareness of it is a strong signal.

---

## 13.7 Edge Cases and Gotchas Checklist

1. **Disconnected graphs have no spanning tree at all** (and no valid single topological order spanning all components in a meaningful combined sense, though each component can independently be topologically sorted if it's itself a DAG) — always verify/state your algorithm's behavior on disconnected input.
2. **Multiple valid topological orders can exist** — never assume there's a single "correct" answer; verify correctness by checking the *ordering property* holds (every edge's source precedes its destination), not by comparing to one specific expected sequence.
3. **Cycles make topological sort undefined** — always check for and handle this explicitly (Kahn's free length-check, or DFS's `recursionStack`).
4. **MST weight is unique; the specific edge set may not be** — if edge weights contain ties, multiple different MSTs with the *same total weight* can exist; don't assume a single canonical MST when comparing outputs.
5. **MST algorithms assume undirected graphs** — Kruskal's and Prim's, as covered here, are defined for undirected graphs; "minimum spanning arborescence" is the (more complex, out of scope here) directed-graph analogue, worth knowing exists if a directed MST-shaped question arises.
6. **Negative weights are actually FINE for MST** (unlike Dijkstra's requirement in Chapter 12!) — since MST algorithms only compare edge weights relative to each other for greedy selection, never accumulate a "distance from source" the way Dijkstra does, negative weights cause no correctness issues at all. This is a genuinely interesting, easy-to-miss contrast worth mentioning explicitly.

---

## 13.8 Chapter Summary

This chapter covered two related-but-distinct graph problems building directly on Chapters 9, 11, and previewing Chapter 14. **Topological sort** answers "what linear ordering satisfies every 'must come before' dependency constraint in a DAG," and only exists at all for acyclic graphs — a direct consequence of Chapter 11's cycle-detection lesson, since a cycle represents a logical contradiction in dependency terms. We covered both **Kahn's algorithm** (BFS-based, repeatedly processing zero-in-degree vertices, with an elegant, free cycle-detection side effect via a simple length check) and the **DFS-based approach** (postorder traversal, directly reusing Chapter 8's postorder concept and Chapter 11's `recursionStack` cycle-detection technique verbatim, followed by a final reversal whose necessity we built real intuition for: DFS naturally finishes the deepest dependency chains first, so the raw postorder result is the topological order turned backward).

We then turned to **Minimum Spanning Trees**, carefully distinguishing this problem from Chapter 12's shortest path: MST minimizes the total cost of connecting *all* vertices together with no specific source or destination in mind, a genuinely different optimization target from "cheapest route between two specific points." We covered **Kruskal's algorithm** (globally sort all edges, greedily add each unless it would form a cycle), which directly previewed the next chapter by requiring an efficient "are these two vertices already connected?" check — precisely the question **Union-Find (Disjoint Set Union)** exists to answer efficiently, making Chapter 14 a natural, motivated continuation rather than an arbitrary new topic. We covered **Prim's algorithm** as a direct structural sibling of Chapter 12's Dijkstra — both use a min-heap to greedily expand a frontier — while being precise about the genuinely different quantity each minimizes (total distance-from-source for Dijkstra, versus cheapest single connecting edge for Prim's, with no source-distance concept at all).

We closed with the practical decision framework between Kruskal's (better for sparse graphs, since edge-sorting cost dominates and stays manageable) and Prim's (better for dense graphs, since its heap-based frontier expansion scales more naturally with vertex degree), and flagged a genuinely interesting, easy-to-miss contrast with Chapter 12: **MST algorithms have no issue with negative edge weights whatsoever**, unlike Dijkstra's strict non-negative-weights requirement, precisely because MST's greedy comparisons never accumulate a "distance from source" the way shortest-path algorithms do.

---

## 13.9 Revision Notes

- Topological sort produces a linear ordering respecting all "must come before" dependency edges — it exists only for DAGs; cycles make it logically undefined.
- Kahn's algorithm (BFS-based, zero-in-degree processing) gets cycle detection for free via a final length check; DFS-based topological sort needs an explicit `recursionStack` and requires reversing the postorder result.
- MST minimizes the cost of connecting ALL vertices together — a genuinely different optimization target from shortest path's "cheapest route between two specific vertices."
- Kruskal's algorithm globally sorts edges and greedily adds them unless they'd form a cycle, directly motivating the need for efficient connectivity checks (Union-Find, Chapter 14).
- Prim's algorithm is a direct structural sibling of Dijkstra (heap-based frontier expansion), but minimizes "cheapest single connecting edge" rather than "total distance from source."
- Kruskal's suits sparse graphs (sorting dominates); Prim's suits dense graphs (heap-based expansion scales with vertex degree).
- MST algorithms tolerate negative edge weights with no correctness issues, unlike Dijkstra's strict non-negative requirement — a notable, easy-to-miss contrast between the two chapters.

---

## 13.10 Mind Map (ASCII)

```
                      TOPOLOGICAL SORT & MST
                              |
        +---------------------+----------------------+
        |                                             |
  TOPOLOGICAL SORT                          MINIMUM SPANNING TREE
  (DAGs only!)                              (connect ALL vertices cheaply --
        |                                    DIFFERENT from shortest path!)
   +----+----+                                        |
   |         |                              +----------+----------+
 KAHN'S    DFS-BASED                        |                     |
 (BFS,     (postorder,                  KRUSKAL'S              PRIM'S
 in-degree  THEN REVERSE --              (sort ALL edges,      (heap-based,
 zero       "finish deepest              greedily add if       DIRECT SIBLING
 processing) chains first")              no cycle forms)       of DIJKSTRA --
   |             |                            |                but minimizes
 FREE cycle   needs explicit            NEEDS UNION-FIND       "cheapest edge,"
 detection    recursionStack            (Ch.14 preview!)       not "distance
 (length      (Ch.11 reused                  |                 from source")
 mismatch)    verbatim)                 O(E log E)                  |
                                         (sort dominates)       O(E log V)
                                              |                      |
                                        Best: SPARSE graphs   Best: DENSE graphs
                                              |                      |
                                        MST tolerates NEGATIVE weights fine
                                        (unlike Dijkstra's strict requirement!)
```

---

## 13.11 Cheat Sheet

```
TOPOLOGICAL SORT
====================
Exists ONLY for DAGs (Directed Acyclic Graphs) -- cycles make it undefined.

Kahn's (BFS):  compute in-degree for all vertices -> queue up zero-in-degree ones ->
               repeatedly dequeue, decrement neighbors' in-degree, enqueue new zeros ->
               if result.length != V, a CYCLE exists (free detection!)

DFS-based:     standard DFS, push vertex to result in POSTORDER (after all descendants) ->
               REVERSE the final result -> use recursionStack (Ch.11) to detect cycles

MINIMUM SPANNING TREE (undirected graphs)
=============================================
Goal: connect ALL vertices at minimum TOTAL cost (NOT shortest path between 2 points!)

Kruskal's:  sort ALL edges by weight -> greedily add each UNLESS it forms a cycle
            (check via Union-Find, Ch.14) -> stop at V-1 edges
            Time: O(E log E). Best for SPARSE graphs.

Prim's:     start at any vertex -> min-heap (Ch.9) of edges leaving the current tree ->
            repeatedly extract cheapest edge to a NOT-YET-INCLUDED vertex -> add it, expand frontier
            Time: O(E log V). Best for DENSE graphs. Structurally = Dijkstra (Ch.12), different goal.

KEY CONTRAST WITH CHAPTER 12
================================
MST tolerates NEGATIVE edge weights fine (greedy comparisons never accumulate
"distance from source"). Dijkstra REQUIRES non-negative weights. Don't confuse the two!
```

---

## 13.12 Key Takeaways

1. Topological sort only exists for DAGs — cycles make a valid dependency ordering logically impossible.
2. Kahn's algorithm gets cycle detection for free (a length mismatch); DFS-based sort needs an explicit recursionStack and a final reversal.
3. MST minimizes total connection cost across all vertices — a fundamentally different goal from shortest path's point-to-point optimization.
4. Kruskal's (sort + Union-Find) suits sparse graphs; Prim's (heap-based, Dijkstra's sibling) suits dense graphs.
5. MST algorithms handle negative weights without issue, unlike Dijkstra's strict non-negative requirement — know this contrast cold.

---

## 13.13 20 Multiple Choice Questions

1. What condition must a graph satisfy for a topological sort to exist?
   a) It must be undirected
   b) It must be a Directed Acyclic Graph (DAG)
   c) It must be weighted
   d) It must have exactly one vertex with in-degree zero

2. What does Kahn's algorithm repeatedly process?
   a) Vertices with the highest in-degree
   b) Vertices with in-degree zero (no remaining unprocessed prerequisites)
   c) The heaviest edges
   d) Vertices in alphabetical order

3. How does Kahn's algorithm detect a cycle?
   a) It cannot detect cycles at all
   b) If the final result's length doesn't match the total vertex count, a cycle exists
   c) It requires a separate DFS pass
   d) It throws an error immediately upon encountering any edge

4. In DFS-based topological sort, when is a vertex added to the result list?
   a) Immediately upon being visited (preorder)
   b) After all of its descendants have been fully processed (postorder)
   c) Only if it has no neighbors
   d) In alphabetical order regardless of DFS

5. Why must the DFS-based topological sort result be reversed at the end?
   a) It's an arbitrary convention
   b) DFS naturally finishes the deepest dependency chains first, so raw postorder is backward
   c) JavaScript arrays require reversal after DFS
   d) It only needs reversal for undirected graphs

6. What data structure does DFS-based topological sort reuse from Chapter 11's cycle detection?
   a) A min-heap
   b) A recursionStack
   c) A Union-Find structure
   d) A trie

7. What problem does a Minimum Spanning Tree (MST) solve?
   a) The shortest path between two specific vertices
   b) The cheapest way to connect all vertices together
   c) The longest path in a graph
   d) Sorting vertices topologically

8. How is MST fundamentally different from Chapter 12's shortest path problem?
   a) They are actually the same problem
   b) MST connects ALL vertices at minimum total cost; shortest path optimizes a route between two specific vertices
   c) MST only works on directed graphs
   d) Shortest path doesn't use weights

9. What is the core strategy of Kruskal's algorithm?
   a) Start from one vertex and expand outward
   b) Sort all edges by weight and greedily add each unless it forms a cycle
   c) Use BFS to find the shortest path first
   d) Randomly select edges until connected

10. What data structure does Kruskal's algorithm rely on to detect cycles efficiently?
    a) A min-heap
    b) Union-Find (Disjoint Set Union)
    c) A trie
    d) A doubly linked list

11. What is the time complexity of Kruskal's algorithm?
    a) O(V + E)
    b) O(E log E), dominated by sorting the edges
    c) O(V³)
    d) O(V * E)

12. What is the core strategy of Prim's algorithm?
    a) Sort all edges globally first
    b) Start from one vertex and greedily expand the tree via the cheapest edge to a new vertex
    c) Use topological sort first
    d) Process vertices in alphabetical order

13. What existing algorithm is Prim's algorithm structurally most similar to?
    a) Kruskal's algorithm
    b) Dijkstra's algorithm (Chapter 12)
    c) Bellman-Ford
    d) Kahn's algorithm

14. What is the key difference between what Prim's algorithm minimizes versus what Dijkstra minimizes?
    a) There is no difference; they are identical
    b) Prim's minimizes the cheapest single connecting edge; Dijkstra minimizes total distance from a source
    c) Prim's requires negative weights; Dijkstra doesn't
    d) Prim's only works on directed graphs

15. Which algorithm is generally preferred for sparse graphs when finding an MST?
    a) Prim's algorithm
    b) Kruskal's algorithm
    c) Dijkstra's algorithm
    d) Bellman-Ford

16. Which algorithm is generally preferred for dense graphs when finding an MST?
    a) Kruskal's algorithm
    b) Prim's algorithm
    c) Kahn's algorithm
    d) DFS-based topological sort

17. How many edges does a spanning tree of a graph with V vertices contain?
    a) V
    b) V - 1
    c) V + 1
    d) V²

18. Is the specific edge set of an MST guaranteed to be unique?
    a) Yes, always exactly one MST exists
    b) No — if edge weights have ties, multiple different MSTs with the same total weight can exist
    c) MSTs never have ties
    d) Uniqueness only applies to directed graphs

19. How do MST algorithms handle negative edge weights, compared to Dijkstra's algorithm?
    a) They fail in the same way Dijkstra does
    b) MST algorithms handle negative weights without any correctness issues, unlike Dijkstra's strict requirement
    c) Negative weights are impossible in any graph algorithm
    d) MST algorithms convert negative weights to zero automatically

20. Can a disconnected graph have a single spanning tree covering all vertices?
    a) Yes, always
    b) No — a spanning tree requires connectivity; a disconnected graph has no single spanning tree
    c) Only if all edge weights are equal
    d) Only for directed graphs

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-b, 19-b, 20-b

---

## 13.14 20 Coding Problems

**Easy**

1. Implement in-degree calculation for a directed graph.
2. Implement Kahn's algorithm from memory (section 13.2), testing it on the course-prerequisite example.
3. Implement DFS-based topological sort from memory (section 13.3), and verify it produces a DIFFERENT but equally valid ordering compared to Kahn's on the same graph.
4. Write a function to verify whether a given ordering is a VALID topological sort of a given graph (check every edge's source precedes its destination).
5. Write a function to count the total weight of a given set of edges (a helper for MST verification).

**Medium**

6. Implement Kruskal's algorithm from memory (section 13.5), including the simplified Union-Find helper functions.
7. Implement Prim's algorithm from memory (section 13.6), using Chapter 9's generic Heap class.
8. Given a graph, determine if it has a UNIQUE topological ordering (hint: at every step, exactly one vertex should have in-degree zero — otherwise multiple valid orderings exist).
9. Given a course prerequisite list, determine if it's possible to finish all courses (reuses Chapter 11's directed cycle detection AND this chapter's topological sort — connect the two).
10. Given a list of edges with weights, verify that a claimed MST (given as a specific edge set) actually has the minimum possible total weight by comparing against Kruskal's computed result.

**Hard**

11. Given a list of tasks with dependencies and individual task durations, compute the minimum total time to complete all tasks (accounting for parallelizable independent tasks), using topological sort plus a DP-style longest-path-in-DAG calculation (a preview of Dynamic Programming techniques).
12. Implement "Alien Dictionary": given a list of words sorted according to an unknown alien language's alphabet ordering, determine the actual character ordering using topological sort on inferred character precedence constraints.
13. Given a network of computers with connection costs, determine the minimum cost to connect all computers into a single network, and separately, determine the SECOND-cheapest possible total cost (a genuinely harder MST variant).
14. Given a graph, find the minimum spanning FOREST (for a disconnected graph, find the MST of each connected component separately) using a modified Kruskal's or Prim's approach.
15. Given a set of cities and their pairwise flight costs, determine the minimum cost to connect all cities via flights, but with the added constraint that a specific "hub" city must have at least 2 direct connections in the final network — discuss the modification needed to standard MST algorithms.

**Interview Level**

16. **(Google-level)** Given a build system's module dependency graph, implement topological sort to determine a valid build order, and detect and clearly report any circular dependency found, naming the specific cycle.
17. **(Amazon-level)** Given a warehouse network where connecting any two warehouses has a known infrastructure cost, use Kruskal's or Prim's algorithm to design the minimum-cost network connecting all warehouses, and report the total infrastructure investment required.
18. **(Microsoft-level)** Given a course scheduling system, implement Kahn's algorithm to produce a valid semester-by-semester course schedule, where each "layer" processed together (all currently zero-in-degree courses at once) represents one semester's worth of parallel-eligible courses.
19. **(Meta-level)** Given a social network's "influence propagation" model represented as a DAG (influence flows in one direction), use topological sort to determine the correct order to compute each user's total influence score, where a user's score depends on the scores of everyone who influences them.
20. **(Netflix-level)** Design a content encoding pipeline where video processing steps have dependencies (e.g., "transcode" must happen before "generate thumbnails," which must happen before "publish"), using topological sort to determine a valid, parallelizable processing order, and discuss in comments how Kahn's algorithm's "process all zero-in-degree items simultaneously" property naturally maps to identifying steps that can run in parallel.

---

## 13.15 5 Interview Questions

1. "What is a topological sort, and under what condition does it fail to exist?" (Tests the DAG requirement and understanding of why cycles break it.)
2. "Walk me through Kahn's algorithm, and tell me how it detects cycles without a separate pass." (Tests the elegant free cycle-detection mechanism.)
3. "How is a Minimum Spanning Tree different from a shortest path?" (Tests the crucial distinction between the two optimization targets.)
4. "Compare Kruskal's and Prim's algorithms — when would you choose one over the other?" (Tests the sparse-vs-dense decision framework.)
5. "Do MST algorithms work correctly with negative edge weights? What about Dijkstra?" (Tests the notable, easy-to-miss contrast between MST and shortest-path algorithms.)

---

## 13.16 3 Real Projects

1. **Complete Topological Sort Library**: Implement both Kahn's and DFS-based topological sort, with a self-check script verifying both produce valid orderings (per coding problem #4's verifier) on a variety of hand-constructed DAGs, and correctly detect cycles on intentionally cyclic test graphs.
2. **Course Scheduler**: Build a Node.js CLI tool that takes a list of courses and prerequisites, uses Kahn's algorithm to group courses into "semesters" (each semester being one batch of simultaneously-zero-in-degree courses), and reports a complete, valid, parallelized schedule — directly implementing coding problem #18.
3. **Network Cost Optimizer**: Build a tool implementing both Kruskal's and Prim's algorithms against the same weighted graph input, verifying they produce the same total MST weight (even if the specific edges differ), and benchmark both at increasing graph sizes/densities to empirically observe the sparse-vs-dense performance trade-off discussed in this chapter.

---

## 13.17 Further Reading

- A. B. Kahn's original 1962 paper introducing the topological sorting algorithm bearing his name.
- Joseph Kruskal's and Robert Prim's original papers on minimum spanning trees, for the historical origins of both algorithms.
- Search "minimum spanning arborescence" (also known as the Edmonds' algorithm / Chu-Liu/Edmonds algorithm) for the directed-graph analogue of MST, mentioned briefly in this chapter's edge cases.
- LeetCode's "Topological Sort," "Union Find," and "Minimum Spanning Tree" problem tags, for extensive additional practice directly extending this chapter's algorithms.

---

*End of Chapter 13. Next: Chapter 14 will cover Union-Find (Disjoint Set Union) in full depth — the data structure previewed throughout this chapter's Kruskal's algorithm implementation, including path compression, union by rank/size, and the amortized inverse-Ackermann complexity bound, plus its many applications beyond MST.*

**Say "Continue to the next chapter" when ready.**
