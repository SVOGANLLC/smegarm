-- Phase 1: copy English sources + dictionary fills (categories, colours, swatches, themes).
-- Safe to re-run: only fills NULL / empty fields.
BEGIN;

-- English source columns
UPDATE products
SET description_en = description
WHERE (description_en IS NULL OR description_en = '')
  AND description IS NOT NULL AND description <> '';

UPDATE products
SET specs_en = specs
WHERE specs_en IS NULL
  AND specs IS NOT NULL AND specs <> '{}'::jsonb;

UPDATE products
SET category_en = category
WHERE (category_en IS NULL OR category_en = '')
  AND category IS NOT NULL AND category <> '';

UPDATE products
SET colour_en = colour
WHERE (colour_en IS NULL OR colour_en = '')
  AND colour IS NOT NULL AND colour <> '';

-- Categories (canonical EN in category column)
UPDATE products p SET category = m.ru, category_hy = m.hy
FROM (VALUES
  ('Accessories','Аксессуары','Պարագաներ'),
  ('Blast chillers','Шкафы шоковой заморозки','Շոկային սառեցման պահարաններ'),
  ('Blenders','Блендеры','Բլենդերներ'),
  ('Built-in drawers','Встраиваемые ящики','Ներկառուցվող դարակներ'),
  ('Citrus juicers','Соковыжималки для цитрусовых','Ցիտրուսի հյութահան'),
  ('Coffee grinders','Кофемолки','Սրճաղացներ'),
  ('Cookers','Кухонные плиты','Խոհանոցային սալօջախներ'),
  ('Cookware','Посуда для приготовления','Խոհանոցային սպասք'),
  ('Countertop ovens and microwaves','Настольные духовки и микроволновые печи','Սեղանի ջեռոցներ և միկրոալիքային վառարաններ'),
  ('Dishwashers','Посудомоечные машины','Ամանլվացքի մեքենաներ'),
  ('Electric barbecues','Электрические барбекю','Էլեկտրական բարբեքյուներ'),
  ('Espresso coffee machines','Эспрессо-кофемашины','Էսպրեսո սրճեփ մեքենաներ'),
  ('Freezers','Морозильники','Սառցարաններ'),
  ('Hand blenders','Погружные блендеры','Ձեռքի բլենդերներ'),
  ('Hand mixers','Ручные миксеры','Ձեռքի միքսերներ'),
  ('Hobs','Варочные панели','Կերակրասալիկներ'),
  ('Hoods','Вытяжки','Օդաքաշներ'),
  ('Kettles','Чайники','Թեյնիկներ'),
  ('Kitchen scales','Кухонные весы','Խոհանոցային կշեռքներ'),
  ('Knife sets','Набор ножей с подставкой','Դանակների հավաքածու'),
  ('Knives block set','Набор ножей с подставкой','Դանակների հավաքածու կանգնակով'),
  ('Lighting','Освещение','Լուսավորություն'),
  ('Microwave ovens','Микроволновые печи','Միկրոալիքային վառարաններ'),
  ('Milk frothers','Вспениватели молока','Կաթի փրփրացուցիչներ'),
  ('Oven','Духовой шкаф','Ջեռոց'),
  ('Portable induction cookers','Переносные индукционные плиты','Շարժական ինդուկցիոն սալիկներ'),
  ('Refrigerators','Холодильники','Սառնարաններ'),
  ('Sinks','Мойки','Լվացարաններ'),
  ('Soda makers','Сифоны для газирования','Գազավորման սարքեր'),
  ('Stand mixers','Планетарные миксеры','Պլանետար միքսերներ'),
  ('Tabletop ovens','Настольные печи','Սեղանադիր վառարաններ'),
  ('Taps','Смесители','Ծորակներ'),
  ('Toasters','Тостеры','Տոստերներ'),
  ('Tumble dryer','Сушильная машина','Չորացման մեքենա'),
  ('Washer dryer','Стирально-сушильная машина','Լվացք-չորացման մեքենա'),
  ('Washing Machine','Стиральная машина','Լվացքի մեքենա'),
  ('Water bottles','Бутылки для воды','Ջրի շշեր'),
  ('Wine coolers','Винные холодильники','Գինու սառնարաններ')
) AS m(en, ru, hy)
WHERE p.category = m.en
  AND ((p.category_hy IS NULL OR p.category_hy = '') OR p.category = m.en AND p.category !~ '[А-Яа-яЁё]');

