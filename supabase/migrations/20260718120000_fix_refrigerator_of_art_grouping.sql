-- Restore intentional Refrigerator of Art colour group and include missing DG fridges.
-- Previous mistaken "split" set variant_group = sku; group was meant to stay one card.

UPDATE public.products p
SET
  variant_group = 'REFRIGERATOR OF ART',
  model_group = 'REFRIGERATOR OF ART'
WHERE p.is_published
  AND p.category_en = 'Refrigerators'
  AND p.theme_key LIKE 'dg_%';

-- Ensure collection membership for all published DG refrigerators
INSERT INTO public.collection_products (collection_id, product_sku, sort_weight)
SELECT c.id, p.sku, 0
FROM public.collections c
JOIN public.products p ON p.is_published
  AND p.category_en = 'Refrigerators'
  AND p.theme_key LIKE 'dg_%'
WHERE c.slug = 'refrigerator-of-art'
ON CONFLICT (collection_id, product_sku) DO NOTHING;

-- Keep auto-sync for refrigerator-of-art (DG refrigerators)
CREATE OR REPLACE FUNCTION public.sync_product_collections()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NOT COALESCE(NEW.is_published, false) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.collection_products (collection_id, product_sku, sort_weight)
  SELECT c.id, NEW.sku, 0
  FROM public.collections c
  WHERE (
    (c.slug = 'isola' AND NEW.aesthetic = 'Isola')
    OR (c.slug = 'musa' AND NEW.aesthetic = 'Musa')
    OR (c.slug = 'dolce-stil-novo' AND NEW.aesthetic = 'Dolce Stil Novo')
    OR (c.slug = 'linea' AND NEW.aesthetic = 'Linea')
    OR (c.slug = 'classica' AND NEW.aesthetic = 'Classica')
    OR (c.slug = 'portofino' AND NEW.aesthetic = 'Portofino')
    OR (c.slug = 'piano-design' AND NEW.aesthetic = 'Piano Design')
    OR (c.slug = 'cortina' AND NEW.aesthetic = 'Cortina')
    OR (c.slug = 'fab-50s' AND NEW.aesthetic = '50''s Style')
    OR (c.slug = 'victoria' AND NEW.aesthetic = 'Victoria')
    OR (c.slug = 'coloniale' AND NEW.aesthetic = 'Coloniale')
    OR (c.slug = 'universale' AND NEW.aesthetic = 'Universale')
    OR (c.slug = 'blu-mediterraneo' AND NEW.theme_key = 'dg_blu_mediterraneo')
    OR (c.slug = 'dolce-gabbana-sicily' AND NEW.theme_key = 'dg_sicily')
    OR (c.slug = 'divina-cucina' AND NEW.theme_key = 'dg_divina_cucina')
    OR (c.slug = 'dolce-gabbana' AND NEW.theme_key LIKE 'dg_%')
    OR (c.slug = 'refrigerator-of-art' AND NEW.theme_key LIKE 'dg_%' AND NEW.category_en = 'Refrigerators')
    OR (c.slug = 'coca-cola' AND NEW.theme_key = 'coca_cola')
    OR (c.slug = 'smeg500' AND NEW.theme_key = 'smeg500')
    OR (c.slug = 'porsche' AND NEW.theme_key IN ('porsche', 'porsche_green', 'porsche_white', 'porsche_917'))
  )
  ON CONFLICT (collection_id, product_sku) DO NOTHING;

  RETURN NEW;
END;
$$;
