-- Convert channel-based product_prices rows to one row per product.
-- Preserves each channel's current price, MRP, and wholesale minimum quantity.
BEGIN;

-- Remove policies that may reference the legacy channel columns being dropped.
DROP POLICY IF EXISTS "Read channel stock" ON public.product_stock;
DROP POLICY IF EXISTS "Admins manage channel stock" ON public.product_stock;
DROP POLICY IF EXISTS "Read channel prices" ON public.product_prices;
DROP POLICY IF EXISTS "Admins manage channel prices" ON public.product_prices;

-- Convert stock channel rows to one row per product with two stock columns.
ALTER TABLE public.product_stock
  ADD COLUMN IF NOT EXISTS retail_quantity integer,
  ADD COLUMN IF NOT EXISTS wholesale_quantity integer;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_stock'
      AND column_name = 'channel'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_stock'
      AND column_name = 'quantity'
  ) THEN
    EXECUTE $migrate$
      WITH channel_stock AS (
        SELECT product_id,
          MAX(quantity) FILTER (WHERE channel = 'default') AS default_quantity,
          MAX(quantity) FILTER (WHERE channel = 'retail') AS retail_stock,
          MAX(quantity) FILTER (WHERE channel = 'wholesale') AS wholesale_stock
        FROM public.product_stock
        GROUP BY product_id
      )
      UPDATE public.product_stock AS keeper
      SET retail_quantity = COALESCE(channel_stock.retail_stock, NULLIF(keeper.retail_quantity, 0),
                                     channel_stock.default_quantity, 0),
          wholesale_quantity = COALESCE(channel_stock.wholesale_stock, NULLIF(keeper.wholesale_quantity, 0),
                                        channel_stock.default_quantity, 0)
      FROM channel_stock
      WHERE keeper.id = (
        SELECT MIN(s2.id) FROM public.product_stock s2
        WHERE s2.product_id = channel_stock.product_id
      )
    $migrate$;

    DELETE FROM public.product_stock AS duplicate
    USING public.product_stock AS keeper
    WHERE duplicate.product_id = keeper.product_id
      AND duplicate.id > keeper.id;

    ALTER TABLE public.product_stock
      DROP CONSTRAINT IF EXISTS product_stock_product_id_channel_key;
    ALTER TABLE public.product_stock DROP COLUMN channel;
    ALTER TABLE public.product_stock DROP COLUMN quantity;
  END IF;
END;
$$;

-- Also collapse duplicates if a previous attempt already removed legacy columns.
WITH stock_values AS (
  SELECT product_id,
    MAX(COALESCE(retail_quantity, 0)) AS retail_quantity,
    MAX(COALESCE(wholesale_quantity, 0)) AS wholesale_quantity
  FROM public.product_stock
  GROUP BY product_id
)
UPDATE public.product_stock AS keeper
SET retail_quantity = GREATEST(COALESCE(keeper.retail_quantity, 0), stock_values.retail_quantity),
    wholesale_quantity = GREATEST(COALESCE(keeper.wholesale_quantity, 0), stock_values.wholesale_quantity)
FROM stock_values
WHERE keeper.id = (
  SELECT MIN(s2.id) FROM public.product_stock s2 WHERE s2.product_id = stock_values.product_id
);
DELETE FROM public.product_stock AS duplicate
USING public.product_stock AS keeper
WHERE duplicate.product_id = keeper.product_id AND duplicate.id > keeper.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_stock'
      AND column_name = 'default_quantity'
  ) THEN
    EXECUTE 'UPDATE public.product_stock SET retail_quantity = COALESCE(NULLIF(retail_quantity, 0), default_quantity, 0), wholesale_quantity = COALESCE(NULLIF(wholesale_quantity, 0), default_quantity, 0)';
    ALTER TABLE public.product_stock DROP COLUMN default_quantity;
  END IF;
END;
$$;

