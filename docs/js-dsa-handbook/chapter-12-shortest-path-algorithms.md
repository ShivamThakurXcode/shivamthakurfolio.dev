# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 12: Shortest Path Algorithms — When Edges Have Weight

---

## 12.0 Why Plain BFS Isn't Enough Anymore

Chapter 11 closed with the single most important fact in graph traversal: **BFS guarantees shortest path, but only in an unweighted graph.** The moment edges carry different costs — travel time between cities, latency between servers, price of a flight — BFS's core guarantee collapses, because BFS's correctness relies entirely on "fewer edges visited so far = closer," which is meaningless once one edge might cost 1 and another might cost 1,000.

### Why BFS Breaks on Weighted Graphs: A Concrete Counter-Example

```
        A --1--> B --1--> D          Path A->B->D: 2 edges, but weight 1+1 = 2
        |                             
        +--------10-------> D        Path A->D directly: 1 edge, but weight 10!

BFS would explore the DIRECT A->D edge first (fewer edges = "closer" in BFS's
edge-counting sense), incorrectly reporting a "shortest path" of weight 10,
when a path through B, using MORE edges, actually has a smaller TOTAL weight (2).

BFS optimizes for FEWEST EDGES. Weighted shortest path needs to optimize for
SMALLEST TOTAL WEIGHT — a genuinely different quantity requiring new machinery.
```

This chapter builds that new machinery: **Dijkstra's algorithm** (the workhorse for non-negative weights), **Bellman-Ford** (which correctly handles negative weights and detects negative cycles), and **Floyd-Warshall** (which finds shortest paths between *every* pair of vertices at once).

---

## 12.1 Dijkstra's Algorithm: Greedy Shortest Path With a Heap

### 12.1.1 The Core Intuition

**Definition:** Dijkstra's algorithm finds the shortest path from a single source vertex to all other vertices in a weighted graph with **non-negative** edge weights, by repeatedly selecting the unvisited vertex with the smallest known distance and "relaxing" (potentially improving) its neighbors' distances.

### Real-Life Analogy: Filling a Reservoir From the Source Outward

Imagine water flowing outward from a source point, always expanding to whichever adjacent, not-yet-flooded point is currently *closest* to the source (measured by total distance traveled, not number of hops). Once a point gets flooded, its flood-arrival time is locked in as final — because water always expands from the currently-closest unflooded frontier next, there's no way a *later*, farther expansion could somehow represent a shorter route to an already-flooded point. This "always expand from the globally closest remaining frontier" behavior is exactly Dijkstra's greedy strategy, and it's *why* it works: **once a vertex is finalized (popped as the current minimum), no future discovery can possibly offer it a shorter path**, because every other path would have to go through a vertex that's currently *farther away* than the one just finalized — and traveling through something farther away can only add more distance, never less (this relies on non-negative weights — more on why that matters in section 12.2).

### 🎯 Why This Directly Needs Chapter 9's Heap

"Repeatedly select the unvisited vertex with the smallest known distance" is *exactly* Chapter 9's `extractMin()` operation. Using a plain array and scanning for the minimum every time would cost O(V) per selection, O(V²) total across all vertices — using a min-heap (Chapter 9) drops this to O(log V) per selection, the entire reason Dijkstra's algorithm is efficient in practice.

### 12.1.2 Full Implementation

```javascript
function dijkstra(graph, startVertex) {
  // graph: Map<vertex, Array<[neighbor, weight]>>
  const distances = new Map();
  const previous = new Map(); // for path reconstruction, exactly like Chapter 11's parent map

  for (const vertex of graph.keys()) {
    distances.set(vertex, Infinity);
  }
  distances.set(startVertex, 0);

  const minHeap = new Heap((a, b) => a.distance - b.distance); // Chapter 9's generic Heap!
  minHeap.insert({ vertex: startVertex, distance: 0 });

  const visited = new Set();

  while (minHeap.size > 0) {
    const { vertex: current, distance: currentDistance } = minHeap.extract();

    if (visited.has(current)) continue; // may have stale/duplicate entries — see note below
    visited.add(current);

    for (const [neighbor, weight] of graph.get(current) || []) {
      if (visited.has(neighbor)) continue;

      const newDistance = currentDistance + weight;

      if (newDistance < distances.get(neighbor)) {
        distances.set(neighbor, newDistance);       // RELAXATION: found a better path!
        previous.set(neighbor, current);
        minHeap.insert({ vertex: neighbor, distance: newDistance });
      }
    }
  }

  return { distances, previous };
}
```

### 🧠 Memory Trick: "Relaxation"

The term "relaxation" (updating `distances.get(neighbor)` to a smaller value) comes from a physical analogy: imagine a taut rope stretched along the *current best-known* (possibly too-long) path. When you discover a shorter route, you "relax" the rope's tension by shortening it to the new, better length. Every shortest-path algorithm in this chapter (Dijkstra, Bellman-Ford, Floyd-Warshall) is fundamentally built from this same one operation, repeated according to different strategies for *which edges to check, and in what order*.

### ⚠ Common Mistake: Not Handling Stale Heap Entries

