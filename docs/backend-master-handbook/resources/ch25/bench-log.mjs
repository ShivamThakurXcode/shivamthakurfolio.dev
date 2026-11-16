import pino from 'pino';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import fs from 'node:fs';
const N = 200000, mode = process.argv[2], out = process.argv[3];
const h = monitorEventLoopDelay({ resolution: 1 }); h.enable();
const obj = (i) => ({ requestId: 'req-' + i, route: '/products/:id', status: 200, duration_ms: 3.2 });
const t = performance.now();
if (mode === 'console') { for (let i = 0; i < N; i++) console.log(JSON.stringify({ level: 'info', msg: 'request completed', ...obj(i) })); }
else if (mode === 'pino-sync') { const l = pino(pino.destination({ dest: out, sync: true })); for (let i = 0; i < N; i++) l.info(obj(i), 'request completed'); }
else if (mode === 'pino-async') { const l = pino(pino.destination({ dest: out, sync: false, minLength: 4096 })); for (let i = 0; i < N; i++) l.info(obj(i), 'request completed'); l.flush(); await new Promise((r) => setTimeout(r, 300)); }
const ms = performance.now() - t; h.disable();
process.stderr.write(`${mode.padEnd(11)} ${N} lines: ${ms.toFixed(0).padStart(5)} ms  (${Math.round(N / ms * 1000).toLocaleString()} lines/s) | event-loop delay p99 ${(h.percentile(99) / 1e6).toFixed(1)} ms max ${(h.max / 1e6).toFixed(1)} ms\n`);
