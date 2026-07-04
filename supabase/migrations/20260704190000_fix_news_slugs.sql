-- Fix truncated news slug that broke article links.
UPDATE public.news
SET slug = 'compasso-doro-award-2025'
WHERE slug LIKE 'compasso-doro-international-award-2025%';
