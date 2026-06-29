-- Smart spec-based product filtering (Phase A)
-- See docs/CATALOG_ROADMAP.md

-- ---------------------------------------------------------------------------
-- Registry of filterable spec fields
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spec_filter_fields (
  slug text PRIMARY KEY,
  label_en text NOT NULL,
  label_ru text,
  label_hy text,
  field_type text NOT NULL CHECK (field_type IN ('enum', 'range', 'boolean')),
  unit text,
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  families jsonb,
  categories jsonb,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_spec_values (
  sku text NOT NULL REFERENCES public.products(sku) ON DELETE CASCADE,
  field_slug text NOT NULL REFERENCES public.spec_filter_fields(slug) ON DELETE CASCADE,
  value_text text,
  value_num numeric,
  PRIMARY KEY (sku, field_slug)
);

CREATE INDEX IF NOT EXISTS idx_psv_field_text ON public.product_spec_values(field_slug, value_text);
CREATE INDEX IF NOT EXISTS idx_psv_field_num ON public.product_spec_values(field_slug, value_num);
CREATE INDEX IF NOT EXISTS idx_psv_sku ON public.product_spec_values(sku);

GRANT SELECT ON public.spec_filter_fields TO anon, authenticated;
GRANT SELECT ON public.product_spec_values TO anon, authenticated;
GRANT ALL ON public.spec_filter_fields TO service_role;
GRANT ALL ON public.product_spec_values TO service_role;

ALTER TABLE public.spec_filter_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_spec_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spec_filter_fields public read"
  ON public.spec_filter_fields FOR SELECT USING (is_active = true);

CREATE POLICY "product_spec_values public read"
  ON public.product_spec_values FOR SELECT USING (true);

CREATE POLICY "spec_filter_fields admin write"
  ON public.spec_filter_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- Parsing helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parse_spec_number(raw text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    ELSE NULLIF(
      regexp_replace(
        regexp_replace(lower(trim(raw)), '[^0-9.,\-]', '', 'g'),
        ',', '.', 'g'
      ),
      ''
    )::numeric
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_installation_value(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    WHEN lower(raw) ~ 'partial' AND lower(raw) ~ 'integrat|built' THEN 'partially_integrated'
    WHEN lower(raw) ~ 'fully.?integrat|fully.?built' THEN 'fully_integrated'
    WHEN lower(raw) ~ 'under counter|under cupboard|built.?in|integrated|with frame' THEN 'built_in'
    WHEN lower(raw) ~ 'free.?stand' THEN 'freestanding'
    ELSE lower(trim(regexp_replace(raw, '\s+', ' ', 'g')))
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_power_source(raw text, battery text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN battery IS NOT NULL AND trim(battery) <> '' THEN 'battery'
    WHEN raw IS NULL OR trim(raw) = '' THEN NULL
    WHEN lower(raw) ~ 'cordless|battery|rechargeable' THEN 'battery'
    WHEN lower(raw) ~ 'mains|plug|cord|230|220|240' THEN 'mains'
    ELSE 'mains'
  END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_spec_raw(specs jsonb, aliases jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT s.value
  FROM jsonb_each_text(COALESCE(specs, '{}'::jsonb)) AS s(key, value)
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(COALESCE(aliases, '[]'::jsonb)) AS a(alias)
    WHERE lower(trim(s.key)) = lower(trim(a.alias))
  )
    AND trim(s.value) <> ''
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Reindex one product
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

  -- Energy label from dedicated column
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
        -- cm → mm heuristic
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

CREATE OR REPLACE FUNCTION public.trg_products_reindex_specs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.reindex_product_spec_values(NEW.sku);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_reindex_specs ON public.products;
CREATE TRIGGER trg_products_reindex_specs
AFTER INSERT OR UPDATE OF specs, specs_en, energy_label, family, category
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.trg_products_reindex_specs();

-- ---------------------------------------------------------------------------
-- RPC: SKUs matching spec filters
-- p_filters example: {"installation":["built_in","freestanding"],"width_mm":{"min":550,"max":650}}
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.skus_matching_spec_filters(p_filters jsonb DEFAULT '{}'::jsonb)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  result text[];
  field_key text;
  field_val jsonb;
  enum_vals text[];
  rmin numeric;
  rmax numeric;
  matched text[];
BEGIN
  IF p_filters IS NULL OR p_filters = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(DISTINCT sku)
  INTO result
  FROM public.products
  WHERE is_published = true;

  FOR field_key, field_val IN SELECT * FROM jsonb_each(p_filters)
  LOOP
    matched := NULL;

    IF jsonb_typeof(field_val) = 'array' AND jsonb_array_length(field_val) > 0 THEN
      SELECT array_agg(DISTINCT enum_v::text)
      INTO enum_vals
      FROM jsonb_array_elements_text(field_val) AS enum_v;

      SELECT array_agg(DISTINCT psv.sku)
      INTO matched
      FROM public.product_spec_values psv
      JOIN public.products pr ON pr.sku = psv.sku AND pr.is_published = true
      WHERE psv.field_slug = field_key
        AND psv.value_text = ANY(enum_vals);

    ELSIF jsonb_typeof(field_val) = 'object' THEN
      rmin := NULLIF(field_val->>'min', '')::numeric;
      rmax := NULLIF(field_val->>'max', '')::numeric;

      SELECT array_agg(DISTINCT psv.sku)
      INTO matched
      FROM public.product_spec_values psv
      JOIN public.products pr ON pr.sku = psv.sku AND pr.is_published = true
      WHERE psv.field_slug = field_key
        AND psv.value_num IS NOT NULL
        AND (rmin IS NULL OR psv.value_num >= rmin)
        AND (rmax IS NULL OR psv.value_num <= rmax);
    END IF;

    IF matched IS NULL THEN
      RETURN ARRAY[]::text[];
    END IF;

    SELECT array_agg(s)
    INTO result
    FROM unnest(result) AS s
    WHERE s = ANY(matched);
  END LOOP;

  RETURN COALESCE(result, ARRAY[]::text[]);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: contextual spec facets with counts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_spec_facets(
  p_categories text[] DEFAULT NULL,
  p_families text[] DEFAULT NULL,
  p_colours text[] DEFAULT NULL,
  p_aesthetics text[] DEFAULT NULL,
  p_in_stock boolean DEFAULT false,
  p_active jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  base_skus text[];
  spec_skus text[];
  out jsonb := '[]'::jsonb;
  fld record;
  enum_vals jsonb;
  rmin numeric;
  rmax numeric;
  cnt int;
BEGIN
  SELECT array_agg(sku)
  INTO base_skus
  FROM public.products
  WHERE is_published = true
    AND (p_categories IS NULL OR category = ANY(p_categories))
    AND (p_families IS NULL OR family = ANY(p_families))
    AND (p_colours IS NULL OR colour = ANY(p_colours))
    AND (p_aesthetics IS NULL OR aesthetic = ANY(p_aesthetics))
    AND (NOT p_in_stock OR availability = 'in_stock');

  IF base_skus IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  spec_skus := public.skus_matching_spec_filters(p_active);
  IF spec_skus IS NOT NULL THEN
    SELECT array_agg(s)
    INTO base_skus
    FROM unnest(base_skus) AS s
    WHERE s = ANY(spec_skus);
  END IF;

  IF base_skus IS NULL OR cardinality(base_skus) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR fld IN
    SELECT slug, label_en, label_ru, label_hy, field_type, unit, families, categories, sort_order
    FROM public.spec_filter_fields
    WHERE is_active = true
    ORDER BY sort_order, slug
  LOOP
    IF fld.field_type = 'enum' THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'value', t.value_text,
          'count', t.cnt
        )
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
          'slug', fld.slug,
          'type', fld.field_type,
          'label_en', fld.label_en,
          'label_ru', fld.label_ru,
          'label_hy', fld.label_hy,
          'unit', fld.unit,
          'values', enum_vals
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
          'slug', fld.slug,
          'type', fld.field_type,
          'label_en', fld.label_en,
          'label_ru', fld.label_ru,
          'label_hy', fld.label_hy,
          'unit', fld.unit,
          'min', rmin,
          'max', rmax,
          'count', cnt
        ));
      END IF;
    END IF;
  END LOOP;

  RETURN out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.skus_matching_spec_filters(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_spec_facets(text[], text[], text[], text[], boolean, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reindex_product_spec_values(text) TO service_role;

-- ---------------------------------------------------------------------------
-- Seed filter field definitions
-- ---------------------------------------------------------------------------
INSERT INTO public.spec_filter_fields (slug, label_en, label_ru, label_hy, field_type, unit, aliases, families, sort_order)
VALUES
  (
    'width_mm', 'Width', 'Ширина', 'Լայնություն', 'range', 'mm',
    '["Width","Product Width","Product width","Packed width","Width (mm)"]'::jsonb,
    NULL, 10
  ),
  (
    'height_mm', 'Height', 'Высота', 'Բարձրություն', 'range', 'mm',
    '["Height","Product Height (mm)","Product Height","Product height","Product height (mm)","Height (mm) packed"]'::jsonb,
    NULL, 20
  ),
  (
    'depth_mm', 'Depth', 'Глубина', 'Խորություն', 'range', 'mm',
    '["Depth (mm)","Product Depth","Product depth","Product depth with handle","Packaged depth"]'::jsonb,
    NULL, 30
  ),
  (
    'installation', 'Installation', 'Тип установки', 'Տեղադրման տեսակ', 'enum', NULL,
    '["Installation","Installation type","Built-in type","Installation positioning of the appliance"]'::jsonb,
    '["Refrigerator","Oven","Hob","Cooker","Dishwashers","Microwave","Freezers","Drawer","Sink","Washing Machine","Washer dryer"]'::jsonb,
    40
  ),
  (
    'power_source', 'Power source', 'Питание', 'Սնուցում', 'enum', NULL,
    '["Plug","Power supply","Type of electric cable installed"]'::jsonb,
    '["Kettles","Toaster","Blenders","Hand Blenders","Espresso Coffee Machine","Drip filter Coffee Machine","Coffee Grinder","Milk Frother","Kitchen Scales","Citrus Juicer"]'::jsonb,
    50
  ),
  (
    'energy_class', 'Energy class', 'Класс энергопотребления', 'Էներգիայի դաս', 'enum', NULL,
    '[]'::jsonb,
    '["Refrigerator","Freezers","Dishwashers","Washing Machine","Washer dryer","Oven"]'::jsonb,
    60
  ),
  (
    'hob_type', 'Hob type', 'Тип варочной', 'Կերակրասալի տեսակ', 'enum', NULL,
    '["Type","Hob type","Burner type"]'::jsonb,
    '["Hob","Cooker"]'::jsonb,
    70
  ),
  (
    'volume_l', 'Volume', 'Объём', 'Ծավալ', 'range', 'l',
    '["Gross volume (l)","Net volume (l)","Total gross volume (l)","Volume (l)","Capacity (l)"]'::jsonb,
    '["Refrigerator","Freezers","Oven","Microwave","Countertop Combi Oven"]'::jsonb,
    80
  ),
  (
    'load_kg', 'Load capacity', 'Загрузка', 'Բեռնատարողություն', 'range', 'kg',
    '["Load capacity (kg)","Maximum load (kg)","Capacity (kg)"]'::jsonb,
    '["Washing Machine","Washer dryer","Dishwashers"]'::jsonb,
    90
  ),
  (
    'material', 'Material', 'Материал', 'Նյութ', 'enum', NULL,
    '["Material","Finishing","Body material"]'::jsonb,
    '["Sink"]'::jsonb,
    100
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

-- Backfill all products
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
