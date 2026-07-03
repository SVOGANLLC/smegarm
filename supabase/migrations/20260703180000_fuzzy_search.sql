-- Fuzzy search: synonyms + pg_trgm fallback when FTS finds few results.
-- Safe rollout: p_fuzzy defaults to false (existing behaviour unchanged).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP FUNCTION IF EXISTS public.search_products(text, boolean, integer);

CREATE TABLE IF NOT EXISTS public.search_synonyms (
  term text PRIMARY KEY,
  expands_to text NOT NULL
);

ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search synonyms public read" ON public.search_synonyms;
CREATE POLICY "search synonyms public read"
  ON public.search_synonyms FOR SELECT
  USING (true);

GRANT SELECT ON public.search_synonyms TO anon, authenticated, service_role;
GRANT ALL ON public.search_synonyms TO service_role;

INSERT INTO public.search_synonyms (term, expands_to) VALUES
  ('смег', 'smeg'),
  ('smeg', 'смег'),
  ('холодильник', 'refrigerator|fridge|սառնարան'),
  ('refrigerator', 'холодильник|fridge'),
  ('fridge', 'холодильник|refrigerator'),
  ('սառնարան', 'холодильник|refrigerator'),
  ('чайник', 'kettle|չայնիկ'),
  ('kettle', 'чайник'),
  ('тостер', 'toaster'),
  ('toaster', 'тостер'),
  ('кофе', 'coffee'),
  ('coffee', 'кофе'),
  ('кофемашина', 'coffee machine|espresso'),
  ('духовка', 'oven'),
  ('oven', 'духовка'),
  ('варочная', 'hob|cooktop'),
  ('hob', 'варочная|cooktop'),
  ('посудомойка', 'dishwasher'),
  ('dishwasher', 'посудомойка'),
  ('стиральная', 'washing machine|washer'),
  ('washer', 'стиральная|washing machine'),
  ('микроволновка', 'microwave'),
  ('microwave', 'микроволновка'),
  ('вытяжка', 'hood|extractor'),
  ('hood', 'вытяжка'),
  ('мороженица', 'ice cream'),
  ('блендер', 'blender'),
  ('blender', 'блендер'),
  ('миксер', 'mixer'),
  ('mixer', 'миксер')
ON CONFLICT (term) DO UPDATE SET expands_to = EXCLUDED.expands_to;

