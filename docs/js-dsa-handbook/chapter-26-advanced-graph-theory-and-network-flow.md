# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 26: Advanced Graph Theory and Network Flow

---

## 26.0 The Question This Chapter Answers

Chapters 11-14 built the foundational graph toolkit: traversal, shortest paths, spanning trees, connectivity. This chapter tackles a genuinely different, higher-level question: **given a network with capacity limits on each edge (think: pipes with maximum flow rates, or roads with maximum traffic capacity), what is the maximum amount of "stuff" that can flow from a source to a destination?** This is the **Maximum Flow** problem, and it comes with one of the most beautiful, surprising results in all of graph theory: **it is exactly equal to the Minimum Cut** — the smallest total capacity of edges that, if removed, would disconnect the source from the destination entirely.

---

## 26.1 Bipartite Graphs and Bipartite Matching

### 26.1.1 What Is a Bipartite Graph?

**Definition:** A bipartite graph is a graph whose vertices can be divided into two disjoint groups, such that every edge connects a vertex in one group to a vertex in the other — never connecting two vertices within the same group.

### Real-Life Analogy: Job Applicants and Job Openings

Picture a graph with job applicants on one side and job openings on the other, with an edge connecting an applicant to every job they're qualified for. **This is inherently bipartite** — applicants never connect to other applicants, and jobs never connect to other jobs.

### 🎯 Detecting Bipartiteness (A Direct Callback to Chapter 11's BFS)

```javascript
function isBipartite(graph) {
  const colors = new Map(); // vertex -> 0 or 1 (the two "sides")

  for (const startVertex of graph.getAllVertices()) {
    if (colors.has(startVertex)) continue; // already colored via an earlier component

    colors.set(startVertex, 0);
    const queue = [startVertex]; // Chapter 6/11's BFS queue

    while (queue.length > 0) {
      const current = queue.shift();

      for (const neighbor of graph.getNeighbors(current)) {
        if (!colors.has(neighbor)) {
          colors.set(neighbor, 1 - colors.get(current)); // opposite color from current
          queue.push(neighbor);
        } else if (colors.get(neighbor) === colors.get(current)) {
          return false; // two adjacent vertices have the SAME color -> NOT bipartite!
        }
      }
    }
  }

  return true;
}
```

### 🧠 Memory Trick: The "Two-Coloring" Test

A graph is bipartite **if and only if** it can be colored with exactly two colors such that no edge connects two same-colored vertices — directly, this is also **equivalent to the graph containing no odd-length cycles** (a genuinely elegant, provable fact: any odd cycle forces some adjacent pair to share a color, since alternating colors around an odd-length loop cannot consistently avoid a same-color collision).

### 26.1.2 Bipartite Matching: The Job-Assignment Problem

**Definition:** A matching in a bipartite graph is a set of edges with no shared endpoints — in the job-applicant analogy, each matched edge represents one applicant assigned to one job, with no applicant or job used twice. **Maximum Bipartite Matching** finds the largest such set.

### The Augmenting Path Algorithm (A Direct Preview of This Chapter's Central Technique)

```javascript
function maxBipartiteMatching(leftVertices, graph) {
  const matchRight = new Map(); // right-side vertex -> the left-side vertex it's matched to

  function tryMatch(leftVertex, visited) {
    for (const rightVertex of graph.getNeighbors(leftVertex)) {
      if (visited.has(rightVertex)) continue;
      visited.add(rightVertex);

      // If rightVertex is unmatched, OR we can find an ALTERNATIVE match for
      // whoever it's currently matched to (freeing it up for leftVertex) -- take it!
      if (!matchRight.has(rightVertex) || tryMatch(matchRight.get(rightVertex), visited)) {
        matchRight.set(rightVertex, leftVertex);
        return true;
      }
    }
    return false;
  }

  let matchCount = 0;
  for (const leftVertex of leftVertices) {
    if (tryMatch(leftVertex, new Set())) {
      matchCount++;
    }
  }

  return matchCount;
}
```

### 🧠 Memory Trick: "Bump the Current Match, See If It Can Find Someone Else"

The key insight, worth internalizing since it's the exact seed of this chapter's central Max Flow technique: **when trying to match a new applicant to an already-taken job, don't give up immediately — recursively check if the CURRENTLY matched applicant can be reassigned to a different job instead, freeing up the contested job for the new applicant.** This "displace and recursively re-match" idea, generalized, becomes exactly the **augmenting path** concept powering maximum flow.

