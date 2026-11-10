\pset border 1
\pset null '∅'

\echo '### 1. filter + sort + limit'
SELECT id, name, price_minor FROM products WHERE active AND price_minor < 20000 ORDER BY price_minor DESC LIMIT 3;

\echo '### 2. NULL semantics'
SELECT name, phone FROM users WHERE phone = NULL;
SELECT name, phone FROM users WHERE phone IS NULL;
SELECT name, phone FROM users WHERE phone <> '+91-90000-00001';
SELECT name, COALESCE(phone, 'no phone') AS phone FROM users ORDER BY id;

\echo '### 3. aggregates: COUNT(*) vs COUNT(col)'
SELECT count(*) AS all_users, count(phone) AS with_phone FROM users;

\echo '### 4. revenue by month (delivered/paid/shipped only), using GROUP BY + date_trunc'
SELECT date_trunc('month', o.created_at)::date AS month,
       count(DISTINCT o.id)                      AS orders,
       sum(oi.quantity * oi.unit_price_minor)    AS revenue_minor
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status IN ('paid','shipped','delivered')
GROUP BY 1
ORDER BY 1;

\echo '### 5. HAVING: customers with more than 1 order'
SELECT u.name, count(*) AS orders
FROM users u JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name
HAVING count(*) > 1
ORDER BY orders DESC, u.name;

\echo '### 6. FILTER clause: several conditional aggregates in one pass'
SELECT count(*) AS total,
       count(*) FILTER (WHERE status = 'delivered') AS delivered,
       count(*) FILTER (WHERE status = 'cancelled') AS cancelled
FROM orders;

\echo '### 7. LEFT JOIN: users who never ordered'
SELECT u.name FROM users u LEFT JOIN orders o ON o.user_id = u.id WHERE o.id IS NULL;

\echo '### 8. products never sold (anti-join with NOT EXISTS)'
SELECT p.id, p.name FROM products p
WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)
ORDER BY p.id;

\echo '### 9. the NOT IN + NULL trap'
SELECT count(*) AS never_ordered_notin
FROM users WHERE id NOT IN (SELECT user_id FROM orders);
SELECT count(*) AS never_ordered_notin_with_a_null
FROM users WHERE id NOT IN (SELECT user_id FROM orders UNION ALL SELECT NULL);

\echo '### 10. JOIN FAN-OUT: the wrong revenue per product'
SELECT p.name, sum(oi.quantity * oi.unit_price_minor) AS wrong_revenue
FROM products p
JOIN order_items oi ON oi.product_id = p.id
JOIN reviews r      ON r.product_id  = p.id          -- one row per review multiplies each order line!
GROUP BY p.id, p.name ORDER BY p.id;

\echo '### 10b. correct: aggregate each side separately, then join'
SELECT p.name, s.revenue_minor, r.reviews, r.avg_rating
FROM products p
JOIN (SELECT product_id, sum(quantity * unit_price_minor) AS revenue_minor FROM order_items GROUP BY 1) s ON s.product_id = p.id
LEFT JOIN (SELECT product_id, count(*) AS reviews, round(avg(rating), 2) AS avg_rating FROM reviews GROUP BY 1) r ON r.product_id = p.id
ORDER BY p.id;
\pset border 1
\pset null '∅'

\echo '### 11. CTE: monthly revenue + running total (window) + month-over-month growth (LAG)'
WITH monthly AS (
  SELECT date_trunc('month', o.created_at)::date AS month,
         sum(oi.quantity * oi.unit_price_minor)  AS revenue
  FROM orders o JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY 1
)
SELECT month,
       revenue,
       sum(revenue) OVER (ORDER BY month)                       AS running_total,
       lag(revenue) OVER (ORDER BY month)                       AS prev_month,
       round(100.0 * (revenue - lag(revenue) OVER (ORDER BY month))
             / NULLIF(lag(revenue) OVER (ORDER BY month), 0), 1) AS growth_pct
FROM monthly
ORDER BY month;

\echo '### 12. top product per category by units sold (ROW_NUMBER, top-N-per-group)'
WITH sales AS (
  SELECT c.name AS category, p.name AS product, sum(oi.quantity) AS units
  FROM order_items oi
  JOIN products p   ON p.id = oi.product_id
  JOIN categories c ON c.id = p.category_id
  GROUP BY c.name, p.name
), ranked AS (
  SELECT *, row_number() OVER (PARTITION BY category ORDER BY units DESC) AS rn
  FROM sales
)
SELECT category, product, units FROM ranked WHERE rn = 1 ORDER BY category;

\echo '### 13. RANK vs DENSE_RANK vs ROW_NUMBER with ties'
SELECT name, price_minor,
       row_number() OVER w AS row_number,
       rank()       OVER w AS rank,
       dense_rank() OVER w AS dense_rank
FROM (VALUES ('A', 100), ('B', 100), ('C', 80), ('D', 50)) AS t(name, price_minor)
WINDOW w AS (ORDER BY price_minor DESC);

