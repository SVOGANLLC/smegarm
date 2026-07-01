-- Client report fixes (2026-07): accessories grouping, HBAC11, matt kettles, D&G EN name

UPDATE public.products
SET model_group = 'HBAC11'
WHERE sku ~* '^HBAC11';

UPDATE public.products
SET model_group = 'KLF03-MATT'
WHERE sku ~* '^KLF03.*MEU$';

UPDATE public.products
SET model_group = 'KLF03-GLOSS'
WHERE sku ~* '^KLF03' AND sku !~* 'MEU$';

UPDATE public.collections
SET name_en = 'Refrigerator of Art'
WHERE slug = 'dolce-gabbana';