---

## 26.2 Maximum Flow: The Ford-Fulkerson Method

### 26.2.1 The Setup: Flow Networks

**Definition:** A flow network is a directed graph where each edge has a **capacity** (the maximum flow it can carry), with a designated **source** vertex (where flow originates) and **sink** vertex (where flow terminates). The Maximum Flow problem asks for the greatest total flow rate achievable from source to sink, without exceeding any edge's capacity.

### ASCII Visualization

```
           10        5
      S -------> A -------> T
      |                     ^
      |          15         |
      +--------> B ---------+
                       10

S = source, T = sink (target)
Capacities shown on each edge. What's the MAXIMUM total flow from S to T?
```

### 26.2.2 The Core Idea: Augmenting Paths and Residual Graphs

**Definition:** The Ford-Fulkerson method repeatedly finds an **augmenting path** — any path from source to sink with available (unused) capacity along every edge — and pushes as much additional flow as that path's **bottleneck** (its minimum remaining capacity) allows, updating a **residual graph** that tracks remaining capacity (and, crucially, "undo" capacity in the reverse direction) after each push.

### 🧠 Memory Trick: Why the Residual Graph Needs Reverse Edges

This is the single most important, most commonly misunderstood detail in the entire algorithm, worth extended attention. **Every time you push flow along an edge, you must add an equal amount of capacity to that edge's REVERSE direction in the residual graph** — even if no such edge existed in the original network. This isn't bookkeeping trivia; it's what allows the algorithm to **"change its mind"** about a previous flow decision if a better overall routing is later discovered.

```
Example showing why reverse edges are ESSENTIAL for correctness:

      S --10--> A --10--> T
      |                   ^
      +---5---> B --------+
                    5

Suppose we FIRST push 10 units along S->A->T (using the direct route).
Residual graph now: S->A has 0 remaining capacity, A->S has 10 "undo" capacity.
                     A->T has 0 remaining capacity, T->A has 10 "undo" capacity.

Now we ALSO want to push 5 units along S->B->? but B only connects meaningfully
IF we could somehow route through A->T again, which is now full...

BUT: what if there had ALSO been an edge B->A with capacity 5 in the original graph?
Then: push S->B (5 units), then B->A (5 units) -- but A->T is FULL (0 remaining)!
HOWEVER, the residual reverse edge T->A (10 capacity, from undoing our first push)
combined with the FORWARD residual A->T... 

The general point: reverse residual edges let a later augmenting path "cancel out"
part of an earlier suboptimal flow choice, rerouting it through a different path,
which is EXACTLY what makes Ford-Fulkerson correct even when the FIRST augmenting
path found isn't part of the truly optimal final solution.
```

### 🎯 Interview Pattern: "Undo" Capacity Is Not Optional

**Without reverse residual edges, Ford-Fulkerson can get "stuck" at a suboptimal total flow**, because it would have no mechanism to reconsider an earlier greedy choice. This directly parallels a lesson from Chapter 20 (Greedy Algorithms): **a naive, purely greedy "just push flow along the first path you find" approach is NOT guaranteed optimal on its own** — the residual graph's reverse edges are precisely the mechanism that lets the algorithm effectively "undo and retry," which is what elevates it from a potentially-wrong greedy heuristic into a provably correct algorithm.

### 26.2.3 Full Implementation Using BFS (Edmonds-Karp Variant)

```javascript
function maxFlow(graph, source, sink, numVertices) {
  // graph: adjacency matrix representation, graph[u][v] = capacity from u to v (0 if no edge)
  const residual = graph.map(row => [...row]); // deep copy — this WILL be mutated

  function bfsFindAugmentingPath() {
    const parent = new Array(numVertices).fill(-1);
    const visited = new Array(numVertices).fill(false);
    const queue = [source];
    visited[source] = true;

    while (queue.length > 0) {
      const current = queue.shift(); // Chapter 6/11's BFS, again!

      for (let next = 0; next < numVertices; next++) {
        if (!visited[next] && residual[current][next] > 0) {
          visited[next] = true;
          parent[next] = current;
          queue.push(next);

          if (next === sink) return parent; // found a path to the sink!
        }
      }
    }

    return null; // no augmenting path exists — we're DONE
  }

  let totalFlow = 0;

  while (true) {
    const parent = bfsFindAugmentingPath();
    if (parent === null) break;

    // Find the BOTTLENECK: the minimum residual capacity along the found path
    let pathFlow = Infinity;
    let node = sink;
    while (node !== source) {
      const prev = parent[node];
      pathFlow = Math.min(pathFlow, residual[prev][node]);
      node = prev;
    }

    // Update the residual graph: subtract forward, ADD backward (the "undo" mechanism!)
    node = sink;
    while (node !== source) {
      const prev = parent[node];
      residual[prev][node] -= pathFlow;
      residual[node][prev] += pathFlow; // THE CRUCIAL REVERSE EDGE UPDATE
      node = prev;
    }

    totalFlow += pathFlow;
  }

  return totalFlow;
}
```

