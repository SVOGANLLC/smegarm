-- compute_model_group used an invalid POSIX regex character class for escaping
-- (brackets [] not balanced). Any product UPDATE that touched name/family/colour
-- failed — including admin saves that always send name, so price/lead_time never persisted.

CREATE OR REPLACE FUNCTION public.compute_model_group(
  p_sku text,
  p_name text,
  p_family text,
  p_colour text
)
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

  IF p_sku IS NOT NULL AND upper(p_sku) ~ '^HBAC[0-9]+' THEN
    RETURN substring(upper(p_sku) from '^(HBAC[0-9]+)');
  END IF;
  IF p_family IS NOT NULL AND trim(p_family) ~* '^HBAC[0-9]+$' THEN
    RETURN upper(trim(p_family));
  END IF;

  IF p_colour = 'Decorated / Special' AND p_sku IS NOT NULL THEN
    body := substring(p_sku from '^[A-Z]+[0-9]+[A-Z]?');
    RETURN coalesce(p_family, '') || '|special|' || coalesce(body, p_sku);
  END IF;

  stripped := p_name;
  IF p_colour IS NOT NULL AND p_colour <> '' THEN
    colour_pat := regexp_replace(p_colour, E'([\\[\\](){}.*+?^$|\\\\-])', E'\\\\\\1', 'g');
    stripped := regexp_replace(stripped, E'\\m' || colour_pat || E'\\M', '', 'gi');
  END IF;
  stripped := lower(trim(regexp_replace(stripped, '\s+', ' ', 'g')));
  RETURN coalesce(p_family, '') || '|' || stripped;
END;
$$;

-- Recompute model_group for all rows (safe after regex fix).
UPDATE public.products SET name = name WHERE name IS NOT NULL;
