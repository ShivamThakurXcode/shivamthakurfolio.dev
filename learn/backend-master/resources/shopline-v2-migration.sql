-- ShopLine schema v1 -> v2 (Chapter 14). Run AFTER shopline-schema.sql.
-- Everything is in one transaction: all-or-nothing.
BEGIN;

-- 1. updated_at maintained by the database, not by hoping every query remembers
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := clock_timestamp(); RETURN NEW; END $$;

ALTER TABLE users    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE products ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER trg_users_touch    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_products_touch BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 2. soft delete for users, with uniqueness only among live rows
ALTER TABLE users ADD COLUMN deleted_at timestamptz;
ALTER TABLE users DROP CONSTRAINT users_email_key;
CREATE UNIQUE INDEX users_email_alive ON users (lower(email)) WHERE deleted_at IS NULL;

-- 3. tags (many-to-many)
CREATE TABLE tags (
  id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE CHECK (name = lower(name))
);
CREATE TABLE product_tags (
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     bigint NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
CREATE INDEX product_tags_tag_idx ON product_tags (tag_id);

-- 4. addresses (one user, many addresses) + an immutable snapshot on the order
CREATE TABLE addresses (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line1       text NOT NULL,
  city        text NOT NULL,
  postal_code text NOT NULL,
  country     char(2) NOT NULL,
  is_default  boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX one_default_address_per_user ON addresses (user_id) WHERE is_default;
ALTER TABLE orders ADD COLUMN shipping_address jsonb;     -- copy of the address at purchase time

-- 5. payments: one order, many attempts; money stays integer
CREATE TABLE payments (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id      bigint NOT NULL REFERENCES orders(id),
  amount_minor  int    NOT NULL CHECK (amount_minor > 0),
  status        text   NOT NULL CHECK (status IN ('initiated','succeeded','failed','refunded')),
  provider_ref  text   UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON payments (order_id);

-- 6. FK columns we join/filter on are not auto-indexed in PostgreSQL
CREATE INDEX orders_user_idx       ON orders (user_id);
CREATE INDEX order_items_prod_idx  ON order_items (product_id);
CREATE INDEX reviews_user_idx      ON reviews (user_id);

COMMIT;
