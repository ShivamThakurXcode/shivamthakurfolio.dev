import pg from 'pg';
import { CFG, setup, enqueue, claim, runWorker, sleep } from './pgqueue.mjs';
const pool = new pg.Pool({ ...CFG, max: 12 });
await setup(pool);
const q = (sql, p) => pool.query(sql, p);
const stats = async () => Object.fromEntries((await q(`SELECT status, count(*)::int n FROM jobs GROUP BY 1`)).rows.map((r) => [r.status, r.n]));

console.log('=== 1. throughput and exactly-one-claim: 600 jobs, 1 vs 4 workers (each job = 10 ms of work) ===');
for (const workers of [1, 4]) {
  await q('TRUNCATE jobs, effect_log RESTART IDENTITY');
  for (let i = 0; i < 600; i++) await enqueue(pool, 'email', { n: i });
  const stop = { stopped: false }; const t = performance.now();
  const handler = async (job, { worker }) => { await sleep(10); await q('INSERT INTO effect_log (job_key, worker) VALUES ($1, $2)', [`job-${job.id}`, worker]); };
  const ps = Array.from({ length: workers }, (_, i) => runWorker(pool, 'email', `w${i + 1}`, handler, { stopSignal: stop }));
  while ((await stats()).done !== 600) await sleep(50);
  const secs = (performance.now() - t) / 1000; stop.stopped = true; await Promise.all(ps);
  const dup = (await q('SELECT count(*)::int n FROM (SELECT job_key FROM effect_log GROUP BY 1 HAVING count(*) > 1) d')).rows[0].n;
  const perWorker = (await q('SELECT worker, count(*)::int n FROM effect_log GROUP BY 1 ORDER BY 1')).rows.map((r) => `${r.worker}:${r.n}`).join(' ');
  console.log(`${workers} worker(s): ${secs.toFixed(1)} s = ${(600 / secs).toFixed(0)} jobs/s | effects ${(await q('SELECT count(*)::int n FROM effect_log')).rows[0].n} (duplicates: ${dup}) | split ${perWorker}`);
}

console.log('\n=== 2. a worker CRASHES mid-job: the lease expires and another worker takes over ===');
await q('TRUNCATE jobs, effect_log RESTART IDENTITY');
await enqueue(pool, 'invoice', { order: 77 });
const crashed = await claim(pool, 'invoice', 'w-crash', { leaseMs: 800 });                 // claims it ... and then "dies" (never completes, never fails)
console.log('w-crash claimed job', crashed[0].id, `(attempt ${crashed[0].attempts}, lease 800 ms) then died.`);
const again1 = await claim(pool, 'invoice', 'w-live', { leaseMs: 800 }); console.log('immediately: w-live can claim?', again1.length ? 'yes' : 'NO (lease still held)');
await sleep(900);
const again2 = await claim(pool, 'invoice', 'w-live', { leaseMs: 800 }); console.log(`after the lease expired: w-live claimed job ${again2[0]?.id} (attempt ${again2[0]?.attempts}, locked_by ${again2[0]?.locked_by})`);
const staleDone = await pool.query(`UPDATE jobs SET status='done' WHERE id = $1 AND locked_by = 'w-crash' AND status = 'running'`, [crashed[0].id]);
console.log('the zombie w-crash wakes up and tries to mark it done -> rows updated:', staleDone.rowCount, '(fenced: only the current lease holder may finish)');

console.log('\n=== 3. a poison job: retries with exponential backoff, then the dead-letter state ===');
await q('TRUNCATE jobs RESTART IDENTITY'); await enqueue(pool, 'email', { to: 'bad@@address' }, { maxAttempts: 4 });
const stop3 = { stopped: false }; const t3 = performance.now(); const events = [];
const w3 = runWorker(pool, 'email', 'w1', async () => { throw new Error('SMTP 550 mailbox does not exist'); }, { stopSignal: stop3, pollMs: 10, onEvent: (e) => events.push(`${e.type}${e.delay ? ` (next try in ${Math.round(e.delay)} ms)` : ''} at +${Math.round(performance.now() - t3)} ms`) });
while (!(await stats()).dead) await sleep(50); stop3.stopped = true; await w3;
events.forEach((e, i) => console.log(`  attempt ${i + 1}: ${e}`));
console.log('final row:', JSON.stringify((await q('SELECT status, attempts, last_error FROM jobs')).rows[0]));

console.log('\n=== 4. at-least-once delivery: a SLOW handler outlives its lease -> the job runs TWICE ===');
await q('TRUNCATE jobs, effect_log, effects RESTART IDENTITY'); await enqueue(pool, 'invoice', { order: 55 });
const stop4 = { stopped: false }; const ev4 = [];
const slowHandler = (idempotent) => async (job, { worker }) => {
  await sleep(worker === 'w1' ? 1500 : 100);                                      // w1 is slow (GC pause / slow API), w2 is quick
  if (idempotent) { const r = await q('INSERT INTO effects (job_key, worker) VALUES ($1,$2) ON CONFLICT DO NOTHING', [`invoice-${job.payload.order}`, worker]); if (r.rowCount === 0) return; }   // already done by someone else: skip
  await q('INSERT INTO effect_log (job_key, worker) VALUES ($1,$2)', [`invoice-${job.payload.order}`, worker]);                                                                                      // the real side effect: "send invoice email"
};
for (const idempotent of [false, true]) {
  await q('TRUNCATE jobs, effect_log, effects RESTART IDENTITY'); await enqueue(pool, 'invoice', { order: 55 }); const stop = { stopped: false }; const ev = [];
  const ws = ['w1', 'w2'].map((w, i) => (async () => { await sleep(i * 1100); return runWorker(pool, 'invoice', w, slowHandler(idempotent), { stopSignal: stop, leaseMs: 1000, onEvent: (e) => ev.push(`${e.worker}:${e.type}`) }); })());
  await sleep(3200); stop.stopped = true; await Promise.all(ws);
  const emails = (await q('SELECT count(*)::int n FROM effect_log')).rows[0].n;
  console.log(`${idempotent ? 'idempotent handler (effects table)' : 'naive handler                     '} lease 1 s, w1 takes 1.5 s | events: ${ev.join(', ')} | invoice emails sent: ${emails}${emails > 1 ? '  <- DUPLICATE' : ''}`);
}
await pool.end();
