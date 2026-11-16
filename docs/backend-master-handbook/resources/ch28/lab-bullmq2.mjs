import { Queue, Worker } from 'bullmq';
const connection = { host: '127.0.0.1', port: 54331, maxRetriesPerRequest: null };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('--- priority: jobs WAITING together are served by priority (lower number = sooner) ---');
{
  const q = new Queue('ch28-prio-' + Date.now(), { connection }); const order = [];
  await q.addBulk([{ name: 'low', data: {}, opts: { priority: 10 } }, { name: 'normal', data: {}, opts: { priority: 5 } }, { name: 'high', data: {}, opts: { priority: 1 } }]);
  const w = new Worker(q.name, async (job) => { order.push(job.name); }, { connection, concurrency: 1 });
  await sleep(600); console.log('enqueued low, normal, high -> processed:', order.join(' -> ')); await w.close(); await q.obliterate({ force: true }); await q.close();
}
console.log('\n--- scheduler: one tick per interval even with TWO worker processes (state lives in Redis) ---');
{
  const q = new Queue('ch28-sched-' + Date.now(), { connection }); const ticks = [];
  const mk = (id) => new Worker(q.name, async () => { ticks.push(id); }, { connection });
  const w1 = mk('instance-A'), w2 = mk('instance-B');
  await q.upsertJobScheduler('every-300', { every: 300 }, { name: 'tick', data: {} });
  await sleep(2000); await q.removeJobScheduler('every-300'); await sleep(100);
  console.log(`2 instances, ~2 s, every 300 ms -> ${ticks.length} ticks total (expected ~6, NOT 12): handled by ${[...new Set(ticks)].join(' & ')}  split ${['instance-A', 'instance-B'].map((i) => `${i}:${ticks.filter((t) => t === i).length}`).join(' ')}`);
  await w1.close(); await w2.close(); await q.obliterate({ force: true }); await q.close();
}
