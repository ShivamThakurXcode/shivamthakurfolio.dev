-- Chapter 15 dataset: 50,000 users, 1,000,000 orders (skewed statuses), in schema ch15.
-- Load:  docker exec -i bmh-pg-test psql -U postgres -d shopline -X -q < ch15-setup.sql   (about 20 s)
-- Needs: CREATE EXTENSION pg_trgm; (for the trigram demo)  — created in schema public, so use SET search_path = ch15, public;
\timing off
DROP SCHEMA IF EXISTS ch15 CASCADE;
CREATE SCHEMA ch15;
SET search_path = ch15;
SELECT setseed(0.42);

CREATE TABLE users (
  id    bigint PRIMARY KEY,
  email text NOT NULL,
  name  text NOT NULL,
  country char(2) NOT NULL
);
INSERT INTO users
SELECT g, 'user' || g || '@example.com', 'User ' || g,
       (ARRAY['IN','IN','IN','IN','US','US','GB','DE','FR','JP'])[1 + (random()*9)::int]
FROM generate_series(1, 50000) g;

CREATE TABLE orders (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      bigint NOT NULL,
  status       text   NOT NULL,
  total_minor  int    NOT NULL,
  created_at   timestamptz NOT NULL
);
INSERT INTO orders (user_id, status, total_minor, created_at)
SELECT 1 + (random()*49999)::int,
       CASE WHEN r < 0.80 THEN 'delivered' WHEN r < 0.88 THEN 'shipped' WHEN r < 0.94 THEN 'paid'
            WHEN r < 0.99 THEN 'pending' ELSE 'cancelled' END,
       500 + (random()*200000)::int,
       timestamptz '2025-01-01' + (g * interval '1 minute') * 0.52
FROM (SELECT g, random() AS r FROM generate_series(1, 1000000) g) s;
ANALYZE;
SELECT count(*) AS orders, min(created_at)::date AS first_day, max(created_at)::date AS last_day,
       pg_size_pretty(pg_relation_size('orders')) AS table_size,
       pg_size_pretty(pg_relation_size('orders_pkey')) AS pk_size FROM orders;
SELECT status, count(*), round(100.0*count(*)/sum(count(*)) OVER (), 1) AS pct FROM orders GROUP BY 1 ORDER BY 2 DESC;
SELECT relpages, reltuples::bigint FROM pg_class WHERE relname = 'orders';
