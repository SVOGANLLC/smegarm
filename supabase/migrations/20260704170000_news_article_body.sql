-- Full article fields for Smeg-style news detail pages.

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS category_en text,
  ADD COLUMN IF NOT EXISTS category_hy text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS body_en text,
  ADD COLUMN IF NOT EXISTS body_hy text;

UPDATE public.news SET
  category = 'Корпоративные новости',
  category_en = 'Corporate',
  category_hy = 'Կորպորատիվ',
  body = E'Smeg представляет коллекцию Moonlight — спокойные матовые оттенки и фирменный силуэт 50''s Style для современной кухни.\n\nНовый матовый финиш подчёркивает свет и текстуру пространства, сохраняя узнаваемый характер бренда. Коллекция создана для тех, кто ценит сдержанную эстетику и качество итальянского дизайна.',
  body_en = E'Smeg introduces the Moonlight Collection — calm matt tones and the iconic 50''s Style silhouette for the modern kitchen.\n\nThe new matt finish plays with light and texture while keeping the brand''s unmistakable character. The collection is made for those who value understated aesthetics and Italian design quality.',
  body_hy = E'Smeg-ը ներկայացնում է Moonlight հավաքածուն՝ հանգիստ փայլատ երանգներ և 50''s Style սիլուետ ժամանակակից խոհանոցի համար։\n\nՆոր փայլատ ծածկույթը ընդգծում է լույսն ու հյուսվածքը՝ պահպանելով բրենդի ճանաչելի ոճը։'
WHERE slug = 'moonlight-collection';

UPDATE public.news SET
  category = 'Технологии',
  category_en = 'Technology',
  category_hy = 'Տեխնոլոգիա',
  body = E'Подключаемые приборы SmegConnect позволяют следить за готовкой и управлять техникой со смартфона — удобно и безопасно.\n\nЧерез приложение можно запускать программы, получать уведомления о статусе и поддерживать единый стандарт использования техники Smeg дома.',
  body_en = E'SmegConnect appliances let you monitor cooking and control devices from your phone — convenient and safe.\n\nThrough the app you can start programmes, receive status notifications and keep a consistent Smeg experience at home.',
  body_hy = E'SmegConnect սարքերը թույլ են տալիս հետևել պատրաստմանը և կառավարել տեխնիկան հեռախոսից՝ հարմար և անվտանգ։\n\nՀավելվածի միջոցով կարող եք գործարկել ծրագրեր և ստանալ ծանուցումներ սարքի կարգավիճակի մասին։'
WHERE slug = 'smegconnect';

UPDATE public.news SET
  category = 'Малая техника',
  category_en = 'Small appliances',
  category_hy = 'Փոքր տեխնիկա',
  body = E'Плотный молочный крем для капучино и латте — с фирменным дизайном Smeg и простым управлением.\n\nВспениватель молока дополняет линейку кофейной техники Smeg и помогает готовить напитки уровня кафе дома.',
  body_en = E'Dense milk foam for cappuccino and latte — with signature Smeg design and simple controls.\n\nThe milk frother completes Smeg''s coffee range and helps you prepare café-style drinks at home.',
  body_hy = E'Խիտ կաթնային փրփուր կապուչինոյի և լատեի համար՝ Smeg դիզայնով և պարզ կառավարմամբ։\n\nԿաթի փրփրացուցիչը լրացնում է Smeg սուրճի գիծը և օգնում է տանը պատրաստել սրճարանային մակարդակի ըմպելիքներ։'
WHERE slug = 'milk-frother';
