-- Run once in Supabase SQL Editor to enable per-user cart persistence.
CREATE TABLE IF NOT EXISTS public.cart_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;

DROP POLICY IF EXISTS "Users can view their cart" ON public.cart_items;
CREATE POLICY "Users can view their cart" ON public.cart_items
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can add to their cart" ON public.cart_items;
CREATE POLICY "Users can add to their cart" ON public.cart_items
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their cart" ON public.cart_items;
CREATE POLICY "Users can update their cart" ON public.cart_items
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can remove from their cart" ON public.cart_items;
CREATE POLICY "Users can remove from their cart" ON public.cart_items
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
