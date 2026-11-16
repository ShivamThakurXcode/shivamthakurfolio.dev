import { makeSimDep, callSim } from './lab1.mjs';
import { retry } from './resilience.mjs';
const storm = async (label, jitter) => {
  const d = makeSimDep({ latency: 50, capacity: 100 }); let ok = 0;
  await Promise.all(Array.from({ length: 300 }, async () => { try { await retry(() => callSim(d, 400), { retries: 6, baseMs: 100, maxMs: 1600, jitter }); ok++; } catch {} }));
  const tl = []; for (let i = 0; i <= Math.max(...d.timeline.keys()); i++) tl.push(d.timeline.get(i) ?? 0);
  console.log(label.padEnd(24), `ok ${ok}/300, ${d.requests} calls | calls per 100 ms window:`, tl.join(' '));
};
await storm('NO jitter', false); await storm('full jitter', true); await storm('NO jitter (again)', false); await storm('full jitter (again)', true);
