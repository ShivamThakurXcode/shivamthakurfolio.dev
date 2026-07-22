# The JavaScript Data Structures & Algorithms Handbook

---

# Chapter 21: The Monotonic Stack & Monotonic Queue Masterclass

---

## 21.0 The Problem: "Next Greater Element" and Why Brute Force Feels Unavoidable

**The problem:** given an array, for every element, find the **next element to its right that's greater than it** (or report none exists).

```javascript
// Naive brute force
function nextGreaterElementNaive(nums) {
  const result = new Array(nums.length).fill(-1);

  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[j] > nums[i]) {
        result[i] = nums[j];
        break;
      }
    }
  }

  return result;
}
// Time: O(n²) — a nested loop, exactly Chapter 1's classic quadratic signature
```

This is Chapter 6 and Chapter 9's stack/heap toolkit's next natural extension: **is there a data structure that lets us answer "what's the next greater element" for every position in a single O(n) pass?** This chapter introduces the **monotonic stack** and **monotonic queue** — specialized usage disciplines (recall Chapter 6's core lesson: stacks and queues are restricted-interface structures, not new capabilities) that achieve exactly this.

---

## 21.1 The Monotonic Stack: Maintaining Order as You Go

**Definition:** A monotonic stack is a stack maintained so that its elements are always in strictly increasing (or decreasing) order from bottom to top — achieved by popping any elements that would violate this order before pushing a new element.

### 🧠 Memory Trick: The Bouncer at an Increasingly Exclusive Club

Imagine a stack representing a line of people at an increasingly exclusive club, where the rule is "everyone currently in line must be taller than everyone in front of them" (a monotonic increasing stack, bottom to top). When a new, very tall person arrives, **everyone shorter than them, standing at the back of the line, gets kicked out** (popped) — because the new tall person now makes those shorter people at the back completely irrelevant; nobody behind the tall person will ever need to interact with them again, since the tall person now "blocks" that role. This is exactly the pop-before-push discipline of a monotonic stack.

### 21.1.1 Solving "Next Greater Element" in O(n)

```javascript
function nextGreaterElement(nums) {
  const result = new Array(nums.length).fill(-1);
  const stack = []; // will hold INDICES, maintaining a decreasing order of VALUES from bottom to top

  for (let i = 0; i < nums.length; i++) {
    // While the current element is GREATER than the value at the stack's top index,
    // the current element IS that index's "next greater element" — resolve it!
    while (stack.length > 0 && nums[i] > nums[stack[stack.length - 1]]) {
      const indexToResolve = stack.pop();
      result[indexToResolve] = nums[i];
    }

    stack.push(i);
  }

  return result; // any indices STILL in the stack at the end have no next greater element (-1, unchanged)
}

console.log(nextGreaterElement([2, 1, 2, 4, 3])); // [4, 2, 4, -1, -1]
```

### Dry Run

```
nums = [2, 1, 2, 4, 3]
result = [-1,-1,-1,-1,-1], stack = []

i=0 (val=2): stack empty, nothing to resolve. push 0. stack=[0]
i=1 (val=1): nums[1]=1 > nums[stack.top=0]=2? NO. push 1. stack=[0,1]
i=2 (val=2): nums[2]=2 > nums[stack.top=1]=1? YES!
    pop 1. result[1] = 2.                          result=[-1,2,-1,-1,-1]
  nums[2]=2 > nums[stack.top=0]=2? NO (not strictly greater). stop popping.
  push 2. stack=[0,2]
i=3 (val=4): nums[3]=4 > nums[stack.top=2]=2? YES!
    pop 2. result[2] = 4.                          result=[-1,2,4,-1,-1]
  nums[3]=4 > nums[stack.top=0]=2? YES!
    pop 0. result[0] = 4.                          result=[4,2,4,-1,-1]
  stack now empty. push 3. stack=[3]
i=4 (val=3): nums[4]=3 > nums[stack.top=3]=4? NO. push 4. stack=[3,4]

Loop ends. Indices STILL in stack (3, 4) never found a next-greater element -> stay -1.

Final: [4, 2, 4, -1, -1] ✓
```

### 🧮 Why This Is O(n), Not O(n²) — The Amortized Argument (A Direct Echo of Chapter 3's Sliding Window Analysis)

This is worth proving rigorously, because the nested `while` loop inside a `for` loop might look, at a glance, like Chapter 1's quadratic signature. **The key insight, directly parallel to Chapter 3's sliding window "total pointer movement" analysis: every single index is pushed onto the stack exactly once, and popped at most once, across the ENTIRE algorithm's execution — not once per outer loop iteration.** Since the total number of pushes is bounded by `n`, and the total number of pops is also bounded by `n` (you can't pop more times than you've pushed), the *total* work across the whole algorithm — summed across every iteration of both loops — is O(n) + O(n) = **O(n)**, not O(n²). This exact "total operations across the whole run is bounded, even though a nested-loop-shaped structure exists" reasoning is one of the most important, recurring analytical tools in this entire book, appearing now for the third time (Chapter 3's sliding window, Chapter 11's BFS/DFS visited-tracking, and here).

### 🎯 Interview Pattern: Recognizing Monotonic Stack Problems

The signal phrases: **"next greater/smaller element," "previous greater/smaller element," "how many days until a warmer temperature" (a direct restatement of "next greater element"), "largest rectangle in a histogram."** Whenever a problem asks about the *nearest* element satisfying a comparison in one direction, and a brute-force approach would be O(n²), suspect a monotonic stack can bring it to O(n).

---

## 21.2 Worked Problem: Daily Temperatures

**The problem:** given daily temperatures, for each day, find how many days you'd have to wait until a warmer temperature (or `0` if never).

```javascript
function dailyTemperatures(temperatures) {
  const result = new Array(temperatures.length).fill(0);
  const stack = []; // indices, maintaining DECREASING temperature order bottom-to-top

  for (let i = 0; i < temperatures.length; i++) {
    while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
      const indexToResolve = stack.pop();
      result[indexToResolve] = i - indexToResolve; // the DISTANCE (days waited), not the temperature itself!
    }

    stack.push(i);
  }

  return result;
}

console.log(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]));
// [1, 1, 4, 2, 1, 1, 0, 0]
```

### 🎯 Interview Pattern: The Exact Same Skeleton, a Different "Payload"

Compare this directly against `nextGreaterElement` in section 21.1.1 — **the algorithm's skeleton is character-for-character identical; only what gets stored in `result` upon resolution differs** (the actual next-greater *value* versus the *distance/index-difference* to it). This is a genuinely valuable realization: **once you've internalized the monotonic stack skeleton, an enormous family of "next greater/smaller"-shaped problems become a matter of swapping one line** (what to record upon resolving a stack entry), not re-deriving the entire algorithm from scratch each time.

---

## 21.3 Worked Problem: Largest Rectangle in a Histogram

**The problem:** given an array of bar heights representing a histogram (each bar has width 1), find the area of the largest rectangle that can be formed using contiguous bars.

### Naive Approach: For Each Bar, Expand Left and Right

```javascript
function largestRectangleNaive(heights) {
  let maxArea = 0;

  for (let i = 0; i < heights.length; i++) {
    let left = i, right = i;

    while (left > 0 && heights[left - 1] >= heights[i]) left--;
    while (right < heights.length - 1 && heights[right + 1] >= heights[i]) right++;

    maxArea = Math.max(maxArea, heights[i] * (right - left + 1));
  }

  return maxArea;
}
// Time: O(n²) worst case (e.g., all bars the same height, expansion is O(n) per bar)
```

### Optimized: Monotonic Increasing Stack

```javascript
function largestRectangleArea(heights) {
  const stack = []; // indices, maintaining INCREASING height order bottom-to-top
  let maxArea = 0;

  for (let i = 0; i <= heights.length; i++) {
    const currentHeight = i === heights.length ? 0 : heights[i]; // sentinel: force final resolution

    while (stack.length > 0 && currentHeight < heights[stack[stack.length - 1]]) {
      const heightIndex = stack.pop();
      const height = heights[heightIndex];
      // The width extends from the element AFTER the new stack top, to the current index
      const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
      maxArea = Math.max(maxArea, height * width);
    }

    stack.push(i);
  }

  return maxArea;
}

console.log(largestRectangleArea([2, 1, 5, 6, 2, 3])); // 10 (bars of height 5,6 -> width 2 -> area 10)
```

### 🧠 Memory Trick: "When a Shorter Bar Appears, Every Taller Bar Behind It Has Found Its Right Boundary"

The core insight: **maintain a stack of increasing heights. When a new, shorter bar arrives, every taller bar still in the stack can no longer extend any further right** (the new short bar blocks them) — so we can now definitively calculate their maximum rectangle area, using the current index as the right boundary and the *new* stack top (after popping the taller bar) as the left boundary. The sentinel `0` appended at the very end (`i === heights.length ? 0 : heights[i]`) is a clever trick ensuring every remaining bar in the stack gets properly resolved, even if the array never naturally contains a value low enough to trigger their resolution otherwise.

### Dry Run (Abbreviated)

```
heights = [2, 1, 5, 6, 2, 3],  process with sentinel 0 appended conceptually at the end

i=0 (h=2): stack empty. push 0. stack=[0]
i=1 (h=1): 1 < heights[0]=2? YES!
    pop 0. height=2. width = stack empty -> i=1. area = 2*1=2. maxArea=2
  push 1. stack=[1]
i=2 (h=5): 5 < heights[1]=1? No. push 2. stack=[1,2]
i=3 (h=6): 6 < heights[2]=5? No. push 3. stack=[1,2,3]
i=4 (h=2): 2 < heights[3]=6? YES!
    pop 3. height=6. width = i - stack.top(2) - 1 = 4-2-1=1. area=6*1=6. maxArea=6
  2 < heights[2]=5? YES!
    pop 2. height=5. width = i - stack.top(1) - 1 = 4-1-1=2. area=5*2=10. maxArea=10
  2 < heights[1]=1? No. push 4. stack=[1,4]
i=5 (h=3): 3 < heights[4]=2? No. push 5. stack=[1,4,5]
i=6 (sentinel h=0): 0 < heights[5]=3? YES!
    pop 5. height=3. width = 6-4-1=1. area=3. maxArea stays 10.
  0 < heights[4]=2? YES!
    pop 4. height=2. width = 6-1-1=4. area=8. maxArea stays 10.
  0 < heights[1]=1? YES!
    pop 1. height=1. width = stack empty -> i=6. area=6. maxArea stays 10.

Final maxArea = 10 ✓ (matches expected output)
```

### 🎯 Interview Pattern

This is widely considered one of the hardest "standard" monotonic stack problems, specifically because the width calculation (`stack.length === 0 ? i : i - stack[stack.length-1] - 1`) requires carefully reasoning about exactly what the *new* stack top (after popping) represents — the nearest bar to the left that's still shorter than the bar being resolved, making it a genuine left-boundary limit. Take the time to internalize this width formula through the dry run above; it's a frequently-tested, easy-to-get-subtly-wrong detail.

---

## 21.4 The Monotonic Queue: Powering Sliding Window Maximum in O(n)

Recall Chapter 6's closing teaser: **the deque is the exact structure used to optimize the Sliding Window Maximum problem.** This section delivers on that promise.

**The problem:** given an array and a window size `k`, find the maximum value in every contiguous window of size `k` as it slides across the array.

### Naive Approach

```javascript
function maxSlidingWindowNaive(nums, k) {
  const result = [];

  for (let i = 0; i <= nums.length - k; i++) {
    let maxInWindow = -Infinity;
    for (let j = i; j < i + k; j++) {
      maxInWindow = Math.max(maxInWindow, nums[j]);
    }
    result.push(maxInWindow);
  }

  return result;
}
// Time: O(n * k) — recomputing the max from scratch for every window
```

### Optimized: Monotonic Decreasing Deque

```javascript
function maxSlidingWindow(nums, k) {
  const deque = []; // stores INDICES, maintaining DECREASING value order front-to-back
  const result = [];

  for (let i = 0; i < nums.length; i++) {
    // Remove indices that have fallen OUT of the current window (from the FRONT)
    if (deque.length > 0 && deque[0] <= i - k) {
      deque.shift(); // NOTE: O(n) with a plain array! Use Chapter 6's Deque class in production.
    }

    // Remove indices whose VALUES are smaller than the current value (from the BACK) —
    // they can NEVER be the maximum again, since the current, later, LARGER value
    // will outlast them in every future window they'd both be part of.
    while (deque.length > 0 && nums[deque[deque.length - 1]] < nums[i]) {
      deque.pop();
    }

    deque.push(i);

    if (i >= k - 1) {
      result.push(nums[deque[0]]); // the FRONT of the deque is always the current window's maximum
    }
  }

  return result;
}

console.log(maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3));
// [3, 3, 5, 5, 6, 7]
```

### 🧠 Memory Trick: "The Deque Front Is Always the Champion, the Back Discards the Weak"

Think of the deque as a "tournament bracket in progress," maintained left-to-right in decreasing strength: **the front always holds the current strongest (largest) contender for the window's maximum. Whenever a new, stronger contender arrives, every weaker contender at the back immediately gets eliminated** (popped), since they can never win a maximum comparison against this new, later-arriving, stronger value for as long as both remain in any future window. The front only gets removed when it *ages out* of the window entirely (its index falls too far behind the current position) — not because a stronger value beat it, but because it's simply no longer part of the current window at all.

### Dry Run (Abbreviated, k=3)

```
nums = [1, 3, -1, -3, 5, 3, 6, 7], k=3
deque=[]

i=0 (val=1): deque empty. push 0. deque=[0]
i=1 (val=3): nums[deque.back=0]=1 < 3? YES -> pop 0. deque=[]
  push 1. deque=[1]
i=2 (val=-1): nums[deque.back=1]=3 < -1? No. push 2. deque=[1,2]
  i=2 >= k-1=2 -> result.push(nums[deque.front=1]=3)  result=[3]
i=3 (val=-3): deque.front=1, is 1 <= i-k=0? No, still in window.
  nums[deque.back=2]=-1 < -3? No. push 3. deque=[1,2,3]
  result.push(nums[deque.front=1]=3)  result=[3,3]
i=4 (val=5): deque.front=1, is 1 <= i-k=1? YES -> shift. deque=[2,3]
  nums[deque.back=3]=-3 < 5? YES -> pop 3. deque=[2]
  nums[deque.back=2]=-1 < 5? YES -> pop 2. deque=[]
  push 4. deque=[4]
  result.push(nums[deque.front=4]=5)  result=[3,3,5]

... (continues similarly) ...

Final result: [3, 3, 5, 5, 6, 7] ✓
```

### 🧮 Complexity: The Same Amortized Argument, a Third Time

- **Time**: **O(n)** — exactly the same amortized reasoning as the monotonic stack (section 21.1.1): every index is pushed and popped (from either end) at most once across the entire algorithm's run, regardless of how many "windows" are processed.
- **Space**: O(k) for the deque (it never holds more than `k` indices at once, since aged-out indices are removed).

### 🔥 Interview Tip

This problem is a fantastic, comprehensive capstone for demonstrating cross-chapter fluency: it requires **Chapter 6's deque** (the underlying structure), **Chapter 3's sliding window** (the overall problem shape), and **this chapter's monotonic-ordering discipline** (what makes it efficient), all working together. Stating this composition explicitly — "I'm using a deque maintained in monotonically decreasing order, giving O(1) access to the current window's maximum, with total work bounded to O(n) across the whole slide" — is exactly the kind of synthesized, multi-chapter answer that signals deep, connected understanding rather than isolated topic memorization.

---

## 21.5 Edge Cases and Gotchas Checklist for Monotonic Stack/Queue Problems

1. **Empty input array.** Verify functions return sensible results (empty array, all `-1`/`0`, etc.) without crashing.
2. **All elements identical.** Stress-tests the strict-vs-non-strict comparison (`>` vs. `>=`) in your monotonic condition — verify your specific problem's tie-breaking requirement.
3. **Strictly increasing or strictly decreasing input** — verify the stack/deque correctly handles the case where almost nothing ever gets popped (or everything gets popped immediately), both valid, common edge cases.
4. **Storing indices vs. storing values** — the overwhelming majority of monotonic stack/queue problems should store **indices**, not raw values, because you frequently need to know *distance* (Daily Temperatures) or *window membership* (Sliding Window Maximum) in addition to the value itself; storing only values loses this information.
5. **The sentinel trick's boundary condition** — in Largest Rectangle in a Histogram, verify the sentinel value (`0`, or sometimes `-1` depending on convention) is appended/considered correctly to force full resolution of any remaining stack entries at the very end.
6. **Sliding window deque front-removal condition** — always double check the exact inequality (`deque[0] <= i - k` vs. `deque[0] < i - k + 1`, which are equivalent but easy to get subtly wrong) for when an index has genuinely aged out of the current window.
7. **Using `.shift()` on a plain array for the deque's front removal** — per Chapter 6's lesson, this is O(n) and should be replaced with a proper `Deque` class (Chapter 6, section 6.3) in genuinely performance-sensitive production code, even though it's commonly accepted for interview whiteboard clarity.

---

## 21.6 Chapter Summary

This chapter delivered on Chapter 6's explicit promise, formalizing the monotonic stack and monotonic queue as specialized usage disciplines — not new fundamental capabilities, but Chapter 6's stack and deque, used with a specific, carefully-maintained ordering invariant that turns an apparent O(n²) brute-force problem family into O(n). We built the monotonic stack around the "bouncer at an increasingly exclusive club" intuition — pop everything that a new, more extreme arrival makes permanently irrelevant, before pushing the new arrival — and proved its O(n) complexity using the exact same amortized "total operations bounded across the whole run, not per outer iteration" argument that's now appeared three times in this book (Chapter 3's sliding window, Chapter 11's graph traversal, and here), a reasoning pattern worth recognizing as a recurring analytical tool rather than a one-off trick.

We solved Next Greater Element and Daily Temperatures side by side specifically to demonstrate that **an enormous family of monotonic stack problems share one identical skeleton**, differing only in what gets recorded upon resolving a stack entry (the value itself, versus the index-distance to it) — a genuinely valuable realization that turns "learn N different algorithms" into "learn one skeleton, adapt one line." We then tackled Largest Rectangle in a Histogram as this chapter's hardest problem, requiring careful reasoning about exactly what the post-pop stack top represents (the nearest remaining shorter bar, defining a genuine left boundary) to correctly compute each resolved bar's maximal rectangle width — a detail worth internalizing through the full dry run rather than treating the formula as a black box.

Finally, we delivered on Chapter 6's specific forward reference: **Sliding Window Maximum**, solved via a monotonic decreasing deque maintaining the current window's champion at its front, discarding weaker, permanently-irrelevant contenders from the back the moment a stronger value arrives, and removing aged-out indices from the front as the window slides — a genuine capstone requiring simultaneous fluency in Chapter 6's deque, Chapter 3's sliding window framing, and this chapter's monotonic-ordering discipline, and a strong, concrete illustration of how this book's individual chapters are designed to compose into solutions no single chapter could fully explain in isolation.

---

## 21.7 Revision Notes

- Monotonic stacks/queues are usage disciplines on Chapter 6's stack/deque, not new capabilities — maintaining a carefully ordered structure turns O(n²) brute force into O(n).
- The core monotonic stack pattern: pop everything a new arrival makes permanently irrelevant, before pushing the new arrival ("bouncer at an increasingly exclusive club").
- O(n) complexity is proven via the same amortized "total operations bounded across the whole run" argument seen in Chapter 3 (sliding window) and Chapter 11 (graph traversal) — every index is pushed and popped at most once, total.
- Next Greater Element and Daily Temperatures share one identical algorithmic skeleton, differing only in what's recorded upon resolution — learn the skeleton once, adapt the "payload" per problem.
- Largest Rectangle in a Histogram requires understanding that the post-pop stack top represents the nearest remaining shorter bar, defining the left boundary for the resolved bar's width calculation.
- Sliding Window Maximum uses a monotonic decreasing deque: front is the current window's champion, back discards permanently-irrelevant weaker values, front removes aged-out indices — a genuine synthesis of Chapters 3, 6, and this chapter.
- Store indices, not raw values, in monotonic stacks/queues — you almost always need distance or window-membership information alongside the value itself.

---

## 21.8 Mind Map (ASCII)

```
                     MONOTONIC STACK & QUEUE MASTERCLASS
                                       |
      +------------------+------------+------------+----------------------+
      |                  |                         |                      |
  MONOTONIC          O(n) PROOF               THE SHARED               MONOTONIC
  STACK                (amortized,             SKELETON                QUEUE (DEQUE)
      |                3rd appearance:              |                       |
  "Bouncer at        Ch.3 sliding window,     Next Greater Element    Sliding Window
  increasingly       Ch.11 graph traversal,   == Daily Temperatures   Maximum (Ch.6
  exclusive club" -- now here)                (SAME skeleton,          teaser, DELIVERED)
  pop everything          |                    different "payload"         |
  a new arrival      Total pushes/pops         recorded on resolve)   Monotonic DECREASING
  makes irrelevant   bounded by n, NOT               |                deque: front=
      |              per-outer-iteration       LARGEST RECTANGLE      champion, back
  Next Greater             |                   IN HISTOGRAM           discards weak,
  Element,           Same reasoning            (hardest problem:      front ages out
  Daily              pattern as                post-pop stack top     of window
  Temperatures       Ch.3 & Ch.11              = nearest shorter            |
                                                bar = LEFT BOUNDARY    Synthesizes
                                                for width calc)        Ch.3+Ch.6+Ch.21
                                                                       into ONE solution
```

---

## 21.9 Cheat Sheet

```
MONOTONIC STACK SKELETON (increasing values top-to-bottom is "decreasing bottom-to-top")
============================================================================================
stack = []  // stores INDICES
for i in range(n):
    while stack not empty AND arr[i] "violates order" vs arr[stack.top]:
        resolved = stack.pop()
        record_answer(resolved, i)   // <- the ONE line that changes per problem!
    stack.push(i)

PROBLEM -> WHAT TO RECORD ON RESOLUTION
===========================================
Next Greater Element   -> record arr[i] (the actual value)
Daily Temperatures      -> record i - resolved (the distance/days waited)
Largest Rectangle       -> record height[resolved] * (i - stack.top - 1) [width calc]

MONOTONIC QUEUE (DEQUE) SKELETON -- Sliding Window Maximum
==============================================================
deque = []  // stores INDICES, DECREASING value order front-to-back
for i in range(n):
    if deque.front is OUTSIDE the window (deque[0] <= i - k): deque.popFront()
    while deque not empty AND arr[deque.back] < arr[i]: deque.popBack()
    deque.pushBack(i)
    if i >= k-1: result.push(arr[deque.front])   // front = current window's max

COMPLEXITY (BOTH STRUCTURES)
================================
O(n) time -- EVERY index pushed & popped AT MOST ONCE across the whole run
(same amortized "total movement bounded" argument as Ch.3 sliding window, Ch.11 BFS/DFS)
O(n) or O(k) space depending on the specific problem

SIGNAL PHRASES
=================
"next/previous greater/smaller element"     -> Monotonic Stack
"days until warmer temperature"             -> Monotonic Stack (Next Greater, disguised)
"largest rectangle in histogram"            -> Monotonic Stack (harder variant)
"maximum/minimum in every sliding window"   -> Monotonic Queue (Deque)
```

---

## 21.10 Key Takeaways

1. Monotonic stacks/queues are Chapter 6's structures used with a specific ordering discipline — not new capabilities, but a powerful usage pattern.
2. O(n) complexity relies on the amortized "total pushes/pops bounded across the whole run" argument, the same reasoning pattern as Chapters 3 and 11.
3. Next Greater Element and Daily Temperatures share one skeleton — learn it once, adapt what gets recorded on resolution.
4. Largest Rectangle in a Histogram's width calculation hinges on recognizing the post-pop stack top as the nearest remaining shorter bar (the left boundary).
5. Sliding Window Maximum's monotonic deque is a genuine synthesis of Chapter 3 (sliding window), Chapter 6 (deque), and this chapter's ordering discipline.

---

## 21.11 20 Multiple Choice Questions

1. What is a monotonic stack?
   a) A stack that only holds numbers
   b) A stack maintained in strictly increasing or decreasing order, achieved by popping violating elements before pushing
   c) A stack with a fixed maximum size
   d) A stack implemented using a heap