Notice the `if (visited.has(current)) continue;` check immediately after extracting from the heap. This is necessary because our heap-based implementation doesn't support an efficient "decrease-key" operation (updating an existing heap entry's priority in place) — instead, we simply **insert a new entry every time we find a better distance**, leaving old, now-stale entries sitting in the heap. When a stale entry is eventually extracted, we must recognize and skip it (since `current` would already be in `visited` from processing its *better* entry earlier). This is a standard, accepted trade-off in practical heap-based Dijkstra implementations — a "true" decrease-key-supporting heap (a Fibonacci heap, mentioned in Further Reading) can avoid this, but is rarely implemented from scratch outside of specialized contexts, and this "allow duplicates, skip stale ones on extraction" approach remains correct and is what's expected in virtually all interview settings.

### Dry Run

```
Graph (weighted, directed for this example):
A -> [[B,4], [C,1]]
B -> [[D,1]]
C -> [[B,2], [D,5]]
D -> []

dijkstra(graph, 'A'):

Init: distances={A:0, B:Inf, C:Inf, D:Inf}, heap=[{A,0}]

Extract {A,0}. Not visited -> visited={A}.
  neighbor B, weight 4: newDist = 0+4=4 < Inf -> distances={A:0,B:4,...}, heap gets {B,4}
  neighbor C, weight 1: newDist = 0+1=1 < Inf -> distances={A:0,B:4,C:1,D:Inf}, heap gets {C,1}
  heap now: [{C,1}, {B,4}] (min-heap keeps C on top)

Extract {C,1}. Not visited -> visited={A,C}.
  neighbor B, weight 2: newDist = 1+2=3 < 4(current B distance!) -> IMPROVEMENT!
    distances={A:0,B:3,C:1,D:Inf}, heap gets {B,3}
  neighbor D, weight 5: newDist = 1+5=6 < Inf -> distances={...,D:6}, heap gets {D,6}
  heap now: [{B,3}, {B,4}(STALE!), {D,6}]

Extract {B,3}. Not visited -> visited={A,C,B}.
  neighbor D, weight 1: newDist = 3+1=4 < 6(current D distance!) -> IMPROVEMENT!
    distances={A:0,B:3,C:1,D:4}, heap gets {D,4}
  heap now: [{D,4}, {B,4}(STALE), {D,6}(STALE)]

Extract {D,4}. Not visited -> visited={A,C,B,D}.
  D has no outgoing edges -> nothing to relax

Extract {B,4}(STALE). visited.has('B') is TRUE -> skip immediately.
Extract {D,6}(STALE). visited.has('D') is TRUE -> skip immediately.

Heap empty. FINAL distances: {A:0, B:3, C:1, D:4}

Verify: shortest A->D is A->C->B->D = 1+2+1 = 4 ✓ (NOT the direct-ish A->B->D = 4+1=5,
and NOT A->C->D = 1+5=6 — the algorithm correctly found the truly shortest route!)
```

### 📌 Quick Revision: Dijkstra's Complexity

- **Time**: O((V + E) log V) with a binary heap (Chapter 9) — each vertex is extracted once (O(log V) each), and each edge triggers at most one heap insertion (O(log V) each).
- **Space**: O(V) for distances, previous, and visited; O(E) worst case for heap entries (due to the stale-entry duplication discussed above).

### ⚠ Common Mistake: Dijkstra's Algorithm FAILS With Negative Weights

This is one of the most important, most frequently tested limitations in this entire chapter. **Dijkstra's greedy strategy assumes that once a vertex is finalized (extracted from the heap as the current minimum), no future path could possibly improve it.** This assumption **breaks entirely** if negative weights exist, because a path through a "farther away" vertex could loop through a large negative-weight edge and end up *shorter* overall than the "closest" vertex Dijkstra already committed to.

```
Example where Dijkstra gives the WRONG answer with a negative edge:

A --1--> B --(-5)--> C           A --4--> C  (direct edge)

Dijkstra from A: extracts A (dist 0). Relaxes B (dist 1) and C (dist 4, via direct edge).
Extracts B next (dist 1, smaller than C's 4). Relaxes C via B: 1 + (-5) = -4.
This IS actually correctly found here because B was processed before C in this
specific example — but in general, Dijkstra's greedy "finalize the minimum and
never revisit" strategy can permanently lock in a WRONG, too-large distance for
a vertex if a negative edge reachable only through a "farther" vertex would have
produced a smaller total. The algorithm has no mechanism to REVISIT and improve
an already-finalized (visited) vertex, which negative weights can require.
```

### 🔥 Interview Tip

If a problem's graph might contain negative weights, **immediately state that Dijkstra's algorithm is unsafe to use, and pivot to Bellman-Ford** (section 12.2). This is one of the highest-value, most specific pieces of knowledge in this entire chapter — many candidates know "Dijkstra finds shortest paths" but don't know or forget to check the non-negative-weights precondition, and interviewers specifically probe this with a "what if some edges are negative?" follow-up.

---

## 12.2 Bellman-Ford Algorithm: Slower, But Handles Negative Weights

**Definition:** The Bellman-Ford algorithm finds shortest paths from a single source to all vertices, correctly handling negative edge weights, by relaxing **every edge in the graph, V-1 times**, guaranteed to converge on correct shortest-path distances (or detect a negative cycle) by that point.

### 🧮 Mathematical Explanation: Why Exactly V-1 Iterations?