### 🎯 Interview Pattern: "Ford-Fulkerson" vs. "Edmonds-Karp" — A Naming Distinction Worth Knowing

**"Ford-Fulkerson" refers to the general METHOD** (repeatedly find any augmenting path, push flow, update residuals) — it doesn't specify *how* to find the augmenting path, and a poor choice (e.g., always taking whatever DFS finds first) can, in rare constructed cases, require an enormous number of iterations. **"Edmonds-Karp" is the SPECIFIC, standard implementation that uses BFS to find the augmenting path** (as shown above), which provably guarantees a bound of **O(VE²)** total time — a genuinely important refinement worth naming specifically if asked to implement max flow, since "just use Ford-Fulkerson" without specifying the augmenting-path-finding strategy is an incomplete answer.

### Dry Run (Using the Network From Section 26.2.1)

```
S=0, A=1, B=2, T=3
Capacities: S->A=10, S->B=15, A->T=5, B->T=10

BFS finds path S->A->T (bottleneck = min(10,5) = 5)
  residual[S][A] -= 5 -> 5.  residual[A][S] += 5 -> 5.
  residual[A][T] -= 5 -> 0.  residual[T][A] += 5 -> 5.
  totalFlow = 5

BFS finds path S->B->T (bottleneck = min(15,10) = 10)
  residual[S][B] -= 10 -> 5.  residual[B][S] += 10 -> 10.
  residual[B][T] -= 10 -> 0.  residual[T][B] += 10 -> 10.
  totalFlow = 15

BFS looks for another path: S->A has 5 remaining, but A->T is now 0 (and A->B doesn't
exist in this simple example) -- no augmenting path found via A. S->B has 5 remaining,
but B->T is now 0. NO AUGMENTING PATH EXISTS.

Final totalFlow = 15 (matches the intuitive maximum: S can send at most 10+15=25 out,
but T can only receive at most 5+10=15 in, so 15 is indeed the true bottleneck-limited max)
```

### 📌 Quick Revision: Ford-Fulkerson / Edmonds-Karp Complexity

- **Ford-Fulkerson (general method, DFS-based path-finding)**: O(E · maxFlow) — genuinely problematic if capacities are large, since the number of augmenting-path iterations can be proportional to the flow value itself, not just the graph's size.
- **Edmonds-Karp (BFS-based path-finding)**: **O(V·E²)** — a provable bound independent of the actual flow values, making it the standard, safe choice.

---

## 26.3 The Max-Flow Min-Cut Theorem: A Genuinely Beautiful Result

**Definition:** A cut in a flow network is a partition of vertices into two groups, one containing the source and the other containing the sink. The capacity of a cut is the sum of capacities of edges crossing from the source's group to the sink's group. **The Max-Flow Min-Cut Theorem states that the maximum possible flow from source to sink is exactly equal to the minimum possible cut capacity.**

### 🧠 Memory Trick: The Bottleneck Intuition

Think of the network as a system of pipes: **no matter how flow is routed, it can never exceed the capacity of the "narrowest choke point" separating the source from the sink** — and the minimum cut IS precisely that narrowest choke point, found by considering every possible way to separate source from sink and taking the cheapest such separation. **The theorem's genuinely surprising claim is that this upper bound (min cut) is always exactly *achievable*** — not just an unreachable theoretical ceiling, but a value the max flow algorithm actually attains.

### 🎯 Interview Pattern: Finding the Min Cut From a Completed Max Flow Run

