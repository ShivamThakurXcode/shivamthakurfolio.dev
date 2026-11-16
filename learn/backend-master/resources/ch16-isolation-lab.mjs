// Run order: node ch16-setup.mjs  then any lab. Needs: npm i pg, and the bmh-pg-test container (see Chapter 12).
import { pool, client, sleep } from './ch16-lib.mjs';
await pool.query(`DROP TABLE IF EXISTS acct, items, doctors, jobs, plain CASCADE;
 CREATE TABLE acct (id int PRIMARY KEY, balance int);  INSERT INTO acct VALUES (1,100);
 CREATE TABLE items (id serial PRIMARY KEY, cat text); INSERT INTO items(cat) VALUES ('shoes'),('shoes');
 CREATE TABLE doctors (name text PRIMARY KEY, on_call boolean); INSERT INTO doctors VALUES ('Asha',true),('Ravi',true);`);
const A = await client(), B = await client();
const one = async (c, sql) => (await c.query(sql)).rows[0];

for (const level of ['READ COMMITTED', 'REPEATABLE READ']) {
  console.log(`\n=== ${level} ===`);
  await pool.query('UPDATE acct SET balance = 100 WHERE id = 1');
  await pool.query(`DELETE FROM items WHERE id > 2`);
  await A.query(`BEGIN ISOLATION LEVEL ${level}`);
  const r1 = await one(A, 'SELECT balance FROM acct WHERE id = 1');
  const c1 = await one(A, `SELECT count(*)::int AS n FROM items WHERE cat = 'shoes'`);
  await B.query(`UPDATE acct SET balance = 50 WHERE id = 1`);           // autocommit: commits immediately
  await B.query(`INSERT INTO items (cat) VALUES ('shoes')`);
  const r2 = await one(A, 'SELECT balance FROM acct WHERE id = 1');
  const c2 = await one(A, `SELECT count(*)::int AS n FROM items WHERE cat = 'shoes'`);
  console.log(`non-repeatable read: first=${r1.balance} second=${r2.balance}   ${r1.balance !== r2.balance ? '<- CHANGED inside one transaction' : '(stable snapshot)'}`);
  console.log(`phantom read:        first=${c1.n} second=${c2.n}   ${c1.n !== c2.n ? '<- a new row APPEARED' : '(stable snapshot)'}`);
  await A.query('COMMIT');
}

console.log('\n=== dirty read attempt (READ UNCOMMITTED) ===');
await pool.query('UPDATE acct SET balance = 100 WHERE id = 1');
await B.query('BEGIN'); await B.query('UPDATE acct SET balance = 999 WHERE id = 1');   // not committed
await A.query('BEGIN ISOLATION LEVEL READ UNCOMMITTED');
console.log('A sees:', (await one(A, 'SELECT balance FROM acct WHERE id = 1')).balance, '(B has uncommitted 999)');
await A.query('COMMIT'); await B.query('ROLLBACK');

console.log('\n=== write skew: "at least one doctor must stay on call" ===');
async function skew(level) {
  await pool.query('UPDATE doctors SET on_call = true');
  const res = [];
  const go = async (c, who) => {
    await c.query(`BEGIN ISOLATION LEVEL ${level}`);
    const { n } = await one(c, 'SELECT count(*)::int AS n FROM doctors WHERE on_call');
    await sleep(100);
    if (n >= 2) await c.query('UPDATE doctors SET on_call = false WHERE name = $1', [who]);
    try { await c.query('COMMIT'); res.push(`${who}:committed`); } catch (e) { res.push(`${who}:${e.code}`); }
  };
  await Promise.all([go(A, 'Asha'), go(B, 'Ravi')]).catch((e) => res.push(e.code));
  const left = (await one(pool, 'SELECT count(*)::int AS n FROM doctors WHERE on_call')).n;
  console.log(level.padEnd(16), res.join('  '), ` -> doctors still on call: ${left}`);
}
await skew('REPEATABLE READ');
await A.query('ROLLBACK').catch(() => {}); await B.query('ROLLBACK').catch(() => {});
await skew('SERIALIZABLE');
await A.query('ROLLBACK').catch(() => {}); await B.query('ROLLBACK').catch(() => {});
await A.end(); await B.end(); await pool.end();