**Claim:** any shortest path between two vertices in a graph with `V` vertices contains **at most V-1 edges** (since a path can visit at most `V` distinct vertices before it would have to repeat one, at which point it contains a cycle — and a cycle can never make a shortest path shorter, assuming no negative cycles exist, since you could always just skip the cycle and arrive at the same place having traveled less total distance... unless the cycle itself has negative total weight, a case we specifically detect separately below).

Since each full pass of relaxing every edge can extend the "confirmed correct" shortest path by **at least one more edge** in the worst case (imagine the shortest path is a single straight chain — the first pass correctly computes the distance for vertices one edge away, the second pass for vertices two edges away, and so on), **V-1 full passes are guaranteed sufficient** to correctly compute the shortest path to every vertex, since no shortest path needs more than V-1 edges.

```javascript
function bellmanFord(edges, vertices, startVertex) {
  // edges: Array<[u, v, weight]>
  const distances = new Map();
  vertices.forEach(v => distances.set(v, Infinity));
  distances.set(startVertex, 0);

  // Relax ALL edges, V-1 times
  for (let i = 0; i < vertices.length - 1; i++) {
    for (const [u, v, weight] of edges) {
      if (distances.get(u) !== Infinity && distances.get(u) + weight < distances.get(v)) {
        distances.set(v, distances.get(u) + weight);  // relaxation, same operation as Dijkstra!
      }
    }
  }

  // ONE MORE pass: if anything STILL improves, there's a negative cycle
  for (const [u, v, weight] of edges) {
    if (distances.get(u) !== Infinity && distances.get(u) + weight < distances.get(v)) {
      throw new Error('Graph contains a negative-weight cycle — shortest path is undefined!');
    }
  }

  return distances;
}
```

### 🧠 Memory Trick: The "One Extra Pass" Negative Cycle Detector

This is an elegant, genuinely important trick worth memorizing on its own: **if a shortest path can never need more than V-1 edges (assuming no negative cycles), then after V-1 relaxation passes, nothing should be able to improve any further.** If a **V-th** pass *still* finds an improvement, that's mathematically impossible unless a negative cycle exists somewhere, letting you "cheat" by looping around it indefinitely to make some path's cost arbitrarily small (approaching negative infinity). **This single extra pass is Bellman-Ford's built-in negative-cycle detector** — a capability Dijkstra's algorithm has no equivalent for at all (it simply produces silently wrong answers, as shown in section 12.1.2's warning, or in the worst case, loops forever if it doesn't have a `visited` guard against reprocessing).

### Dry Run (Abbreviated, Focusing on the Key Insight)

```
Graph edges: [A,B,4], [A,C,1], [C,B,2], [B,D,1], [C,D,5]
vertices = [A,B,C,D], start = A

distances = {A:0, B:Inf, C:Inf, D:Inf}

Pass 1 (relax all edges once, in listed order):
  [A,B,4]: 0+4=4 < Inf -> B=4
  [A,C,1]: 0+1=1 < Inf -> C=1
  [C,B,2]: 1+2=3 < 4    -> B=3  (already improved this same pass!)
  [B,D,1]: 3+1=4 < Inf  -> D=4
  [C,D,5]: 1+5=6, not < 4 -> no change
  After pass 1: {A:0, B:3, C:1, D:4}

Pass 2 (V-1=3, so 2 more passes total needed; let's check pass 2):
  [A,B,4]: 0+4=4, not < 3 -> no change
  [A,C,1]: 0+1=1, not < 1 -> no change
  [C,B,2]: 1+2=3, not < 3 -> no change
  [B,D,1]: 3+1=4, not < 4 -> no change
  [C,D,5]: 1+5=6, not < 4 -> no change
  NOTHING improved -- we could stop early here (a common practical optimization),
  but Bellman-Ford's guarantee holds regardless of running the full V-1 passes.

Final distances: {A:0, B:3, C:1, D:4}  -- MATCHES Dijkstra's result from section 12.1.2!
(As expected: with no negative edges present, both algorithms agree — Bellman-Ford
is simply the safe, if slower, ALTERNATIVE that also works when negatives ARE present.)
```

### 📌 Quick Revision: Dijkstra vs. Bellman-Ford

| | Dijkstra | Bellman-Ford |
|---|---|---|
| Time complexity | O((V+E) log V) with a heap | **O(V · E)** |
| Handles negative weights | **No — produces silently wrong answers** | **Yes** |
| Detects negative cycles | No mechanism at all | **Yes — via the extra V-th pass** |
| Strategy | Greedy (always expand the current minimum) | Brute-force-ish (relax every edge, repeatedly, a fixed number of times) |
| When to use | Non-negative weights, want the fastest correct answer | Negative weights present, or need negative-cycle detection |

### 🎯 Interview Pattern

The clean decision rule: **"Are negative edge weights possible? If no, use Dijkstra (faster). If yes, or if you need to detect negative cycles specifically, use Bellman-Ford (handles both correctly, at the cost of being slower)."** State this trade-off explicitly and unprompted whenever a shortest-path problem doesn't clearly specify non-negative weights.

---

## 12.3 Floyd-Warshall: All-Pairs Shortest Paths

Both Dijkstra and Bellman-Ford solve **single-source** shortest paths — "shortest path from ONE specific starting vertex to everywhere else." Sometimes you need **every** pair's shortest path simultaneously — Floyd-Warshall answers exactly this.

### 12.3.1 The Core Intuition: Dynamic Programming Over Intermediate Vertices

