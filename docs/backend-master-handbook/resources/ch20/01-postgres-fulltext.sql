\pset border 1
DROP SCHEMA IF EXISTS ch20 CASCADE; CREATE SCHEMA ch20; SET search_path = ch20, public;
SET max_parallel_workers_per_gather = 0;
SELECT setseed(0.7);
CREATE TABLE reviews AS
SELECT g AS id, 1 + (g % 5000) AS product_id,
  (SELECT string_agg(w, ' ') FROM (SELECT (ARRAY['notebook','paper','pages','ruled','smooth','pen','ink','leaks','blue','durable','backpack','zipper','broke','comfortable','shipping','late','fast','refund','quality','cheap','premium','sturdy','light','heavy','color','faded','love','hate','recommend','waste'])[1 + (random()*29)::int] AS w FROM generate_series(1, 12 + g % 8) WHERE g > 0) s) AS body
FROM generate_series(1, 300000) g;
UPDATE reviews SET body = body || ' waterproof' WHERE id % 1000 = 7;
ANALYZE reviews;
SELECT count(*) AS rows, pg_size_pretty(pg_relation_size('reviews')) AS size FROM reviews;
\echo '### E1 ILIKE %waterproof% (no index)'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON, TIMING OFF) SELECT id FROM reviews WHERE body ILIKE '%waterproof%';
\echo '### E2 full-text: generated tsvector + GIN'
ALTER TABLE reviews ADD COLUMN tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', body)) STORED;
CREATE INDEX reviews_tsv_idx ON reviews USING gin (tsv);
ANALYZE reviews;
SELECT pg_size_pretty(pg_relation_size('reviews_tsv_idx')) AS gin_size;
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON, TIMING OFF) SELECT id FROM reviews WHERE tsv @@ to_tsquery('english', 'waterproof');
\echo '### E3 stemming and web-style queries'
SELECT to_tsvector('english', 'The pens were leaking and the notebooks leaked') AS vec;
SELECT count(*) FILTER (WHERE tsv @@ websearch_to_tsquery('english', 'leak')) AS stem_leak,
       count(*) FILTER (WHERE body ILIKE '%leak%') AS ilike_leak_substring,
       count(*) FILTER (WHERE tsv @@ websearch_to_tsquery('english', 'leaking pen -refund')) AS leaking_pen_not_refund,
       count(*) FILTER (WHERE tsv @@ websearch_to_tsquery('english', '"fast shipping"')) AS phrase_fast_shipping
FROM reviews;
\echo '### E4 ranking'
SELECT id, round(ts_rank(tsv, q)::numeric, 4) AS rank, left(body, 70) AS body
FROM reviews, websearch_to_tsquery('english', 'waterproof notebook') q WHERE tsv @@ q ORDER BY rank DESC, id LIMIT 3;
\echo '### E5 typo tolerance needs trigrams (FTS does not do fuzzy)'
SELECT count(*) AS fts_typo FROM reviews WHERE tsv @@ plainto_tsquery('english', 'waterprof');
CREATE TABLE words AS SELECT DISTINCT unnest(string_to_array(body, ' ')) AS word FROM reviews;
CREATE INDEX ON words USING gin (word gin_trgm_ops);
SELECT word, round(similarity(word, 'waterprof')::numeric, 2) AS sim FROM words WHERE word % 'waterprof' ORDER BY sim DESC LIMIT 3;
