-- anon cannot execute has_role(); policies that OR has_role() break public SELECT.
-- Split into published-only (everyone) + admin read unpublished (authenticated).

DROP POLICY IF EXISTS "collections_public_read" ON public.collections;
CREATE POLICY "collections_public_read"
  ON public.collections FOR SELECT
  USING (is_published = true);

CREATE POLICY "collections_admin_read_all"
  ON public.collections FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can view published partners" ON public.partners;
CREATE POLICY "Anyone can view published partners"
  ON public.partners FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins read all partners"
  ON public.partners FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
