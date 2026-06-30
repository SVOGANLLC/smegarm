-- Allow catalog staff (admin + manager) to upload to product-media bucket.

DROP POLICY IF EXISTS "product-media: admin insert" ON storage.objects;
DROP POLICY IF EXISTS "product-media: admin update" ON storage.objects;
DROP POLICY IF EXISTS "product-media: admin delete" ON storage.objects;

CREATE POLICY "product-media: staff insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-media' AND public.can_manage_catalog(auth.uid()));

CREATE POLICY "product-media: staff update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-media' AND public.can_manage_catalog(auth.uid()))
WITH CHECK (bucket_id = 'product-media' AND public.can_manage_catalog(auth.uid()));

CREATE POLICY "product-media: staff delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-media' AND public.can_manage_catalog(auth.uid()));