**Definition:** The Floyd-Warshall algorithm computes shortest paths between all pairs of vertices by progressively considering each vertex as a potential **intermediate stop** on a path between every other pair, updating the shortest known distance whenever routing through that intermediate vertex helps.

### 🧠 Memory Trick: "Can I Get There Faster Through Here?"

Imagine asking, for every single pair of cities `(i, j)`, one at a time: "is my current best-known route from `i` to `j` improved by detouring through city `k`?" Floyd-Warshall's core loop asks exactly this question, systematically, for **every** possible intermediate city `k`, for **every** pair `(i, j)` — a beautifully simple, if computationally heavier, brute-force-with-structure approach.

```javascript
function floydWarshall(vertices, edges) {
  const n = vertices.length;
  const indexOf = new Map(vertices.map((v, i) => [v, i]));

  // Initialize distance matrix: Infinity everywhere except self (0) and direct edges
  const dist = Array.from({ length: n }, () => new Array(n).fill(Infinity));
  for (let i = 0; i < n; i++) dist[i][i] = 0;

  for (const [u, v, weight] of edges) {
    const i = indexOf.get(u);
    const j = indexOf.get(v);
    dist[i][j] = weight;
  }

  // THE CORE TRIPLE LOOP: try routing through every possible intermediate vertex k
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j]; // found a shorter route THROUGH k!
        }
      }
    }
  }

  return dist;
}
```

### ⚠ Common Mistake: Loop Order Matters — `k` Must Be the OUTERMOST Loop

This is a genuinely subtle, easy-to-get-backward detail: **the intermediate vertex `k` must be the outermost loop**, not `i` or `j`. Why? Because `dist[i][k]` and `dist[k][j]` used in the innermost check must already reflect the best-known distances **considering all intermediate vertices processed so far** (`0` through `k-1`) — this is a genuine dynamic programming recurrence (a full formal treatment of DP awaits the dedicated DP Masterclass chapters, but this is a direct, concrete preview): **`dist[i][j]` after processing intermediate vertex `k` represents "the shortest path from i to j using only vertices `0..k` as allowed intermediate stops."** If `i` or `j` were the outer loop instead, you'd sometimes use a "not yet updated for this k" value of `dist[i][k]` or `dist[k][j]`, silently producing incorrect results for certain graphs. Getting this loop order backward is one of the most common Floyd-Warshall implementation bugs.

### Dry Run (Small Example)

```
Vertices: A(0), B(1), C(2)
Edges: A->B (3), B->C (1), A->C (10)

Initial dist matrix (rows/cols = A,B,C):
        A    B    C
    A [ 0,   3,  10 ]
    B [Inf,  0,   1 ]
    C [Inf, Inf,  0 ]

k=0 (A as intermediate): check if routing through A helps any (i,j)
  dist[B][A] is Inf -> routing B->A->anything is useless (Inf + anything = Inf). No changes possible via A as intermediate for reaching FROM B or C, since nothing reaches A.

k=1 (B as intermediate): check if routing through B helps
  dist[A][B]=3, dist[B][C]=1 -> dist[A][C] currently 10. Is 3+1=4 < 10? YES!
  dist[A][C] = 4   <- IMPROVEMENT FOUND: A->B->C (cost 4) beats direct A->C (cost 10)!

  Updated matrix:
        A    B    C
    A [ 0,   3,   4 ]
    B [Inf,  0,   1 ]
    C [Inf, Inf,  0 ]

k=2 (C as intermediate): check if routing through C helps
  C has no outgoing edges (dist[C][anything] is Inf or 0) -> no further improvements possible

FINAL: dist[A][C] = 4 (correctly found the A->B->C shortcut, beating the direct edge!)
```

### 📌 Quick Revision: Floyd-Warshall Complexity

- **Time**: **O(V³)** — the triple nested loop, unconditionally, regardless of edge sparsity.
- **Space**: O(V²) — the full distance matrix.

### 🎯 Interview Pattern: When Floyd-Warshall Is the Right Choice

Despite its O(V³) cost being worse than running Dijkstra from every single vertex (which would be O(V · (V+E) log V) — often better for sparse graphs), **Floyd-Warshall's simplicity, ability to handle negative weights (though still not negative cycles — it can detect them too, via a negative value appearing on the diagonal `dist[i][i]` after running), and directness for all-pairs queries make it the preferred choice specifically when the graph is small-to-medium sized and you genuinely need every pair's shortest distance, not just paths from one source.** State this trade-off explicitly: **"For all-pairs shortest paths, Floyd-Warshall is O(V³) and simple to implement; running Dijkstra from every vertex is O(V·(V+E)log V), which can be better for large, sparse graphs — the right choice depends on graph size and density."**

---

## 12.4 Comprehensive Comparison and Decision Framework

### 📌 The Complete Shortest-Path Decision Table

| Scenario | Algorithm | Complexity |
|---|---|---|
| Unweighted graph, single source | **BFS** (Chapter 11) | O(V + E) |
| Weighted graph, non-negative weights, single source | **Dijkstra** | O((V+E) log V) |
| Weighted graph, negative weights possible, single source | **Bellman-Ford** | O(V · E) |
| Need to detect negative cycles specifically | **Bellman-Ford** | O(V · E) |
| Weighted graph, need ALL pairs' shortest paths | **Floyd-Warshall** (or Dijkstra from every vertex, for large sparse graphs) | O(V³) (or O(V·(V+E)log V)) |

