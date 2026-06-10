
-- 1) Normalize Russian colour values into canonical English ones
UPDATE public.products SET colour = CASE colour
  WHEN 'Нержавеющая сталь' THEN 'Stainless steel'
  WHEN 'Черный' THEN 'Black'
  WHEN 'Чёрный' THEN 'Black'
  WHEN 'Белый' THEN 'White'
  WHEN 'Кремовый' THEN 'Cream'
  WHEN 'Антрацит' THEN 'Anthracite'
  WHEN 'Красный' THEN 'Red'
  WHEN 'Матовый черный' THEN 'Matt Black'
  WHEN 'Матовый чёрный' THEN 'Matt Black'
  WHEN 'Декорированный / Специальный' THEN 'Decorated / Special'
  WHEN 'Декорированный / Особый' THEN 'Decorated / Special'
  WHEN 'Серый Нептун' THEN 'Neptune Grey'
  WHEN 'Нептун серый' THEN 'Neptune Grey'
  WHEN 'Пастельно-голубой' THEN 'Pastel blue'
  WHEN 'Пастельно-зеленый' THEN 'Pastel green'
  WHEN 'Изумрудно-зеленый' THEN 'Emerald Green'
  WHEN 'Изумрудный зеленый' THEN 'Emerald Green'
  WHEN 'Желтый' THEN 'Yellow'
  WHEN 'Оранжевый' THEN 'Orange'
  WHEN 'Розовый' THEN 'Pink'
  WHEN 'Бирюзовый' THEN 'Turquese'
  WHEN 'Алюминий' THEN 'Silver'
  WHEN 'Дуб' THEN 'Oak'
  WHEN 'Оливково-зеленый' THEN 'Olive green'
  WHEN 'Оливковый зеленый' THEN 'Olive green'
  ELSE colour
END
WHERE colour IN (
  'Нержавеющая сталь','Черный','Чёрный','Белый','Кремовый','Антрацит','Красный',
  'Матовый черный','Матовый чёрный','Декорированный / Специальный','Декорированный / Особый',
  'Серый Нептун','Нептун серый','Пастельно-голубой','Пастельно-зеленый',
  'Изумрудно-зеленый','Изумрудный зеленый','Желтый','Оранжевый','Розовый',
  'Бирюзовый','Алюминий','Дуб','Оливково-зеленый','Оливковый зеленый'
);

-- 2) Add missing swatches (idempotent)
INSERT INTO public.color_swatches (colour, hex, sort_order) VALUES
  ('Oats', '#d8c9a3', 100),
  ('Steel', '#9a9a9a', 100),
  ('Matt White', '#efeee9', 100),
  ('Dove Gray', '#9c9890', 100),
  ('Old Brass', '#9a7b3a', 100),
  ('Nickel', '#b3b6b8', 100),
  ('Sea Salt Green', '#9bb8a6', 100),
  ('Stainless steel/Black', '#6e6e6e', 100),
  ('Stainless Steel and Glass', '#b8b8b8', 100),
  ('Black with matt black frame', '#1a1a1a', 100),
  ('Black with stainless steel effect frame', '#2a2a2a', 100),
  ('Chrome and black matt', '#7a7a7a', 100)
ON CONFLICT (colour) DO NOTHING;