CREATE INDEX IF NOT EXISTS products_sku_trgm_idx
  ON public.products USING gin (lower(sku) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_search_blob_trgm_idx
  ON public.products USING gin (
    lower(
      coalesce(sku, '') || ' ' ||
      coalesce(name, '') || ' ' ||
      coalesce(name_en, '') || ' ' ||
      coalesce(name_hy, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(category_en, '') || ' ' ||
      coalesce(colour, '') || ' ' ||
      coalesce(colour_en, '')
    ) gin_trgm_ops
  );

CREATE OR REPLACE FUNCTION public.expand_search_terms(p_query text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  q text := lower(btrim(coalesce(p_query, '')));
  words text[];
  w text;
  terms text[] := ARRAY[]::text[];
  extra text;
BEGIN
  IF q = '' THEN
    RETURN terms;
  END IF;

  terms := array_append(terms, q);

  words := regexp_split_to_array(
    btrim(regexp_replace(q, '[^[:alnum:][:alpha:]]+', ' ', 'g')),
    '\s+'
  );

  FOREACH w IN ARRAY words LOOP
    IF w IS NULL OR w = '' THEN
      CONTINUE;
    END IF;
    terms := array_append(terms, w);
    SELECT s.expands_to INTO extra FROM public.search_synonyms s WHERE s.term = w LIMIT 1;
    IF extra IS NOT NULL THEN
      terms := terms || regexp_split_to_array(extra, '\|');
    END IF;
  END LOOP;

  SELECT coalesce(array_agg(DISTINCT t), ARRAY[q])
  INTO terms
  FROM unnest(terms) AS u(t)
  WHERE t IS NOT NULL AND btrim(t) <> '';

  RETURN terms;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_products(
  q text,
  only_published boolean DEFAULT true,
  max_rows integer DEFAULT 12,
  p_fuzzy boolean DEFAULT false
)
RETURNS TABLE (
  sku text,
  name text,
  category text,
  colour text,
  main_image text,
  price_amd integer,
  is_published boolean,
  rank real
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  trimmed text := btrim(coalesce(q, ''));
  trimmed_lower text := lower(btrim(coalesce(q, '')));
  lim integer := greatest(least(coalesce(max_rows, 12), 500), 1);
  fuzzy_min integer := 3;
  trgm_threshold real := 0.28;
BEGIN
  IF trimmed = '' THEN
    RETURN;
  END IF;

  PERFORM set_config('pg_trgm.similarity_threshold', trgm_threshold::text, true);

  RETURN QUERY
  WITH
  terms AS (
    SELECT unnest(public.expand_search_terms(trimmed_lower)) AS term
  ),
  fts_raw AS (
    SELECT
      p.sku,
      p.name,
      p.category,
      p.colour,
      p.main_image,
      p.price_amd,
      p.is_published,
      GREATEST(
        ts_rank(p.search_tsv, websearch_to_tsquery('simple', t.term)),
        ts_rank(
          p.search_tsv,
          to_tsquery(
            'simple',
            regexp_replace(
              btrim(regexp_replace(t.term, '[^[:alnum:]]+', ' ', 'g')),
              '\s+', ':* & ', 'g'
            ) || ':*'
          )
        ) * 0.8::real
      )::real AS rank
    FROM public.products p
    CROSS JOIN terms t
    WHERE (NOT only_published OR p.is_published)
      AND (
        p.search_tsv @@ websearch_to_tsquery('simple', t.term)
        OR p.search_tsv @@ to_tsquery(
          'simple',
          regexp_replace(
            btrim(regexp_replace(t.term, '[^[:alnum:]]+', ' ', 'g')),
            '\s+', ':* & ', 'g'
          ) || ':*'
        )
      )
  ),
  fts AS (
    SELECT DISTINCT ON (f.sku)
      f.sku, f.name, f.category, f.colour, f.main_image, f.price_amd, f.is_published, f.rank
    FROM fts_raw f
    ORDER BY f.sku, f.rank DESC
  ),
  fts_count AS (
    SELECT count(*)::integer AS n FROM fts
  ),
  search_blob AS (
    SELECT
      p.sku,
      p.name,
      p.category,
      p.colour,
      p.main_image,
      p.price_amd,
      p.is_published,
      lower(
        coalesce(p.sku, '') || ' ' ||
        coalesce(p.name, '') || ' ' ||
        coalesce(p.name_en, '') || ' ' ||
        coalesce(p.name_hy, '') || ' ' ||
        coalesce(p.category, '') || ' ' ||
        coalesce(p.category_en, '') || ' ' ||
        coalesce(p.colour, '') || ' ' ||
        coalesce(p.colour_en, '')
      ) AS blob
    FROM public.products p
    WHERE (NOT only_published OR p.is_published)
  ),
  fuzzy AS (
    SELECT
      b.sku,
      b.name,
      b.category,
      b.colour,
      b.main_image,
      b.price_amd,
      b.is_published,
      (
        0.55::real * greatest(
          similarity(b.blob, trimmed_lower),
          word_similarity(trimmed_lower, b.blob),
          CASE WHEN b.sku ILIKE '%' || regexp_replace(trimmed, '[^[:alnum:]]+', '%', 'g') || '%' THEN 0.65::real ELSE 0::real END
        )
      )::real AS rank
    FROM search_blob b
    WHERE p_fuzzy
      AND (SELECT n FROM fts_count) < fuzzy_min
      AND b.sku NOT IN (SELECT f.sku FROM fts f)
      AND (
        b.blob % trimmed_lower
        OR word_similarity(trimmed_lower, b.blob) > trgm_threshold
        OR similarity(b.blob, trimmed_lower) > trgm_threshold
        OR lower(b.sku) LIKE '%' || regexp_replace(trimmed_lower, '[^a-z0-9]', '', 'g') || '%'
      )
  ),
  combined AS (
    SELECT * FROM fts
    UNION ALL
    SELECT * FROM fuzzy
  )
  SELECT c.sku, c.name, c.category, c.colour, c.main_image, c.price_amd, c.is_published, c.rank
  FROM combined c
  ORDER BY c.rank DESC, c.name ASC
  LIMIT lim;
END;
$$;

REVOKE ALL ON FUNCTION public.search_products(text, boolean, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_products(text, boolean, integer, boolean) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.expand_search_terms(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expand_search_terms(text) TO anon, authenticated, service_role;
