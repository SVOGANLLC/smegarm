-- Allow spec facets for a fixed SKU list (collections, sale pages)
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
    AND (p_skus IS NULL OR sku = ANY(p_skus))
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

GRANT EXECUTE ON FUNCTION public.get_spec_facets(text[], text[], text[], text[], boolean, jsonb, text[]) TO anon, authenticated, service_role;
