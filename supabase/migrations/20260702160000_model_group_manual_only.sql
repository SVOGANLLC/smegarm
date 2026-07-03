-- model_group is manual-only via admin «Цветовые группы» (variant_group).
-- Stop auto-computing from name/colour/family on product save.

CREATE OR REPLACE FUNCTION public.products_compute_derived()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.theme_key := COALESCE(NEW.theme_key, public.compute_theme_key(NEW.name, NEW.aesthetic));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_compute_derived ON public.products;
CREATE TRIGGER trg_products_compute_derived
  BEFORE INSERT OR UPDATE OF name, aesthetic ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_compute_derived();
