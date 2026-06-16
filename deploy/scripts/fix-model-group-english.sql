-- Make variant grouping language-independent: compute model_group from the stable
-- English fields (name_en/colour_en) instead of the localized name/colour, which
-- change with translation and broke the colour switcher.
BEGIN;

CREATE OR REPLACE FUNCTION public.products_compute_derived()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.model_group := public.compute_model_group(
    NEW.sku,
    COALESCE(NEW.name_en, NEW.name),
    NEW.family,
    COALESCE(NEW.colour_en, NEW.colour)
  );
  NEW.theme_key := COALESCE(NEW.theme_key, public.compute_theme_key(COALESCE(NEW.name_en, NEW.name), NEW.aesthetic));
  RETURN NEW;
END;
$$;

-- Recompute model_group for every product via the trigger.
UPDATE public.products SET sku = sku;

COMMIT;