UPDATE public.product_stock SET retail_quantity = 0 WHERE retail_quantity IS NULL;
UPDATE public.product_stock SET wholesale_quantity = 0 WHERE wholesale_quantity IS NULL;
ALTER TABLE public.product_stock
  ALTER COLUMN retail_quantity SET DEFAULT 0,
  ALTER COLUMN retail_quantity SET NOT NULL,
  ALTER COLUMN wholesale_quantity SET DEFAULT 0,
  ALTER COLUMN wholesale_quantity SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS product_stock_product_id_idx
  ON public.product_stock (product_id);
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read channel stock" ON public.product_stock
  FOR SELECT TO anon, authenticated
  USING (auth.role() = 'anon' OR public.is_admin() OR public.is_active_wholesaler());
CREATE POLICY "Admins manage channel stock" ON public.product_stock
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_stock TO authenticated;
GRANT SELECT ON public.product_stock TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.product_stock_id_seq TO authenticated;

ALTER TABLE public.product_prices
  ADD COLUMN IF NOT EXISTS retail_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS wholesale_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS retail_mrp numeric(12,2),
  ADD COLUMN IF NOT EXISTS wholesale_mrp numeric(12,2),
  ADD COLUMN IF NOT EXISTS wholesale_min_order_qty integer NOT NULL DEFAULT 1
    CHECK (wholesale_min_order_qty >= 1);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_prices'
      AND column_name = 'channel'
  ) THEN
    EXECUTE $migrate$
      WITH channel_prices AS (
        SELECT product_id,
          MAX(price) FILTER (WHERE channel = 'retail') AS retail_price,
          MAX(price) FILTER (WHERE channel = 'wholesale') AS wholesale_price,
          MAX(mrp) FILTER (WHERE channel = 'retail') AS retail_mrp,
          MAX(mrp) FILTER (WHERE channel = 'wholesale') AS wholesale_mrp,
          MAX(min_order_qty) FILTER (WHERE channel = 'wholesale') AS wholesale_min_order_qty
        FROM public.product_prices
        GROUP BY product_id
      )
      UPDATE public.product_prices AS keeper
      SET retail_price = COALESCE(keeper.retail_price, channel_prices.retail_price),
          wholesale_price = COALESCE(keeper.wholesale_price, channel_prices.wholesale_price),
          retail_mrp = COALESCE(keeper.retail_mrp, channel_prices.retail_mrp),
          wholesale_mrp = COALESCE(keeper.wholesale_mrp, channel_prices.wholesale_mrp),
          wholesale_min_order_qty = COALESCE(channel_prices.wholesale_min_order_qty, 1)
      FROM channel_prices
      WHERE keeper.id = (
        SELECT MIN(p2.id) FROM public.product_prices p2
        WHERE p2.product_id = channel_prices.product_id
      )
    $migrate$;

    DELETE FROM public.product_prices AS duplicate
    USING public.product_prices AS keeper
    WHERE duplicate.product_id = keeper.product_id
      AND duplicate.id > keeper.id;

    ALTER TABLE public.product_prices
      DROP CONSTRAINT IF EXISTS product_prices_product_id_channel_key;
    DROP INDEX IF EXISTS public.product_prices_product_channel_idx;
    ALTER TABLE public.product_prices DROP COLUMN channel;
    ALTER TABLE public.product_prices DROP COLUMN price;
    ALTER TABLE public.product_prices DROP COLUMN mrp;
    ALTER TABLE public.product_prices DROP COLUMN min_order_qty;
  END IF;
END;
$$;

