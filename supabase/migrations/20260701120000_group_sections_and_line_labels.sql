-- Default grouping: small appliances only; seed WKF01 line labels

DO $$
DECLARE
  sections jsonb := '{"large":false,"small":true,"accessories":false}'::jsonb;
  labels jsonb := '[
    {
      "key": "WKF01",
      "name_ru": "Чайник со свистком",
      "name_en": "Whistling Kettle",
      "name_hy": "Թեյնիկ սուլիչով"
    },
    {
      "key": "Kettles|whistling kettle 50''s style aesthetic",
      "name_ru": "Чайник со свистком",
      "name_en": "Whistling Kettle",
      "name_hy": "Թեյնիկ սուլիչով"
    }
  ]'::jsonb;
  patch jsonb;
BEGIN
  patch := jsonb_build_object(
    'config.groupByColorSections', jsonb_build_object(
      'ru', sections::text,
      'en', sections::text,
      'hy', sections::text
    ),
    'config.modelGroupLabels', jsonb_build_object(
      'ru', labels::text,
      'en', labels::text,
      'hy', labels::text
    )
  );

  UPDATE public.site_content
  SET value = COALESCE(value, '{}'::jsonb) || patch,
      updated_at = now()
  WHERE key = 'categories';

  IF NOT FOUND THEN
    INSERT INTO public.site_content (key, value)
    VALUES ('categories', patch);
  END IF;
END;
$$;
