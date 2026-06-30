-- Enable colour grouping for large appliances section

DO $$
DECLARE
  sections jsonb := '{"large":true,"small":true,"accessories":false}'::jsonb;
  patch jsonb;
BEGIN
  patch := jsonb_build_object(
    'config.groupByColorSections', jsonb_build_object(
      'ru', sections::text,
      'en', sections::text,
      'hy', sections::text
    )
  );

  UPDATE public.site_content
  SET value = COALESCE(value, '{}'::jsonb) || patch,
      updated_at = now()
  WHERE key = 'categories';
END;
$$;
