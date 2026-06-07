
-- Products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_hy text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_hy text,
  ADD COLUMN IF NOT EXISTS specs_en jsonb,
  ADD COLUMN IF NOT EXISTS specs_hy jsonb,
  ADD COLUMN IF NOT EXISTS category_en text,
  ADD COLUMN IF NOT EXISTS category_hy text,
  ADD COLUMN IF NOT EXISTS colour_en text,
  ADD COLUMN IF NOT EXISTS colour_hy text,
  ADD COLUMN IF NOT EXISTS translated_at timestamptz;

-- Collections
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_hy text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_hy text;

-- Themes
ALTER TABLE public.themes
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_hy text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_hy text;

-- Color swatches
ALTER TABLE public.color_swatches
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_hy text;

-- Update search tsv to include translations
CREATE OR REPLACE FUNCTION public.products_search_tsv_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.sku, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.name_hy, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.ean, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.category_en, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.category_hy, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.family, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.brand, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.aesthetic, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.colour, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.colour_en, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.colour_hy, '')), 'C') ||
    setweight(to_tsvector('simple', regexp_replace(coalesce(NEW.description, ''), '<[^>]+>', ' ', 'g')), 'D') ||
    setweight(to_tsvector('simple', regexp_replace(coalesce(NEW.description_en, ''), '<[^>]+>', ' ', 'g')), 'D') ||
    setweight(to_tsvector('simple', regexp_replace(coalesce(NEW.description_hy, ''), '<[^>]+>', ' ', 'g')), 'D');
  RETURN NEW;
END;
$function$;

-- Backfill tsv for existing rows
UPDATE public.products SET search_tsv = search_tsv WHERE true;
