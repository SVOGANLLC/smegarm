-- New collection background images + colour-aware theme_key for Porsche / Divina Cucina.

UPDATE public.themes SET background_image = '/brand/themes/porsche-green.png' WHERE key = 'porsche_green';
UPDATE public.themes SET background_image = '/brand/themes/porsche-white.png' WHERE key = 'porsche_white';
UPDATE public.themes SET background_image = '/brand/themes/porsche-red.png' WHERE key IN ('porsche_917', 'porsche');
UPDATE public.themes SET background_image = '/brand/themes/dg-blu.png' WHERE key = 'dg_blu_mediterraneo';
UPDATE public.themes SET background_image = '/brand/themes/dg-sicily.png' WHERE key IN ('dg_sicily', 'dg', 'dg_divina_cucina');

CREATE OR REPLACE FUNCTION public.compute_theme_key(
  p_name text,
  p_aesthetic text,
  p_colour text DEFAULT NULL,
  p_colour_en text DEFAULT NULL
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_name ~* 'sicily is my love' THEN 'dg_sicily'
    WHEN p_name ~* 'blu mediterraneo'  THEN 'dg_blu_mediterraneo'
    WHEN p_name ~* 'divina cucina' THEN
      CASE
        WHEN COALESCE(p_colour_en, p_colour, '') ~* '(blue|blu|azzur|azure|navy|голуб|син|կապույ|lan)' THEN 'dg_divina_cucina'
        ELSE 'dg_divina_cucina'
      END
    WHEN p_name ~* 'dolce.{0,3}gabbana' THEN 'dg_sicily'
    WHEN p_name ~* 'coca.?cola'        THEN 'coca_cola'
    WHEN p_name ~* '(smeg500|fiat\s*500)' THEN 'smeg500'
    WHEN p_name ~* '917'               THEN 'porsche_917'
    WHEN p_name ~* 'porsche'
      AND COALESCE(p_colour_en, p_colour, '') ~* '(white|carrara|pcw|бел|սպիտակ|bianco)' THEN 'porsche_white'
    WHEN p_name ~* 'porsche'
      AND COALESCE(p_colour_en, p_colour, '') ~* '(green|shade green|psg|зелен|կանաչ|verde)' THEN 'porsche_green'
    WHEN p_name ~* 'porsche'
      AND COALESCE(p_colour_en, p_colour, '') ~* '(red|salzburg|917|cherry|красн|կարմիր|rosso)' THEN 'porsche_917'
    WHEN p_name ~* 'porsche'
      AND p_name ~* '(shade green|psg)' THEN 'porsche_green'
    WHEN p_name ~* 'porsche'
      AND p_name ~* '(carrara|white|pcw)' THEN 'porsche_white'
    WHEN p_name ~* 'porsche'           THEN 'porsche_917'
    ELSE NULL
  END
$function$;

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
  NEW.theme_key := COALESCE(
    NEW.theme_key,
    public.compute_theme_key(NEW.name, NEW.aesthetic, NEW.colour, NEW.colour_en)
  );
  RETURN NEW;
END;
$$;

UPDATE public.products
SET theme_key = public.compute_theme_key(name, aesthetic, colour, colour_en)
WHERE theme_key IS NOT NULL
  AND (
    theme_key LIKE 'porsche%'
    OR theme_key LIKE 'dg%'
  );
