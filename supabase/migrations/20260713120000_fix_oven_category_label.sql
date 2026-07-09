-- Homepage oven card had categoryKey "Ovens" but labelKey for hobs.
UPDATE public.site_content
SET value = jsonb_set(
  value,
  '{config.mainCards}',
  jsonb_build_object(
    'ru', replace(value->'config.mainCards'->>'ru', '"categoryKey": "Ovens", "labelKey": "section.categories.hobs"', '"categoryKey": "Ovens", "labelKey": "section.categories.ovens"'),
    'en', replace(value->'config.mainCards'->>'en', '"categoryKey": "Ovens", "labelKey": "section.categories.hobs"', '"categoryKey": "Ovens", "labelKey": "section.categories.ovens"'),
    'hy', replace(value->'config.mainCards'->>'hy', '"categoryKey": "Ovens", "labelKey": "section.categories.hobs"', '"categoryKey": "Ovens", "labelKey": "section.categories.ovens"')
  )
)
WHERE key = 'categories'
  AND (
    (value->'config.mainCards'->>'ru') LIKE '%"categoryKey": "Ovens", "labelKey": "section.categories.hobs"%'
    OR (value->'config.mainCards'->>'en') LIKE '%"categoryKey": "Ovens", "labelKey": "section.categories.hobs"%'
    OR (value->'config.mainCards'->>'hy') LIKE '%"categoryKey": "Ovens", "labelKey": "section.categories.hobs"%'
  );