Once Ford-Fulkerson/Edmonds-Karp terminates (no more augmenting paths exist), **the min cut is found for free**: run a BFS/DFS from the source using only edges with remaining residual capacity — every vertex reachable this way is on the "source side" of the min cut, and every unreachable vertex is on the "sink side." The cut edges are exactly the original edges crossing from a reachable vertex to an unreachable one, and their capacities sum to exactly the max flow value.

### 🔥 Interview Tip

This is one of the most quotable, elegant results in all of graph theory, worth having ready verbatim: **"Max flow equals min cut — the maximum amount of flow you can push through a network is exactly equal to the capacity of the network's narrowest bottleneck separating source from sink, and this isn't just a theoretical bound, it's always achievable. You can find the actual min cut for free once max flow terminates, just by checking which vertices remain reachable via residual capacity."**

### 🎯 Real-World Applications Worth Naming Unprompted

- **Bipartite matching** (section 26.1.2) is directly solvable as a max flow problem: connect a super-source to every left vertex (capacity 1 each), every right vertex to a super-sink (capacity 1 each), and the original bipartite edges (capacity 1 each) — the max flow equals the maximum matching size, a genuinely elegant unification of two seemingly separate techniques into one.
- **Network reliability/bottleneck analysis**: identifying the min cut in a computer network or supply chain reveals exactly which connections, if disrupted, would most severely limit total throughput — directly actionable for infrastructure investment decisions.
- **Image segmentation** (a computer vision application): pixels as vertices, similarity as edge capacity, min cut separates an image into foreground/background regions.
- **Project selection with dependencies** ("maximum weight closure" problems): a genuinely clever reduction of certain optimization problems into a min-cut computation.

---

## 26.4 Edge Cases and Gotchas Checklist

1. **Disconnected source and sink.** Verify your max flow implementation correctly returns `0` if no path exists at all.
2. **Self-loops or parallel edges in the flow network.** Verify your adjacency matrix representation handles these correctly (self-loops typically contribute nothing useful and should be ignored or given zero effective capacity).
3. **Forgetting the reverse residual edge update** — this is, without exaggeration, the single most common and most severe bug in Ford-Fulkerson implementations, silently producing an incorrect (too-low) max flow value, since the algorithm loses its ability to "undo" suboptimal early choices.
4. **Using DFS instead of BFS for augmenting path finding without realizing the complexity implications** — always default to BFS (Edmonds-Karp) unless you have a specific reason and have verified the graph's structure won't trigger DFS's pathological slow case.
5. **Integer vs. floating-point capacities** — verify your bottleneck (`Math.min`) calculations behave correctly if capacities aren't guaranteed to be integers.
6. **Directed vs. undirected flow networks** — an undirected edge with capacity `c` is typically modeled as two directed edges (each direction, capacity `c`), not capacity `c` shared between both directions; verify this distinction matches your specific problem's intent.

---

## 26.5 Chapter Summary

This chapter extended Chapters 11-14's graph foundations into genuinely advanced territory, opening with bipartite graphs — detected via Chapter 11's BFS combined with a two-coloring test, and provably equivalent to the graph containing no odd-length cycles — and bipartite matching, whose augmenting-path algorithm ("displace the current match, recursively check if it can find an alternative, then take the freed slot") turned out to be the exact conceptual seed of this chapter's central technique, not a separate, unrelated idea.

