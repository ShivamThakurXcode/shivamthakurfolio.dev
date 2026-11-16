import fs from 'node:fs';
const dir = 'prof'; const f = fs.readdirSync(dir)[0];
const p = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
const self = new Map(); const byId = new Map(p.nodes.map((n) => [n.id, n]));
const dt = p.timeDeltas; let total = 0;
p.samples.forEach((id, i) => { const n = byId.get(id); const key = `${n.callFrame.functionName || '(anonymous)'}  ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`; self.set(key, (self.get(key) ?? 0) + dt[i]); total += dt[i]; });
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log(`profile: ${p.samples.length} samples, ${(total / 1000).toFixed(0)} ms sampled`);
for (const [k, us] of top) console.log(`${(100 * us / total).toFixed(1).padStart(5)} %  ${(us / 1000).toFixed(0).padStart(5)} ms  ${k}`);
