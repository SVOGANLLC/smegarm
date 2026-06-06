
DROP POLICY IF EXISTS "Anyone can submit inquiry" ON public.inquiries;
CREATE POLICY "Anyone can submit inquiry"
ON public.inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  name IS NOT NULL
  AND length(name) BETWEEN 1 AND 200
  AND (email IS NULL OR length(email) <= 320)
  AND (phone IS NULL OR length(phone) <= 50)
  AND (message IS NULL OR length(message) <= 5000)
  AND (product_sku IS NULL OR length(product_sku) <= 100)
  AND status = 'new'
  AND admin_notes IS NULL
);
