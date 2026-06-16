-- Rebuild collection_products from products (same logic as migration 20260606223337).
-- Run after products are imported.

DELETE FROM public.collection_products;

WITH mapping AS (
  SELECT c.id AS collection_id, p.sku AS product_sku
  FROM public.collections c
  JOIN public.products p
    ON (c.slug = 'fab-50s'              AND p.aesthetic = '50''s Style')
    OR (c.slug = 'portofino'            AND p.aesthetic = 'Portofino')
    OR (c.slug = 'linea'                AND p.aesthetic = 'Linea')
    OR (c.slug = 'victoria'             AND p.aesthetic = 'Victoria')
    OR (c.slug = 'coloniale'            AND p.aesthetic = 'Coloniale')
    OR (c.slug = 'dolce-stil-novo'      AND p.aesthetic = 'Dolce Stil Novo')
    OR (c.slug = 'classica'             AND p.aesthetic = 'Classica')
    OR (c.slug = 'dolce-gabbana'        AND p.theme_key LIKE 'dg_%')
    OR (c.slug = 'dolce-gabbana-sicily' AND p.theme_key = 'dg_sicily')
    OR (c.slug = 'coca-cola'            AND p.theme_key = 'coca_cola')
    OR (c.slug = 'smeg500'              AND p.theme_key = 'smeg500')
    OR (c.slug = 'porsche'              AND p.theme_key IN ('porsche','porsche_green','porsche_white','porsche_917'))
)
INSERT INTO public.collection_products (collection_id, product_sku, sort_weight)
SELECT collection_id, product_sku, 0 FROM mapping
ON CONFLICT (collection_id, product_sku) DO NOTHING;
