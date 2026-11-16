import pg from 'pg';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const CFG = { host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline', options: '-c search_path=ch28' };

export async function setup(pool) {
  await pool.query(`DROP SCHEMA IF EXISTS ch28 CASCADE; CREATE SCHEMA ch28;
    CREATE TABLE ch28.jobs (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, queue text NOT NULL, payload jsonb NOT NULL,
      status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','dead')),
      attempts int NOT NULL DEFAULT 0, max_attempts int NOT NULL DEFAULT 5,
      run_at timestamptz NOT NULL DEFAULT now(), locked_by text, locked_until timestamptz, last_error text,
      created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz);
    CREATE INDEX jobs_ready_idx ON ch28.jobs (queue, run_at) WHERE status IN ('queued','running');
    CREATE TABLE ch28.effects (job_key text PRIMARY KEY, worker text, at timestamptz DEFAULT now());   -- idempotency record: "this side effect already happened"
    CREATE TABLE ch28.effect_log (id bigserial PRIMARY KEY, job_key text, worker text);                 -- plain log WITHOUT a unique key: reveals duplicates`);
}
export const enqueue = (pool, queue, payload, { runAt, maxAttempts = 5 } = {}) =>
  pool.query('INSERT INTO jobs (queue, payload, run_at, max_attempts) VALUES ($1, $2, COALESCE($3, now()), $4) RETURNING id', [queue, payload, runAt ?? null, maxAttempts]);

// Claim up to n jobs: queued & due, OR running with an EXPIRED lease (a crashed/slow worker). SKIP LOCKED = workers never block each other.
export async function claim(pool, queue, worker, { n = 1, leaseMs = 30000 } = {}) {
  const { rows } = await pool.query(`
    UPDATE jobs SET status = 'running', locked_by = $2, locked_until = now() + ($3 || ' milliseconds')::interval, attempts = attempts + 1
    WHERE id IN (SELECT id FROM jobs WHERE queue = $1 AND ((status = 'queued' AND run_at <= now()) OR (status = 'running' AND locked_until < now()))
                 ORDER BY run_at, id LIMIT $4 FOR UPDATE SKIP LOCKED)
    RETURNING *`, [queue, worker, String(leaseMs), n]);
  return rows;
}
// Completion is FENCED: only the current lease holder may finish the job.
export async function complete(pool, job, worker) {
  const r = await pool.query(`UPDATE jobs SET status = 'done', finished_at = now(), locked_until = NULL WHERE id = $1 AND locked_by = $2 AND status = 'running'`, [job.id, worker]);
  return r.rowCount === 1;
}
export async function fail(pool, job, worker, err, { baseMs = 200 } = {}) {
  const dead = job.attempts >= job.max_attempts;
  const delay = Math.min(60000, baseMs * 2 ** (job.attempts - 1)) * (0.5 + Math.random() / 2);          // exponential backoff with jitter (Ch 26)
  const r = await pool.query(`UPDATE jobs SET status = $3, last_error = $4, locked_until = NULL, run_at = now() + ($5 || ' milliseconds')::interval, finished_at = CASE WHEN $3 = 'dead' THEN now() END
                              WHERE id = $1 AND locked_by = $2 AND status = 'running'`, [job.id, worker, dead ? 'dead' : 'queued', String(err.message).slice(0, 200), String(Math.round(delay))]);
  return { updated: r.rowCount === 1, dead, delay };
}
export async function runWorker(pool, queue, worker, handler, { stopSignal, leaseMs = 30000, pollMs = 20, onEvent = () => {} } = {}) {
  while (!stopSignal.stopped) {
    const jobs = await claim(pool, queue, worker, { n: 1, leaseMs });
    if (!jobs.length) { await sleep(pollMs); continue; }
    for (const job of jobs) {
      try { await handler(job, { worker, stopSignal }); const ok = await complete(pool, job, worker); onEvent({ type: ok ? 'done' : 'lost-lease', job, worker }); }
      catch (e) { const f = await fail(pool, job, worker, e); onEvent({ type: f.dead ? 'dead' : 'retry', job, worker, delay: f.delay, error: e.message }); }
    }
  }
}