We built **Maximum Flow** around the Ford-Fulkerson method: repeatedly find an augmenting path with available capacity, push flow equal to its bottleneck, and update a **residual graph**. We gave extended, careful attention to the single most commonly misunderstood detail in the entire algorithm: **every forward flow push must be accompanied by an equal "undo" capacity added in the reverse direction**, without which the algorithm would have no mechanism to reconsider an earlier suboptimal routing choice — directly echoing Chapter 20's lesson that naive, purely greedy, "never look back" strategies aren't automatically correct, and that a genuine correctness guarantee requires the specific mechanism (here, reverse residual edges) that allows revision. We distinguished the general **Ford-Fulkerson method** from its specific, standard **Edmonds-Karp implementation** (using BFS, directly reusing Chapter 6/11's queue-based traversal, to find augmenting paths), noting the provable O(VE²) bound this specific choice guarantees, versus the general method's potentially problematic dependence on the actual flow value's magnitude when a poorer path-finding strategy is used.

We closed with the **Max-Flow Min-Cut Theorem** — a genuinely beautiful, surprising result stating that the maximum achievable flow is always *exactly* equal to the network's narrowest bottleneck (the minimum cut separating source from sink), not merely bounded by it, and that this minimum cut can be recovered for free once max flow terminates, simply by checking residual reachability from the source. We closed with a survey of real-world applications worth naming unprompted in an interview: bipartite matching reduces directly to a max flow computation (a genuinely elegant unification of two techniques covered in the same chapter), alongside network reliability analysis, image segmentation, and project-selection-with-dependencies problems — demonstrating that this chapter's techniques, while among the most mathematically sophisticated in the book, have correspondingly wide, genuinely practical real-world reach.

---

## 26.6 Revision Notes

- Bipartite graphs are detected via Chapter 11's BFS combined with two-coloring; equivalent to containing no odd-length cycles.
- Bipartite matching's augmenting-path algorithm ("displace and recursively re-match") is the conceptual seed of this chapter's central max-flow technique, not a separate idea.
- Ford-Fulkerson repeatedly finds an augmenting path, pushes flow equal to its bottleneck, and updates a residual graph — the reverse residual edge update is non-negotiable, providing the "undo" mechanism that makes the algorithm correct rather than a potentially-wrong greedy heuristic.
- Edmonds-Karp is the specific, standard implementation using BFS for augmenting-path finding, guaranteeing O(VE²) — a critical refinement over the unspecified general Ford-Fulkerson method.
- The Max-Flow Min-Cut Theorem: maximum flow always exactly equals the minimum cut capacity — not just an upper bound, but always achievable, and recoverable for free via residual reachability once max flow terminates.
- Bipartite matching reduces directly to a max flow computation via a super-source/super-sink construction — a genuine unification of this chapter's two halves.

---

## 26.7 Mind Map (ASCII)

```
                  ADVANCED GRAPH THEORY & NETWORK FLOW
                                  |
      +------------------+-------+-------+------------------------+
      |                  |               |                        |
  BIPARTITE           MAXIMUM FLOW    RESIDUAL GRAPH          MAX-FLOW
  GRAPHS              (Ford-Fulkerson) & REVERSE EDGES        MIN-CUT THEOREM
      |                    |               |                       |
  Two-coloring test    Augmenting path: Every forward push    Max flow EXACTLY
  (Ch.11 BFS) =        find path with   needs a reverse       equals min cut
  equivalent to        available        "undo" edge -- THE    capacity (narrowest
  "no odd cycles"      capacity, push   #1 correctness         bottleneck)
      |                bottleneck       requirement (echoes         |
  Bipartite            flow                  Ch.20: naive      NOT just a bound
  MATCHING:                |             greedy isn't          -- ALWAYS
  augmenting-path      Edmonds-Karp =    automatically         ACHIEVABLE
  algorithm            SPECIFIC impl.    correct without a          |
  ("displace &         using BFS         revision mechanism)   Find min cut FREE:
  re-match")           (Ch.6/11 queue)        |                BFS/DFS from source
  = SEED of this        -> O(V*E^2)      Ford-Fulkerson =      using residual
  chapter's max-        guaranteed       the GENERAL method,   capacity; reachable
  flow technique        bound            unspecified path-      = source side
      |                                  finding strategy            |
  REDUCES TO MAX                                               Applications:
  FLOW via super-                                              bipartite matching,
  source/super-sink                                            network reliability,
  construction!                                                image segmentation,
  (unifies both                                                project selection
  halves of chapter)
```

---

## 26.8 Cheat Sheet

```
BIPARTITE GRAPH DETECTION
=============================
Two-color via BFS (Ch.11): if any edge connects two same-colored vertices -> NOT bipartite
Equivalent fact: bipartite <=> no odd-length cycles

BIPARTITE MATCHING (AUGMENTING PATH)
========================================
For each left vertex, try to match it to an unmatched right neighbor.
If all neighbors are taken, try to DISPLACE one (recursively re-match its
current partner to a DIFFERENT vertex) -- if successful, take the freed slot.

MAX FLOW (FORD-FULKERSON / EDMONDS-KARP)
============================================
while an augmenting path (source to sink, available capacity) exists:
    bottleneck = MIN residual capacity along the path
    for each edge (u,v) on the path:
        residual[u][v] -= bottleneck    <- forward: use up capacity
        residual[v][u] += bottleneck    <- REVERSE: add "undo" capacity (CRITICAL!)
    totalFlow += bottleneck
return totalFlow

Ford-Fulkerson (general method): path-finding strategy unspecified, can be O(E*maxFlow) worst case
Edmonds-Karp (BFS-specific):     O(V*E^2) GUARANTEED -- the standard, safe choice

MAX-FLOW MIN-CUT THEOREM
============================
max flow == min cut capacity (ALWAYS, exactly, not just an upper bound)
Find min cut for FREE after max flow completes:
  BFS/DFS from source using only edges with remaining residual capacity
  Reachable vertices = source side. Unreachable = sink side.
  Cut edges = original edges crossing from reachable to unreachable.

APPLICATIONS
===============
Bipartite matching = max flow (super-source -> left, capacity 1 each;
                                right -> super-sink, capacity 1 each;
                                original edges, capacity 1 each)
Network reliability, image segmentation, project selection (max weight closure)
```

---

## 26.9 Key Takeaways

1. Bipartite graphs are detected via two-coloring (Chapter 11's BFS) and are equivalent to having no odd-length cycles.
2. Bipartite matching's "displace and recursively re-match" augmenting-path technique is the direct conceptual seed of maximum flow, not a separate idea.
3. The residual graph's reverse "undo" edges are non-negotiable for Ford-Fulkerson's correctness — without them, the algorithm can't revise an earlier suboptimal choice.
4. Edmonds-Karp (BFS-based augmenting paths) guarantees O(VE²), a critical, specific refinement over the unspecified general Ford-Fulkerson method.
5. The Max-Flow Min-Cut Theorem states these two quantities are always exactly equal, not just bounded — and the min cut is recoverable for free via residual reachability.

---

## 26.10 20 Multiple Choice Questions

1. What defines a bipartite graph?
   a) A graph with exactly two vertices
   b) A graph whose vertices can be split into two groups where every edge connects one group to the other, never within a group
   c) A graph with exactly two edges
   d) A tree with two branches

