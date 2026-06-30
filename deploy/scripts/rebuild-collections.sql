-- Rebuild collection_products from products (full aesthetic + theme mapping).
-- Run after products are imported. Preserves manual links via ON CONFLICT DO NOTHING.

INSERT INTO public.collection_products (collection_id, product_sku, sort_weight)
SELECT c.id, p.sku, 0
FROM public.collections c
JOIN public.products p ON p.is_published
  AND (
    (c.slug = 'isola' AND p.aesthetic = 'Isola')
    OR (c.slug = 'musa' AND p.aesthetic = 'Musa')
    OR (c.slug = 'dolce-stil-novo' AND p.aesthetic = 'Dolce Stil Novo')
    OR (c.slug = 'linea' AND p.aesthetic = 'Linea')
    OR (c.slug = 'classica' AND p.aesthetic = 'Classica')
    OR (c.slug = 'portofino' AND p.aesthetic = 'Portofino')
    OR (c.slug = 'piano-design' AND p.aesthetic = 'Piano Design')
    OR (c.slug = 'cortina' AND p.aesthetic = 'Cortina')
    OR (c.slug = 'fab-50s' AND p.aesthetic = '50''s Style')
    OR (c.slug = 'victoria' AND p.aesthetic = 'Victoria')
    OR (c.slug = 'coloniale' AND p.aesthetic = 'Coloniale')
    OR (c.slug = 'universale' AND p.aesthetic = 'Universale')
    OR (c.slug = 'blu-mediterraneo' AND p.theme_key = 'dg_blu_mediterraneo')
    OR (c.slug = 'dolce-gabbana-sicily' AND p.theme_key = 'dg_sicily')
    OR (c.slug = 'divina-cucina' AND p.theme_key = 'dg_divina_cucina')
    OR (c.slug = 'dolce-gabbana' AND p.theme_key LIKE 'dg_%')
    OR (c.slug = 'coca-cola' AND p.theme_key = 'coca_cola')
    OR (c.slug = 'smeg500' AND p.theme_key = 'smeg500')
    OR (c.slug = 'porsche' AND p.theme_key IN ('porsche', 'porsche_green', 'porsche_white', 'porsche_917'))
  )
ON CONFLICT (collection_id, product_sku) DO NOTHING;
