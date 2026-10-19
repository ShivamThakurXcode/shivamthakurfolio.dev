# Voiceover script — "JS Event Loop in 60s"

Record at a fast, energetic pace (~165 words/min). **Bold** = punch that word.
Timestamps match the animation. If your take runs long or short, retime the `T` table in `src/EventLoop.tsx`.

| Time | Say this | On screen |
|---|---|---|
| 0:00–0:04 | "**Most** developers get this wrong. What does this code print?" | MOST DEVS GET THIS WRONG / What prints? |
| 0:04–0:10 | "If you said 1, 2, 3, 4... **nope.** Here's the secret: JavaScript has only **one** thread. One thing at a time. So how do timers even work?" | ONE thread |
| 0:10–0:18 | "Every line goes onto the **Call Stack**. `console.log(1)` runs... prints **1**... and it's gone." | Call stack, console shows 1 |
| 0:18–0:26 | "Then `setTimeout`. JavaScript doesn't wait for it. It hands it off to the **browser** and keeps going. Zero milliseconds later, the callback lands in the **Task Queue**." | Chip flies to Web APIs, then to Task Queue |
| 0:26–0:34 | "Now the **Promise**. Its `.then` goes into a different line: the **Microtask Queue**. Think of it as the **VIP line.**" | Chip lands in Microtask Queue |
| 0:34–0:38 | "`console.log(4)`: prints **4**. The stack is empty. Now what?" | Console shows 4 |
| 0:38–0:50 | "This is where the **Event Loop** wakes up. It checks: is the stack empty? Yes. And here's the twist: the VIP line **always** goes first. So **3** prints. Only **then** does the timer get its turn: **2.**" | Loop spins, 3 then 2 print |
| 0:50–0:56 | "**1, 4, 3, 2.** Even a zero-millisecond timer loses to a Promise." | Big 1 4 3 2 |
| 0:56–1:00 | "Remember: sync code, then microtasks, then tasks. Follow for more JavaScript in 60 seconds." | Rule card + Follow |

## Post copy
**Title:** JavaScript prints 1 4 3 2?! 🤯 The Event Loop in 60s
**Caption:** Most devs get this wrong 👀 Comment your answer BEFORE watching. #javascript #webdev #coding #programming #eventloop #frontend #shorts
**Pinned comment:** "What would `setTimeout(..., 0)` inside a `.then` print? 👇" (questions like this drive comments, which drive reach)
