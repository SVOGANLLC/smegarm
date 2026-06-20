
-- Collection sections + 18 aesthetic lines with cover images and product mapping
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS section text;

INSERT INTO public.collections (slug, name, description, is_published, sort_weight, section, cover_image, name_en, name_hy, description_en, description_hy)
VALUES
  ('isola', 'Isola', 'Островная кухня с архитектурной чистотой линий.', true, 100, 'design', '/brand/collections/isola.jpg',
   'Isola', 'Isola', 'Island kitchens with architectural purity.', 'Կղզի խոհանոցներ՝ ճարտարապետական մաքրությամբ։'),
  ('musa', 'Musa', 'Сдержанная элегантность встроенной техники.', true, 99, 'design', '/brand/collections/musa.jpg',
   'Musa', 'Musa', 'Understated elegance in built-in appliances.', 'Պարզ և նրբագեղ ներկառուցվող տեխնիկա։'),
  ('piano-design', 'Piano Design', 'Дизайн от Daniel Libeskind — скульптурная форма.', true, 94, 'design', '/brand/collections/piano-design.jpg',
   'Piano Design', 'Piano Design', 'Design by Daniel Libeskind — sculptural form.', 'Daniel Libeskind-ի դիզայն — քանդակային ձև։'),
  ('blu-mediterraneo', 'Blu Mediterraneo', 'Smeg × Dolce&Gabbana — сине-белая мажорика.', true, 79, 'special', '/brand/collections/blu-mediterraneo.jpg',
   'Blu Mediterraneo', 'Blu Mediterraneo', 'Smeg × Dolce&Gabbana — blue and white majolica.', 'Smeg × Dolce&Gabbana — կապույտ-սպիտակ մաժոլիկա։'),
  ('divina-cucina', 'Divina Cucina', 'Smeg × Dolce&Gabbana — орнаментальная кухня.', true, 77, 'special', '/brand/collections/divina-cucina.jpg',
   'Divina Cucina', 'Divina Cucina', 'Smeg × Dolce&Gabbana — ornamental kitchen art.', 'Smeg × Dolce&Gabbana — զարդարված խոհանոցային արվեստ։'),
  ('universale', 'Universale', 'Универсальные решения для любой кухни.', true, 72, 'special', '/brand/collections/universale.jpg',
   'Universale', 'Universale', 'Universal solutions for every kitchen.', 'Ունիվերսալ լուծումներ ցանկացած խոհանոցի համար։')
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

UPDATE public.collections SET section = 'design', sort_weight = 98, cover_image = '/brand/collections/dolce-stil-novo.jpg' WHERE slug = 'dolce-stil-novo';
UPDATE public.collections SET section = 'design', sort_weight = 97, cover_image = '/brand/collections/linea.jpg' WHERE slug = 'linea';
UPDATE public.collections SET section = 'design', sort_weight = 96, cover_image = '/brand/collections/classica.jpg' WHERE slug = 'classica';
UPDATE public.collections SET section = 'design', sort_weight = 95, cover_image = '/brand/collections/portofino.jpg' WHERE slug = 'portofino';

UPDATE public.collections SET section = 'timeless', sort_weight = 89, cover_image = '/brand/collections/fab-50s.jpg' WHERE slug = 'fab-50s';
UPDATE public.collections SET section = 'timeless', sort_weight = 88, cover_image = '/brand/collections/victoria.jpg' WHERE slug = 'victoria';
UPDATE public.collections SET section = 'timeless', sort_weight = 87, cover_image = '/brand/collections/coloniale.jpg' WHERE slug = 'coloniale';

UPDATE public.collections SET section = 'special', sort_weight = 78, cover_image = '/brand/collections/dolce-gabbana-sicily.jpg' WHERE slug = 'dolce-gabbana-sicily';
UPDATE public.collections SET section = 'special', sort_weight = 76, cover_image = '/brand/collections/dolce-gabbana.jpg' WHERE slug = 'dolce-gabbana';
UPDATE public.collections SET section = 'special', sort_weight = 75, cover_image = '/brand/collections/porsche.jpg' WHERE slug = 'porsche';
UPDATE public.collections SET section = 'special', sort_weight = 74, cover_image = '/brand/collections/coca-cola.jpg' WHERE slug = 'coca-cola';
UPDATE public.collections SET section = 'special', sort_weight = 73, cover_image = '/brand/collections/smeg500.jpg' WHERE slug = 'smeg500';

-- Hide empty special collections until products are imported
-- UPDATE public.collections SET is_published = false WHERE slug IN ('coca-cola', 'smeg500');

DELETE FROM public.collection_products;

WITH mapping AS (
  SELECT c.id AS collection_id, p.sku AS product_sku
  FROM public.collections c
  JOIN public.products p ON p.is_published
    AND (
      (c.slug = 'isola'               AND p.aesthetic = 'Isola')
      OR (c.slug = 'musa'             AND p.aesthetic = 'Musa')
      OR (c.slug = 'dolce-stil-novo'  AND p.aesthetic = 'Dolce Stil Novo')
      OR (c.slug = 'linea'            AND p.aesthetic = 'Linea')
      OR (c.slug = 'classica'         AND p.aesthetic = 'Classica')
      OR (c.slug = 'portofino'         AND p.aesthetic = 'Portofino')
      OR (c.slug = 'piano-design'     AND p.aesthetic = 'Piano Design')
      OR (c.slug = 'fab-50s'           AND p.aesthetic = '50''s Style')
      OR (c.slug = 'victoria'         AND p.aesthetic = 'Victoria')
      OR (c.slug = 'coloniale'        AND p.aesthetic = 'Coloniale')
      OR (c.slug = 'universale'       AND p.aesthetic = 'Universale')
      OR (c.slug = 'blu-mediterraneo' AND p.theme_key = 'dg_blu_mediterraneo')
      OR (c.slug = 'dolce-gabbana-sicily' AND p.theme_key = 'dg_sicily')
      OR (c.slug = 'divina-cucina'   AND p.theme_key = 'dg_divina_cucina')
      OR (c.slug = 'dolce-gabbana'    AND p.theme_key LIKE 'dg_%')
      OR (c.slug = 'coca-cola'        AND p.theme_key = 'coca_cola')
      OR (c.slug = 'smeg500'          AND p.theme_key = 'smeg500')
      OR (c.slug = 'porsche'          AND p.theme_key IN ('porsche','porsche_green','porsche_white','porsche_917'))
    )
)
INSERT INTO public.collection_products (collection_id, product_sku, sort_weight)
SELECT collection_id, product_sku, 0 FROM mapping
ON CONFLICT (collection_id, product_sku) DO NOTHING;
