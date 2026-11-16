import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import pg from 'pg';

const DIR = process.env.MIGRATIONS_DIR ?? 'migrations';
const LOCK_ID = 727274; // any constant; one runner at a time per database

export async function migrate(client, { dir = DIR, log = console.log } = {}) {
  await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Map((await client.query('SELECT version, checksum FROM schema_migrations')).rows.map((r) => [r.version, r.checksum]));
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    let applied = 0;
    for (const file of files) {
      const sql = await readFile(path.join(dir, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex').slice(0, 12);
      if (done.has(file)) {
        if (done.get(file) !== checksum) throw new Error(`${file} was edited after it was applied (checksum ${done.get(file)} -> ${checksum}). Write a NEW migration instead.`);
        continue;
      }
      const noTx = /^--\s*no-transaction/m.test(sql);       // e.g. CREATE INDEX CONCURRENTLY
      log(`applying ${file}${noTx ? ' (no transaction)' : ''}`);
      try {
        if (!noTx) await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [file, checksum]);
        if (!noTx) await client.query('COMMIT');
        applied++;
      } catch (err) {
        if (!noTx) await client.query('ROLLBACK');
        throw new Error(`migration ${file} failed: ${err.message}`);
      }
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
  }
}