2. What technique detects whether a graph is bipartite?
   a) Sorting the vertices
   b) A two-coloring test using BFS, checking that no edge connects same-colored vertices
   c) Computing the graph's diameter
   d) Running Dijkstra's algorithm

3. What structural property is equivalent to a graph being bipartite?
   a) Having exactly n-1 edges
   b) Containing no odd-length cycles
   c) Being a tree
   d) Having a Hamiltonian path

4. What is the "displace and recursively re-match" technique in bipartite matching?
   a) Randomly reassigning all matches
   b) When a contested match is found, recursively checking if the current holder can be reassigned elsewhere, freeing the slot
   c) Sorting all vertices before matching
   d) Always keeping the first match found, never revising it

5. What does the bipartite matching algorithm's core technique directly seed?
   a) Sorting algorithms
   b) This chapter's maximum flow algorithm (augmenting paths)
   c) Binary search
   d) Hash table design

6. What is an augmenting path in the context of maximum flow?
   a) Any path from source to sink
   b) A path from source to sink with available (unused) capacity along every edge
   c) The shortest path in the network
   d) A path with zero capacity

7. What is the "bottleneck" of an augmenting path?
   a) The total capacity of all edges combined
   b) The minimum residual capacity among all edges along the path
   c) The number of edges in the path
   d) The maximum capacity among all edges

8. What is the single most critical, commonly-missed detail in implementing Ford-Fulkerson?
   a) Using DFS instead of BFS
   b) Adding a reverse "undo" edge to the residual graph after every forward flow push
   c) Sorting the edges by capacity first
   d) Using a Fenwick Tree for capacity tracking

9. Why is the reverse residual edge update necessary for correctness?
   a) It's optional; the algorithm works fine without it
   b) It allows the algorithm to revise/undo an earlier suboptimal flow-routing choice
   c) It only matters for undirected graphs
   d) It prevents integer overflow

10. What earlier chapter's lesson does the reverse-edge requirement directly echo?
    a) Chapter 15's sorting stability
    b) Chapter 20's lesson that naive greedy strategies aren't automatically correct without a revision mechanism
    c) Chapter 9's heap building
    d) Chapter 5's linked list reversal