2. What is the "bouncer at an increasingly exclusive club" analogy describing?
   a) How queues work
   b) How a monotonic stack pops elements that a new, more extreme arrival makes permanently irrelevant
   c) How binary search works
   d) How hash tables resolve collisions

3. What is the time complexity of solving "Next Greater Element" using a monotonic stack?
   a) O(n²)
   b) O(n)
   c) O(n log n)
   d) O(1)

4. Why is the monotonic stack's nested while-loop-inside-a-for-loop still O(n), not O(n²)?
   a) It isn't actually O(n); this is a misconception
   b) Every index is pushed and popped at most once across the ENTIRE run, not once per outer iteration
   c) JavaScript optimizes nested loops automatically
   d) The array is always small in practice

5. What earlier chapters' analytical technique does this "total operations bounded across the whole run" argument echo?
   a) Chapter 3's sliding window and Chapter 11's graph traversal analysis
   b) Chapter 15's sorting complexity analysis
   c) Chapter 9's heap building analysis
   d) Chapter 5's linked list reversal

6. What is typically stored in a monotonic stack — values or indices?
   a) Values only
   b) Indices — because distance/position information is usually also needed
   c) Neither; monotonic stacks store objects only
   d) It doesn't matter; both are equivalent

7. What is the relationship between Next Greater Element and Daily Temperatures?
   a) They are unrelated problems requiring different algorithms
   b) They share an identical algorithmic skeleton, differing only in what's recorded upon resolving a stack entry
   c) Daily Temperatures requires a queue while Next Greater Element requires a stack
   d) Daily Temperatures is O(n²) while Next Greater Element is O(n)

