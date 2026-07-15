-- Category-aware catalog filters: fix aliases, add appliance-specific fields,
-- scope facets by category_en / family, fix energy_class indexing.

-- ---------------------------------------------------------------------------
-- Helpers: scope + normalizers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spec_field_applies_to_product(
  p_families jsonb,
  p_categories jsonb,
  p_family text,
  p_category text,
  p_category_en text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN (p_families IS NULL OR jsonb_typeof(p_families) <> 'array' OR jsonb_array_length(p_families) = 0)
     AND (p_categories IS NULL OR jsonb_typeof(p_categories) <> 'array' OR jsonb_array_length(p_categories) = 0)
    THEN true
    WHEN p_families IS NOT NULL AND jsonb_typeof(p_families) = 'array' AND jsonb_array_length(p_families) > 0
     AND p_family IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM jsonb_array_elements_text(p_families) f(v)
       WHERE lower(trim(f.v)) = lower(trim(p_family))
     )
    THEN true
    WHEN p_categories IS NOT NULL AND jsonb_typeof(p_categories) = 'array' AND jsonb_array_length(p_categories) > 0
     AND EXISTS (
       SELECT 1 FROM jsonb_array_elements_text(p_categories) c(v)
       WHERE (p_category_en IS NOT NULL AND lower(trim(c.v)) = lower(trim(p_category_en)))
          OR (p_category IS NOT NULL AND lower(trim(c.v)) = lower(trim(p_category)))
     )
    THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_toaster_slots(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    WHEN lower(raw) ~ '2\s*x\s*2|toaster\s*2([^0-9]|$)|2[\s-]?slot' THEN '2'
    WHEN lower(raw) ~ '4\s*x\s*4|2\s*x\s*4|toaster\s*4|4[\s-]?slot' THEN '4'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_coffee_type(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    WHEN lower(raw) ~ 'filter|drip' THEN 'drip'
    WHEN lower(raw) ~ 'automatic|auto' THEN 'automatic'
    WHEN lower(raw) ~ 'manual|espresso|portafilter|grinder' THEN 'portafilter'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_juicer_type(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    WHEN lower(raw) ~ 'citrus' THEN 'citrus'
    WHEN lower(raw) ~ 'centrifugal|centrifuge' THEN 'centrifugal'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_oven_type(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    WHEN lower(raw) ~ 'combi|multitech|steam|microwave' THEN 'combi'
    WHEN lower(raw) ~ 'thermo|fan|static|electric|conventional' THEN 'electric'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_hood_install(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    WHEN lower(raw) ~ 'island' THEN 'island'
    WHEN lower(raw) ~ 'ceiling' THEN 'ceiling'
    WHEN lower(raw) ~ 'downdraft' THEN 'downdraft'
    WHEN lower(raw) ~ 'integrated|under.?cabinet|semi' THEN 'integrated'
    WHEN lower(raw) ~ 'wall|decorative' THEN 'wall'
    ELSE lower(trim(regexp_replace(raw, '\s+', ' ', 'g')))
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_fridge_type(name_en text, sku text, category_en text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN category_en IS NOT NULL AND lower(category_en) ~ 'wine' THEN 'wine'
    WHEN coalesce(name_en, '') ~* 'side[\s-]?by[\s-]?side' OR coalesce(sku, '') ~* '^SBS' THEN 'side_by_side'
    WHEN coalesce(name_en, '') ~* '4\s*doors?' OR coalesce(sku, '') ~* '^FQ|^FQI|^SMEG500' THEN 'side_by_side'
    WHEN coalesce(name_en, '') ~* '2\s*doors?|bottom\s*mount|top\s*mount|2\s*drawers' THEN 'double_door'
    WHEN coalesce(sku, '') ~* '^FC|^FD|^FA[0-9]|^RBM' THEN 'double_door'
    WHEN category_en IS NOT NULL AND lower(category_en) = 'refrigerators' THEN 'single_door'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_energy_class(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    WHEN raw ~* 'https?://' THEN NULL
    WHEN upper(trim(raw)) ~ '^[A-G]\+{0,3}$' THEN upper(trim(raw))
    WHEN upper(trim(raw)) ~ 'CLASS[[:space:]]*([A-G])' THEN (regexp_match(upper(trim(raw)), 'CLASS[[:space:]]*([A-G])'))[1]
    WHEN upper(trim(raw)) ~ '^[A-G]$' THEN upper(trim(raw))
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_dishwasher_width(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    WHEN raw ~ '45' THEN '45'
    WHEN raw ~ '60' THEN '60'
    ELSE NULL
  END;
$$;

-- ---------------------------------------------------------------------------
-- Reindex (category-scoped, fixed energy, new normalizers)
-- ---------------------------------------------------------------------------
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
  energy_raw text;
BEGIN
  SELECT sku, family, category, category_en, name_en, energy_label,
         COALESCE(specs_en, specs) AS specs
  INTO p
  FROM public.products
  WHERE sku = p_sku;

  IF NOT FOUND THEN
    DELETE FROM public.product_spec_values WHERE sku = p_sku;
    RETURN;
  END IF;

  DELETE FROM public.product_spec_values WHERE sku = p_sku;

  FOR rec IN
    SELECT slug, field_type, aliases, families, categories
    FROM public.spec_filter_fields
    WHERE is_active = true
  LOOP
    IF NOT public.spec_field_applies_to_product(
      rec.families, rec.categories, p.family, p.category, p.category_en
    ) THEN
      CONTINUE;
    END IF;

    -- Energy class: prefer specs letter, never store label URL
    IF rec.slug = 'energy_class' THEN
      energy_raw := public.lookup_spec_raw(
        p.specs,
        '["Energy Efficiency Class","Energy efficiency class","Energy class"]'::jsonb
      );
      norm := public.normalize_energy_class(energy_raw);
      IF norm IS NULL THEN
        norm := public.normalize_energy_class(p.energy_label);
      END IF;
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
      CONTINUE;
    END IF;

    -- Derived fridge type from name/sku (no reliable Type key)
    IF rec.slug = 'fridge_type' THEN
      norm := public.normalize_fridge_type(p.name_en, p.sku, p.category_en);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
      CONTINUE;
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
    ELSIF rec.slug = 'hob_type' THEN
      norm := public.normalize_hob_type_value(raw);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
    ELSIF rec.slug = 'toaster_slots' THEN
      norm := public.normalize_toaster_slots(raw);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
    ELSIF rec.slug = 'coffee_type' THEN
      norm := public.normalize_coffee_type(raw);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
    ELSIF rec.slug = 'juicer_type' THEN
      norm := public.normalize_juicer_type(raw);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
    ELSIF rec.slug = 'oven_type' THEN
      norm := public.normalize_oven_type(raw);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
    ELSIF rec.slug = 'hood_install' THEN
      norm := public.normalize_hood_install(raw);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
    ELSIF rec.slug = 'dishwasher_width_cm' THEN
      norm := public.normalize_dishwasher_width(raw);
      IF norm IS NOT NULL THEN
        INSERT INTO public.product_spec_values (sku, field_slug, value_text)
        VALUES (p_sku, rec.slug, norm);
      END IF;
    ELSIF rec.field_type = 'range' THEN
      num := public.parse_spec_number(raw);
      IF num IS NOT NULL THEN
        IF num < 300 AND lower(raw) ~ 'cm' AND rec.slug LIKE '%_mm' THEN
          num := num * 10;
        END IF;
        -- Max spin often like "1400 giri/min" — already parsed
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

-- ---------------------------------------------------------------------------
-- Facets: honor field scope; match category OR category_en
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_spec_facets(
  p_categories text[] DEFAULT NULL,
  p_families text[] DEFAULT NULL,
  p_colours text[] DEFAULT NULL,
  p_aesthetics text[] DEFAULT NULL,
  p_in_stock boolean DEFAULT false,
  p_active jsonb DEFAULT '{}'::jsonb,
  p_skus text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  context_skus text[];
  base_skus text[];
  facet_active jsonb;
  spec_skus text[];
  out jsonb := '[]'::jsonb;
  fld record;
  enum_vals jsonb;
  rmin numeric;
  rmax numeric;
  cnt int;
  has_catalog_context boolean;
  in_scope boolean;
BEGIN
  has_catalog_context :=
    (p_categories IS NOT NULL AND cardinality(p_categories) > 0)
    OR (p_families IS NOT NULL AND cardinality(p_families) > 0)
    OR (p_skus IS NOT NULL AND cardinality(p_skus) > 0);

  SELECT array_agg(sku)
  INTO context_skus
  FROM public.products
  WHERE is_published = true
    AND (p_skus IS NULL OR sku = ANY(p_skus))
    AND (
      p_categories IS NULL
      OR category = ANY(p_categories)
      OR category_en = ANY(p_categories)
    )
    AND (p_families IS NULL OR family = ANY(p_families))
    AND (p_colours IS NULL OR colour = ANY(p_colours) OR colour_en = ANY(p_colours))
    AND (p_aesthetics IS NULL OR aesthetic = ANY(p_aesthetics))
    AND (NOT p_in_stock OR availability = 'in_stock');

  IF context_skus IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR fld IN
    SELECT slug, label_en, label_ru, label_hy, field_type, unit, families, categories, sort_order
    FROM public.spec_filter_fields
    WHERE is_active = true
    ORDER BY sort_order, slug
  LOOP
    -- Category/family-scoped filters only when browsing a scoped catalog view
    IF (fld.families IS NOT NULL AND jsonb_typeof(fld.families) = 'array' AND jsonb_array_length(fld.families) > 0)
       OR (fld.categories IS NOT NULL AND jsonb_typeof(fld.categories) = 'array' AND jsonb_array_length(fld.categories) > 0)
    THEN
      IF NOT has_catalog_context THEN
        CONTINUE;
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM public.products pr
        WHERE pr.sku = ANY(context_skus)
          AND public.spec_field_applies_to_product(
            fld.families, fld.categories, pr.family, pr.category, pr.category_en
          )
      ) INTO in_scope;

      IF NOT in_scope THEN
        CONTINUE;
      END IF;
    END IF;

    facet_active := public.jsonb_without_key(COALESCE(p_active, '{}'::jsonb), fld.slug);
    spec_skus := public.skus_matching_spec_filters(facet_active);

    base_skus := context_skus;
    IF spec_skus IS NOT NULL THEN
      SELECT array_agg(s)
      INTO base_skus
      FROM unnest(context_skus) AS s
      WHERE s = ANY(spec_skus);
    END IF;

    IF base_skus IS NULL OR cardinality(base_skus) = 0 THEN
      CONTINUE;
    END IF;

    IF fld.field_type = 'enum' THEN
      SELECT jsonb_agg(
        jsonb_build_object('value', t.value_text, 'count', t.cnt)
        ORDER BY t.cnt DESC, t.value_text
      )
      INTO enum_vals
      FROM (
        SELECT psv.value_text, count(DISTINCT psv.sku)::int AS cnt
        FROM public.product_spec_values psv
        WHERE psv.field_slug = fld.slug
          AND psv.sku = ANY(base_skus)
          AND psv.value_text IS NOT NULL
        GROUP BY psv.value_text
        HAVING count(DISTINCT psv.sku) > 0
      ) t;

      IF enum_vals IS NOT NULL AND jsonb_array_length(enum_vals) > 0 THEN
        out := out || jsonb_build_array(jsonb_build_object(
          'slug', fld.slug, 'type', fld.field_type,
          'label_en', fld.label_en, 'label_ru', fld.label_ru, 'label_hy', fld.label_hy,
          'unit', fld.unit, 'values', enum_vals
        ));
      END IF;

    ELSIF fld.field_type = 'range' THEN
      SELECT min(psv.value_num), max(psv.value_num), count(DISTINCT psv.sku)::int
      INTO rmin, rmax, cnt
      FROM public.product_spec_values psv
      WHERE psv.field_slug = fld.slug
        AND psv.sku = ANY(base_skus)
        AND psv.value_num IS NOT NULL;

      IF cnt > 0 AND rmin IS NOT NULL AND rmax IS NOT NULL THEN
        out := out || jsonb_build_array(jsonb_build_object(
          'slug', fld.slug, 'type', fld.field_type,
          'label_en', fld.label_en, 'label_ru', fld.label_ru, 'label_hy', fld.label_hy,
          'unit', fld.unit, 'min', rmin, 'max', rmax, 'count', cnt
        ));
      END IF;
    END IF;
  END LOOP;

  RETURN out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.spec_field_applies_to_product(jsonb, jsonb, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_spec_facets(text[], text[], text[], text[], boolean, jsonb, text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reindex_product_spec_values(text) TO service_role;

-- ---------------------------------------------------------------------------
-- Fix existing field aliases + scope; add new category filters
-- ---------------------------------------------------------------------------

-- Dimensions: large appliances (+ dishwashers already have dedicated width enum)
UPDATE public.spec_filter_fields
SET
  aliases = '["Width","Product Width","Product width","Packed width","Width (mm)","Hood width"]'::jsonb,
  categories = '["Refrigerators","Freezers","Ovens","Hobs","Hoods","Microwave ovens","Dishwashers","Washing Machine","Tumble dryer","Wine coolers","Washer dryer","Tabletop ovens"]'::jsonb,
  families = '["Refrigerator","Freezers","Oven","Hob","Cooker","Microwave","Countertop Combi Oven","Dishwashers","Washing Machine","Washer dryer","Tumble dryer"]'::jsonb
WHERE slug = 'width_mm';

UPDATE public.spec_filter_fields
SET
  categories = '["Refrigerators","Freezers","Ovens","Hobs","Hoods","Microwave ovens","Dishwashers","Washing Machine","Tumble dryer","Wine coolers","Washer dryer","Tabletop ovens"]'::jsonb,
  families = '["Refrigerator","Freezers","Oven","Hob","Cooker","Microwave","Countertop Combi Oven","Dishwashers","Washing Machine","Washer dryer","Tumble dryer"]'::jsonb
WHERE slug IN ('height_mm', 'depth_mm');

UPDATE public.spec_filter_fields
SET
  categories = '["Refrigerators","Freezers","Ovens","Hobs","Hoods","Microwave ovens","Dishwashers","Washing Machine","Tumble dryer","Wine coolers","Washer dryer"]'::jsonb,
  families = '["Refrigerator","Freezers","Oven","Hob","Cooker","Microwave","Countertop Combi Oven","Dishwashers","Washing Machine","Washer dryer","Tumble dryer"]'::jsonb
WHERE slug = 'installation';

UPDATE public.spec_filter_fields
SET
  aliases = '["Energy Efficiency Class","Energy efficiency class","Energy class"]'::jsonb,
  categories = '["Refrigerators","Freezers","Ovens","Dishwashers","Washing Machine","Tumble dryer","Wine coolers","Washer dryer","Hoods"]'::jsonb,
  families = '["Refrigerator","Freezers","Oven","Dishwashers","Washing Machine","Washer dryer","Tumble dryer"]'::jsonb
WHERE slug = 'energy_class';

UPDATE public.spec_filter_fields
SET
  aliases = '["Gross volume","Net volume","Gross volume (l)","Net volume (l)","Total gross volume (l)","Total net volume","Total storage volume","Net volume of the cavity","Volume (l)","Capacity (l)","Sum of the volumes of the frozen compartment(s)"]'::jsonb,
  categories = '["Refrigerators","Freezers","Ovens","Microwave ovens","Tabletop ovens"]'::jsonb,
  families = '["Refrigerator","Freezers","Oven","Microwave","Countertop Combi Oven"]'::jsonb
WHERE slug = 'volume_l';

UPDATE public.spec_filter_fields
SET
  aliases = '["Loading capacity","Load capacity","Load capacity (kg)","Load capacity (cotton)","Maximum load (kg)","Capacity (kg)"]'::jsonb,
  categories = '["Washing Machine","Tumble dryer","Washer dryer"]'::jsonb,
  families = '["Washing Machine","Washer dryer","Tumble dryer"]'::jsonb
WHERE slug = 'load_kg';

UPDATE public.spec_filter_fields
SET
  aliases = '["Number of place settings","Rated capacity (ps)","Place settings"]'::jsonb,
  categories = '["Dishwashers"]'::jsonb,
  families = '["Dishwashers"]'::jsonb
WHERE slug = 'place_settings';

UPDATE public.spec_filter_fields
SET
  categories = '["Hobs"]'::jsonb,
  families = '["Hob","Cooker"]'::jsonb
WHERE slug = 'hob_type';

UPDATE public.spec_filter_fields
SET
  categories = '["Hobs"]'::jsonb,
  families = '["Hob","Cooker"]'::jsonb
WHERE slug = 'cook_zones';

-- Keep power_source hidden in UI; still scoped
UPDATE public.spec_filter_fields
SET
  categories = '["Kettles","Toasters","Blenders","Hand blenders","Hand mixers","Stand mixers","Citrus juicers","Espresso coffee machines","Coffee grinders","Milk frothers"]'::jsonb
WHERE slug = 'power_source';

INSERT INTO public.spec_filter_fields
  (slug, label_en, label_ru, label_hy, field_type, unit, aliases, families, categories, sort_order)
VALUES
  (
    'toaster_slots', 'Slots', 'Слоты', 'Սլոտեր', 'enum', NULL,
    '["Type"]'::jsonb, '["Toaster"]'::jsonb, '["Toasters"]'::jsonb, 110
  ),
  (
    'power_w', 'Power', 'Мощность', 'Հզորություն', 'range', 'W',
    '["Power","Motor power","Electrical connection rating","Power absorption","Microwave effective power"]'::jsonb,
    '["Blenders","Hand Blenders","Espresso Coffee Machine","Drip filter Coffee Machine","Coffee machine","Coffee Grinder","Citrus Juicer"]'::jsonb,
    '["Blenders","Hand blenders","Hand mixers","Stand mixers","Citrus juicers","Espresso coffee machines","Coffee grinders"]'::jsonb,
    120
  ),
  (
    'kettle_volume_l', 'Capacity', 'Объём', 'Ծավալ', 'range', 'l',
    '["Max capacity","Capacity (l)","Capacity"]'::jsonb,
    '["Kettles"]'::jsonb, '["Kettles"]'::jsonb, 130
  ),
  (
    'bowl_volume_l', 'Bowl / jug volume', 'Объём чаши', 'Ամանի ծավալ', 'range', 'l',
    '["Bowl capacity","Jug capacity","Bottle net capacity"]'::jsonb,
    '["Blenders"]'::jsonb, '["Blenders","Stand mixers"]'::jsonb, 140
  ),
  (
    'speeds', 'Speeds', 'Скорости', 'Արագություններ', 'range', NULL,
    '["Speeds","Number of speeds","No. of speeds"]'::jsonb,
    NULL, '["Blenders","Hand mixers","Stand mixers"]'::jsonb, 150
  ),
  (
    'juicer_type', 'Juicer type', 'Тип соковыжималки', 'Հյութաքամիչի տեսակ', 'enum', NULL,
    '["Type"]'::jsonb, '["Citrus Juicer"]'::jsonb, '["Citrus juicers"]'::jsonb, 160
  ),
  (
    'coffee_type', 'Coffee machine type', 'Тип кофемашины', 'Սուրճի մեքենայի տեսակ', 'enum', NULL,
    '["Type"]'::jsonb,
    '["Espresso Coffee Machine","Drip filter Coffee Machine","Coffee machine"]'::jsonb,
    '["Espresso coffee machines"]'::jsonb, 170
  ),
  (
    'grinder_capacity_g', 'Bean capacity', 'Ёмкость', 'Տարողություն', 'range', 'g',
    '["Coffee bean container capacity","Bean capacity","Hopper capacity","Ground coffee container capacity"]'::jsonb,
    '["Coffee Grinder"]'::jsonb, '["Coffee grinders"]'::jsonb, 180
  ),
  (
    'fridge_type', 'Refrigerator type', 'Тип холодильника', 'Սառնարանի տեսակ', 'enum', NULL,
    '[]'::jsonb, '["Refrigerator"]'::jsonb, '["Refrigerators","Wine coolers"]'::jsonb, 190
  ),
  (
    'oven_type', 'Oven type', 'Тип духовки', 'Ջեռոցի տեսակ', 'enum', NULL,
    '["Cooking Method"]'::jsonb, '["Oven"]'::jsonb, '["Ovens"]'::jsonb, 200
  ),
  (
    'hood_install', 'Hood type', 'Тип вытяжки', 'Գլխարկի տեսակ', 'enum', NULL,
    '["Hood Type","Type"]'::jsonb, NULL, '["Hoods"]'::jsonb, 210
  ),
  (
    'spin_rpm', 'Spin speed', 'Скорость отжима', 'Պտտման արագություն', 'range', 'rpm',
    '["Max spin speed","Maximum spin speed"]'::jsonb,
    '["Washing Machine","Washer dryer"]'::jsonb, '["Washing Machine","Washer dryer"]'::jsonb, 220
  ),
  (
    'bottle_capacity', 'Bottle capacity', 'Количество бутылок', 'Շշերի քանակ', 'range', NULL,
    '["Max Capacity (bottles 0,75lt)","Bottle capacity","Max bottle capacity"]'::jsonb,
    '["Soda Maker"]'::jsonb, '["Wine coolers","Soda makers"]'::jsonb, 230
  ),
  (
    'dishwasher_width_cm', 'Width', 'Ширина', 'Լայնություն', 'enum', 'cm',
    '["Commercial width"]'::jsonb, '["Dishwashers"]'::jsonb, '["Dishwashers"]'::jsonb, 240
  )
ON CONFLICT (slug) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_ru = EXCLUDED.label_ru,
  label_hy = EXCLUDED.label_hy,
  field_type = EXCLUDED.field_type,
  unit = EXCLUDED.unit,
  aliases = EXCLUDED.aliases,
  families = EXCLUDED.families,
  categories = EXCLUDED.categories,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

-- Scope material to sinks only (already family-scoped)
UPDATE public.spec_filter_fields
SET categories = '["Sinks"]'::jsonb
WHERE slug = 'material';

-- Prefer the first numeric token (avoids "1.5lt / 6 cups" → 1.56)
CREATE OR REPLACE FUNCTION public.parse_spec_number(raw text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    ELSE NULLIF(
      replace(
        (regexp_match(lower(trim(raw)), '(-?[0-9]+[.,]?[0-9]*)'))[1],
        ',', '.'
      ),
      ''
    )::numeric
  END;
$$;

-- Purge bad energy_class URL values before reindex
DELETE FROM public.product_spec_values WHERE field_slug = 'energy_class';

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
