
UPDATE public.collections
SET is_published = false
WHERE slug IN ('coca-cola', 'smeg500');

DELETE FROM public.collection_products
WHERE collection_id IN (SELECT id FROM public.collections WHERE slug IN ('coca-cola', 'smeg500'));
