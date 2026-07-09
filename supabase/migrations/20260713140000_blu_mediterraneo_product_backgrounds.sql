-- Blu Mediterraneo product pages: always use the blue D&G tile background.
UPDATE public.products
SET theme_key = 'dg_blu_mediterraneo'
WHERE upper(sku) IN (
  'FAB28RDGME6',
  'FAB5RDGME6',
  'KT90DGME',
  'TR90DGME9',
  'MFF01DGBEU',
  'ECF02DGBEU',
  'CJF01DGBEU',
  'CGF01DGBEU',
  'TSF01DGBEU',
  'KLF03DGBEU'
);
