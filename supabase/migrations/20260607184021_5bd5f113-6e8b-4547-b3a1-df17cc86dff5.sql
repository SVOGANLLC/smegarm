
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
SECURITY INVOKER
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
      ts_rank(p.search_tsv, prefix_tsq) * 0.8::real
    )::real AS rank
  FROM public.products p
  WHERE (NOT only_published OR p.is_published)
    AND (p.search_tsv @@ tsq OR p.search_tsv @@ prefix_tsq)
  ORDER BY rank DESC, p.name ASC
  LIMIT max_rows;
END;
$$;