### 🔥 Interview Tip: The Single Question That Determines Everything

When facing any shortest-path problem, ask, in this exact order: **(1) Are edges weighted at all? If no, BFS. (2) Can weights be negative? If no, Dijkstra. (3) If yes (negative weights possible), Bellman-Ford. (4) Do I need EVERY pair's shortest path, not just one source? If yes, Floyd-Warshall (or repeated Dijkstra, if the graph is large and sparse).** This decision tree, stated explicitly and confidently, is one of the highest-value things you can demonstrate in a graph-algorithms interview — it shows you're navigating a genuine decision framework, not pattern-matching to a single memorized algorithm regardless of fit.

---

## 12.5 Edge Cases and Gotchas Checklist

1. **Unreachable vertices.** Does your implementation correctly leave/report `Infinity` (or a clear "unreachable" sentinel) for vertices with no path from the source, rather than crashing or returning a misleading value like `0` or `undefined`?
2. **Negative weights with Dijkstra.** Always verify the problem guarantees non-negative weights before reaching for Dijkstra; if unstated, ask or explicitly flag the assumption.
3. **Negative cycles with Bellman-Ford.** Always run (or at least mention) the extra V-th verification pass — silently skipping it means your algorithm could return an incorrect "shortest path" for graphs with a negative cycle, when the correct answer is "undefined/unbounded."
4. **Self-loops and parallel edges** (multiple edges between the same pair of vertices with different weights) — verify your relaxation logic naturally handles picking the smaller of duplicate edges (it does, automatically, since relaxation only ever accepts strict improvements).
5. **Floyd-Warshall loop order** — `k` must be outermost; this is the single most common implementation bug in this chapter's final algorithm.
6. **Directed vs. undirected weighted graphs** — for undirected graphs, remember each edge must be added/relaxed in *both* directions (exactly as in Chapter 11's `addEdge` with `directed = false`).
7. **Path reconstruction** — if a problem asks for the actual path (not just the distance), remember to track and use a `previous`/parent map (section 12.1.2), reconstructing by walking backward once the algorithm completes, exactly mirroring Chapter 11's BFS path-reconstruction technique.

---

## 12.6 Chapter Summary

This chapter directly extended Chapter 11's graph traversal foundation into the weighted-edge world, opening with a concrete proof of exactly *why* BFS's shortest-path guarantee collapses the moment edges carry different costs — BFS optimizes for fewest edges, while weighted shortest path requires optimizing for smallest total weight, a genuinely different quantity. We built **Dijkstra's algorithm** as a direct, practical payoff of Chapter 9's heap: its greedy strategy of always finalizing the currently-closest unvisited vertex works specifically *because* non-negative weights guarantee that no future, farther-starting path could ever retroactively improve an already-finalized vertex's distance — and we were explicit and rigorous about the critical failure mode this creates: **Dijkstra produces silently wrong answers on graphs with negative weights**, since that exact non-retroactive-improvement assumption breaks down.

We introduced **Bellman-Ford** as the correct, if slower (O(V·E) versus Dijkstra's O((V+E) log V)), alternative for graphs where negative weights are possible, built on the elegant mathematical fact that no shortest path needs more than V-1 edges, making V-1 full edge-relaxation passes provably sufficient — and we highlighted its genuinely valuable bonus capability that Dijkstra has no equivalent for at all: **a single extra relaxation pass serves as a complete negative-cycle detector**, since any further improvement after the guaranteed-sufficient V-1 passes is only possible if a negative cycle allows a path's cost to be driven arbitrarily low. We closed the core algorithmic content with **Floyd-Warshall**, an all-pairs shortest-path algorithm built on a genuine dynamic-programming recurrence (a direct, concrete preview of the DP Masterclass chapters ahead) — "the shortest path from i to j using only vertices 0..k as intermediates" — and were careful to flag its single most common implementation bug: the intermediate vertex `k` must be the *outermost* loop, or the recurrence's "already improved using earlier intermediates" invariant silently breaks.

Finally, we assembled everything into a single, complete decision framework spanning both this chapter and Chapter 11: unweighted → BFS; weighted, non-negative → Dijkstra; weighted, negative weights possible → Bellman-Ford; all-pairs needed → Floyd-Warshall (or repeated Dijkstra for large sparse graphs) — a decision tree worth having ready to state, in order, the moment any shortest-path problem appears, since correctly identifying *which* algorithm the problem's constraints actually demand is a bigger interview differentiator than knowing any single algorithm's implementation in isolation.

---

## 12.7 Revision Notes

- BFS's shortest-path guarantee relies on "fewest edges = closest," which breaks entirely once edges carry different weights — a genuinely different optimization target.
- Dijkstra's greedy strategy (always finalize the current minimum, via Chapter 9's heap) is correct only because non-negative weights guarantee no future path can retroactively improve a finalized vertex — this assumption breaks with negative weights, producing silently wrong answers.
- Bellman-Ford relaxes every edge V-1 times (provably sufficient, since no shortest path needs more than V-1 edges), correctly handling negative weights, at O(V·E) cost.
- A single extra (V-th) Bellman-Ford relaxation pass detects negative cycles — any further improvement at that point is only possible via a negative cycle.
- Floyd-Warshall computes all-pairs shortest paths via a DP recurrence over intermediate vertices; the intermediate vertex `k` must be the outermost loop, or the "already improved via earlier intermediates" invariant breaks.
- Decision framework: unweighted → BFS; weighted non-negative → Dijkstra; weighted with possible negatives → Bellman-Ford; all-pairs needed → Floyd-Warshall (or repeated Dijkstra for large sparse graphs).

---

## 12.8 Mind Map (ASCII)

```
                          SHORTEST PATH ALGORITHMS
                                    |
      +------------------+---------+---------+------------------------+
      |                  |                   |                        |
  WHY BFS FAILS      DIJKSTRA            BELLMAN-FORD            FLOYD-WARSHALL
  ON WEIGHTED             |                   |                        |
  GRAPHS            Greedy: always      Relax ALL edges          DP over
  (fewest edges      finalize current   V-1 times (proof:        intermediate
  != smallest        minimum via        no shortest path        vertices k
  total weight)       Ch.9 HEAP          needs > V-1 edges)      (k MUST be
      |               (extractMin)            |                 OUTERMOST loop
  Different            |                Handles NEGATIVE         -- common bug!)
  optimization      FAILS on negative   weights correctly             |
  target entirely   weights (silently  ("relaxation" = the       O(V^3) time,
                     wrong, no error!)  ONE operation shared     O(V^2) space
                     O((V+E)logV)       by ALL 3 algorithms)          |
                          |                   |                 Best for: need
                     Non-negative        Extra V-th pass =      EVERY pair's
                     weights ONLY        NEGATIVE CYCLE          shortest path,
                                         DETECTOR (Dijkstra      small-medium
                                         has NO equivalent!)     graphs
                                         O(V*E) time
                                              |
                        DECISION FRAMEWORK: unweighted->BFS,
                        weighted+nonneg->Dijkstra,
                        weighted+maybe-negative->Bellman-Ford,
                        all-pairs->Floyd-Warshall
```

---

## 12.9 Cheat Sheet

```
SHORTEST PATH DECISION TREE
==============================
1. Unweighted?                              -> BFS (Chapter 11), O(V+E)
2. Weighted, non-negative only?              -> Dijkstra, O((V+E) log V)
3. Weighted, negative weights POSSIBLE?      -> Bellman-Ford, O(V*E)
4. Need negative CYCLE detection?            -> Bellman-Ford (extra V-th pass)
5. Need ALL-PAIRS shortest paths?            -> Floyd-Warshall, O(V^3)
                                                 (or Dijkstra from every vertex
                                                  if graph is large & sparse)

DIJKSTRA
===========
Greedy: extractMin from a heap (Ch.9), relax neighbors, repeat.
FAILS SILENTLY on negative weights -- always check for this precondition!
Time: O((V+E) log V) with a binary heap.

BELLMAN-FORD
===============
Relax EVERY edge, V-1 times (provably sufficient — no shortest path > V-1 edges).
Run ONE more pass: if anything still improves -> NEGATIVE CYCLE exists.
Time: O(V*E). Handles negative weights correctly.

FLOYD-WARSHALL
=================
for k in vertices:         <- MUST be outermost loop!
  for i in vertices:
    for j in vertices:
      dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
Time: O(V^3). Space: O(V^2). All-pairs shortest paths in one run.

RELAXATION (the ONE operation underlying all three algorithms)
===================================================================
if dist[u] + weight(u,v) < dist[v]:
  dist[v] = dist[u] + weight(u,v)   <- found a shorter path, update it
```

---

## 12.10 Key Takeaways

1. BFS's shortest-path guarantee is specifically about fewest edges — it collapses entirely once weights differ, requiring genuinely new algorithms.
2. Dijkstra (heap-powered, O((V+E) log V)) is correct only for non-negative weights — it fails silently, not loudly, on negative weights, making this precondition check essential.
3. Bellman-Ford (O(V·E)) correctly handles negative weights via V-1 relaxation passes, and its extra V-th pass is a complete, elegant negative-cycle detector Dijkstra has no equivalent for.
4. Floyd-Warshall (O(V³)) computes all-pairs shortest paths via a DP recurrence over intermediate vertices — the intermediate vertex must be the outermost loop.
5. A complete decision framework (unweighted→BFS, non-negative→Dijkstra, possibly-negative→Bellman-Ford, all-pairs→Floyd-Warshall) is worth having ready to state explicitly for any shortest-path problem.

---

## 12.11 20 Multiple Choice Questions

1. Why does BFS fail to guarantee shortest paths in a weighted graph?
   a) BFS doesn't work on graphs at all
   b) BFS optimizes for fewest edges, not smallest total weight — a different quantity once weights differ
   c) BFS only works on trees
   d) BFS requires a heap, which weighted graphs don't have

