-- Align D&G collection Russian name with EN «Refrigerator of Art»
UPDATE public.collections
SET
  name = 'Холодильник искусства',
  name_hy = 'Refrigerator of Art'
WHERE slug = 'dolce-gabbana';
