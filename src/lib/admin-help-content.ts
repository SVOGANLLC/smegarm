/** Admin help copy: [RU, EN, HY] */
export type HelpTriplet = [string, string, string];

export type HelpSection = {
  id: string;
  title: HelpTriplet;
  /** Hidden from managers when true */
  adminOnly?: boolean;
  paragraphs: HelpTriplet[];
  bullets?: HelpTriplet[];
  tips?: HelpTriplet[];
  link?: { to: string; label: HelpTriplet };
};

export const ADMIN_HELP_SECTIONS: HelpSection[] = [
  {
    id: "start",
    title: ["С чего начать", "Getting started", "Սկսելու համար"],
    paragraphs: [
      [
        "Админка Smeg Armenia — панель для управления каталогом, заказами, заявками и контентом сайта smeg.am. Войдите через /auth (email и пароль). После входа откроется раздел «Обзор».",
        "Smeg Armenia admin is the control panel for catalog, orders, inquiries, and site content. Sign in at /auth. After login you land on Overview.",
        "Smeg Armenia ադմինը կատալոգի, պատվերների, հայտերի և կայքի բովանդակության կառավարման վահանակն է։ Մուտք՝ /auth։",
      ],
      [
        "Язык интерфейса админки переключается внизу бокового меню: HY / RU / EN. Это не влияет на язык публичного сайта — на сайте посетитель выбирает язык сам.",
        "Admin UI language is switched at the bottom of the sidebar: HY / RU / EN. This does not change the public site language for visitors.",
        "Ադմինի լեզուն փոխվում է կողային մենյուի ներքևում՝ HY / RU / EN։",
      ],
    ],
    bullets: [
      ["Обзор — сводные цифры по товарам и заявкам", "Overview — product and inquiry stats", "Ակնարկ — ապրանքների և հայտերի ամփոփ"],
      ["Заказы и Заявки доступны и админу, и менеджеру", "Orders and Inquiries: admin + manager", "Պատվերներ և Հայտեր՝ ադմին և մենեջեր"],
      ["Каталог, контент, команда — только роль admin", "Catalog, content, team — admin role only", "Կատալոգ, բովանդակություն, թիմ՝ միայն admin"],
    ],
    link: { to: "/admini", label: ["Открыть обзор", "Open overview", "Բացել ակնարկը"] },
  },
  {
    id: "roles",
    title: ["Роли и доступ", "Roles and access", "Դերեր և մուտք"],
    paragraphs: [
      [
        "В системе три роли: admin (полный доступ), manager (заказы и заявки), user (обычный пользователь без админки). Первый зарегистрированный пользователь автоматически становится admin.",
        "Three roles: admin (full), manager (orders + inquiries), user (no admin). The first registered user becomes admin.",
        "Երեք դեր՝ admin, manager (պատվերներ+հայտեր), user։",
      ],
    ],
    bullets: [
      ["admin — товары, коллекции, контент, партнёры, команда, инструменты", "admin — products, collections, content, partners, team, tools", "admin — ամբողջական"],
      ["manager — заказы (статусы, заметки), заявки, уведомления Telegram", "manager — orders, inquiries, Telegram notifications", "manager — պատվերներ, հայտեր"],
      ["Менеджер не видит пункты меню каталога, но URL может открыться — права на запись каталога у менеджера тоже есть (RLS)", "Manager nav hides catalog items; direct URLs may work — catalog write RLS includes managers", "Մենեջերի մենյուն չի ցույց տալիս կատալոգը"],
    ],
    link: { to: "/admini/team", label: ["Управление командой", "Manage team", "Կառավարել թիմը"] },
    adminOnly: true,
  },
  {
    id: "orders",
    title: ["Заказы", "Orders", "Պատվերներ"],
    paragraphs: [
      [
        "Раздел «Заказы» показывает все оформленные покупки с сайта. Можно искать по имени, телефону или номеру заказа, фильтровать по статусу и переключаться между списком и канбан-доской.",
        "Orders shows all checkout purchases. Search by name, phone, or order #; filter by status; list or kanban view.",
        "«Պատվերներ» բաժինը ցույց է տալիս բոլոր պատվերները։",
      ],
    ],
    bullets: [
      ["Статусы: new → in_progress → confirmed → shipped → done (или cancelled)", "Statuses: new → in_progress → confirmed → shipped → done / cancelled", "Կարգավիճակների շղթա"],
      ["Онлайн-оплата ConverseBank: смотрите payment_status и px_number в карточке заказа", "ConverseBank: check payment_status and px_number", "ConverseBank վճարում"],
      ["Внутренние заметки видны только сотрудникам", "Internal notes are staff-only", "Ներքին նշումներ"],
      ["Экспорт в Excel — кнопка вверху списка", "Excel export — top toolbar", "Excel արտահանում"],
    ],
    tips: [
      [
        "При оплате картой клиент может вернуться на сайт с задержкой — обновите страницу заказа, статус подтянется из банка.",
        "Card payments may return with delay — refresh the order page.",
        "Քարտային վճարման դեպքում թարմացրեք էջը։",
      ],
    ],
    link: { to: "/admini/orders", label: ["Открыть заказы", "Open orders", "Բացել պատվերները"] },
  },
  {
    id: "inquiries",
    title: ["Заявки", "Inquiries", "Հայտեր"],
    paragraphs: [
      [
        "Заявки приходят с формы «Связаться» на сайте и с карточек товаров. У каждой заявки: имя, телефон, email, текст, опционально SKU товара.",
        "Inquiries come from the site contact form and product pages.",
        "Հայտերը գալիս են կայքի ձևից։",
      ],
    ],
    bullets: [
      ["Статусы: new, in_progress, done, spam", "Statuses: new, in_progress, done, spam", "Կարգավիճակներ"],
      ["Обрабатывайте новые заявки из блока «Обзор» — там счётчик новых", "New inquiry count on Overview", "Նոր հայտերի հաշվիչ ակնարկում"],
    ],
    link: { to: "/admini/inquiries", label: ["Открыть заявки", "Open inquiries", "Բացել հայտերը"] },
  },
  {
    id: "products-list",
    title: ["Товары — список", "Products — list", "Ապրանքներ — ցանկ"],
    adminOnly: true,
    paragraphs: [
      [
        "Список всех SKU в каталоге. Поиск работает по артикулу и названию (минимум 2 символа). Фильтры: категория, видимость, наличие, маркетинговые метки.",
        "All SKUs. Search by SKU/name. Filters for category, visibility, stock, marketing flags.",
        "Բոլոր SKU-ները։",
      ],
    ],
    bullets: [
      ["«Создать» — введите SKU, название и категорию, откроется карточка редактирования", "Create — SKU, name, category → edit page", "Ստեղծել ապրանք"],
      ["Глаз — опубликован / скрыт на сайте", "Eye — published / hidden", "Հրապարակում"],
      ["Звёзды, NEW, SALE — быстрые переключатели витринных флагов", "Quick toggles for bestseller, new, special offer", "Ցուցադրության դրոշակներ"],
      ["Клик по строке или «Изменить» — карточка товара", "Row click or Edit — product page", "Խմբագրում"],
    ],
    link: { to: "/admini/products", label: ["Открыть товары", "Open products", "Բացել ապրանքները"] },
  },
  {
    id: "products-edit",
    title: ["Товары — карточка", "Products — edit", "Ապրանք — խմբագրում"],
    adminOnly: true,
    paragraphs: [
      [
        "Карточка товара делится на основную колонку (тексты, фото, SEO, характеристики) и боковую панель (каталог, цены, склад, флаги). Обязательно нажмите «Сохранить» внизу справа — иначе изменения не попадут на сайт.",
        "Product edit: main column (copy, images, SEO, specs) + sidebar (catalog, prices, stock, flags). Click Save — changes go live.",
        "Պահպանել կոճակը պարտադիր է։",
      ],
    ],
    bullets: [
      ["Вкладки RU / EN / HY — название и описание; кнопка AI переводит пустые EN/HY с русского", "RU/EN/HY tabs; AI translates from Russian", "AI թարգմանություն"],
      ["Главное фото и галерея — URL или загрузка в хранилище product-media", "Main image + gallery — URL or upload", "Նկարների բեռնում"],
      ["Характеристики — формат «Ключ: значение» построчно; EAN синхронизируется со specs", "Specs: key: value per line; EAN syncs", "Բնութագրեր"],
      ["Коллекции — добавление сразу сохраняется (кнопка +), состав только вручную", "Collections — instant save on +, manual membership only", "Հավաքածուներ"],
      ["Дублировать / Переименовать SKU — в шапке карточки", "Duplicate / Rename SKU in header", "SKU վերանվանում"],
      ["is_featured — попадание в блок «Иконы Smeg» на главной (список SKU задаётся в Контенте)", "is_featured — homepage icons (SKU list in Content)", "Գլխավորի «Իկոններ»"],
    ],
    tips: [
      [
        "Если сохранение падает с ошибкой «запись не обновлена» — нет прав или SKU не найден. Проверьте роль и что товар существует.",
        "Save error «no row updated» — permissions or missing SKU.",
        "Պահպանման սխալ՝ ստուգեք իրավունքները։",
      ],
    ],
    link: { to: "/admini/products", label: ["К списку товаров", "Product list", "Ապրանքների ցանկ"] },
  },
  {
    id: "collections",
    title: ["Коллекции", "Collections", "Հավաքածուներ"],
    adminOnly: true,
    paragraphs: [
      [
        "Коллекции — тематические подборки на главной и отдельные лендинги /collection/slug. Создайте коллекцию вверху страницы, затем настройте карточку.",
        "Collections are curated groups on the homepage and /collection/slug pages.",
        "Հավաքածուները գլխավոր էջում և առանձին էջերում։",
      ],
    ],
    bullets: [
      ["Название RU / EN / HY — измените и нажмите «Сохранить названия»", "Edit names and click Save names", "Խմբագրել և սեղմել «Պահպանել անվանումները»"],
      ["Slug (URL) задаётся при создании коллекции и не меняется при переименовании", "Slug is set at creation and does not change on rename", "Slug-ը ստեղծման ժամանակ"],
      ["Секция: Design / Timeless / Special — группировка на главной", "Section: design / timeless / special", "Խմբավորում գլխավորում"],
      ["Товары в коллекции — раскройте блок, найдите SKU, кликните; сохраняется сразу", "Products — expand, search SKU, click to add", "Ապրանքների ավելացում"],
      ["Состав коллекции только ручной — сохранение товара не меняет коллекции", "Collection membership is manual only", "Միայն ձեռքով"],
    ],
    link: { to: "/admini/collections", label: ["Открыть коллекции", "Open collections", "Բացել հավաքածուները"] },
  },
  {
    id: "content",
    title: ["Контент сайта", "Site content", "Կայքի բովանդակություն"],
    adminOnly: true,
    paragraphs: [
      [
        "CMS хранит тексты главной, House of Coffee и контактов в таблице site_content. Три вкладки вверху: Главная, Дом кофе, Контакты. У каждого блока поля RU / EN / HY и кнопка сохранения блока.",
        "CMS in site_content. Tabs: Homepage, House of Coffee, Contacts. Per-block RU/EN/HY + Save.",
        "CMS՝ site_content աղյուսակում։",
      ],
    ],
    bullets: [
      ["Hero, Story, Benefits — тексты секций главной", "Hero, Story, Benefits sections", "Գլխավորի տեքստեր"],
      ["Категории — подписи + порядок категорий в каталоге + группировка по цвету + названия групп моделей", "Categories tab — labels, catalog order, color grouping, model group labels", "Կատեգորիաներ"],
      ["Избранное — список SKU для блока «Иконы Smeg»", "Featured — iconic SKU list", "Իկոնական SKU"],
      ["Бегущая строка (marquee)", "Marquee text", "Գոյացնող տող"],
      ["Стили текста — шрифт, размер, цвет для отдельных полей", "Per-field typography styles", "Տեքստի ոճեր"],
      ["После сохранения сайт обновляется без пересборки — кэш сбрасывается автоматически", "Live update after save — cache invalidated", "Ավտոմատ թարմացում"],
    ],
    link: { to: "/admini/content", label: ["Открыть контент", "Open content", "Բացել բովանդակությունը"] },
  },
  {
    id: "partners",
    title: ["Партнёры", "Partners", "Գործընկերներ"],
    adminOnly: true,
    paragraphs: [
      [
        "Блок партнёров на главной странице. Для каждого: логотип (загрузка), название и описание на трёх языках, ссылка, порядок, публикация.",
        "Homepage partners strip — logo, i18n name/description, link, order, publish.",
        "Գլխավորի գործընկերների բլոկ։",
      ],
    ],
    link: { to: "/admini/partners", label: ["Открыть партнёров", "Open partners", "Բացել գործընկերներին"] },
  },
  {
    id: "team",
    title: ["Команда", "Team", "Թիմ"],
    adminOnly: true,
    paragraphs: [
      [
        "Назначение ролей зарегистрированным пользователям: user, manager, admin. Меняйте роль в выпадающем списке — сохраняется сразу.",
        "Assign roles to registered users. Dropdown saves immediately.",
        "Դերերի նշանակում։",
      ],
    ],
    link: { to: "/admini/team", label: ["Открыть команду", "Open team", "Բացել թիմը"] },
  },
  {
    id: "notifications",
    title: ["Уведомления Telegram", "Telegram notifications", "Telegram ծանուցումներ"],
    paragraphs: [
      [
        "Привяжите личный chat_id бота @smegarmbot, чтобы получать уведомления о новых заказах и заявках. Инструкция на странице. Кнопка «Тест» проверяет связь.",
        "Link your Telegram chat_id via @smegarmbot for new order/inquiry alerts.",
        "Կապել Telegram chat_id-ն։",
      ],
    ],
    link: { to: "/admini/notifications", label: ["Открыть уведомления", "Open notifications", "Բացել ծանուցումները"] },
  },
  {
    id: "tools",
    title: ["Инструменты", "Tools", "Գործիքներ"],
    adminOnly: true,
    paragraphs: [
      [
        "Массовые операции с каталогом — только для опытных пользователей. Всегда делайте экспорт перед импортом.",
        "Bulk catalog operations — export before import.",
        "Զանգվածային գործողություններ։",
      ],
    ],
    bullets: [
      ["Экспорт — полный каталог в XLSX", "Export full catalog XLSX", "Արտահանում"],
      ["Импорт — загрузка XLSX, превью изменений, применение по SKU", "Import XLSX with diff preview", "Ներմուծում"],
      ["Массовые цены — скидки по категории/семейству", "Bulk pricing / discounts", "Զանգվածային գներ"],
      ["Массовый перевод — AI для пустых EN/HY полей", "Bulk AI translation", "Զանգվածային թարգմանություն"],
    ],
    link: { to: "/admini/tools", label: ["Открыть инструменты", "Open tools", "Բացել գործիքները"] },
  },
  {
    id: "site-catalog",
    title: ["Как устроен каталог на сайте", "How the public catalog works", "Ինչպես է աշխատում կատալոգը"],
    paragraphs: [
      [
        "Публичный каталог /catalog фильтрует опубликованные товары. Секции: крупная техника, мелкая, аксессуары. Можно группировать карточки по model_group с выбором цвета — настройка в Контенте → Категории.",
        "Public /catalog with large/small/accessories sections. Color grouping per CMS settings.",
        "Հանրային /catalog։",
      ],
    ],
    bullets: [
      ["Сортировка: цена, новизна, случайно (при повторном выборе «Случайно» порядок меняется)", "Sort includes shuffle reshuffle", "Տեսակավորում"],
      ["Карточка товара /product/SKU — галерея, варианты цвета, корзина, характеристики", "PDP /product/SKU", "Ապրանքի էջ"],
      ["Коллекция /collection/slug — товары подборки с фильтрами", "Collection landing pages", "Հավաքածուի էջ"],
      ["Распродажа /sale — товары со скидкой или флагом special offer", "Sale page", "Զեղչեր"],
      ["House of Coffee /house-of-coffee — отдельный раздел кофемашин", "Coffee hub page", "Սուրճի տուն"],
    ],
  },
  {
    id: "site-orders",
    title: ["Заказы на сайте", "Checkout on the site", "Պատվեր կայքում"],
    paragraphs: [
      [
        "Клиент добавляет товары в корзину, оформляет заказ на /checkout. Оплата: наличными или картой ConverseBank. Цены и остатки берутся из БД в момент заказа — резерв stock_reserved.",
        "Cart → checkout. Cash or ConverseBank card. Prices/stock from DB at order time.",
        "Զամբյուղ → checkout։",
      ],
    ],
  },
  {
    id: "troubleshooting",
    title: ["Частые вопросы", "FAQ / troubleshooting", "Հաճախակի հարցեր"],
    paragraphs: [
      [
        "Контент на сайте мелькает старым текстом — дождитесь загрузки CMS (исправлено: сайт ждёт bundle перед показом). Если в админке сохранили контент, а на сайте старое — жёсткое обновление страницы (Ctrl+F5).",
        "Content flash — site waits for CMS bundle. Hard refresh if stale.",
        "Բովանդակության թարմացում։",
      ],
    ],
    bullets: [
      ["Товар не на сайте — проверьте is_published и stock/lead_time", "Not on site — is_published, stock", "Չի երևում կայքում"],
      ["Не сохраняется в админке — ошибка прав или RLS; смотрите текст toast", "Save fails — check toast error / role", "Չի պահպանվում"],
      ["Коллекции в меню главной со 2-го клика — обновите сайт после деплоя (исправлен прокрутка к #collections)", "Collections menu hash scroll fixed in latest deploy", "Մենյու #collections"],
      ["Документация для разработчиков — docs/PLATFORM.md в корне репозитория", "Developer docs — docs/PLATFORM.md", "docs/PLATFORM.md"],
    ],
  },
];

export function pickHelp(t: HelpTriplet, lang: "ru" | "en" | "hy"): string {
  if (lang === "hy") return t[2];
  if (lang === "en") return t[1];
  return t[0];
}