2. What data structure from Chapter 9 does Dijkstra's algorithm rely on for efficiency?
   a) A trie
   b) A min-heap
   c) A hash table
   d) A binary search tree

3. What critical assumption does Dijkstra's greedy strategy depend on?
   a) The graph must be a tree
   b) Edge weights are non-negative
   c) The graph must be undirected
   d) There must be no cycles

4. What happens when Dijkstra's algorithm is run on a graph with negative edge weights?
   a) It throws a clear error
   b) It may silently produce an incorrect shortest-path result
   c) It runs forever
   d) It automatically switches to Bellman-Ford

5. What is the time complexity of Dijkstra's algorithm using a binary heap?
   a) O(V²)
   b) O((V+E) log V)
   c) O(V * E)
   d) O(V³)

6. What operation is shared by Dijkstra, Bellman-Ford, and Floyd-Warshall as their fundamental building block?
   a) Sorting
   b) Relaxation (checking if a shorter path has been found and updating accordingly)
   c) Hashing
   d) Binary search

7. How many times does Bellman-Ford relax every edge in the graph?
   a) V times
   b) V-1 times
   c) E times
   d) log V times

8. Why is V-1 the correct number of relaxation passes in Bellman-Ford?
   a) It's an arbitrary convention
   b) No shortest path in a graph with V vertices needs more than V-1 edges
   c) It matches the number of edges exactly
   d) It's related to the heap's height

