-- Oven card on homepage used missing SKU SOP6604TPNR — switch to published SF6905P1.
UPDATE public.site_content
SET value = jsonb_set(
  value,
  '{config.mainCards}',
  jsonb_build_object(
    'ru', replace(value->'config.mainCards'->>'ru', 'SOP6604TPNR', 'SF6905P1'),
    'en', replace(value->'config.mainCards'->>'en', 'SOP6604TPNR', 'SF6905P1'),
    'hy', replace(value->'config.mainCards'->>'hy', 'SOP6604TPNR', 'SF6905P1')
  )
)
WHERE key = 'categories'
  AND (
    (value->'config.mainCards'->>'ru') LIKE '%SOP6604TPNR%'
    OR (value->'config.mainCards'->>'en') LIKE '%SOP6604TPNR%'
    OR (value->'config.mainCards'->>'hy') LIKE '%SOP6604TPNR%'
  );