\echo '### 14. recursive CTE: category tree with depth and path'
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, 0 AS depth, name::text AS path
  FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.name, c.parent_id, t.depth + 1, t.path || ' > ' || c.name
  FROM categories c JOIN tree t ON c.parent_id = t.id
)
SELECT repeat('  ', depth) || name AS category, path FROM tree ORDER BY path;

\echo '### 15. gap-filling with generate_series: orders per week (zero weeks included)'
SELECT w.week::date, count(o.id) AS orders
FROM generate_series('2026-08-03'::date, '2026-09-07'::date, interval '7 days') AS w(week)
LEFT JOIN orders o ON o.created_at >= w.week AND o.created_at < w.week + interval '7 days'
GROUP BY w.week ORDER BY w.week;

\echo '### 16. each customer lifetime value + rank (aggregate then window)'
SELECT u.name,
       sum(oi.quantity * oi.unit_price_minor) AS lifetime_minor,
       rank() OVER (ORDER BY sum(oi.quantity * oi.unit_price_minor) DESC) AS spend_rank
FROM users u
JOIN orders o ON o.user_id = u.id AND o.status <> 'cancelled'
JOIN order_items oi ON oi.order_id = o.id
GROUP BY u.id, u.name
ORDER BY spend_rank;

\echo '### 17. correlated subquery vs LATERAL: latest order per user'
SELECT u.name, lo.id AS last_order, lo.created_at::date AS on_day
FROM users u
LEFT JOIN LATERAL (
  SELECT id, created_at FROM orders o WHERE o.user_id = u.id ORDER BY created_at DESC LIMIT 1
) lo ON true
ORDER BY u.id;

\echo '### 18. set operations: users who ordered AND reviewed vs ordered but never reviewed'
SELECT user_id FROM orders INTERSECT SELECT user_id FROM reviews ORDER BY 1;
SELECT user_id FROM orders EXCEPT SELECT user_id FROM reviews ORDER BY 1;

\echo '### 19. CASE + conditional pricing tier'
SELECT name, price_minor,
       CASE WHEN price_minor >= 100000 THEN 'premium'
            WHEN price_minor >= 10000  THEN 'standard'
            ELSE 'budget' END AS tier
FROM products ORDER BY price_minor DESC;

\echo '### 20. jsonb: query inside a column'
SELECT name, attrs->>'color' AS color FROM products WHERE attrs ? 'color' ORDER BY id;
SELECT name FROM products WHERE attrs @> '{"ruled": true}';
\pset border 1
\pset null '∅'

\echo '### 21. UPDATE ... RETURNING and INSERT ... ON CONFLICT (upsert)'
BEGIN;
UPDATE products SET price_minor = price_minor * 110 / 100 WHERE category_id = 3 RETURNING id, name, price_minor;
INSERT INTO reviews (product_id, user_id, rating, body) VALUES (1, 1, 3, 'changed my mind')
ON CONFLICT (product_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body
RETURNING id, product_id, user_id, rating, body;
INSERT INTO reviews (product_id, user_id, rating) VALUES (1, 1, 5) ON CONFLICT DO NOTHING RETURNING id;
ROLLBACK;

\echo '### 22. integer division and rounding traps'
SELECT 7 / 2 AS int_div, 7 / 2.0 AS decimal_div, 7::numeric / 2 AS cast_div, round(2.5) AS r25, round(3.5) AS r35, round(2.675, 2) AS r2675;

\echo '### 23. timestamptz vs timestamp'
SET TIME ZONE 'UTC';
SELECT '2026-11-03 09:30+05:30'::timestamptz AS stored_as_utc;
SET TIME ZONE 'Asia/Kolkata';
SELECT '2026-11-03 09:30+05:30'::timestamptz AS shown_in_ist;
SELECT '2026-11-03 09:30'::timestamp AS naive_no_zone_info;
SET TIME ZONE 'UTC';

\echo '### 24. constraint errors you will see'
INSERT INTO users (email, name, country) VALUES ('asha@example.com', 'Dup', 'IN');
INSERT INTO orders (user_id, status, created_at) VALUES (999, 'paid', now());
INSERT INTO order_items VALUES (1, 1, 0, 100);
INSERT INTO products (category_id, name, price_minor) VALUES (2, NULL, 5);

\echo '### 25. a VIEW and a MATERIALIZED VIEW'
CREATE OR REPLACE VIEW v_order_totals AS
SELECT o.id AS order_id, o.user_id, o.status, o.created_at,
       sum(oi.quantity * oi.unit_price_minor) AS total_minor
FROM orders o JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id;
SELECT * FROM v_order_totals ORDER BY order_id LIMIT 3;

DROP MATERIALIZED VIEW IF EXISTS mv_daily_revenue;
CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT created_at::date AS day, sum(total_minor) AS revenue_minor FROM v_order_totals WHERE status <> 'cancelled' GROUP BY 1;
SELECT * FROM mv_daily_revenue ORDER BY day LIMIT 3;