-- Finish cleanup if an earlier run removed channel but left old NOT NULL columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_prices' AND column_name = 'price'
  ) THEN
    EXECUTE 'UPDATE public.product_prices SET retail_price = COALESCE(retail_price, price)';
    ALTER TABLE public.product_prices DROP COLUMN price;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_prices' AND column_name = 'mrp'
  ) THEN
    EXECUTE 'UPDATE public.product_prices SET retail_mrp = COALESCE(retail_mrp, mrp)';
    ALTER TABLE public.product_prices DROP COLUMN mrp;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_prices' AND column_name = 'min_order_qty'
  ) THEN
    EXECUTE 'UPDATE public.product_prices SET wholesale_min_order_qty = CASE WHEN wholesale_min_order_qty = 1 THEN min_order_qty ELSE wholesale_min_order_qty END';
    ALTER TABLE public.product_prices DROP COLUMN min_order_qty;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_prices' AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.product_prices DROP COLUMN channel;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS product_prices_product_id_uidx
  ON public.product_prices (product_id);

-- Keep legacy retail fields current for the existing public retail storefront.
INSERT INTO public.product_prices (product_id, retail_price, retail_mrp)
SELECT p.id, p.price, p.mrp
FROM public.products p
ON CONFLICT (product_id) DO UPDATE SET
  retail_price = COALESCE(public.product_prices.retail_price, EXCLUDED.retail_price),
  retail_mrp = COALESCE(public.product_prices.retail_mrp, EXCLUDED.retail_mrp);

DO $$
BEGIN
  IF to_regclass('public.wholesale_prices') IS NOT NULL THEN
    EXECUTE $legacy$
      INSERT INTO public.product_prices (product_id, wholesale_price)
      SELECT product_id, price FROM public.wholesale_prices
      ON CONFLICT (product_id) DO UPDATE SET
        wholesale_price = COALESCE(public.product_prices.wholesale_price, EXCLUDED.wholesale_price)
    $legacy$;
  END IF;
END;
$$;

ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read channel prices" ON public.product_prices;
DROP POLICY IF EXISTS "Read product prices" ON public.product_prices;
DROP POLICY IF EXISTS "Admins manage channel prices" ON public.product_prices;
DROP POLICY IF EXISTS "Admins manage product prices" ON public.product_prices;
CREATE POLICY "Read product prices" ON public.product_prices
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_active_wholesaler());
CREATE POLICY "Admins manage product prices" ON public.product_prices
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE SELECT ON public.product_prices FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.product_prices_id_seq TO authenticated;

-- Retail listing data is public; wholesale values are returned only to
-- wholesalers and admins because row-level policies cannot mask columns.
CREATE OR REPLACE VIEW public.product_price_catalog
  WITH (security_barrier = true) AS
SELECT pp.product_id,
  pp.retail_price,
  pp.retail_mrp,
  CASE WHEN public.is_admin() OR public.is_active_wholesaler()
    THEN pp.wholesale_price END AS wholesale_price,
  CASE WHEN public.is_admin() OR public.is_active_wholesaler()
    THEN pp.wholesale_mrp END AS wholesale_mrp,
  CASE WHEN public.is_admin() OR public.is_active_wholesaler()
    THEN pp.wholesale_min_order_qty ELSE 1 END AS wholesale_min_order_qty
FROM public.product_prices pp;
GRANT SELECT ON public.product_price_catalog TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_order_item_authoritative_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_price numeric(12,2);
  v_min_order_qty integer := 1;
BEGIN
  IF public.is_active_wholesaler() THEN
    SELECT pp.wholesale_price, pp.wholesale_min_order_qty
      INTO v_price, v_min_order_qty
    FROM public.product_prices pp WHERE pp.product_id = NEW.product_id;
  ELSE
    SELECT pp.retail_price, 1 INTO v_price, v_min_order_qty
    FROM public.product_prices pp WHERE pp.product_id = NEW.product_id;
  END IF;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Product price is not configured for the customer channel';
  END IF;
  IF NEW.quantity < COALESCE(v_min_order_qty, 1) THEN
    RAISE EXCEPTION 'Minimum order quantity for this product is %', COALESCE(v_min_order_qty, 1);
  END IF;
  NEW.price := v_price;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
