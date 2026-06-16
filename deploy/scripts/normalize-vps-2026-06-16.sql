-- Нормализация категорий и цветов на VPS (16.06.2026)
-- Повторяет правки, сделанные в Lovable напрямую в его облачной БД.
-- Категории: заполняем category_en / category_hy каноном (фильтр в каталоге
--   объединяет по category_en, фильтрует по «сырым» значениям — поэтому сам
--   столбец category НЕ трогаем).
-- Цвета: фасет считает по «сырому» colour, поэтому переписываем colour в
--   английский канон + colour_en (триггер пересчитает model_group).
BEGIN;

-- 0) Резервные копии (одноразовые снапшоты на случай отката)
CREATE TABLE IF NOT EXISTS products_bak_20260616 AS TABLE public.products;
CREATE TABLE IF NOT EXISTS color_swatches_bak_20260616 AS TABLE public.color_swatches;

-- 1) Недостающие свотчи
INSERT INTO public.color_swatches (colour, hex, sort_order) VALUES
  ('Turquoise', '#3fb5b5', 80),
  ('Beige', '#d8c2a0', 100),
  ('Grey blue', '#7d8a99', 100)
ON CONFLICT (colour) DO NOTHING;

-- 2) Канонизация цветов (RU/опечатки/дубли → английский канон)
WITH colour_map(src, dst) AS (VALUES
  ('Черный','Black'),
  ('Чёрный','Black'),
  ('Нержавеющая сталь','Stainless steel'),
  ('Под нержавеющую сталь','Stainless steel'),
  ('Цвет нержавеющей стали','Stainless steel'),
  ('Цвет «нержавеющая сталь»','Stainless steel'),
  ('Цвет «Нержавеющая сталь»','Stainless steel'),
  ('Белый','White'),
  ('Декорированный / Специальный','Decorated / Special'),
  ('Декорированный/Специальный','Decorated / Special'),
  ('Декорированный / Специальный цвет','Decorated / Special'),
  ('Отдекорированный / Специальный','Decorated / Special'),
  ('Кремовый','Cream'),
  ('Серебристый','Silver'),
  ('Серебро','Silver'),
  ('Красный','Red'),
  ('Матовый черный','Matt Black'),
  ('Матовый белый','Matt White'),
  ('Антрацит','Anthracite'),
  ('Серый «Нептун»','Neptune Grey'),
  ('Серый Нептун','Neptune Grey'),
  ('Пастельный голубой','Pastel blue'),
  ('Пастельно-голубой','Pastel blue'),
  ('Пастельный синий','Pastel blue'),
  ('Пастельно-синий','Pastel blue'),
  ('Нежно-пастельный','Pastel blue'),
  ('Розовый','Pink'),
  ('Хром','Chrome'),
  ('Пастельный зеленый','Pastel green'),
  ('Пастельно-зеленый','Pastel green'),
  ('Нежно-зеленый','Pastel green'),
  ('Изумрудно-зеленый','Emerald Green'),
  ('Цемент / Бетон','Cement / Concrete'),
  ('Грифельно-серый','Slate Grey'),
  ('Оранжевый','Orange'),
  ('Латунь','Brass'),
  ('Состаренная латунь','Old Brass'),
  ('Овсяный','Oats'),
  ('Овес','Oats'),
  ('Темный инокс','Dark Inox'),
  ('Под темный инокс','Dark Inox'),
  ('Темно-серый под нержавеющую сталь','Dark Grey Inox Look'),
  ('Медь','Copper'),
  ('Серый','Grey'),
  ('Серо-голубой','Grey blue'),
  ('Серо-коричневый','Taupe'),
  ('Грозовой синий','Storm Blue'),
  ('Черный с матовой черной рамкой','Black with matt black frame'),
  ('Под мрамор','Marble look'),
  ('Черный с рамкой под нержавеющую сталь','Black with stainless steel effect frame'),
  ('Черный с эффектом Inox','Black with stainless steel effect frame'),
  ('Нержавеющая сталь и стекло','Stainless Steel and Glass'),
  ('Нержавеющая сталь/черный','Stainless steel/Black'),
  ('Сталь','Steel'),
  ('Лунный свет','Moonlight'),
  ('Желтый','Yellow'),
  ('Синий','Blue'),
  ('Темно-синий','Navy Blue'),
  ('Лаймовый зеленый','Lime green'),
  ('Шампань','Champagne'),
  ('Никель','Nickel'),
  ('Оливковый','Olive green'),
  ('Бирюзовый','Turquoise'),
  ('Turquese','Turquoise'),
  ('Бежевый','Beige'),
  ('Зеленый «морская соль»','Sea Salt Green'),
  ('Ржаво-оранжевый','Rust'),
  ('Зеленый','Green'),
  ('Рубиново-красный','Ruby Red'),
  ('Хром и матовый черный','Chrome and black matt')
)
UPDATE public.products p
SET colour = m.dst, colour_en = m.dst
FROM colour_map m
WHERE p.colour = m.src;

-- Для уже английских значений выставим colour_en, если пуст
UPDATE public.products
SET colour_en = colour
WHERE colour IS NOT NULL AND (colour_en IS NULL OR colour_en = '');

-- Удаляем дубль-опечатку свотча Turquese (после переноса товаров на Turquoise)
DELETE FROM public.color_swatches WHERE colour = 'Turquese';