-- Colours
UPDATE products p SET colour = m.ru, colour_hy = m.hy
FROM (VALUES
  ('Anthracite','Антрацит','Անտրասիտ'),
  ('Aluminium','Алюминий','Ալյումին'),
  ('Beige','Бежевый','Բեժ'),
  ('Black','Черный','Սև'),
  ('Black with matt black frame','Черный с матовой черной рамкой','Սև՝ մատ սև շրջանակով'),
  ('Black with stainless steel effect frame','Черный с рамкой под нержавеющую сталь','Սև՝ չժանգոտվող պողպատի էֆեկտով շրջանակով'),
  ('Blue','Синий','Կապույտ'),
  ('Brass','Латунь','Արույր'),
  ('Cement / Concrete','Цемент / Бетон','Ցեմենտ / Բետոն'),
  ('Champagne','Шампань','Շամպայն'),
  ('Chrome','Хром','Քրոմ'),
  ('Chrome and black matt','Хром и матовый черный','Քրոմ և մատ սև'),
  ('Copper','Медь','Պղինձ'),
  ('Cream','Кремовый','Կրեմագույն'),
  ('Dark Grey Inox Look','Темно-серый под нержавеющую сталь','Մուգ մոխրագույն՝ ինոքսի տեսքով'),
  ('Dark Inox','Темный инокс','Մուգ ինոքս'),
  ('Dark Inox Look','Под темный инокс','Մուգ ինոքսի տեսքով'),
  ('Decorated / Special','Декорированный / Специальный','Դեկորացված / Հատուկ'),
  ('Dove Gray','Серо-голубой','Աղավնագույն մոխրագույն'),
  ('Emerald Green','Изумрудно-зеленый','Զմրուխտ կանաչ'),
  ('Green','Зеленый','Կանաչ'),
  ('Grey','Серый','Մոխրագույն'),
  ('Grey blue','Серо-голубой','Մոխրագույն-կապույտ'),
  ('Inox Look','Под нержавеющую сталь','Ինոքսի տեսքով'),
  ('Lime green','Лаймовый зеленый','Լայմ կանաչ'),
  ('Marble look','Под мрамор','Մարմարի տեսքով'),
  ('Matt Black','Матовый черный','Մատ սև'),
  ('Matt White','Матовый белый','Մատ սպիտակ'),
  ('Moonlight','Лунный свет','Լուսնի լույս'),
  ('Navy Blue','Темно-синий','Մուգ կապույտ'),
  ('Neptune Grey','Серый «Нептун»','Նեպտուն մոխրագույն'),
  ('Nickel','Никель','Նիկել'),
  ('Oak','Дуб','Կաղնի'),
  ('Oats','Овсяный','Վարսակագույն'),
  ('Old Brass','Состаренная латунь','Հին արույր'),
  ('Olive green','Оливковый','Ձիթապտղի կանաչ'),
  ('Orange','Оранжевый','Նարնջագույն'),
  ('Pastel blue','Пастельный голубой','Պաստել երկնագույն'),
  ('Pastel green','Пастельный зеленый','Պաստել կանաչ'),
  ('Perfectly Pale','Нежно-пастельный','Նուրբ գունատ'),
  ('Pink','Розовый','Վարդագույն'),
  ('Red','Красный','Կարմիր'),
  ('Ruby Red','Рубиново-красный','Սուտակ կարմիր'),
  ('Rust','Ржаво-оранжевый','Ժանգագույն'),
  ('Sea Salt Green','Зеленый «морская соль»','Ծովի աղի կանաչ'),
  ('Silver','Серебристый','Արծաթագույն'),
  ('Slate Grey','Грифельно-серый','Շիֆերի մոխրագույն'),
  ('Stainless steel','Нержавеющая сталь','Չժանգոտվող պողպատ'),
  ('Stainless Steel and Glass','Нержавеющая сталь и стекло','Չժանգոտվող պողպատ և ապակի'),
  ('Stainless steel/Black','Нержавеющая сталь/черный','Չժանգոտվող պողպատ/սև'),
  ('Steel','Сталь','Պողպատ'),
  ('Storm Blue','Грозовой синий','Փոթորկային կապույտ'),
  ('Taupe','Серо-коричневый','Մոխրագորշ'),
  ('Turquoise','Бирюзовый','Փիրուզագույն'),
  ('Turquese','Бирюзовый','Փիրուզագույն'),
  ('White','Белый','Սպիտակ'),
  ('Yellow','Желтый','Դեղին')
) AS m(en, ru, hy)
WHERE p.colour = m.en
  AND (p.colour_hy IS NULL OR p.colour_hy = '' OR p.colour = m.en);

