import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import autocannon from 'autocannon';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();
const BASE = 54350;                                               // nginx on 127.0.0.1:54350
const procs = new Map();
const portOf = (name) => ({ A: 54361, B: 54362, C: 54363, D: 54364 }[name]);
async function startInstance(name, port, extra = 0) {
  const p = spawn(process.execPath, ['app.mjs', String(port), name, String(extra)], { stdio: 'ignore' }); p.exited = new Promise((res) => p.once('exit', res)); procs.set(name, p);
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/healthz`); if (r.ok) return p; } catch {} await sleep(150); }
  throw new Error('instance ' + name + ' did not start');
}
async function stopInstance(name) { const p = procs.get(name); if (!p) return; p.kill(); await p.exited; }
const ports = { A: 54361, B: 54362, C: 54363, D: 54364 };
const upstream = (names, opts = '') => names.map((n) => `server 192.168.65.254:${ports[n]} ${opts};`).join(' ');

function nginxConf(names) {
  return `worker_processes 2; events { worker_connections 4096; }
http {
  access_log off;
  upstream rr      { ${upstream(names)} keepalive 64; }
  upstream lc      { least_conn; ${upstream(names)} keepalive 64; }
  upstream iph     { ip_hash; ${upstream(names)} }
  upstream rr_fo   { ${upstream(names, 'max_fails=1 fail_timeout=3s')} keepalive 64; }
  server { listen 8080;
    proxy_http_version 1.1; proxy_set_header Connection ""; proxy_connect_timeout 1s;
    location /rr/    { proxy_pass http://rr/;  proxy_next_upstream off; }
    location /lc/    { proxy_pass http://lc/;  proxy_next_upstream off; }
    location /ip/    { proxy_pass http://iph/; proxy_next_upstream off; }
    location /nofo/  { proxy_pass http://rr/;  proxy_next_upstream off; }
    location /fo/    { proxy_pass http://rr_fo/; proxy_next_upstream error timeout http_502 http_503; proxy_next_upstream_tries 3; }
  }
}`;
}
function startNginx(names) {
  try { docker('rm', '-f', 'bmh-nginx'); } catch {}
  const conf = path.join(os.tmpdir(), 'bmh-nginx.conf'); fs.writeFileSync(conf, nginxConf(names));
  docker('create', '--name', 'bmh-nginx', '-p', `127.0.0.1:${BASE}:8080`, 'nginx:alpine');
  docker('cp', conf, 'bmh-nginx:/etc/nginx/nginx.conf'); docker('start', 'bmh-nginx');
}
const get = async (p, h = {}) => { try { const r = await fetch(`http://127.0.0.1:${BASE}${p}`, { headers: { connection: 'close', ...h } }); const j = await r.json().catch(() => ({})); return { status: r.status, instance: r.headers.get('x-instance'), ...j }; } catch (e) { return { status: 0, error: e.message }; } };
const tally = (rs, key = 'instance') => { const m = {}; rs.forEach((r) => { const k = r.status === 200 || r.status === 401 ? r[key] : `ERR${r.status}`; m[k] = (m[k] ?? 0) + 1; }); return Object.entries(m).sort().map(([k, v]) => `${k}:${v}`).join(' '); };
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
async function ready(path, tries = 40) { for (let i = 0; i < tries; i++) { const r = await get(path); if (r.status === 200) return; await sleep(250); } throw new Error('nginx/app not ready: ' + path); }

try {
  await startInstance('A', ports.A); await startInstance('B', ports.B); await startInstance('C', ports.C);
  startNginx(['A', 'B', 'C']); await ready('/rr/whoami'); await sleep(500);

  console.log('=== 1. load-balancing algorithms: 300 sequential requests through nginx (3 identical instances) ===');
  for (const [label, prefix] of [['round-robin', '/rr'], ['least_conn', '/lc'], ['ip_hash', '/ip']]) {
    const rs = []; for (let i = 0; i < 300; i++) rs.push(await get(`${prefix}/whoami`));
    console.log(`${label.padEnd(12)} ->`, tally(rs));
  }
  console.log('(ip_hash picks the instance from the CLIENT IP; here every request arrives from the same Docker-NAT address, so one instance gets everything: a classic trap behind NAT/proxies)');

  console.log('\n=== 2. one instance is SLOW (+300 ms): round-robin vs least_conn under 30 concurrent clients ===');
  await stopInstance('C'); await startInstance('C', ports.C, 300); startNginx(['A', 'B', 'C']); await ready('/rr/whoami'); await sleep(300);
  for (const [label, prefix] of [['round-robin', '/rr'], ['least_conn', '/lc']]) {
    const lat = []; const seen = []; const t0 = performance.now(); let next = 0;
    await Promise.all(Array.from({ length: 30 }, async () => { while (next < 600) { next++; const s = performance.now(); const r = await get(`${prefix}/whoami`); lat.push(performance.now() - s); seen.push(r); } }));
    console.log(`${label.padEnd(12)} p50 ${pct(lat, 0.5).toFixed(0).padStart(4)} ms  p99 ${pct(lat, 0.99).toFixed(0).padStart(4)} ms | 600 requests in ${((performance.now() - t0) / 1000).toFixed(1)} s | share ${tally(seen)}`);
  }
  await stopInstance('C'); await startInstance('C', ports.C, 0);

  console.log('\n=== 3. an instance DIES under load: no failover vs proxy_next_upstream (200 requests/s for ~3 s, instance B killed after 1 s) ===');
  for (const [label, prefix] of [['no failover (/nofo)', '/nofo'], ['failover enabled (/fo)', '/fo']]) {
    await stopInstance('B'); await startInstance('B', ports.B); startNginx(['A', 'B', 'C']); await ready('/rr/whoami'); await sleep(300);
    const rs = []; const t0 = performance.now(); let killed = false;
    const loop = async () => { while (performance.now() - t0 < 3000) { if (!killed && performance.now() - t0 > 1000) { killed = true; procs.get('B').kill('SIGKILL'); } rs.push(await get(`${prefix}/whoami`)); } };
    await Promise.all(Array.from({ length: 6 }, loop));
    const errors = rs.filter((r) => r.status !== 200).length;
    console.log(`${label.padEnd(24)} ${rs.length} requests, ERRORS ${errors} (${(100 * errors / rs.length).toFixed(1)}%) | ${tally(rs)}`);
    await stopInstance('B'); await startInstance('B', ports.B);
  }

  console.log('\n=== 4. STATE: sessions kept in process memory vs in Redis (3 instances, round-robin) ===');
  for (const kind of ['mem', 'redis']) {
    let ok = 0, fail = 0;
    for (let u = 0; u < 30; u++) {
      const user = `${kind}-user-${u}-${Date.now()}`; await get(`/rr/login-${kind}?u=${user}`);
      for (let k = 0; k < 3; k++) { const r = await get(`/rr/me-${kind}?u=${user}`); r.status === 200 ? ok++ : fail++; }
    }
    console.log(`${kind === 'mem' ? 'in-memory sessions' : 'Redis sessions    '} 30 users x 3 follow-up requests: logged in ${ok}, "logged out" ${fail}  (${(100 * fail / (ok + fail)).toFixed(0)}% of requests fail)`);
  }
  let okS = 0, failS = 0; for (let u = 0; u < 30; u++) { const user = `sticky-${u}-${Date.now()}`; await get(`/ip/login-mem?u=${user}`); for (let k = 0; k < 3; k++) { const r = await get(`/ip/me-mem?u=${user}`); r.status === 200 ? okS++ : failS++; } }
  console.log(`in-memory + ip_hash (sticky) logged in ${okS}, failed ${failS}   <- works, UNTIL that instance restarts or the pool changes (then every session on it is lost)`);

  console.log('\n=== 5. does adding instances add throughput? CPU-bound endpoint (20 ms of CPU per request), 40 connections, 6 s ===');
  const results = [];
  for (const n of [1, 2, 3]) {
    const names = ['A', 'B', 'C'].slice(0, n);
    for (const nm of ['A', 'B', 'C']) await stopInstance(nm);
    for (const nm of names) await startInstance(nm, ports[nm]);
    startNginx(names); await ready('/rr/whoami'); await sleep(500);
    const r = await autocannon({ url: `http://127.0.0.1:${BASE}/rr/cpu?ms=20`, connections: 40, duration: 6 });
    results.push([n, r.requests.average, r.latency.p50, r.latency.p99, r.non2xx + r.errors]);
    console.log(`${n} instance(s): ${Math.round(r.requests.average)} req/s | latency p50 ${r.latency.p50} ms, p99 ${r.latency.p99} ms | errors ${r.non2xx + r.errors}`);
  }
  const base = results[0][1]; console.log('speed-up vs 1 instance:', results.map(([n, rps]) => `${n}x -> ${(rps / base).toFixed(2)}x`).join(', '), `(machine has ${os.cpus().length} cores shared with nginx, Docker and the load generator)`);
} finally {
  for (const p of procs.values()) p.kill(); try { docker('rm', '-f', 'bmh-nginx'); } catch {}
}