8. In Largest Rectangle in a Histogram, what does the stack top represent immediately AFTER a pop?
   a) The tallest bar in the array
   b) The nearest remaining bar shorter than the just-resolved bar, defining its left boundary
   c) The average height of all bars
   d) The total number of bars processed so far

9. What is the purpose of the sentinel value (e.g., 0) appended in Largest Rectangle in a Histogram?
   a) It has no purpose; it's optional
   b) It forces full resolution of any bars still remaining in the stack at the very end
   c) It marks the start of the array
   d) It prevents integer overflow

10. What data structure does the Sliding Window Maximum problem use?
    a) A monotonic stack
    b) A monotonic queue (deque)
    c) A binary search tree
    d) A trie

11. In the Sliding Window Maximum's monotonic deque, what does the FRONT of the deque represent?
    a) The oldest element added
    b) The current window's maximum value
    c) The smallest value in the entire array
    d) The next element to be added

12. Why are elements removed from the BACK of the deque in Sliding Window Maximum?
    a) They have aged out of the window
    b) A new, larger value makes them permanently unable to ever be the maximum again while both remain in a shared window
    c) The deque has reached its size limit
    d) It's an arbitrary implementation choice

13. Why are elements removed from the FRONT of the deque in Sliding Window Maximum?
    a) They are no longer larger than other elements
    b) Their index has fallen outside the current window's range
    c) They were added in the wrong order
    d) The deque never removes from the front