9. What does an extra (V-th) relaxation pass in Bellman-Ford detect if it still finds improvements?
   a) A disconnected graph
   b) A negative-weight cycle
   c) A duplicate edge
   d) An unweighted graph

10. What is the time complexity of Bellman-Ford?
    a) O((V+E) log V)
    b) O(V * E)
    c) O(V³)
    d) O(V + E)

11. What is the primary advantage of Bellman-Ford over Dijkstra?
    a) It's always faster
    b) It correctly handles negative edge weights and can detect negative cycles
    c) It doesn't require a graph representation
    d) It works only on trees

12. What problem does Floyd-Warshall solve that Dijkstra and Bellman-Ford do not directly address?
    a) Negative weight handling
    b) All-pairs shortest paths (every vertex to every other vertex simultaneously)
    c) Cycle detection
    d) Unweighted graph traversal

13. In Floyd-Warshall's triple nested loop, which loop variable must be outermost?
    a) i (the source vertex being considered)
    b) j (the destination vertex being considered)
    c) k (the intermediate vertex being considered)
    d) Order doesn't matter

14. Why must the intermediate vertex `k` be the outermost loop in Floyd-Warshall?
    a) It's a stylistic preference only
    b) dist[i][k] and dist[k][j] must already reflect improvements from all earlier intermediate vertices (0 to k-1)
    c) JavaScript requires this loop order for correctness
    d) It only matters for very large graphs

15. What is the time complexity of Floyd-Warshall?
    a) O(V + E)
    b) O((V+E) log V)
    c) O(V³)
    d) O(V * E)

16. What is the space complexity of Floyd-Warshall?
    a) O(V)
    b) O(V²)
    c) O(E)
    d) O(1)

17. According to this chapter's decision framework, which algorithm should you use for a weighted graph where negative weights are impossible?
    a) BFS
    b) Dijkstra
    c) Bellman-Ford only
    d) Floyd-Warshall only

18. According to this chapter's decision framework, which algorithm(s) should you use if you need shortest paths between EVERY pair of vertices in a large, sparse graph?
    a) A single Dijkstra run only
    b) Floyd-Warshall exclusively, always
    c) Floyd-Warshall or repeated Dijkstra from every vertex, depending on graph size/density
    d) BFS repeated for every vertex

19. Why does the Dijkstra implementation in this chapter check `if (visited.has(current)) continue;` after extracting from the heap?
    a) To handle stale/duplicate heap entries left over from earlier relaxations
    b) To detect negative cycles
    c) It's unnecessary and can be removed safely
    d) To handle disconnected graphs

20. What must be tracked to reconstruct the actual shortest PATH (not just its total distance) after running any of these algorithms?
    a) Nothing extra is needed
    b) A `previous`/parent map, updated during relaxation, walked backward once the algorithm completes
    c) The total number of vertices only
    d) A separate BFS run afterward

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-c, 14-b, 15-c, 16-b, 17-b, 18-c, 19-a, 20-b

---

## 12.12 20 Coding Problems

**Easy**

1. Implement Dijkstra's algorithm from memory (section 12.1.2), testing it on a small hand-constructed weighted graph.
2. Write a function to reconstruct the shortest path (not just distance) from Dijkstra's `previous` map.
3. Given a weighted graph, write a function to find the shortest distance between two SPECIFIC vertices (early-exit Dijkstra once the target is extracted from the heap).
4. Implement Bellman-Ford from memory (section 12.2), and verify it produces the same distances as Dijkstra on a graph with no negative weights.
5. Write a function to detect if a given graph contains a negative-weight cycle, using Bellman-Ford's extra pass.

**Medium**

6. Implement Floyd-Warshall from memory (section 12.3.1), being careful about the loop order, and verify against a hand-computed small example.
7. Given a weighted graph representing flight routes with prices, find the cheapest route from a source to a destination with at most K stops (a variant requiring a modified Bellman-Ford-style relaxation limited to K passes).
8. Given a graph, implement a function that returns the shortest path distances from a source to ALL other vertices, explicitly reporting `Infinity`/unreachable for disconnected vertices.
9. Given a road network with tolls (weights), find the path from A to B that minimizes total toll cost, and separately, the path that minimizes the NUMBER of toll roads used (contrasting Dijkstra with plain BFS on the same graph).
10. Implement a function that uses Floyd-Warshall's result matrix to determine the "diameter" of a weighted graph (the largest shortest-path distance between any pair of vertices).

**Hard**

