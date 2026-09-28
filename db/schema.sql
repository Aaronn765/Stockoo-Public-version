-- Standalone demonstration schema. Use only in the disposable demo database.
CREATE TABLE IF NOT EXISTS demo_users (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_organizations (
  organization_id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_organization_members (
  organization_id UUID NOT NULL REFERENCES demo_organizations(organization_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES demo_users(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS demo_stores (
  store_id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES demo_organizations(organization_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (organization_id, store_id)
);

CREATE TABLE IF NOT EXISTS demo_store_members (
  store_id UUID NOT NULL REFERENCES demo_stores(store_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  PRIMARY KEY (store_id, user_id),
  FOREIGN KEY (user_id) REFERENCES demo_users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS demo_products (
  product_id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES demo_stores(store_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_code TEXT NOT NULL,
  sell_price_cents BIGINT NOT NULL CHECK (sell_price_cents >= 0),
  stock_milli BIGINT NOT NULL CHECK (stock_milli >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id)
);

CREATE TABLE IF NOT EXISTS demo_sales (
  sale_id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES demo_stores(store_id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES demo_users(user_id),
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demo_sale_items (
  sale_item_id UUID PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES demo_sales(sale_id) ON DELETE CASCADE,
  product_id UUID REFERENCES demo_products(product_id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  unit_code_snapshot TEXT NOT NULL,
  quantity_milli BIGINT NOT NULL CHECK (quantity_milli > 0),
  unit_price_cents BIGINT NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents BIGINT NOT NULL CHECK (line_total_cents >= 0)
);

CREATE TABLE IF NOT EXISTS demo_stock_movements (
  movement_id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES demo_stores(store_id) ON DELETE CASCADE,
  product_id UUID REFERENCES demo_products(product_id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  unit_code_snapshot TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES demo_users(user_id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment')),
  quantity_delta_milli BIGINT NOT NULL CHECK (quantity_delta_milli <> 0),
  quantity_before_milli BIGINT NOT NULL CHECK (quantity_before_milli >= 0),
  quantity_after_milli BIGINT NOT NULL CHECK (quantity_after_milli >= 0),
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_products_store_idx ON demo_products(store_id);
CREATE INDEX IF NOT EXISTS demo_stock_movements_store_time_idx
  ON demo_stock_movements(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS demo_sale_items_sale_idx ON demo_sale_items(sale_id);
