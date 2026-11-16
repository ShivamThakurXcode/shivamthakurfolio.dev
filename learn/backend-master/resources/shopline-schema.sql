-- ShopLine schema v1 (Chapter 13). Money is stored as integer minor units (paise).
DROP TABLE IF EXISTS reviews, order_items, orders, products, categories, users CASCADE;

CREATE TABLE users (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  country     char(2)     NOT NULL,
  phone       text,                                   -- nullable on purpose (NULL demos)
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  parent_id  int REFERENCES categories (id)
);

CREATE TABLE products (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id  int     NOT NULL REFERENCES categories (id),
  name         text    NOT NULL,
  price_minor  integer NOT NULL CHECK (price_minor >= 0),
  stock        integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active       boolean NOT NULL DEFAULT true,
  attrs        jsonb   NOT NULL DEFAULT '{}'
);

CREATE TABLE orders (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint      NOT NULL REFERENCES users (id),
  status      text        NOT NULL CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
  created_at  timestamptz NOT NULL
);

CREATE TABLE order_items (
  order_id          bigint  NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id        bigint  NOT NULL REFERENCES products (id),
  quantity          integer NOT NULL CHECK (quantity > 0),
  unit_price_minor  integer NOT NULL CHECK (unit_price_minor >= 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE reviews (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id  bigint      NOT NULL REFERENCES products (id),
  user_id     bigint      NOT NULL REFERENCES users (id),
  rating      integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

INSERT INTO users (email, name, country, phone, created_at) VALUES
  ('asha@example.com', 'Asha', 'IN', '+91-90000-00001', '2026-07-01'),
  ('ravi@example.com', 'Ravi', 'IN', NULL,              '2026-07-15'),
  ('mei@example.com',  'Mei',  'SG', '+65-8000-0003',   '2026-08-02'),
  ('lena@example.com', 'Lena', 'DE', NULL,              '2026-08-20'),
  ('omar@example.com', 'Omar', 'AE', '+971-50-000-0005','2026-09-05');

INSERT INTO categories (name, parent_id) VALUES
  ('Stationery', NULL), ('Notebooks', 1), ('Pens', 1), ('Bags', NULL), ('Backpacks', 4);

INSERT INTO products (category_id, name, price_minor, stock, active, attrs) VALUES
  (2, 'Notebook A5',   12000,   50, true,  '{"pages": 200, "ruled": true}'),
  (2, 'Notebook A4',   18000,   30, true,  '{"pages": 120, "ruled": false}'),
  (3, 'Gel Pen',        1500,  500, true,  '{"color": "blue"}'),
  (3, 'Fountain Pen',  45000,   20, true,  '{"color": "black", "nib": "fine"}'),
  (5, 'Backpack 20L',  89900,   12, true,  '{"volume_l": 20}'),
  (4, 'Laptop Bag',   129900,    8, true,  '{"fits_inches": 15}'),
  (1, 'Sticky Notes',   2500,    0, false, '{}'),
  (3, 'Eraser',          500, 1000, true,  '{}');

INSERT INTO orders (user_id, status, created_at) VALUES
  (1, 'delivered', '2026-08-05 10:00+00'),
  (1, 'delivered', '2026-08-28 12:30+00'),
  (2, 'delivered', '2026-09-02 09:15+00'),
  (3, 'shipped',   '2026-09-10 16:45+00'),
  (1, 'paid',      '2026-09-18 08:00+00'),
  (4, 'cancelled', '2026-09-21 19:20+00'),
  (2, 'delivered', '2026-10-03 11:11+00'),
  (3, 'pending',   '2026-10-07 14:05+00'),
  (1, 'delivered', '2026-10-12 13:40+00');

INSERT INTO order_items (order_id, product_id, quantity, unit_price_minor) VALUES
  (1, 1, 2, 12000), (1, 3, 5, 1500),
  (2, 5, 1, 89900),
  (3, 4, 1, 45000), (3, 3, 2, 1500),
  (4, 2, 3, 18000),
  (5, 1, 1, 12000), (5, 6, 1, 129900),
  (6, 5, 1, 89900),
  (7, 3, 10, 1500), (7, 1, 1, 12000),
  (8, 4, 2, 45000),
  (9, 5, 1, 89900), (9, 3, 1, 1500);

INSERT INTO reviews (product_id, user_id, rating, body, created_at) VALUES
  (1, 1, 5, 'Great paper', '2026-08-10'),
  (1, 2, 4, 'Good',        '2026-09-08'),
  (1, 3, 4, NULL,          '2026-09-20'),
  (3, 1, 5, 'Smooth',      '2026-08-12'),
  (3, 2, 3, 'Okay',        '2026-09-09'),
  (5, 1, 5, 'Love it',     '2026-09-01'),
  (4, 2, 2, 'Scratchy',    '2026-09-15');

ANALYZE;