14. What three chapters' concepts does the Sliding Window Maximum solution synthesize?
    a) Chapters 1, 2, and 3
    b) Chapter 3 (sliding window), Chapter 6 (deque), and Chapter 21 (monotonic ordering)
    c) Chapters 8, 9, and 10
    d) Chapters 15, 16, and 17

15. What is the time complexity of the monotonic-deque-based Sliding Window Maximum solution?
    a) O(n * k)
    b) O(n)
    c) O(n log n)
    d) O(k²)

16. What is the space complexity of the monotonic deque in Sliding Window Maximum?
    a) O(n)
    b) O(k), since it never holds more than k relevant indices
    c) O(1)
    d) O(n * k)

17. What signal phrase most strongly suggests a monotonic stack approach?
    a) "Sort the array"
    b) "Find the next/previous greater or smaller element"
    c) "Count connected components"
    d) "Find the shortest path"

18. What signal phrase most strongly suggests a monotonic queue (deque) approach?
    a) "Find the maximum/minimum in every sliding window"
    b) "Detect a cycle in a graph"
    c) "Sort a linked list"
    d) "Validate a binary search tree"

19. What is a common implementation pitfall when using a plain array for the deque's front removal in Sliding Window Maximum?
    a) It's always correct and efficient
    b) Using `.shift()` is O(n), reintroducing Chapter 6's classic queue performance trap in production code
    c) Arrays cannot be used as deques at all
    d) It causes incorrect results, not just inefficiency

