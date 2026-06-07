
-- 1. tsvector column + trigger
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE OR REPLACE FUNCTION public.products_search_tsv_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.sku, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.ean, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.family, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.brand, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.aesthetic, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.colour, '')), 'C') ||
    setweight(to_tsvector('simple', regexp_replace(coalesce(NEW.description, ''), '<[^>]+>', ' ', 'g')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_search_tsv_trg ON public.products;
CREATE TRIGGER products_search_tsv_trg
BEFORE INSERT OR UPDATE OF sku, name, ean, category, family, brand, aesthetic, colour, description
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.products_search_tsv_update();

-- Backfill existing rows
UPDATE public.products
SET search_tsv =
  setweight(to_tsvector('simple', coalesce(sku, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(ean, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(family, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(brand, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(aesthetic, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(colour, '')), 'C') ||
  setweight(to_tsvector('simple', regexp_replace(coalesce(description, ''), '<[^>]+>', ' ', 'g')), 'D');

CREATE INDEX IF NOT EXISTS products_search_tsv_idx
  ON public.products USING gin (search_tsv);

-- 2. Search RPC (suggestions + admin search)
CREATE OR REPLACE FUNCTION public.search_products(
  q text,
  only_published boolean DEFAULT true,
  max_rows int DEFAULT 12
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
SET search_path = public
AS $$
DECLARE
  trimmed text := btrim(coalesce(q, ''));
  tsq tsquery;
  prefix_tsq tsquery;
BEGIN
  IF trimmed = '' THEN
    RETURN;
  END IF;

  -- websearch syntax for free-form, plus prefix match for "as-you-type"
  tsq := websearch_to_tsquery('simple', trimmed);
  prefix_tsq := to_tsquery(
    'simple',
    regexp_replace(
      btrim(regexp_replace(trimmed, '[^[:alnum:]]+', ' ', 'g')),
      '\s+', ':* & ', 'g'
    ) || ':*'
  );

  RETURN QUERY
  SELECT
    p.sku,
    p.name,
    p.category,
    p.colour,
    p.main_image,
    p.price_amd,
    p.is_published,
    GREATEST(
      ts_rank(p.search_tsv, tsq),
      ts_rank(p.search_tsv, prefix_tsq) * 0.8
    ) AS rank
  FROM public.products p
  WHERE (NOT only_published OR p.is_published)
    AND (p.search_tsv @@ tsq OR p.search_tsv @@ prefix_tsq)
  ORDER BY rank DESC, p.name ASC
  LIMIT max_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_products(text, boolean, int) TO anon, authenticated, service_role;