11. Given a graph where some edges may be negative but the graph as a whole has no negative cycles, implement Bellman-Ford to find shortest paths, and write a function that also returns the actual path for a specified destination.
12. Given a currency exchange graph (currencies as vertices, exchange rates as edges, where the "weight" is the negative log of the rate for arbitrage-detection purposes), use Bellman-Ford's negative-cycle detection to determine if a profitable arbitrage opportunity exists.
13. Given a grid where each cell has a "cost" to enter, find the minimum-cost path from the top-left to the bottom-right corner using Dijkstra treating the grid as an implicit weighted graph (a direct combination of Chapter 11's implicit-graph technique with this chapter's weighted algorithms).
14. Implement a network delay time calculator: given a list of weighted directed edges representing signal travel times between network nodes, determine the minimum time for a signal starting at a given node to reach all other nodes, using Dijkstra.
15. Given a graph with both positive and negative edges (but no negative cycles), and a requirement to answer MANY shortest-path queries between different pairs efficiently, discuss (in comments) why running Floyd-Warshall ONCE upfront is more efficient than running Bellman-Ford separately for each query, then implement the Floyd-Warshall version.

**Interview Level**

16. **(Google-level)** Given a graph representing a computer network with latencies as weights, design a system to find the K shortest paths (not just the single shortest) between two nodes, extending Dijkstra's approach conceptually (full K-shortest-paths algorithms are advanced, but discuss the approach in comments).
17. **(Amazon-level)** Given a delivery network with travel times (weighted, non-negative) between warehouses, implement Dijkstra to find the fastest delivery route from a central warehouse to all destination warehouses, and report which destinations are unreachable.
18. **(Microsoft-level)** Given a graph representing task dependencies where edges have "cost" representing time delays, and possibly negative weights representing time savings from parallelization, use Bellman-Ford to compute the fastest possible completion time for each task, detecting if the dependency structure creates an impossible (negative cycle) scenario.
19. **(Meta-level)** Given a social network graph with weighted edges representing "interaction strength" (used as a cost to minimize, e.g., for finding the path of least resistance for information spread), implement Dijkstra to find the most efficient path between two users, and Floyd-Warshall to precompute all pairwise efficient paths for a smaller, frequently-queried subset of "VIP" users.
20. **(Netflix-level)** Design a CDN (content delivery network) routing system: given server nodes with weighted latency edges, use Dijkstra to route each user request to the server offering the lowest end-to-end latency, and discuss (in comments) how you'd efficiently recompute routes as network conditions (edge weights) change dynamically in production.

---

## 12.13 5 Interview Questions

1. "Why doesn't BFS work for finding the shortest path in a weighted graph?" (Tests understanding of the fundamental optimization-target mismatch.)
2. "Walk me through Dijkstra's algorithm, and tell me what assumption it depends on that could break it." (Tests both implementation knowledge and the critical non-negative-weights precondition.)
3. "How would you find the shortest path in a graph that might have negative edge weights?" (Tests knowledge of Bellman-Ford as the correct pivot.)
4. "How would you detect a negative-weight cycle in a graph?" (Tests the elegant extra-pass technique specific to Bellman-Ford.)
5. "How would you find the shortest path between every pair of vertices in a graph?" (Tests Floyd-Warshall knowledge and the trade-off against repeated Dijkstra.)

---

## 12.14 3 Real Projects

1. **Complete Shortest-Path Library**: Build a module implementing Dijkstra, Bellman-Ford, and Floyd-Warshall against a shared weighted-graph representation, with a self-check script verifying all three agree on graphs with non-negative weights, and that Bellman-Ford correctly detects an intentionally-inserted negative cycle.
2. **Road Trip Planner**: Build a Node.js CLI tool that models a small set of cities and travel times/costs as a weighted graph, then uses Dijkstra to find the cheapest/fastest route between any two cities the user specifies, printing the full path via the `previous`-map reconstruction technique.
3. **Currency Arbitrage Detector**: Build the currency-exchange arbitrage detector from coding problem #12 as a standalone tool, using real or simulated exchange rate data, applying the negative-log-weight transformation and Bellman-Ford's negative-cycle detection to report any arbitrage opportunities found.

---

## 12.15 Further Reading

- Edsger Dijkstra's original 1959 paper, for the historical origin of the algorithm bearing his name.
- Search "Fibonacci heap Dijkstra" for the theoretically optimal (though rarely implemented in practice) O(E + V log V) variant using a more sophisticated heap supporting true decrease-key operations.
- Search "Bellman-Ford SPFA optimization" (Shortest Path Faster Algorithm) for a common practical optimization reducing Bellman-Ford's average-case runtime using a queue-based relaxation order.
- Robert Floyd and Stephen Warshall's original papers, for the historical, independently-discovered origins of the all-pairs algorithm bearing both their names.
- LeetCode's "Dijkstra" and "Shortest Path" adjacent problems (e.g., "Network Delay Time," "Cheapest Flights Within K Stops"), for extensive additional practice directly extending this chapter's core algorithms.

---

*End of Chapter 12. Next: Chapter 13 will cover Topological Sort and Minimum Spanning Trees — ordering DAGs by dependency (directly extending Chapter 11's directed-cycle-detection machinery), and finding the cheapest way to connect an entire graph via Kruskal's and Prim's algorithms.*

**Say "Continue to the next chapter" when ready.**
