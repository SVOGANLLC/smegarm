-- Managers can write products but could not SELECT hidden rows after UPDATE (RLS).
CREATE POLICY "Staff read all products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.can_manage_catalog(auth.uid()));
