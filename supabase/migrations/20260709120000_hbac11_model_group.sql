-- HBAC11 accessory sets: family=HBAC11 must collapse to one model_group for colour grouping.

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

  -- HBAC accessory lines: group all colour SKUs (HBAC11BL, HBAC11CR, …) under HBAC11
  IF p_sku IS NOT NULL AND upper(p_sku) ~ '^HBAC[0-9]+' THEN
    RETURN substring(upper(p_sku) from '^(HBAC[0-9]+)');
  END IF;
  IF p_family IS NOT NULL AND trim(p_family) ~* '^HBAC[0-9]+$' THEN
    RETURN upper(trim(p_family));
  END IF;

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

-- Recompute HBAC rows via trigger (family column is in trigger OF list)
UPDATE public.products SET family = family WHERE sku ~* '^HBAC[0-9]+';

-- Recompute model_group when SKU prefix changes
DROP TRIGGER IF EXISTS trg_products_compute_derived ON public.products;
CREATE TRIGGER trg_products_compute_derived
  BEFORE INSERT OR UPDATE OF sku, name, family, colour, aesthetic ON public.products
  FOR EACH ROW EXECUTE FUNCTION products_compute_derived();
