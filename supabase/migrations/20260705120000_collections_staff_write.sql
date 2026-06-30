-- Allow managers to edit collections (same as products/catalog writes).

DROP POLICY IF EXISTS "collections_admin_write" ON public.collections;
CREATE POLICY "collections_staff_write"
  ON public.collections
  FOR ALL
  TO authenticated
  USING (public.can_manage_catalog(auth.uid()))
  WITH CHECK (public.can_manage_catalog(auth.uid()));
