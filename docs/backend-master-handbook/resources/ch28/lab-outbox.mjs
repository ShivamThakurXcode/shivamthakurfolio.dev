import pg from 'pg';
import { CFG, sleep } from './pgqueue.mjs';
const pool = new pg.Pool({ ...CFG, max: 20 });
const q = (sql, p) => pool.query(sql, p);
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
await q(`DROP SCHEMA IF EXISTS ch28 CASCADE; CREATE SCHEMA ch28;
  CREATE TABLE ch28.orders (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, total_minor int NOT NULL);
  CREATE TABLE ch28.outbox (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, topic text NOT NULL, payload jsonb NOT NULL, created_at timestamptz DEFAULT now(), published_at timestamptz);
  CREATE INDEX ON ch28.outbox (id) WHERE published_at IS NULL;
  CREATE TABLE ch28.processed (message_id text PRIMARY KEY);
  CREATE TABLE ch28.emails_sent (id bigserial PRIMARY KEY, order_id bigint);
  CREATE TABLE ch28.schedule_runs (tick int, instance text);
  CREATE TABLE ch28.schedule (name text PRIMARY KEY, last_tick int NOT NULL DEFAULT -1);
  INSERT INTO ch28.schedule VALUES ('daily-report', -1);`);

console.log('=== 1. do slow work in the request, or enqueue it? (email = 300 ms, 200 orders, 20 concurrent clients) ===');
const sendEmail = () => sleep(300);
async function createOrder(client) { const { rows: [o] } = await client.query('INSERT INTO orders (total_minor) VALUES (31500) RETURNING id'); return o.id; }
const inline = async () => { const id = await createOrder(pool); await sendEmail(); return id; };
const queued = async () => { const c = await pool.connect(); try { await c.query('BEGIN'); const id = await createOrder(c); await c.query(`INSERT INTO outbox (topic, payload) VALUES ('order.created', $1)`, [{ orderId: id }]); await c.query('COMMIT'); return id; } finally { c.release(); } };
for (const [label, fn] of [['inline (await sendEmail)', inline], ['enqueue (outbox row, same tx)', queued]]) {
  const lat = []; const t0 = performance.now(); let next = 0;
  await Promise.all(Array.from({ length: 20 }, async () => { while (next < 200) { next++; const s = performance.now(); await fn(); lat.push(performance.now() - s); } }));
  console.log(`${label.padEnd(32)} request latency p50 ${pct(lat, 0.5).toFixed(0).padStart(4)} ms  p99 ${pct(lat, 0.99).toFixed(0).padStart(4)} ms | 200 orders took ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

console.log('\n=== 2. the dual-write problem vs the outbox (20% of requests "crash" between the two steps; 300 orders) ===');
await q('TRUNCATE orders, outbox, emails_sent, processed RESTART IDENTITY');
const queueDelivered = []; const externalQueue = { publish: async (msg) => { queueDelivered.push(msg); } };       // stand-in for Redis/Kafka/SQS
let crashes = 0;
for (let i = 0; i < 300; i++) {                                                  // A) naive dual write: DB commit, THEN publish
  const id = await createOrder(pool);
  if (Math.random() < 0.2) { crashes++; continue; }                              // process dies after the commit, before publishing
  await externalQueue.publish({ id: `A-${id}`, orderId: id });
}
console.log(`naive dual write : ${crashes} of 300 orders committed but NEVER announced (no email, no inventory event) -> silent data loss`);
queueDelivered.length = 0; await q('TRUNCATE orders, outbox RESTART IDENTITY');
crashes = 0;
for (let i = 0; i < 300; i++) {                                                  // B) outbox: order + outbox row in ONE transaction; a relay publishes later
  const c = await pool.connect(); try { await c.query('BEGIN'); const id = await createOrder(c); await c.query(`INSERT INTO outbox (topic, payload) VALUES ('order.created', $1)`, [{ orderId: id }]); await c.query('COMMIT'); } finally { c.release(); }
}
// the relay: claim unpublished rows, publish, mark published. batches 2 and 5 crash AFTER publishing but BEFORE marking (at-least-once!)
let relayCrashes = 0, relayBatches = 0;
async function relayOnce() {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query(`SELECT id, payload FROM outbox WHERE published_at IS NULL ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED`);
    for (const r of rows) await externalQueue.publish({ id: `outbox-${r.id}`, orderId: r.payload.orderId });
    if (++relayBatches === 2 || relayBatches === 5) { relayCrashes++; await c.query('ROLLBACK'); return rows.length; }            // crash AFTER publishing the batch, BEFORE marking it (15% of batches)
    await c.query(`UPDATE outbox SET published_at = now() WHERE id = ANY($1)`, [rows.map((r) => r.id)]); await c.query('COMMIT'); return rows.length;
  } finally { c.release(); }
}
while ((await q('SELECT count(*)::int n FROM outbox WHERE published_at IS NULL')).rows[0].n > 0) await relayOnce();
const ids = queueDelivered.map((m) => m.orderId); const unique = new Set(ids);
console.log(`outbox + relay    : orders 300 | unpublished 0 | messages delivered ${queueDelivered.length} for ${unique.size} distinct orders (${queueDelivered.length - unique.size} duplicates caused by ${relayCrashes} relay crashes after publishing)`);
// consumer: idempotent via a processed-messages table
const consume = async (m) => { const r = await q('INSERT INTO processed (message_id) VALUES ($1) ON CONFLICT DO NOTHING', [`order-${m.orderId}`]); if (r.rowCount === 1) await q('INSERT INTO emails_sent (order_id) VALUES ($1)', [m.orderId]); };
for (const m of queueDelivered) await consume(m);
console.log(`idempotent consumer: emails actually sent ${(await q('SELECT count(*)::int n FROM emails_sent')).rows[0].n} for 300 orders (duplicates absorbed by the processed table)`);

console.log('\n=== 3. backpressure: producer 200 jobs/s, consumer 50 jobs/s for 4 s ===');
async function pressure(label, maxDepth) {
  let depth = 0, produced = 0, rejected = 0, consumed = 0; const queue = []; const waits = [];
  const consumer = setInterval(() => { const j = queue.shift(); if (j) { consumed++; waits.push(Date.now() - j); } }, 20);                  // 50/s
  const producer = setInterval(() => { for (let k = 0; k < 2; k++) { produced++; if (queue.length >= maxDepth) rejected++; else queue.push(Date.now()); } }, 10);   // 200/s
  const samples = []; for (let s = 0; s < 4; s++) { await sleep(1000); samples.push(queue.length); }
  clearInterval(producer); clearInterval(consumer);
  console.log(`${label.padEnd(30)} queue depth after 1/2/3/4 s: ${samples.join(', ').padEnd(18)} | rejected (HTTP 429/503) ${String(rejected).padStart(3)} | median wait of served jobs ${pct(waits, 0.5)} ms, p99 ${pct(waits, 0.99)} ms`);
}
await pressure('unbounded queue', Infinity); await pressure('bounded (max depth 100)', 100);

console.log('\n=== 4. scheduled jobs on 3 instances: every instance fires the cron ===');
await q('TRUNCATE schedule_runs');
const instances = ['A', 'B', 'C'];
for (const mode of ['naive', 'claimed']) {
  await q('TRUNCATE schedule_runs'); await q(`UPDATE schedule SET last_tick = -1`);
  for (let tick = 0; tick < 5; tick++) {
    await Promise.all(instances.map(async (inst) => {
      if (mode === 'naive') return q('INSERT INTO schedule_runs VALUES ($1,$2)', [tick, inst]);
      const c = await pool.connect(); try {                                                       // claim the tick with a conditional UPDATE (atomic)
        const r = await c.query(`UPDATE schedule SET last_tick = $1 WHERE name = 'daily-report' AND last_tick < $1`, [tick]);
        if (r.rowCount === 1) await c.query('INSERT INTO schedule_runs VALUES ($1,$2)', [tick, inst]);
      } finally { c.release(); }
    }));
  }
  const per = (await q('SELECT tick, count(*)::int n FROM schedule_runs GROUP BY 1 ORDER BY 1')).rows.map((r) => r.n);
  console.log(`${mode.padEnd(8)} runs per tick (5 ticks, 3 instances): ${per.join(', ')}  -> total ${per.reduce((a, b) => a + b, 0)}`);
}
await pool.end();
