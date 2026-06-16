-- One-time manual translation of product categories and colours (EN -> RU base, EN copy -> *_en, HY -> *_hy).
-- Only touches untranslated rows (name_en IS NULL); matching is on the English source value,
-- so already-translated (Russian) rows are left untouched.
BEGIN;

-- Preserve the English source into *_en before overwriting the base column with Russian.
UPDATE products SET category_en = category WHERE name_en IS NULL AND category_en IS NULL AND category IS NOT NULL;
UPDATE products SET colour_en   = colour   WHERE name_en IS NULL AND colour_en   IS NULL AND colour   IS NOT NULL;

-- Categories
UPDATE products p SET category = m.ru, category_hy = m.hy
FROM (VALUES
  ('Accessories','Аксессуары','Պարագաներ'),
  ('Blast chillers','Шкафы шоковой заморозки','Շոկային սառեցման պահարաններ'),
  ('Blenders','Блендеры','Բլենդերներ'),
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
  ('Taps','Смесители','Ծորակներ'),
  ('Toasters','Тостеры','Տոստերներ'),
  ('Tumble dryer','Сушильная машина','Չորացման մեքենա'),
  ('Washer dryer','Стирально-сушильная машина','Լվացք-չորացման մեքենա'),
  ('Washing Machine','Стиральная машина','Լվացքի մեքենա'),
  ('Water bottles','Бутылки для воды','Ջրի շշեր'),
  ('Wine coolers','Винные холодильники','Գինու սառնարաններ')
) AS m(en, ru, hy)
WHERE p.name_en IS NULL AND p.category = m.en;

-- Colours
UPDATE products p SET colour = m.ru, colour_hy = m.hy
FROM (VALUES
  ('Anthracite','Антрацит','Անտրասիտ'),
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
  ('Grey','Серый','Մոխրագույն'),
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
  ('Turquese','Бирюзовый','Փիրուզագույն'),
  ('White','Белый','Սպիտակ'),
  ('Yellow','Желтый','Դեղին')
) AS m(en, ru, hy)
WHERE p.name_en IS NULL AND p.colour = m.en;

COMMIT;
