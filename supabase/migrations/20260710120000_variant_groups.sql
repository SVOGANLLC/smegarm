-- Manual colour-variant groups (admin «Цветовые группы»).
-- When variant_group is set, it becomes model_group and survives product edits.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variant_group text;

CREATE INDEX IF NOT EXISTS idx_products_variant_group ON public.products(variant_group);

CREATE OR REPLACE FUNCTION public.products_compute_derived()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.variant_group IS NOT NULL AND trim(NEW.variant_group) <> '' THEN
    NEW.model_group := upper(trim(NEW.variant_group));
  ELSE
    NEW.model_group := public.compute_model_group(NEW.sku, NEW.name, NEW.family, NEW.colour);
  END IF;
  NEW.theme_key := COALESCE(NEW.theme_key, public.compute_theme_key(NEW.name, NEW.aesthetic));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_compute_derived ON public.products;
CREATE TRIGGER trg_products_compute_derived
  BEFORE INSERT OR UPDATE OF sku, name, family, colour, aesthetic, variant_group ON public.products
  FOR EACH ROW EXECUTE FUNCTION products_compute_derived();

-- Lock existing HBAC11 line as a manual group
UPDATE public.products
SET variant_group = 'HBAC11'
WHERE sku ~* '^HBAC11';