-- 3) Канонизация категорий: заполняем category_en
WITH cat_map(src, en) AS (VALUES
  ('Автоматические кофемашины','Espresso coffee machines'),
  ('Автоматические кофемашины эспрессо','Espresso coffee machines'),
  ('Автоматические эспрессо-кофемашины','Espresso coffee machines'),
  ('Кофемашины эспрессо','Espresso coffee machines'),
  ('Рожковые кофемашины','Espresso coffee machines'),
  ('Встраиваемые кофемашины','Espresso coffee machines'),
  ('Эспрессо кофемашины','Espresso coffee machines'),
  ('Эспрессо-кофемашины','Espresso coffee machines'),
  ('Аксессуары','Accessories'),
  ('Блендеры','Blenders'),
  ('Погружные блендеры','Hand blenders'),
  ('Бутылки для воды','Water bottles'),
  ('Варочные панели','Hobs'),
  ('Варочные поверхности','Hobs'),
  ('Переносные индукционные плиты','Hobs'),
  ('Винные холодильники','Wine coolers'),
  ('Винные шкафы','Wine coolers'),
  ('Вспениватели молока','Milk frothers'),
  ('Встраиваемые ящики','Built-in drawers'),
  ('Вытяжки','Hoods'),
  ('Духовой шкаф','Ovens'),
  ('Кофемолки','Coffee grinders'),
  ('Кухонная утварь','Cookware'),
  ('Посуда','Cookware'),
  ('Посуда для приготовления','Cookware'),
  ('Кухонные весы','Kitchen scales'),
  ('Кухонные плиты','Cookers'),
  ('Плиты','Cookers'),
  ('Микроволновые печи','Microwave ovens'),
  ('Мойки','Sinks'),
  ('Морозильники','Freezers'),
  ('Морозильные камеры','Freezers'),
  ('Набор ножей с подставкой','Knife sets'),
  ('Настольные духовки и микроволновые печи','Tabletop ovens'),
  ('Настольные печи и микроволновые печи','Tabletop ovens'),
  ('Освещение','Lighting'),
  ('Планетарные миксеры','Stand mixers'),
  ('Ручные миксеры','Hand mixers'),
  ('Посудомоечные машины','Dishwashers'),
  ('Сифоны для газирования','Soda makers'),
  ('Смесители','Taps'),
  ('Соковыжималки для цитрусовых','Citrus juicers'),
  ('Стиральная машина','Washing Machine'),
  ('Стирально-сушильная машина','Washer dryer'),
  ('Сушильная машина','Tumble dryer'),
  ('Тостеры','Toasters'),
  ('Холодильники','Refrigerators'),
  ('Чайники','Kettles'),
  ('Шкафы шоковой заморозки','Blast chillers'),
  ('Электрические барбекю','Electric barbecues'),
  ('Электрические грили','Electric barbecues')
)
UPDATE public.products p
SET category_en = m.en
FROM cat_map m
WHERE p.category = m.src;

-- Для уже английских категорий выставим category_en = category, если пуст
UPDATE public.products
SET category_en = category
WHERE category IS NOT NULL AND (category_en IS NULL OR category_en = '');

-- 4) Заполняем category_hy по канону (en → hy)
WITH hy_map(en, hy) AS (VALUES
  ('Refrigerators','Սառնարաններ'),
  ('Hobs','Գազօջախներ և սալօջախներ'),
  ('Accessories','Աքսեսուարներ'),
  ('Hoods','Օդաքարշներ'),
  ('Ovens','Վառարաններ'),
  ('Sinks','Լվացարաններ'),
  ('Dishwashers','Սպասք լվացող մեքենաներ'),
  ('Cookers','Խոհանոցային վառարաններ'),
  ('Taps','Ծորակներ'),
  ('Kettles','Թեյնիկներ'),
  ('Espresso coffee machines','Սուրճի մեքենաներ'),
  ('Toasters','Տոստերներ'),
  ('Microwave ovens','Միկրոալիքային վառարաններ'),
  ('Cookware','Խոհանոցային սպասք'),
  ('Milk frothers','Կաթի փրփրեցուցիչներ'),
  ('Tumble dryer','Չորանոցներ'),
  ('Stand mixers','Միքսերներ'),
  ('Blenders','Բլենդերներ'),
  ('Wine coolers','Գինու պահարաններ'),
  ('Water bottles','Ջրի շշեր'),
  ('Coffee grinders','Սրճաղացներ'),
  ('Built-in drawers','Ներկառուցվող դարակներ'),
  ('Hand blenders','Ձեռքի բլենդերներ'),
  ('Citrus juicers','Ցիտրուսի հյութահան'),
  ('Freezers','Սառցարաններ'),
  ('Tabletop ovens','Սեղանադիր վառարաններ'),
  ('Soda makers','Գազավորման սարքեր'),
  ('Lighting','Լուսավորություն'),
  ('Knife sets','Դանակների հավաքածուներ'),
  ('Washer dryer','Լվացք-չորանոց մեքենաներ'),
  ('Washing Machine','Լվացքի մեքենաներ'),
  ('Hand mixers','Ձեռքի միքսերներ'),
  ('Electric barbecues','Էլեկտրական բարբեքյուներ'),
  ('Blast chillers','Արագ սառեցուցիչներ'),
  ('Kitchen scales','Խոհանոցային կշեռքներ')
)
UPDATE public.products p
SET category_hy = m.hy
FROM hy_map m
WHERE p.category_en = m.en AND (p.category_hy IS NULL OR p.category_hy = '');

COMMIT;