-- Color swatches
UPDATE color_swatches cs SET name_en = m.en, name_hy = m.hy
FROM (VALUES
  ('Anthracite','Anthracite','Անտրասիտ'),
  ('Aluminium','Aluminium','Ալյումին'),
  ('Beige','Beige','Բեժ'),
  ('Black','Black','Սև'),
  ('Blue','Blue','Կապույտ'),
  ('Champagne','Champagne','Շամպայն'),
  ('Chrome','Chrome','Քրոմ'),
  ('Copper','Copper','Պղինձ'),
  ('Cream','Cream','Կրեմագույն'),
  ('Emerald Green','Emerald Green','Զմրուխտ կանաչ'),
  ('Green','Green','Կանաչ'),
  ('Grey','Grey','Մոխրագույն'),
  ('Grey blue','Grey blue','Մոխրագույն-կապույտ'),
  ('Lime green','Lime green','Լայմ կանաչ'),
  ('Matt Black','Matt Black','Մատ սև'),
  ('Matt White','Matt White','Մատ սպիտակ'),
  ('Moonlight','Moonlight','Լուսնի լույս'),
  ('Navy Blue','Navy Blue','Մուգ կապույտ'),
  ('Neptune Grey','Neptune Grey','Նեպտուն մոխրագույն'),
  ('Olive green','Olive green','Ձիթապտղի կանաչ'),
  ('Orange','Orange','Նարնջագույն'),
  ('Pastel blue','Pastel blue','Պաստել երկնագույն'),
  ('Pastel green','Pastel green','Պաստել կանաչ'),
  ('Pink','Pink','Վարդագույն'),
  ('Red','Red','Կարմիր'),
  ('Ruby Red','Ruby Red','Սուտակ կարմիր'),
  ('Rust','Rust','Ժանգագույն'),
  ('Sea Salt Green','Sea Salt Green','Ծովի աղի կանաչ'),
  ('Silver','Silver','Արծաթագույն'),
  ('Stainless steel','Stainless steel','Չժանգոտվող պողպատ'),
  ('Steel','Steel','Պողպատ'),
  ('Storm Blue','Storm Blue','Փոթորկային կապույտ'),
  ('Taupe','Taupe','Մոխրագորշ'),
  ('Turquoise','Turquoise','Փիրուզագույն'),
  ('White','White','Սպիտակ'),
  ('Yellow','Yellow','Դեղին')
) AS m(colour, en, hy)
WHERE cs.colour = m.colour
  AND (cs.name_hy IS NULL OR cs.name_hy = '');

-- Themes (brand collab names stay as-is in all langs)
UPDATE themes SET
  name_en = COALESCE(name_en, name),
  name_hy = COALESCE(NULLIF(name_hy, ''), name_en, name)
WHERE name_hy IS NULL OR name_hy = '';

COMMIT;
