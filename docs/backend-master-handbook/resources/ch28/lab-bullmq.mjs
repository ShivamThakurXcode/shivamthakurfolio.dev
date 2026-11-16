import { Queue, Worker, QueueEvents } from 'bullmq';
const connection = { host: '127.0.0.1', port: 54331, maxRetriesPerRequest: null };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const name = 'ch28-' + Date.now();
const queue = new Queue(name, { connection });
const t0 = performance.now(); const at = () => `+${Math.round(performance.now() - t0)} ms`;
const log = [];

console.log('=== BullMQ (Redis-backed queue): retries with backoff, delay, priority, rate limit, repeat ===');
let flakyCalls = 0;
const worker = new Worker(name, async (job) => {
  if (job.name === 'flaky') { flakyCalls++; if (job.attemptsMade < 2) throw new Error('503 from provider'); return 'ok after ' + (job.attemptsMade + 1) + ' attempts'; }
  if (job.name === 'poison') throw new Error('always fails');
  if (job.name === 'tick') { log.push(`repeat tick ${at()}`); return; }
  log.push(`${job.name}:${job.data.n ?? ''} ran ${at()}`); await sleep(20); return job.data;
}, { connection, concurrency: 3, limiter: { max: 10, duration: 1000 } });
const events = new QueueEvents(name, { connection }); await events.waitUntilReady();
const failedLog = []; worker.on('failed', (job, err) => failedLog.push(`${job.name} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`));

await queue.add('flaky', {}, { attempts: 4, backoff: { type: 'exponential', delay: 100 } });
await queue.add('poison', {}, { attempts: 3, backoff: { type: 'fixed', delay: 50 } });
await queue.add('delayed', { n: 1 }, { delay: 800 });
await queue.add('low', { n: 1 }, { priority: 10 }); await queue.add('high', { n: 1 }, { priority: 1 });
await sleep(1500);
const flaky = (await queue.getJobs(['completed'])).find((j) => j.name === 'flaky');
console.log('flaky job result:', flaky?.returnvalue, '| handler calls:', flakyCalls);
failedLog.forEach((l) => console.log('  ', l));
console.log('poison job ends in the failed set (BullMQ\'s dead-letter equivalent):', (await queue.getJobs(['failed'])).map((j) => `${j.name}(attempts ${j.attemptsMade})`).join(', '));
console.log('delayed job (800 ms) ran at:', log.find((l) => l.startsWith('delayed')));
console.log('priority: high (1) vs low (10) arrival order:', log.filter((l) => /^(high|low)/.test(l)).map((l) => l.split(':')[0]).join(' -> '));

console.log('\n--- rate limiter: 10 jobs/second, 40 jobs enqueued at once ---');
const bulkStart = performance.now(); let done = 0; const doneTimes = [];
worker.on('completed', (job) => { if (job.name === 'bulk') { done++; doneTimes.push(performance.now() - bulkStart); } });
await queue.addBulk(Array.from({ length: 40 }, (_, i) => ({ name: 'bulk', data: { n: i } })));
while (done < 40) await sleep(100);
const perSecond = [0, 1, 2, 3, 4].map((s) => doneTimes.filter((t) => t >= s * 1000 && t < (s + 1) * 1000).length);
console.log('jobs finished per second:', perSecond.join(', '), `(total ${done} in ${(doneTimes.at(-1) / 1000).toFixed(1)} s)  <- capped by the limiter, protecting a downstream API`);

console.log('\n--- repeatable (cron-like) job: every 300 ms ---');
await queue.upsertJobScheduler('every-300', { every: 300 }, { name: 'tick', data: {} });
await sleep(1500); await queue.removeJobScheduler('every-300');
console.log('ticks in ~1.5 s:', log.filter((l) => l.startsWith('repeat')).length, '(scheduler state lives in Redis, so N instances still produce ONE tick per interval)');
console.log('queue counts:', JSON.stringify(await queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed')));
await worker.close(); await events.close(); await queue.obliterate({ force: true }); await queue.close();
