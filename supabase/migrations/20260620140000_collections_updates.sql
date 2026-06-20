-- Collections content updates: swap covers, Cortina, FAB rename, Universale section, Coloniale placeholder

UPDATE public.collections SET cover_image = '/brand/collections/dolce-gabbana-sicily.jpg' WHERE slug = 'classica';
UPDATE public.collections SET cover_image = '/brand/collections/classica.jpg' WHERE slug = 'dolce-gabbana-sicily';
UPDATE public.collections SET cover_image = '/brand/smeg-logo.png' WHERE slug = 'coloniale';

UPDATE public.collections SET
  name = '50''s Style',
  name_en = '50''s Style',
  name_hy = '50-ականների ոճ',
  description = 'Культовые ретро-холодильники с ручной отделкой изгибов.',
  description_en = 'Iconic retro fridges with hand-finished curves.',
  description_hy = 'Ձեռքով հղկված կորերով դասական ռետրո սառնարաններ։'
WHERE slug = 'fab-50s';

UPDATE public.collections SET section = 'timeless', sort_weight = 86 WHERE slug = 'universale';

INSERT INTO public.collections (slug, name, description, is_published, sort_weight, section, cover_image, name_en, name_hy, description_en, description_hy)
VALUES
  ('cortina', 'Cortina', 'Горная элегантность встроенной техники.', true, 93, 'design', '/brand/smeg-logo.png',
   'Cortina', 'Cortina', 'Alpine elegance in built-in appliances.', 'Լեռնային նրբագեղություն ներկառուցվող տեխնիկայում։')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_published = EXCLUDED.is_published,
  sort_weight = EXCLUDED.sort_weight,
  section = EXCLUDED.section,
  cover_image = EXCLUDED.cover_image,
  name_en = EXCLUDED.name_en,
  name_hy = EXCLUDED.name_hy,
  description_en = EXCLUDED.description_en,
  description_hy = EXCLUDED.description_hy;

INSERT INTO public.collection_products (collection_id, product_sku, sort_weight)
SELECT c.id, p.sku, 0
FROM public.collections c
JOIN public.products p ON p.is_published AND p.aesthetic = 'Cortina'
WHERE c.slug = 'cortina'
ON CONFLICT (collection_id, product_sku) DO NOTHING;
