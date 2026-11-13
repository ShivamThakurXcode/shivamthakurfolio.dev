import pg from 'pg';
const ES = 'http://127.0.0.1:54340';
const es = async (method, path, body, ct = 'application/json') => { const r = await fetch(ES + path, { method, headers: { 'content-type': ct }, body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw Object.assign(new Error(JSON.stringify(j.error?.reason ?? j)), { status: r.status }); return j; };
const pool = new pg.Pool({ host: '127.0.0.1', port: 54329, user: 'postgres', password: 'bmhtest', database: 'shopline' });
console.log('ES version:', (await es('GET', '/')).version.number);
await es('DELETE', '/reviews').catch(() => {});
await es('PUT', '/reviews', { settings: { number_of_shards: 1, number_of_replicas: 0 }, mappings: { properties: { product_id: { type: 'integer' }, body: { type: 'text', analyzer: 'english' } } } });
const { rows } = await pool.query('SELECT id, product_id, body FROM ch20.reviews ORDER BY id LIMIT 100000');
let t = performance.now();
for (let i = 0; i < rows.length; i += 5000) {
  const nd = rows.slice(i, i + 5000).flatMap((r) => [JSON.stringify({ index: { _id: r.id } }), JSON.stringify({ product_id: r.product_id, body: r.body })]).join('\n') + '\n';
  const res = await es('POST', '/reviews/_bulk', nd, 'application/x-ndjson'); if (res.errors) throw new Error('bulk errors');
}
console.log(`bulk indexed ${rows.length} docs in ${((performance.now() - t) / 1000).toFixed(1)} s`);
console.log('searchable immediately?', (await es('GET', '/reviews/_count')).count, '(of', rows.length + ')');
await es('POST', '/reviews/_refresh'); console.log('after _refresh:', (await es('GET', '/reviews/_count')).count);
const stats = await es('GET', '/reviews/_stats/store'); console.log('index size:', (stats._all.primaries.store.size_in_bytes / 1e6).toFixed(1), 'MB');
const q = async (label, body) => { const t0 = performance.now(); const r = await es('POST', '/reviews/_search', body); console.log(label.padEnd(40), `hits=${String(r.hits.total.value).padStart(6)}`.padEnd(16), `took(server)=${r.took} ms  round trip=${(performance.now() - t0).toFixed(0)} ms`); return r; };
await q('match waterproof', { query: { match: { body: 'waterproof' } }, size: 3 });
await q('fuzzy: "waterprof" (typo)', { query: { match: { body: { query: 'waterprof', fuzziness: 'AUTO' } } }, size: 3 });
await q('phrase "fast shipping"', { query: { match_phrase: { body: 'fast shipping' } }, size: 3 });
await q('bool: leaking pen NOT refund', { query: { bool: { must: [{ match: { body: 'leaking pen' } }], must_not: [{ match: { body: 'refund' } }] } }, size: 3 });
const r = await q('highlight + rank', { query: { match: { body: 'waterproof notebook' } }, highlight: { fields: { body: {} }, pre_tags: ['['], post_tags: [']'] }, size: 2 });
console.log('  top hit score', r.hits.hits[0]._score.toFixed(2), '| highlight:', r.hits.hits[0].highlight.body[0].slice(0, 90));
const agg = await es('POST', '/reviews/_search', { size: 0, query: { match: { body: 'refund' } }, aggs: { per_product: { terms: { field: 'product_id', size: 3 } } } });
console.log('aggregation top products mentioning refund:', agg.aggregations.per_product.buckets.map((b) => `${b.key}:${b.doc_count}`).join(', '));
// the sync problem: change PG, ES doesn't know
await pool.query(`UPDATE ch20.reviews SET body = body || ' brandnewword' WHERE id = 1`);
console.log('after UPDATE in PostgreSQL, ES finds "brandnewword":', (await es('POST', '/reviews/_search', { query: { match: { body: 'brandnewword' } } })).hits.total.value, '<- search index is a COPY that must be synced');
await pool.query(`UPDATE ch20.reviews SET body = replace(body, ' brandnewword', '') WHERE id = 1`);
await pool.end();