11. What is the difference between "Ford-Fulkerson" and "Edmonds-Karp"?
    a) They are unrelated algorithms
    b) Ford-Fulkerson is the general method with an unspecified path-finding strategy; Edmonds-Karp specifically uses BFS, guaranteeing O(VE²)
    c) Edmonds-Karp doesn't use residual graphs
    d) Ford-Fulkerson only works on bipartite graphs

12. What is the time complexity guarantee of Edmonds-Karp?
    a) O(V + E)
    b) O(V * E²)
    c) O(E * maxFlow), dependent on flow value
    d) O(V²)

13. What is a potential problem with the general Ford-Fulkerson method if a poor path-finding strategy (e.g., naive DFS) is used?
    a) It becomes incorrect
    b) The number of iterations can become proportional to the flow value itself, not just graph size
    c) It cannot find any augmenting path at all
    d) It only works for undirected graphs

14. What does the Max-Flow Min-Cut Theorem state?
    a) Max flow is always greater than min cut
    b) Maximum flow is always EXACTLY equal to the minimum cut capacity
    c) Max flow and min cut are unrelated quantities
    d) Min cut is always zero

15. Is the min cut capacity merely an upper bound on max flow, or is it always achievable?
    a) It's merely a theoretical upper bound, rarely achieved
    b) It's always exactly achievable, not just a bound
    c) It depends on whether the graph is bipartite
    d) It's only achievable for undirected graphs

16. How can you find the min cut for free after running max flow to completion?
    a) Re-run the entire algorithm from scratch with different parameters
    b) BFS/DFS from the source using only edges with remaining residual capacity; reachable vertices are the source side
    c) Sort all edges by capacity
    d) It cannot be found without a separate algorithm

17. How does bipartite matching relate to maximum flow?
    a) They are unrelated problems
    b) Bipartite matching reduces directly to a max flow computation via a super-source/super-sink construction with capacity-1 edges
    c) Bipartite matching is always faster than max flow
    d) Maximum flow only works on bipartite graphs

18. What is a real-world application of the min-cut concept mentioned in this chapter?
    a) Sorting large datasets
    b) Network reliability/bottleneck analysis and image segmentation
    c) String pattern matching
    d) Binary search optimization

19. What data structure from earlier chapters powers the Edmonds-Karp augmenting-path search?
    a) A stack (Chapter 6)
    b) A queue, for BFS (Chapters 6 and 11)
    c) A heap (Chapter 9)
    d) A trie (Chapter 10)

20. What should you verify regarding undirected edges when modeling a flow network?
    a) Undirected edges cannot be used in flow networks
    b) An undirected edge with capacity c is typically modeled as two directed edges, each with capacity c
    c) Undirected edges automatically have infinite capacity
    d) Undirected edges must be removed before running max flow

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-b, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-b, 19-b, 20-b

---

## 26.11 20 Coding Problems

**Easy**

1. Implement `isBipartite` from memory (section 26.1.1), and test it on both a bipartite and a non-bipartite (odd-cycle-containing) graph.
2. Write a function to construct a simple flow network (adjacency matrix) from a list of edges with capacities.
3. Implement a function to find the bottleneck (minimum capacity) along a given path in a flow network.
4. Given a flow network, write a function to verify that a claimed flow assignment respects every edge's capacity constraint.
5. Implement a simple BFS-based path existence checker for a residual graph (a helper for the full max flow algorithm).

**Medium**

6. Implement `maxBipartiteMatching` from memory (section 26.1.2), and verify it against a small hand-constructed job-assignment example.
7. Implement the full `maxFlow` (Edmonds-Karp) function from memory (section 26.2.3), and verify against the book's dry run.
8. Given a completed max flow computation, implement a function to find the min cut (the specific edges) using residual-graph reachability.
9. Given a bipartite graph representing students and elective courses (each student can take one course, each course has one slot), use max flow to determine the maximum number of students that can be assigned.
10. Implement a function to verify the Max-Flow Min-Cut theorem empirically: compute max flow and min cut independently on the same network, and confirm they're equal.

**Hard**

