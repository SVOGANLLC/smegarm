-- Auto-fill SEO fields when empty (products + collections).
CREATE OR REPLACE FUNCTION public.auto_product_seo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.seo_title IS NULL OR btrim(NEW.seo_title) = '' THEN
    NEW.seo_title := left(
      coalesce(nullif(btrim(NEW.name_en), ''), nullif(btrim(NEW.name_hy), ''), nullif(btrim(NEW.name), ''), NEW.sku)
        || ' — Smeg Armenia',
      160
    );
  END IF;
  IF NEW.seo_description IS NULL OR btrim(NEW.seo_description) = '' THEN
    NEW.seo_description := left(
      coalesce(
        nullif(btrim(NEW.description_en), ''),
        nullif(btrim(NEW.description_hy), ''),
        nullif(btrim(NEW.description), ''),
        nullif(btrim(NEW.name_en), ''),
        nullif(btrim(NEW.name), ''),
        NEW.sku
      ),
      320
    );
  END IF;
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := lower(regexp_replace(coalesce(NEW.sku, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_auto_seo ON public.products;
CREATE TRIGGER trg_products_auto_seo
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.auto_product_seo();

-- Backfill existing rows missing SEO.
UPDATE public.products
SET
  seo_title = left(coalesce(nullif(btrim(name_en), ''), nullif(btrim(name_hy), ''), name, sku) || ' — Smeg Armenia', 160),
  seo_description = left(coalesce(nullif(btrim(description_en), ''), nullif(btrim(description_hy), ''), nullif(btrim(description), ''), name_en, name, sku), 320)
WHERE seo_title IS NULL OR btrim(seo_title) = ''
   OR seo_description IS NULL OR btrim(seo_description) = '';
