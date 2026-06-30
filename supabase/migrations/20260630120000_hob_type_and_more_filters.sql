-- Fix hob_type indexing (family-scoped), clearer labels, cook zones + place settings filters

CREATE OR REPLACE FUNCTION public.normalize_hob_type_value(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    WHEN lower(raw) ~ 'induction.*integrat.*hood|integrat.*hood.*induction' THEN 'induction_hood'
    WHEN lower(raw) ~ 'induction' THEN 'induction'
    WHEN lower(raw) ~ 'gas' THEN 'gas'
    WHEN lower(raw) ~ 'ceramic|vitroceramic|electric plate' THEN 'ceramic'
    WHEN lower(raw) ~ 'mixed|combi' THEN 'mixed'
    WHEN lower(raw) ~ 'teppanyaki' THEN 'teppanyaki'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.reindex_product_spec_values(p_sku text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  rec record;
  p record;
  raw text;
  norm text;
  num numeric;
  battery text;
BEGIN
  SELECT sku, family, category, energy_label,
         COALESCE(specs_en, specs) AS specs
  INTO p
  FROM public.products
  WHERE sku = p_sku;

  IF NOT FOUND THEN
    DELETE FROM public.product_spec_values WHERE sku = p_sku;
    RETURN;
  END IF;

  DELETE FROM public.product_spec_values WHERE sku = p_sku;

  IF p.energy_label IS NOT NULL AND trim(p.energy_label) <> '' THEN
    INSERT INTO public.product_spec_values (sku, field_slug, value_text)
    VALUES (p_sku, 'energy_class', lower(trim(p.energy_label)))
    ON CONFLICT (sku, field_slug) DO UPDATE SET value_text = EXCLUDED.value_text;
  END IF;

  FOR rec IN
    SELECT slug, field_type, aliases
    FROM public.spec_filter_fields
    WHERE is_active = true AND slug <> 'energy_class'
  LOOP
    IF rec.slug = 'hob_type' THEN
      IF p.family IS NULL OR p.family NOT IN ('Hob', 'Cooker') THEN
        CONTINUE;
      END IF;
      raw := public.lookup_spec_raw(p.specs, rec.aliases);
      IF raw IS NULL THEN
        CONTINUE;
      END IF;
      norm := public.normalize_hob_type_value(raw);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
      CONTINUE;
    END IF;

    IF rec.slug = 'material' THEN
      IF p.family IS NULL OR p.family <> 'Sink' THEN
        CONTINUE;
      END IF;
    END IF;

    IF rec.slug = 'cook_zones' THEN
      IF p.family IS NULL OR p.family NOT IN ('Hob', 'Cooker') THEN
        CONTINUE;
      END IF;
    END IF;

    IF rec.slug = 'place_settings' THEN
      IF p.family IS NULL OR p.family <> 'Dishwashers' THEN
        CONTINUE;
      END IF;
    END IF;

    raw := public.lookup_spec_raw(p.specs, rec.aliases);
    IF raw IS NULL THEN
      CONTINUE;
    END IF;

    IF rec.slug = 'installation' THEN
      norm := public.normalize_installation_value(raw);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
    ELSIF rec.slug = 'power_source' THEN
      battery := public.lookup_spec_raw(p.specs, '["Battery type","Battery"]'::jsonb);
      norm := public.normalize_power_source(raw, battery);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
    ELSIF rec.field_type = 'range' THEN
      num := public.parse_spec_number(raw);
      IF num IS NOT NULL THEN
        IF num < 300 AND lower(raw) ~ 'cm' THEN
          num := num * 10;
        END IF;
        INSERT INTO public.product_spec_values (sku, field_slug, value_num, value_text)
        VALUES (p_sku, rec.slug, num, raw);
      END IF;
    ELSIF rec.field_type = 'enum' THEN
      norm := lower(trim(regexp_replace(raw, '\s+', ' ', 'g')));
      INSERT INTO public.product_spec_values (sku, field_slug, value_text)
      VALUES (p_sku, rec.slug, norm);
    END IF;
  END LOOP;
END;
$$;

UPDATE public.spec_filter_fields
SET
  label_en = 'Heating type',
  label_ru = 'Тип нагрева',
  label_hy = 'Տաքացման տեսակ',
  aliases = '["Hob type","Type","Burner type"]'::jsonb
WHERE slug = 'hob_type';

INSERT INTO public.spec_filter_fields (slug, label_en, label_ru, label_hy, field_type, unit, aliases, families, sort_order)
VALUES
  (
    'cook_zones', 'Cook zones', 'Конфорки', 'Կերակրասալներ', 'range', NULL,
    '["Total no. of cook zones","Number of cooking zones","Cooking zones"]'::jsonb,
    '["Hob","Cooker"]'::jsonb,
    75
  ),
  (
    'place_settings', 'Place settings', 'Комплектов посуды', 'Տեղերի քանակ', 'range', NULL,
    '["Number of place settings"]'::jsonb,
    '["Dishwashers"]'::jsonb,
    95
  )
ON CONFLICT (slug) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_ru = EXCLUDED.label_ru,
  label_hy = EXCLUDED.label_hy,
  field_type = EXCLUDED.field_type,
  unit = EXCLUDED.unit,
  aliases = EXCLUDED.aliases,
  families = EXCLUDED.families,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Normalize legacy hob_type slugs
UPDATE public.product_spec_values
SET value_text = 'induction_hood'
WHERE field_slug = 'hob_type' AND value_text = 'induction with integrated hood';

-- Drop hob_type rows for non-hob/cooker products (reindex will not recreate them)
DELETE FROM public.product_spec_values psv
USING public.products p
WHERE p.sku = psv.sku
  AND psv.field_slug = 'hob_type'
  AND (p.family IS NULL OR p.family NOT IN ('Hob', 'Cooker'));

DELETE FROM public.product_spec_values psv
USING public.products p
WHERE p.sku = psv.sku
  AND psv.field_slug = 'material'
  AND (p.family IS NULL OR p.family <> 'Sink');

DO $$
DECLARE
  s text;
BEGIN
  FOR s IN SELECT sku FROM public.products
  LOOP
    PERFORM public.reindex_product_spec_values(s);
  END LOOP;
END;
$$;
