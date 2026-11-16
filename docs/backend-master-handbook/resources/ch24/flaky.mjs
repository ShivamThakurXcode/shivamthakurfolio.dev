// A classic flaky test: it measures REAL elapsed time.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
fs.writeFileSync('flaky-case.test.js', `
import { test } from 'node:test'; import assert from 'node:assert/strict';
test('a 10 ms timer fires within 25 ms', async () => {
  const t0 = performance.now(); await new Promise((r) => setTimeout(r, 10));
  assert.ok(performance.now() - t0 < 25, 'took too long');
});`);
const runOnce = () => new Promise((res) => { const p = spawn(process.execPath, ['--test', 'flaky-case.test.js'], { stdio: 'ignore' }); p.on('close', (code) => res(code === 0)); });
const batch = async (n) => (await Promise.all(Array.from({ length: n }, runOnce))).filter((ok) => !ok).length;
console.log('idle machine, 20 runs in sequence  : failures =', await (async () => { let f = 0; for (let i = 0; i < 20; i++) if (!(await runOnce())) f++; return f; })());
console.log('loaded machine, 60 runs in parallel: failures =', await batch(60), 'of 60   <- same code, same test, different verdict');
fs.unlinkSync('flaky-case.test.js');
