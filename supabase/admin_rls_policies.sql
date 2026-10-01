-- Run once in Supabase SQL Editor. Admin membership is stored on existing
-- public.users rows; use `npm run sync-admins` to sync VITE_ADMIN_EMAILS.

-- Add customer info columns to orders table.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_pincode text;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Only the database owner/service role can change is_admin. This helper checks
-- the signed-in auth user against their profile row.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT lower(COALESCE(auth.jwt() ->> 'email', '')) = 'anjankaran246@gmail.com'
    OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all order_items" ON public.order_items;
CREATE POLICY "Admins can view all order_items" ON public.order_items
  FOR SELECT TO authenticated USING (public.is_admin());
