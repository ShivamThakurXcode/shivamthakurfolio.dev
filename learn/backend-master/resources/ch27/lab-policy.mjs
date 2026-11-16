// Pure simulation: hit ratio of LRU vs LFU vs FIFO vs RANDOM on a skewed (Zipf) workload, for several cache sizes.
const KEYS = 100000, REQ = 400000;
function zipfSampler(n, s = 1.0) { const w = new Float64Array(n); let tot = 0; for (let i = 0; i < n; i++) { w[i] = 1 / Math.pow(i + 1, s); tot += w[i]; } const cdf = new Float64Array(n); let acc = 0; for (let i = 0; i < n; i++) { acc += w[i] / tot; cdf[i] = acc; } return () => { const r = Math.random(); let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < r) lo = m + 1; else hi = m; } return lo; }; }
const sample = zipfSampler(KEYS, 1.0); const trace = Array.from({ length: REQ }, sample);
const policies = {
  LRU: (cap) => { const m = new Map(); return (k) => { if (m.has(k)) { m.delete(k); m.set(k, 1); return true; } m.set(k, 1); if (m.size > cap) m.delete(m.keys().next().value); return false; }; },
  FIFO: (cap) => { const m = new Map(); return (k) => { if (m.has(k)) return true; m.set(k, 1); if (m.size > cap) m.delete(m.keys().next().value); return false; }; },
  RANDOM: (cap) => { const arr = []; const set = new Set(); return (k) => { if (set.has(k)) return true; if (arr.length >= cap) { const i = Math.floor(Math.random() * arr.length); set.delete(arr[i]); arr[i] = k; } else arr.push(k); set.add(k); return false; }; },
  'LFU (aging-free)': (cap) => { const freq = new Map(); return (k) => { if (freq.has(k)) { freq.set(k, freq.get(k) + 1); return true; } if (freq.size >= cap) { let minK, minF = Infinity, scanned = 0; for (const [kk, f] of freq) { if (f < minF) { minF = f; minK = kk; } if (++scanned > 64) break; } freq.delete(minK); } freq.set(k, 1); return false; }; },
};
console.log(`workload: ${REQ.toLocaleString()} requests over ${KEYS.toLocaleString()} keys, Zipf(s=1.0): a few keys are very popular`);
console.log('cache size (% of keys)'.padEnd(24), Object.keys(policies).map((p) => p.padEnd(18)).join(''));
for (const pct of [0.1, 1, 5, 10]) { const cap = Math.max(1, Math.round(KEYS * pct / 100)); const row = Object.values(policies).map((mk) => { const c = mk(cap); let h = 0; for (const k of trace) if (c(k)) h++; return `${(100 * h / REQ).toFixed(1)}%`.padEnd(18); }); console.log(`${pct}% (${cap} keys)`.padEnd(24), row.join('')); }
// scan resistance: one big sequential scan pollutes an LRU
const hot = zipfSampler(1000, 1.0); const trace2 = []; for (let i = 0; i < 200000; i++) { trace2.push(hot()); if (i === 100000) for (let j = 0; j < 5000; j++) trace2.push(50000 + j); }
console.log('\nscan pollution (one 5,000-key sequential scan in the middle, cache holds 500 of 1,000 hot keys):');
for (const [name, mk] of Object.entries({ LRU: policies.LRU, 'LFU (aging-free)': policies['LFU (aging-free)'] })) { const c = mk(500); let before = 0, bn = 0, after = 0, an = 0; trace2.forEach((k, i) => { const h = c(k); if (i < 100000) { before += h; bn++; } else if (i > 105000 && i < 105800) { after += h; an++; } }); console.log(`${name.padEnd(18)} hit ratio before the scan ${(100 * before / bn).toFixed(1)}% | in the 800 requests right after the scan ${(100 * after / an).toFixed(1)}%`); }