11. Given a network with multiple sources and multiple sinks, adapt the max flow algorithm using a "super-source" and "super-sink" construction (connecting all sources/sinks with infinite-capacity edges) to find the maximum total flow.
12. Implement "Minimum Vertex Cover" for a bipartite graph using König's theorem (a genuinely elegant result stating that in bipartite graphs, the minimum vertex cover size equals the maximum matching size), building on your bipartite matching implementation.
13. Given a flow network where edges also have MINIMUM required flow (not just maximum capacity), describe (with a simplified implementation) how the max flow algorithm would need to be adapted to handle this "lower bound" constraint.
14. Implement a project-selection ("maximum weight closure") solver: given projects with profits/costs and dependencies, use a min-cut reduction to determine the optimal subset of projects to undertake.
15. Given a large bipartite graph (e.g., thousands of applicants and jobs), benchmark your max-flow-based matching solution against the direct augmenting-path bipartite matching algorithm (section 26.1.2), discussing when each approach is preferable.

**Interview Level**

16. **(Google-level)** Given a data center network with bandwidth capacities between servers, use max flow to determine the maximum sustainable data transfer rate between two specific servers, and use min cut to identify the specific network links that would need upgrading to increase capacity.
17. **(Amazon-level)** Given a warehouse-to-customer delivery network with capacity constraints on each route segment, use max flow to determine the maximum number of packages deliverable per day, and discuss how this informs logistics infrastructure investment decisions.
18. **(Microsoft-level)** Given a task-assignment system where employees have varying skill sets (bipartite: employees to tasks) and each task can be assigned to exactly one employee, use max flow to find the maximum number of tasks that can be staffed, and discuss handling employees who can do multiple tasks.
19. **(Meta-level)** Given a content moderation queue distribution problem (moderators to content types, bipartite, each moderator can handle multiple content types up to a capacity limit), extend the standard bipartite matching to a capacitated flow problem and solve it with max flow.
20. **(Netflix-level)** Design a content delivery network (CDN) capacity planning tool: given server-to-region bandwidth capacities, use max flow to determine the maximum total content delivery rate to a specific region, and use the min-cut result to identify and report the exact bottleneck links limiting further scaling.

---

## 26.12 5 Interview Questions

1. "How would you determine if a graph is bipartite?" (Tests the two-coloring BFS technique and the odd-cycle equivalence.)
2. "Implement maximum bipartite matching, and explain the core idea behind your algorithm." (Tests the augmenting-path/displacement technique specifically.)
3. "Implement the Ford-Fulkerson algorithm for maximum flow, and explain why the residual graph needs reverse edges." (Tests both implementation and the critical correctness detail.)
4. "What is the Max-Flow Min-Cut theorem, and how would you find the actual min cut once you've computed max flow?" (Tests the theorem itself and the free min-cut-recovery technique.)
5. "How does bipartite matching relate to maximum flow?" (Tests the unifying reduction connecting both halves of this chapter.)

---

## 26.13 3 Real Projects

1. **Complete Flow Algorithm Library**: Implement bipartite graph detection, bipartite matching, and Edmonds-Karp maximum flow (with min-cut recovery) in a single library, with a self-check script verifying the Max-Flow Min-Cut theorem holds across randomized test networks.
2. **Job Assignment Optimizer**: Build a tool that takes a list of job applicants with their qualifications and a list of job openings with requirements, models it as a bipartite graph, and uses max flow to find the maximum number of successful assignments, reporting the specific matches made.
3. **Network Bottleneck Analyzer**: Build a tool that takes a network topology with bandwidth capacities, computes the maximum flow between any two specified nodes, and reports the specific min-cut edges — directly useful for identifying which network links would most improve throughput if upgraded.

---

## 26.14 Further Reading

- L.R. Ford Jr. and D.R. Fulkerson's original 1956 paper introducing the max flow method bearing their names.
- Jack Edmonds and Richard Karp's 1972 paper establishing the BFS-based polynomial-time bound for the algorithm bearing their names.
- Search "König's theorem bipartite graphs" for the elegant minimum-vertex-cover result mentioned in coding problem #12.
- Jon Kleinberg and Éva Tardos, *Algorithm Design*, chapter on network flow, for the definitive, rigorous treatment of max flow applications, including project selection and image segmentation.
- LeetCode's and competitive programming resources' "Network Flow" and "Bipartite Matching" problem sets, for extensive additional practice.

---

*End of Chapter 26. Next: Chapter 27 will cover System Design Connections for DSA — how the data structures and algorithms throughout this book directly underpin real system design decisions: caching strategies, database indexing, load balancing, rate limiting, and distributed systems concepts, bridging the gap between "I can solve this algorithm problem" and "I understand why production systems are built this way."*

**Say "Continue to the next chapter" when ready.**
