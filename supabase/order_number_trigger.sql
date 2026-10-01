-- Run this in Supabase SQL Editor to auto-generate order_number on insert

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || LPAD(NEXTVAL('order_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_number ON public.orders;
CREATE TRIGGER trg_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Also backfill order_number for existing orders that don't have one
UPDATE public.orders
SET order_number = 'ORD-' || LPAD(id::text, 5, '0')
WHERE order_number IS NULL;
