\pset border 1
SET search_path = ch20, public;
SET max_parallel_workers_per_gather = 0;
DROP TABLE IF EXISTS ev_flat, ev CASCADE;
CREATE TABLE ev (id bigint GENERATED ALWAYS AS IDENTITY, at timestamptz NOT NULL, user_id int, kind text, PRIMARY KEY (id, at)) PARTITION BY RANGE (at);
DO $$ BEGIN FOR m IN 1..12 LOOP
  EXECUTE format('CREATE TABLE ev_2025_%s PARTITION OF ev FOR VALUES FROM (%L) TO (%L)', lpad(m::text,2,'0'), make_date(2025,m,1), make_date(2025,m,1) + interval '1 month');
END LOOP; END $$;
INSERT INTO ev (at, user_id, kind) SELECT timestamptz '2025-01-01' + (g * interval '15 seconds'), g % 5000, (ARRAY['click','view','buy'])[1 + g % 3] FROM generate_series(1, 2000000) g;
CREATE INDEX ON ev (at);
CREATE TABLE ev_flat AS SELECT * FROM ev; CREATE INDEX ON ev_flat (at);
ANALYZE ev; ANALYZE ev_flat;
SELECT tableoid::regclass AS partition, count(*) FROM ev GROUP BY 1 ORDER BY 1 LIMIT 4;
\echo '### P1 partition pruning: one day'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON) SELECT count(*) FROM ev WHERE at >= '2025-03-10' AND at < '2025-03-11';
\echo '### P2 retention: drop the oldest month'
\timing on
DELETE FROM ev_flat WHERE at < '2025-02-01';
\timing off
\timing on
ALTER TABLE ev DETACH PARTITION ev_2025_01;
DROP TABLE ev_2025_01;
\timing off
