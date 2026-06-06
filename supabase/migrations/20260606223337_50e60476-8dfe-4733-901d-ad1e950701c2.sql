
-- 1. Add SKU-prefix grouping for decorated specials so all themed variants of the same body share a model_group
CREATE OR REPLACE FUNCTION public.compute_model_group(p_sku text, p_name text, p_family text, p_colour text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  stripped text;
  colour_pat text;
  body text;
BEGIN
  IF p_name IS NULL THEN RETURN NULL; END IF;
  -- For prints/specials: group by SKU body prefix (e.g. FAB28R, BLF03, BCC12) so all themed variants link
  IF p_colour = 'Decorated / Special' AND p_sku IS NOT NULL THEN
    body := substring(p_sku from '^[A-Z]+[0-9]+[A-Z]?');
    RETURN coalesce(p_family,'') || '|special|' || coalesce(body, p_sku);
  END IF;
  stripped := p_name;
  IF p_colour IS NOT NULL AND p_colour <> '' THEN
    colour_pat := regexp_replace(p_colour, '([\.\^\$\*\+\?\(\)\[\]\{\}\|\\])', '\\\1', 'g');
    stripped := regexp_replace(stripped, '\m' || colour_pat || '\M', '', 'gi');
  END IF;
  stripped := lower(trim(regexp_replace(stripped, '\s+', ' ', 'g')));
  RETURN coalesce(p_family,'') || '|' || stripped;
END;
$$;

-- Update the trigger to pass sku
CREATE OR REPLACE FUNCTION public.products_compute_derived()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.model_group := public.compute_model_group(NEW.sku, NEW.name, NEW.family, NEW.colour);
  NEW.theme_key   := COALESCE(NEW.theme_key, public.compute_theme_key(NEW.name, NEW.aesthetic));
  RETURN NEW;
END;
$$;

-- Drop the old 3-arg signature
DROP FUNCTION IF EXISTS public.compute_model_group(text, text, text);

-- Recompute model_group + theme_key for every product
UPDATE public.products SET sku = sku;

-- 2. Add missing brand collections
INSERT INTO public.collections (slug, name, description, is_published, sort_weight)
VALUES
  ('dolce-gabbana-sicily',  'Sicily Is My Love',   'Smeg × Dolce&Gabbana — расписанные вручную силуэты Сицилии', true, 95),
  ('coca-cola',             'Coca-Cola',            'Лимитированная коллекция в иконическом красном цвете', true, 90),
  ('smeg500',               'Smeg500',              'Холодильник из настоящего капота Fiat 500', true, 88),
  ('porsche',               'Porsche x Smeg',       'Капсульная коллекция в стиле гоночного дизайна Porsche', true, 86)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_published = true,
    sort_weight = EXCLUDED.sort_weight;

-- 3. Refresh collection_products from scratch based on aesthetic + theme_key
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
