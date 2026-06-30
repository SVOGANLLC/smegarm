-- Fix collections RLS: managers can read all rows; split ALL policy into explicit write ops.

DROP POLICY IF EXISTS "collections_staff_write" ON public.collections;

CREATE POLICY "collections_staff_read_all"
  ON public.collections
  FOR SELECT
  TO authenticated
  USING (public.can_manage_catalog(auth.uid()));

CREATE POLICY "collections_staff_insert"
  ON public.collections
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_catalog(auth.uid()));

CREATE POLICY "collections_staff_update"
  ON public.collections
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_catalog(auth.uid()))
  WITH CHECK (public.can_manage_catalog(auth.uid()));

CREATE POLICY "collections_staff_delete"
  ON public.collections
  FOR DELETE
  TO authenticated
  USING (public.can_manage_catalog(auth.uid()));
