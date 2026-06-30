# Smeg Armenia — платформа: сайт и админка

Полное описание публичного сайта **smeg.am**, панели управления **/admini**, данных в Supabase и ключевых бизнес-правил.  
Для краткой инструкции для сотрудников используйте раздел **Справка** в админке (`/admini/help`).

---

## Содержание

1. [Архитектура](#1-архитектура)
2. [Публичный сайт](#2-публичный-сайт)
3. [Админка](#3-админка)
4. [Роли и доступ](#4-роли-и-доступ)
5. [Товары (products)](#5-товары-products)
6. [Коллекции](#6-коллекции)
7. [Контент (CMS)](#7-контент-cms)
8. [Каталог и группировка](#8-каталог-и-группировка)
9. [Заказы и оплата](#9-заказы-и-оплата)
10. [Заявки](#10-заявки)
11. [Интернационализация](#11-интернационализация)
12. [База данных](#12-база-данных)
13. [Хранилище файлов](#13-хранилище-файлов)
14. [Фоновые процессы](#14-фоновые-процессы)
15. [Деплой и окружение](#15-деплой-и-окружение)
16. [Структура репозитория](#16-структура-репозитория)

---

## 1. Архитектура

| Слой | Технология |
|------|------------|
| Frontend + SSR | TanStack Start (React), TanStack Router |
| Стили | Tailwind CSS |
| Данные | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Серверные действия | TanStack Start server functions |
| Хостинг | Docker на VPS, nginx, SSL |

**Поток данных на сайте:** браузер → SSR/клиент React → Supabase (anon key + RLS) для чтения каталога и записи заказов/заявок.  
**Админка:** Supabase Auth → JWT → RLS policies с проверкой роли.

Ключевые провайдеры в `src/routes/__root.tsx`:

- `I18nProvider` — язык и строки (статика + CMS)
- `CartProvider` — корзина в памяти браузера
- React Query — кэш запросов

---

## 2. Публичный сайт

### Маршруты

| URL | Назначение |
|-----|------------|
| `/` | Главная: hero, избранное, витрины (бестселлеры / акции / новинки), коллекции, категории, преимущества, история бренда, дилер, партнёры |
| `/catalog` | Каталог с фильтрами, сортировкой, пагинацией, режимом выбора цвета модели |
| `/product/:sku` | Карточка товара (PDP) |
| `/collection/:slug` | Лендинг коллекции |
| `/sale` | Товары со скидкой / special offer |
| `/house-of-coffee` | Раздел «Дом кофе» |
| `/checkout` | Оформление заказа |
| `/order/:id` | Страница заказа / благодарность |
| `/payment/converse/return` | Возврат с оплаты ConverseBank |
| `/auth` | Вход сотрудников |

Якоря на главной: `#collections`, `#story`, `#contact` — прокрутка с повторными попытками (`src/lib/hash-scroll.ts`), секция `#collections` всегда в DOM при загрузке.

### Главная страница (блоки)

1. **Hero** — тексты из CMS (`site_content.hero`)
2. **Featured / Иконы Smeg** — SKU из CMS (`homepage` block) + флаг `is_featured` у товаров
3. **Marquee** — бегущая строка
4. **Showcase strips** — три полосы: бестселлеры (`is_bestseller`), акции (`is_special_offer`), новинки (`is_new`)
5. **Collections** — опубликованные коллекции, группы Design / Timeless / Special
6. **Categories** — карточки категорий из CMS + ссылки в каталог
7. **Benefits, Story, Dealer, Partners** — CMS + таблица `partners`

### Каталог (`/catalog`)

**Секции:** крупная техника (`large`), мелкая (`small`), аксессуары (`accessories`) — см. `src/lib/catalog-sections.ts`.

**Фильтры:** поиск, категория, цвет (swatches), эстетика, флаги (новинка, бестселлер, акция), в наличии, характеристики (spec filters).

**Сортировка:** цена ↑↓, новизна, случайный порядок (при повторном выборе «Случайно» seed меняется).

**Группировка по модели:** если включена в CMS, карточки с одинаковым `model_group` объединяются; клик открывает сетку цветов (`?model=&modelSkus=`). Настройки: какие секции группировать, какие категории исключить, подписи групп (`ModelGroupLabelsEditor`).

### Карточка товара

- Галерея, зум, переключатель цветов (`ColorSwitcher` — варианты с тем же `model_group`)
- Цена, старая цена, скидка, наличие (`stock_qty`, `lead_time_days`, `availability`)
- Добавление в корзину
- Локализованные характеристики (`specs`, `specs_en`, `specs_hy`)
- Тематическое оформление при `theme_key` (D&G, Porsche и т.д.)
- SEO + JSON-LD

### Корзина и checkout

- Корзина — клиентский state (`src/lib/cart.tsx`), drawer в шапке
- Checkout вызывает server function `createOrder` — цены и остатки **только из БД**, резерв `stock_reserved`
- Оплата: наличные или ConverseBank (редирект → return URL → polling статуса)

### Формы связи

- Блок дилера / footer — адрес, CTA
- Заявки пишутся в `inquiries` (имя, телефон, email, сообщение, опционально SKU)

---

## 3. Админка

**URL:** `/admini` (legacy `/admin/*` редиректится).  
**Вход:** `/auth` — email/password (и OAuth при настройке).

### Меню

| Раздел | Путь | Кто видит |
|--------|------|-----------|
| Обзор | `/admini` | все |
| Заказы | `/admini/orders` | все |
| Заявки | `/admini/inquiries` | все |
| Товары | `/admini/products` | admin (меню) |
| Коллекции | `/admini/collections` | admin (меню) |
| Контент | `/admini/content` | admin |
| Партнёры | `/admini/partners` | admin (меню) |
| Команда | `/admini/team` | admin |
| Уведомления | `/admini/notifications` | все |
| Инструменты | `/admini/tools` | admin |
| **Справка** | `/admini/help` | все |

Язык UI админки: HY / RU / EN (нижняя часть sidebar), словарь `src/lib/admin-i18n.ts`.

### Обзор

Счётчики: всего товаров, опубликовано, новые заявки, всего заявок.

### Заказы

- Список и канбан по статусам: `new`, `in_progress`, `confirmed`, `shipped`, `done`, `cancelled`
- Поиск, фильтр статуса, экспорт Excel
- Карточка заказа: контакты, доставка, оплата, позиции, смена статуса, внутренние заметки, история статусов
- ConverseBank: `payment_status`, `px_number`

### Заявки

Статусы: `new`, `in_progress`, `done`, `spam`.

### Товары — список

Поиск (RPC `search_products`), фильтры, быстрые переключатели флагов и публикации, создание нового SKU.

### Товары — карточка (`/admini/products/:sku`)

**Сохранение:** кнопка «Сохранить» в sidebar (единый submit формы).

| Зона | Поля |
|------|------|
| i18n | name/description RU, EN, HY; AI-перевод |
| Медиа | main_image, gallery (URL + upload в `product-media`) |
| SEO | seo_title, seo_description |
| Specs | specs RU/EN/HY, синхронизация EAN |
| Каталог | category, colour, aesthetic, family, EAN (RU/EN/HY где есть) |
| Коллекции | `ProductCollectionsEditor` — мгновенное сохранение, синхрон theme_key |
| Цены | price_amd, price_old, discount_percent |
| Склад | stock_qty, lead_time_days, превью availability |
| Флаги | is_published, is_bestseller, is_new, is_special_offer, is_featured |
| Действия | дублировать SKU, переименовать SKU |

При ошибке сохранения без изменения строки — toast с текстом (`assertRowUpdated`).

### Коллекции

- CRUD коллекций: name RU/EN/HY, slug (авто из RU), section, sort_weight, descriptions, cover, publish
- Товары в коллекции: поиск SKU, клик = добавить (без отдельного Save)
- Метка **авто** — членство из aesthetic/theme_key
- При ручном add/remove — обновление `theme_key` / `aesthetic` у товара (`src/lib/collection-auto-sync.ts`)

### Контент

Вкладки: **Главная**, **Дом кофе**, **Контакты**.

Данные в `site_content` (JSON на ключ блока) + `__styles__` для типографики.

Блок **categories** дополнительно содержит:

- карточки категорий на главной
- порядок категорий в сайдбаре каталога
- группировка по цвету
- подписи и фото групп моделей (`model_group`)

### Партнёры

Логотип, тексты RU/EN/HY, ссылка, порядок, публикация.

### Команда

Назначение ролей `user` | `manager` | `admin` в `user_roles`.

### Уведомления

Привязка `telegram_chat_id` в `profiles` к боту @smegarmbot.

### Инструменты

- Экспорт каталога XLSX
- Импорт XLSX с превью diff
- Массовое изменение цен/скидок
- Массовый AI-перевод

---

## 4. Роли и доступ

| Роль | Возможности |
|------|-------------|
| `admin` | Полный доступ, включая CMS, команду, инструменты |
| `manager` | Заказы, заявки, уведомления; в меню скрыты каталог и контент |
| `user` | Только сайт, без `/admini` |

**RLS helpers (PostgreSQL):**

- `has_role(uid, 'admin')`
- `can_manage_orders(uid)` — admin + manager
- `can_manage_catalog(uid)` — admin + manager (товары, коллекции)

Первый зарегистрированный пользователь получает `admin` (триггер на signup).

---

## 5. Товары (products)

### Важные поля

| Поле | Назначение |
|------|------------|
| `sku` | Первичный ключ |
| `name`, `name_en`, `name_hy` | Названия |
| `description*` | Описания |
| `category*` | Категория (канонический EN + локали) |
| `colour*` | Цвет |
| `aesthetic` | Линейка дизайна (Linea, 50's Style…) → автоколлекции |
| `family` | Семейство для фильтров/импорта |
| `model_group` | Группировка цветов в каталоге |
| `theme_key` | Спецколлекции (D&G, Porsche…) → автоколлекции + тема на PDP |
| `price_amd`, `price_old`, `discount_percent` | Цены |
| `stock_qty`, `stock_reserved`, `lead_time_days` | Склад |
| `is_published` | Видимость на сайте |
| `is_featured`, `is_bestseller`, `is_new`, `is_special_offer` | Витрины |
| `main_image`, `images[]` | Фото |
| `specs`, `specs_en`, `specs_hy` | JSON характеристик |
| `seo_title`, `seo_description` | SEO |

### theme_key

Вычисляется функцией `compute_theme_key(name, aesthetic)` при импорте/триггерах. Примеры:

- `dg_divina_cucina`, `dg_sicily`, `dg_blu_mediterraneo`
- `coca_cola`, `smeg500`
- `porsche`, `porsche_green`, `porsche_white`, `porsche_917`

---

## 6. Коллекции

### Таблицы

- `collections` — slug, name*, description*, cover_image, section, sort_weight, is_published
- `collection_products` — связь M:N с `sort_weight`

### Секции на главной

- `design` — Design Aesthetic
- `timeless` — Timeless Atmosphere  
- `special` — Special Projects

### Автосинхронизация (триггер `sync_product_collections`)

При INSERT/UPDATE товара (`aesthetic`, `theme_key`, `is_published`) автоматически добавляются строки в `collection_products`:

| Коллекция (slug) | Условие на товаре |
|------------------|-------------------|
| `isola` | aesthetic = Isola |
| `musa` | aesthetic = Musa |
| `dolce-stil-novo` | aesthetic = Dolce Stil Novo |
| `linea` | aesthetic = Linea |
| `classica` | aesthetic = Classica |
| `portofino` | aesthetic = Portofino |
| `piano-design` | aesthetic = Piano Design |
| `cortina` | aesthetic = Cortina |
| `fab-50s` | aesthetic = 50's Style |
| `victoria` | aesthetic = Victoria |
| `coloniale` | aesthetic = Coloniale |
| `universale` | aesthetic = Universale |
| `blu-mediterraneo` | theme_key = dg_blu_mediterraneo |
| `dolce-gabbana-sicily` | theme_key = dg_sicily |
| `divina-cucina` | theme_key = dg_divina_cucina |
| `dolce-gabbana` | theme_key LIKE dg_% |
| `coca-cola` | theme_key = coca_cola |
| `smeg500` | theme_key = smeg500 |
| `porsche` | theme_key IN (porsche, porsche_green, porsche_white, porsche_917) |

**Обратная синхронизация в админке:** при ручном add/remove в коллекции обновляются `theme_key` и/или `aesthetic` (`applyCollectionMembershipToProduct`).

---

## 7. Контент (CMS)

Таблица `site_content`:

| key | Содержимое |
|-----|------------|
| `hero`, `story`, `benefits`, `categories`, `homepage`, `marquee` | Главная |
| `house-of-coffee` | Страница кофе |
| `dealer`, `footer` | Контакты |
| `catalog-nav` | Опциональное переопределение меню каталога |
| `__styles__` | Стили полей (шрифт, размер, цвет) |

Загрузка: `fetchSiteContentBundle()` — один запрос, ключ кэша `site-content-bundle`.  
`I18nProvider` не рендерит детей до загрузки bundle (нет «мигания» дефолтных текстов).

Сохранение в админке: upsert по ключу блока + инвалидация кэша.

---

## 8. Каталог и группировка

Конфиг в блоке CMS `categories`:

```json
{
  "config.groupByColor": true,
  "config.groupByColorSections": ["small"],
  "config.groupByColorOff": ["slug-категории"],
  "config.modelGroupLabels": { "WKF01": { "name_ru": "...", "image_sku": "..." } }
}
```

Алгоритм: `src/lib/catalog-grouping.ts` — `buildProductGroups()`, seed для shuffle.

Представитель группы — SKU с минимальной ценой в группе.

---

## 9. Заказы и оплата

### Таблица `orders`

Клиент, телефон, email, адрес, комментарий, способ оплаты, статус, сумма, поля ConverseBank, `internal_notes`, `status_history` (JSON).

### Таблица `order_items`

Снимок SKU, названия, цены на момент заказа.

### Server functions

- `createOrder` — создание, резерв склада, Telegram, email queue
- `startConversePayment`, `checkConversePayment` — эквайринг

---

## 10. Заявки

Таблица `inquiries`: контактные данные, сообщение, `product_sku`, статус, timestamps.

---

## 11. Интернационализация

**Языки сайта:** `hy` (по умолчанию в HTML), `ru`, `en`.

1. Статические словари в `src/lib/i18n.tsx`
2. Переопределения из `site_content` (по i18n-ключу внутри блоков)
3. Поля товаров/коллекций: `pickLocalized(entity, "name", lang)`

Категории и цвета: `category-i18n.ts`, `colour-i18n.ts`.

Админка: отдельный словарь `admin-i18n.ts`.

---

## 12. База данных

Основные таблицы:

| Таблица | Назначение |
|---------|------------|
| `products` | Каталог |
| `collections`, `collection_products` | Коллекции |
| `site_content` | CMS |
| `orders`, `order_items` | Заказы |
| `inquiries` | Заявки |
| `partners` | Партнёры |
| `profiles` | Профили staff (+ telegram_chat_id) |
| `user_roles` | Роли |
| `color_swatches` | HEX для фильтра цветов |
| `themes` | Оформление спецколлекций |
| `spec_filter_fields`, `product_spec_values` | Фильтры по характеристикам |

Миграции: `supabase/migrations/*.sql` — применять при деплое.

Полезные RPC: `search_products`, `compute_theme_key`.

---

## 13. Хранилище файлов

Bucket **`product-media`** (публичные URL):

- `products/{sku}/...` — фото товаров
- `collections/{slug}.jpg` — обложки коллекций
- логотипы партнёров

Загрузка из админки: `src/lib/admin-upload.ts`.

---

## 14. Фоновые процессы

| Endpoint | Назначение |
|----------|------------|
| `/api/public/translate/tick` | Пакетный AI-перевод товаров (cron) |
| `/api/public/telegram/webhook` | Webhook Telegram-бота |
| `/api/public/email/queue/process` | Очередь email |

---

## 15. Деплой и окружение

Документы: `DEPLOY.md`, `SERVER-ACCESS.md`, `DNS-INSTRUCTIONS.md`, `.env.example`.

**Клиент (build-time):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

**Сервер (runtime):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_BASE_URL`, `CONVERSE_*`, `TELEGRAM_BOT_TOKEN`

**Процесс:** `docker compose build && docker compose up -d` на сервере `/opt/smeg`.

**Prod DB:** контейнер `smeg-db`, миграции из репозитория.

---

## 16. Структура репозитория

```
src/
  routes/           # Страницы (файловый роутинг)
  components/
    site/           # Публичный UI
    admin/          # Компоненты админки
  lib/              # Бизнес-логика, запросы, i18n
  integrations/     # Supabase client, types
supabase/
  migrations/       # SQL миграции
deploy/             # Docker, скрипты, Supabase config
docs/
  PLATFORM.md       # Этот файл
  CATALOG_ROADMAP.md
```

### Ключевые файлы lib/

| Файл | Роль |
|------|------|
| `products.ts` | Запросы каталога, коллекций, facets |
| `site-content.ts` | CMS bundle |
| `i18n.tsx` | Язык сайта |
| `admin-i18n.ts` | Язык админки |
| `admin-help-content.ts` | Тексты справки |
| `collection-auto-sync.ts` | Коллекции ↔ theme_key/aesthetic |
| `catalog-grouping.ts` | Группировка model_group |
| `catalog-group-config.ts` | Парсинг CMS-конфига |
| `orders.functions.ts` | Создание заказа |
| `converse.functions.ts` | Оплата |
| `translate.functions.ts` | AI-перевод |
| `supabase-assert.ts` | Проверка записи после UPDATE |

---

## История изменений документа

- 2026-06 — первоначальная версия: полное описание сайта, админки, автосинхронизации коллекций, CMS, ролей и деплоя.

---

*При расхождении документа с кодом приоритет у кода и миграций БД. Обновляйте этот файл при существенных изменениях платформы.*