20. What edge case should be specifically stress-tested for monotonic stack/queue problems?
    a) Only arrays with negative numbers
    b) All elements identical (tests the strict vs. non-strict comparison choice) and strictly increasing/decreasing input
    c) Only arrays of even length
    d) Only single-element arrays

**Answer Key:** 1-b, 2-b, 3-b, 4-b, 5-a, 6-b, 7-b, 8-b, 9-b, 10-b, 11-b, 12-b, 13-b, 14-b, 15-b, 16-b, 17-b, 18-a, 19-b, 20-b

---

## 21.12 20 Coding Problems

**Easy**

1. Implement `nextGreaterElement` from memory (section 21.1.1).
2. Implement `dailyTemperatures` from memory (section 21.2), noting the one-line difference from problem 1.
3. Given a circular array, find the next greater element for every position, where "next" can wrap around to the beginning (hint: process the array twice, conceptually).
4. Given an array, find the "previous smaller element" for every position (a mirror-image variant of Next Greater Element).
5. Write a function to validate that a given stack-based solution actually maintains the monotonic invariant at every step (a testing/debugging helper).

**Medium**

6. Implement `largestRectangleArea` from memory (section 21.3), including the sentinel-value trick.
7. Implement `maxSlidingWindow` from memory (section 21.4), using a plain array for simplicity, then note in a comment where Chapter 6's proper Deque class should replace it for production use.
8. Given a histogram-like 2D binary matrix, find the largest rectangle containing only 1s, by treating each row as a histogram and reusing your Largest Rectangle solution (a genuinely clever 2D extension).
9. Implement "132 Pattern" detection: given an array, determine if there exists a subsequence of three indices i<j<k such that nums[i] < nums[k] < nums[j], using a monotonic stack.
10. Given a string, remove duplicate letters so that every letter appears exactly once, resulting in the lexicographically smallest possible result, using a monotonic stack.

