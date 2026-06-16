INSERT INTO public.collections (slug, name, description, is_published, sort_weight)
VALUES
  ('fab-50s', 'FAB · 50''s Style', 'Культовые ретро-холодильники с ручной отделкой изгибов.', true, 100),
  ('portofino', 'Portofino', 'Элегантность Ривьеры и профессиональное мастерство.', true, 90),
  ('linea', 'Linea', 'Архитектурный минимализм для современных кухонь.', true, 85),
  ('victoria', 'Victoria', 'Деревенский шарм, переосмысленный с итальянской точностью.', true, 80),
  ('coloniale', 'Coloniale', 'Вечная традиция в прочных материалах.', true, 75),
  ('dolce-stil-novo', 'Dolce Stil Novo', 'Чистые профессиональные линии с медными деталями.', true, 70),
  ('classica', 'Classica', 'Сдержанная классика для встраиваемых кухонь.', true, 65),
  ('dolce-gabbana', 'Smeg × Dolce & Gabbana', 'Сицилийская роспись вручную на премиальной технике.', true, 95)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.collections SET name_en='FAB · 50''s Style', name_hy='FAB · 50-ականների ոճ', description_en='Iconic retro fridges with hand-finished curves.', description_hy='Ձեռքով հղկված կորերով դասական ռետրո սառնարաններ։' WHERE slug='fab-50s';
UPDATE public.collections SET name_en='Portofino', name_hy='Portofino', description_en='Riviera elegance, professional craftsmanship.', description_hy='Ռիվիերայի նրբագեղություն և պրոֆեսիոնալ վարպետություն։' WHERE slug='portofino';
UPDATE public.collections SET name_en='Linea', name_hy='Linea', description_en='Architectural minimalism for modern kitchens.', description_hy='Ճարտարապետական մինիմալիզմ ժամանակակից խոհանոցների համար։' WHERE slug='linea';
UPDATE public.collections SET name_en='Victoria', name_hy='Victoria', description_en='Country charm, reinvented with Italian precision.', description_hy='Գյուղական հմայք՝ վերաիմաստավորված իտալական ճշգրտությամբ։' WHERE slug='victoria';
UPDATE public.collections SET name_en='Coloniale', name_hy='Coloniale', description_en='Timeless tradition in solid materials.', description_hy='Հավերժական ավանդույթ՝ ամուր նյութերում։' WHERE slug='coloniale';
UPDATE public.collections SET name_en='Dolce Stil Novo', name_hy='Dolce Stil Novo', description_en='Pure professional lines with copper details.', description_hy='Մաքուր պրոֆեսիոնալ գծեր՝ պղնձե դետալներով։' WHERE slug='dolce-stil-novo';
UPDATE public.collections SET name_en='Classica', name_hy='Classica', description_en='Restrained classics for built-in kitchens.', description_hy='Զուսպ դասականություն ներկառուցվող խոհանոցների համար։' WHERE slug='classica';
UPDATE public.collections SET name_en='Smeg × Dolce & Gabbana', name_hy='Smeg × Dolce & Gabbana', description_en='Hand-painted Sicilian art on premium appliances.', description_hy='Ձեռքով նկարված սիցիլիական արվեստ պրեմիում տեխնիկայի վրա։' WHERE slug='dolce-gabbana';
