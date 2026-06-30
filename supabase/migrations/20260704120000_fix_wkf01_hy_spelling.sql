-- WKF01 Armenian: «Թեյնիկ սուլիչով» (not genitive «Թեյնիկի»)

UPDATE public.products
SET name_hy = regexp_replace(name_hy, '^Թեյնիկի սուլիչով', 'Թեյնիկ սուլիչով')
WHERE sku ILIKE 'WKF01%'
  AND name_hy ~ '^Թեյնիկի սուլիչով';

UPDATE public.site_content
SET value = replace(value::text, 'Թեյնիկի սուլիչով', 'Թեյնիկ սուլիչով')::jsonb,
    updated_at = now()
WHERE key = 'categories'
  AND value::text LIKE '%Թեյնիկի սուլիչով%';