**Hard**

11. Implement "Trapping Rain Water": given an elevation map, compute how much water can be trapped after raining, using a monotonic stack approach (contrast this against a two-pointer approach from Chapter 3, if you recall it, and discuss the trade-offs).
12. Given a sequence of stock prices, implement a "stock span" calculator: for each day, find the number of consecutive previous days (including today) where the price was less than or equal to today's price, using a monotonic stack.
13. Implement "Maximal Rectangle" fully: given a 2D binary matrix, find the largest rectangle containing only 1s, building the full histogram-per-row solution from problem 8 into a complete algorithm.
14. Given an array, find the sum of the minimum elements of all contiguous subarrays, using a monotonic stack to efficiently determine each element's "range of influence" as a minimum.
15. Implement a sliding window MINIMUM (the mirror image of Sliding Window Maximum) using a monotonic increasing deque, and verify it produces correct results alongside the maximum version on the same input.

**Interview Level**

16. **(Google-level)** Given a stream of stock prices, implement a real-time "stock span" tracker (problem 12's online/streaming variant) that efficiently answers span queries as new prices arrive one at a time, without recomputing from scratch.
17. **(Amazon-level)** Given a warehouse's shelf height data, use the Largest Rectangle in Histogram technique to determine the maximum contiguous storage area (by height x width) available for a large item, framing the algorithm in a practical warehouse-optimization context.
18. **(Microsoft-level)** Given a log of server response times, use a monotonic queue to efficiently answer "what was the maximum response time in the last N requests" for a continuously arriving stream of requests.
19. **(Meta-level)** Given a sequence of user engagement scores over time, use a monotonic stack to find, for each time point, the next time point with strictly higher engagement (a direct product-framing of Next Greater Element), and discuss how this could power a "momentum detection" feature.
20. **(Netflix-level)** Design a real-time video bitrate monitor using a monotonic deque to efficiently track the maximum bitrate demand over a sliding time window (e.g., the last 60 seconds), supporting O(1) amortized updates as new bitrate readings arrive continuously.

---

## 21.13 5 Interview Questions

1. "Implement 'Next Greater Element' in O(n), and prove why it's O(n) despite the nested loop appearance." (Tests both implementation and the amortized analysis argument.)
2. "How would you solve 'Daily Temperatures,' and how does it relate to 'Next Greater Element'?" (Tests recognition of the shared skeleton across superficially different problems.)
3. "Walk me through 'Largest Rectangle in a Histogram' — specifically, how do you calculate the width when resolving a bar from the stack?" (Tests deep, non-superficial understanding of the width formula.)
4. "How would you find the maximum in every sliding window of size k, in O(n) total time?" (Tests the monotonic deque technique specifically.)
5. "Why do monotonic stacks typically store indices rather than values?" (Tests understanding of the distance/window-membership information requirement.)

---

## 21.14 3 Real Projects

1. **Complete Monotonic Stack/Queue Library**: Implement Next Greater Element (and its previous/smaller variants), Daily Temperatures, Largest Rectangle in a Histogram, and Sliding Window Maximum/Minimum in a single library, with a self-check script verifying correctness against brute-force baselines and confirming O(n) behavior empirically at increasing input sizes.
2. **Stock Span Tracker**: Build the stock-span calculator (coding problem #12) as a standalone module, extended to the streaming/real-time variant (coding problem #16), and benchmark it against a naive recomputation-from-scratch approach.
3. **Histogram Analyzer**: Build a Node.js CLI tool that takes a set of bar heights, computes the largest rectangle using the monotonic stack technique, and prints an ASCII visualization of the histogram with the winning rectangle highlighted — a direct, visual reinforcement of section 21.3's hardest problem.

---

## 21.15 Further Reading

- Search "monotonic stack template competitive programming" for extensive additional problem sets built around this chapter's shared skeleton technique.
- LeetCode's problems "Next Greater Element I/II," "Daily Temperatures," "Largest Rectangle in Histogram," "Sliding Window Maximum," and "Trapping Rain Water," for the canonical, extensively-discussed versions of every technique in this chapter.
- Steven Skiena, *The Algorithm Design Manual*, for additional stack-based algorithmic technique discussion, connecting back to the fundamentals established in Chapter 6.

---

*End of Chapter 21. Next: Chapter 22 will cover String Algorithms in depth — the KMP (Knuth-Morris-Pratt) and Rabin-Karp pattern-matching algorithms, and an introduction to suffix arrays and suffix trees, moving beyond the naive O(n·m) substring search into genuinely optimized string-matching techniques.*

**Say "Continue to the next chapter" when ready.**
