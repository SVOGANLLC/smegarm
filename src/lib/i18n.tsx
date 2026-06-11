import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { stylesToCss, collectGoogleFonts, type ContentStylesMap } from "./content-styles";

export type Lang = "ru" | "en" | "hy";

type Dict = Record<string, string>;

const dicts: Record<Lang, Dict> = {
  ru: {
    "nav.catalog": "Каталог",
    "nav.collections": "Коллекции",
    "nav.story": "Бренд",
    "nav.dealer": "Дилер в Армении",
    "nav.contact": "Контакты",
    "hero.eyebrow": "Официальный SMEG в Армении",
    "hero.title": "ВЫБЕРИ ЦВЕТ\nСВОЕГО НАСТРОЕНИЯ",
    "hero.subtitle":
      "Итальянская техника, превращающая каждое движение на кухне в ритуал.",
    "hero.cta": "Открыть каталог",
    "hero.cta2": "История бренда",
    "hero.scroll": "Прокрутить",
    "hero.quote": "«Bellezza, qualità, prestazioni.»",
    "hero.quoteCaption": "— Манифест Smeg",
    "header.menu": "Меню",
    "header.close": "Закрыть",
    "section.featured.eyebrow": "Избранное",
    "section.featured.title": "Иконы Smeg",
    "section.collections.eyebrow": "Коллекции",
    "section.collections.title": "Десять способов\nвыразить себя.",
    "section.categories.eyebrow": "Категории",
    "section.categories.title": "Каждая деталь\nна своём месте.",
    "section.categories.small": "Малая техника",
    "section.categories.refrigerators": "Холодильники",
    "section.categories.ovens": "Духовые шкафы",
    "section.categories.hobs": "Варочные панели",
    "section.benefits.eyebrow": "Почему Smeg",
    "section.benefits.title": "Итальянское мастерство.\nАрмянская забота.",
    "section.benefits.1.t": "Сделано в Италии",
    "section.benefits.1.d": "Сборка на заводах Smeg в Гуасталле — 76 лет опыта.",
    "section.benefits.2.t": "Иконический дизайн",
    "section.benefits.2.d": "От FAB50 до Linea — модели от ведущих мировых дизайнеров.",
    "section.benefits.3.t": "Энергоэффективность",
    "section.benefits.3.d": "Технологии A-класса для современного дома.",
    "section.benefits.4.t": "Официальная гарантия",
    "section.benefits.4.d": "Полная гарантия Smeg и сертифицированный сервис по Армении.",
    "section.story.eyebrow": "С 1948 года",
    "section.story.title": "Семейная история\nиз Гвасталлы.",
    "section.story.body":
      "Более семидесяти лет Smeg объединяет инженерию, дизайн и итальянскую культуру дома. Каждая модель — это диалог между функцией и формой.",
    "section.story.cta": "Узнать историю",
    "section.story.stat.years": "Лет",
    "section.story.stat.countries": "Стран",
    "section.story.stat.colours": "Цветов",
    "section.dealer.eyebrow": "Smeg Armenia",
    "section.dealer.title": "Showroom в Ереване",
    "section.dealer.body":
      "Приходите в наш салон, чтобы увидеть Smeg вживую, обсудить проект кухни с консультантом и оформить доставку по всей Армении.",
    "section.dealer.cta": "Записаться на визит",
    "section.dealer.address": "ул. Нар-Доса 2, Ереван, Армения",
    "footer.contact": "Контакты",
    "footer.address": "Адрес",
    "footer.follow": "Соцсети",
    "footer.rights": "Все права защищены.",
    "footer.designed": "Designed & Developed by",
    "footer.tagline": "Официальный SMEG в Армении. Премиальная итальянская техника с 1948 года.",
    "footer.address.line1": "ул. Нар-Доса 2",
    "footer.address.line2": "Ереван, Армения",
    "common.discover": "Подробнее",
    "common.shop": "В каталог",
    "product.sku": "Артикул",
    "product.style": "Стиль",
    "product.colour": "Цвет",
    "product.family": "Семейство",
    "product.ean": "EAN",
    "product.requestPrice": "Запросить цену",
    "product.pdf": "PDF спецификация",
    "product.energy": "Энергоэтикетка",
    "product.specs": "Характеристики",
    "product.specs.show": "Показать",
    "product.specs.hide": "Свернуть",
    "product.noPhoto": "нет фото",
    "product.notFound": "Товар не найден",
    "product.loadError": "Не удалось загрузить товар",
    "product.toCatalog": "К каталогу",
    "avail.inStock": "В наличии",
    "avail.unit": "шт.",
    "avail.preOrder": "Под заказ",
    "avail.delivery": "доставка на склад",
    "avail.days": "дн.",
    "avail.onRequest": "По запросу",
    "catalog.title": "Каталог",
    "catalog.all": "Вся техника Smeg",
    "catalog.unavailable": "Каталог временно недоступен",
    "catalog.notFound": "Не найдено",
    "catalog.modelsSuffix": "моделей",
    "catalog.loading": "Загрузка…",
    "catalog.empty": "Нет результатов",
    "catalog.nothing": "Ничего не найдено.",
    "catalog.search": "Поиск",
    "catalog.searchPlaceholder": "Артикул или название",
    "catalog.sort.name": "По названию",
    "catalog.sort.priceAsc": "Цена ↑",
    "catalog.sort.priceDesc": "Цена ↓",
    "catalog.filters": "Фильтры",
    "catalog.reset": "Сбросить",
    "catalog.prev": "← Назад",
    "catalog.next": "Дальше →",
    "catalog.showCount": "Показать",
    "catalog.itemsSuffix": "товаров",
    "facet.marketing": "Маркетинг",
    "facet.categories": "Категории",
    "facet.all": "Все",
    "facet.colour": "Цвет",
    "facet.aesthetic": "Эстетика",
    "facet.family": "Тип техники",
    "flag.is_bestseller": "Хит продаж",
    "flag.is_new": "Новинки",
    "flag.is_special_offer": "Спецпредложения",
    "flag.sale": "Со скидкой",
    "flag.is_featured": "Избранное",
    "badge.hit": "Хит",
    "badge.new": "Новинка",
    "badge.sale": "Акция",
    "showcase.bestsellers.eyebrow": "Бестселлеры",
    "showcase.bestsellers.title": "Хиты продаж",
    "showcase.special.eyebrow": "Спецпредложения",
    "showcase.special.title": "Спецпредложения",
    "showcase.new.eyebrow": "Новинки",
    "showcase.new.title": "Новинки",
    "cta.allProducts": "Все товары",
    "cta.allOffers": "Все акции",
    "cta.catalog": "Каталог",
    "section.partners.eyebrow": "Партнёры",
    "section.partners.title": "Наши партнёры",
  },
  en: {
    "nav.catalog": "Shop",
    "nav.collections": "Collections",
    "nav.story": "Brand",
    "nav.dealer": "Armenia Dealer",
    "nav.contact": "Contact",
    "hero.eyebrow": "Official SMEG in Armenia",
    "hero.title": "CHOOSE THE COLOR\nOF YOUR MOOD",
    "hero.subtitle":
      "Italian appliances that turn every kitchen gesture into a ritual.",
    "hero.cta": "Explore the catalog",
    "hero.cta2": "Our story",
    "hero.scroll": "Scroll",
    "hero.quote": "“Bellezza, qualità, prestazioni.”",
    "hero.quoteCaption": "— Smeg manifesto",
    "header.menu": "Menu",
    "header.close": "Close",
    "section.featured.eyebrow": "Featured",
    "section.featured.title": "Smeg icons",
    "section.collections.eyebrow": "Collections",
    "section.collections.title": "Ten ways\nto express yourself.",
    "section.categories.eyebrow": "Categories",
    "section.categories.title": "Every detail\nin its place.",
    "section.categories.small": "Small appliances",
    "section.categories.refrigerators": "Refrigerators",
    "section.categories.ovens": "Ovens",
    "section.categories.hobs": "Hobs & Cooktops",
    "section.benefits.eyebrow": "Why Smeg",
    "section.benefits.title": "Italian craft.\nArmenian care.",
    "section.benefits.1.t": "Made in Italy",
    "section.benefits.1.d": "Assembled in Smeg's Guastalla factories with 76 years of know-how.",
    "section.benefits.2.t": "Iconic design",
    "section.benefits.2.d": "From the FAB50 to Linea — pieces curated by world-class designers.",
    "section.benefits.3.t": "Energy efficiency",
    "section.benefits.3.d": "A-class technology engineered for the modern Mediterranean home.",
    "section.benefits.4.t": "Official warranty",
    "section.benefits.4.d": "Full Smeg warranty and certified service across Armenia.",
    "section.story.eyebrow": "Since 1948",
    "section.story.title": "A family story\nfrom Guastalla.",
    "section.story.body":
      "For over seventy years Smeg has united engineering, design and Italian home culture. Every model is a conversation between function and form.",
    "section.story.cta": "Discover the story",
    "section.story.stat.years": "Years",
    "section.story.stat.countries": "Countries",
    "section.story.stat.colours": "Colours",
    "section.dealer.eyebrow": "Smeg Armenia",
    "section.dealer.title": "Yerevan showroom",
    "section.dealer.body":
      "Visit our showroom to experience Smeg in person, plan your kitchen with a consultant and arrange delivery anywhere in Armenia.",
    "section.dealer.cta": "Book a visit",
    "section.dealer.address": "2 Nar-Dos St, Yerevan, Armenia",
    "footer.contact": "Contact",
    "footer.address": "Address",
    "footer.follow": "Follow",
    "footer.rights": "All rights reserved.",
    "footer.designed": "Designed & Developed by",
    "footer.tagline": "Official SMEG in Armenia. Premium Italian appliances since 1948.",
    "footer.address.line1": "2 Nar-Dos St",
    "footer.address.line2": "Yerevan, Armenia",
    "common.discover": "Discover",
    "common.shop": "Shop",
    "product.sku": "SKU",
    "product.style": "Style",
    "product.colour": "Colour",
    "product.family": "Family",
    "product.ean": "EAN",
    "product.requestPrice": "Request price",
    "product.pdf": "PDF spec sheet",
    "product.energy": "Energy label",
    "product.specs": "Specifications",
    "product.specs.show": "Show",
    "product.specs.hide": "Hide",
    "product.noPhoto": "no photo",
    "product.notFound": "Product not found",
    "product.loadError": "Could not load product",
    "product.toCatalog": "To catalogue",
    "avail.inStock": "In stock",
    "avail.unit": "pcs",
    "avail.preOrder": "Pre-order",
    "avail.delivery": "warehouse delivery",
    "avail.days": "days",
    "avail.onRequest": "On request",
    "catalog.title": "Catalogue",
    "catalog.all": "All Smeg appliances",
    "catalog.unavailable": "Catalogue temporarily unavailable",
    "catalog.notFound": "Not found",
    "catalog.modelsSuffix": "models",
    "catalog.loading": "Loading…",
    "catalog.empty": "No results",
    "catalog.nothing": "Nothing found.",
    "catalog.search": "Search",
    "catalog.searchPlaceholder": "SKU or name",
    "catalog.sort.name": "By name",
    "catalog.sort.priceAsc": "Price ↑",
    "catalog.sort.priceDesc": "Price ↓",
    "catalog.filters": "Filters",
    "catalog.reset": "Reset",
    "catalog.prev": "← Back",
    "catalog.next": "Next →",
    "catalog.showCount": "Show",
    "catalog.itemsSuffix": "items",
    "facet.marketing": "Marketing",
    "facet.categories": "Categories",
    "facet.all": "All",
    "facet.colour": "Colour",
    "facet.aesthetic": "Aesthetic",
    "facet.family": "Appliance type",
    "flag.is_bestseller": "Best sellers",
    "flag.is_new": "New",
    "flag.is_special_offer": "Special offers",
    "flag.sale": "On sale",
    "flag.is_featured": "Featured",
    "badge.hit": "Hit",
    "badge.new": "New",
    "badge.sale": "Sale",
    "showcase.bestsellers.eyebrow": "Bestsellers",
    "showcase.bestsellers.title": "Best sellers",
    "showcase.special.eyebrow": "Special offers",
    "showcase.special.title": "Special offers",
    "showcase.new.eyebrow": "New arrivals",
    "showcase.new.title": "New arrivals",
    "cta.allProducts": "All products",
    "cta.allOffers": "All offers",
    "cta.catalog": "Catalogue",
    "section.partners.eyebrow": "Partners",
    "section.partners.title": "Our partners",
  },
  hy: {
    "nav.catalog": "Կատալոգ",
    "nav.collections": "Կոլեկցիաներ",
    "nav.story": "Բրենդ",
    "nav.dealer": "Հայաստան",
    "nav.contact": "Կապ",
    "hero.eyebrow": "Պաշտոնական SMEG Հայաստանում",
    "hero.title": "ԸՆՐԻՐ ՔՈ\nՏՐԱՄԱԴՐՈՒԹՅԱՆ ԳՈՒՅՆԸ",
    "hero.subtitle":
      "Իտալական տեխնիկա, որը խոհանոցի յուրաքանչյուր շարժում վերածում է ծեսի։",
    "hero.cta": "Տեսնել կատալոգը",
    "hero.cta2": "Բրենդի պատմությունը",
    "hero.scroll": "Ոլորել",
    "hero.quote": "«Bellezza, qualità, prestazioni.»",
    "hero.quoteCaption": "— Smeg-ի մանիֆեստ",
    "header.menu": "Մենյու",
    "header.close": "Փակել",
    "section.featured.eyebrow": "Ընտրված",
    "section.featured.title": "Smeg-ի խորհրդանիշները",
    "section.collections.eyebrow": "Կոլեկցիաներ",
    "section.collections.title": "Տասը ձև՝\nարտահայտվելու։",
    "section.categories.eyebrow": "Կատեգորիաներ",
    "section.categories.title": "Ամեն մանրուք՝\nիր տեղում։",
    "section.categories.small": "Փոքր տեխնիկա",
    "section.categories.refrigerators": "Սառնարաններ",
    "section.categories.ovens": "Վառարաններ",
    "section.categories.hobs": "Գազօջախներ և սալօջախներ",
    "section.benefits.eyebrow": "Ինչու Smeg",
    "section.benefits.title": "Իտալական վարպետություն։\nՀայկական խնամք։",
    "section.benefits.1.t": "Արտադրված Իտալիայում",
    "section.benefits.1.d": "Հավաքվում է Smeg-ի Գուաստալայի գործարաններում՝ 76 տարվա փորձով։",
    "section.benefits.2.t": "Խորհրդանշական դիզայն",
    "section.benefits.2.d": "FAB50-ից մինչև Linea՝ համաշխարհային մակարդակի դիզայներների գործեր։",
    "section.benefits.3.t": "Էներգախնայողություն",
    "section.benefits.3.d": "A դասի տեխնոլոգիա ժամանակակից տան համար։",
    "section.benefits.4.t": "Պաշտոնական երաշխիք",
    "section.benefits.4.d": "Smeg-ի լրիվ երաշխիք և սերտիֆիկացված սպասարկում Հայաստանում։",
    "section.story.eyebrow": "1948 թվականից",
    "section.story.title": "Ընտանեկան\nպատմություն Գուաստալայից։",
    "section.story.body":
      "Ավելի քան յոթանասուն տարի Smeg-ը միավորում է ինժեներիան, դիզայնը և տան իտալական մշակույթը։",
    "section.story.cta": "Բացահայտել պատմությունը",
    "section.story.stat.years": "Տարի",
    "section.story.stat.countries": "Երկիր",
    "section.story.stat.colours": "Գույն",
    "section.dealer.eyebrow": "Smeg Armenia",
    "section.dealer.title": "Showroom Երևանում",
    "section.dealer.body":
      "Այցելեք մեր սրահ՝ տեսնելու Smeg-ը կենդանի, խորհրդակցելու և կազմակերպելու առաքում ողջ Հայաստանում։",
    "section.dealer.cta": "Ամրագրել այց",
    "section.dealer.address": "Նար-Դոս 2, Երևան, Հայաստան",
    "footer.contact": "Կապ",
    "footer.address": "Հասցե",
    "footer.follow": "Հետևեք",
    "footer.rights": "Բոլոր իրավունքները պաշտպանված են։",
    "footer.designed": "Դիզայնը և մշակումը՝",
    "footer.tagline": "Պաշտոնական SMEG Հայաստանում։ Պրեմիում իտալական տեխնիկա 1948 թվականից։",
    "footer.address.line1": "Նար-Դոս 2",
    "footer.address.line2": "Երևան, Հայաստան",
    "common.discover": "Իմանալ ավելին",
    "common.shop": "Կատալոգ",
    "product.sku": "Արտ․ համար",
    "product.style": "Ոճ",
    "product.colour": "Գույն",
    "product.family": "Ընտանիք",
    "product.ean": "EAN",
    "product.requestPrice": "Հարցնել գինը",
    "product.pdf": "PDF բնութագիր",
    "product.energy": "Էներգապիտակ",
    "product.specs": "Բնութագրեր",
    "product.specs.show": "Ցույց տալ",
    "product.specs.hide": "Թաքցնել",
    "product.noPhoto": "լուսանկար չկա",
    "product.notFound": "Ապրանքը չի գտնվել",
    "product.loadError": "Չհաջողվեց բեռնել ապրանքը",
    "product.toCatalog": "Դեպի կատալոգ",
    "avail.inStock": "Առկա է",
    "avail.unit": "հատ",
    "avail.preOrder": "Նախնական պատվեր",
    "avail.delivery": "առաքում պահեստ",
    "avail.days": "օր",
    "avail.onRequest": "Ըստ պատվերի",
    "catalog.title": "Կատալոգ",
    "catalog.all": "Smeg-ի ամբողջ տեխնիկան",
    "catalog.unavailable": "Կատալոգը ժամանակավորապես անհասանելի է",
    "catalog.notFound": "Չի գտնվել",
    "catalog.modelsSuffix": "մոդել",
    "catalog.loading": "Բեռնվում է…",
    "catalog.empty": "Արդյունք չկա",
    "catalog.nothing": "Ոչինչ չի գտնվել։",
    "catalog.search": "Որոնում",
    "catalog.searchPlaceholder": "Արտիկուլ կամ անվանում",
    "catalog.sort.name": "Ըստ անվան",
    "catalog.sort.priceAsc": "Գին ↑",
    "catalog.sort.priceDesc": "Գին ↓",
    "catalog.filters": "Զտիչներ",
    "catalog.reset": "Մաքրել",
    "catalog.prev": "← Հետ",
    "catalog.next": "Առաջ →",
    "catalog.showCount": "Ցույց տալ",
    "catalog.itemsSuffix": "ապրանք",
    "facet.marketing": "Մարկետինգ",
    "facet.categories": "Կատեգորիաներ",
    "facet.all": "Բոլորը",
    "facet.colour": "Գույն",
    "facet.aesthetic": "Էսթետիկա",
    "facet.family": "Տեխնիկայի տեսակ",
    "flag.is_bestseller": "Բեսթսելլեր",
    "flag.is_new": "Նորույթ",
    "flag.is_special_offer": "Հատուկ առաջարկ",
    "flag.sale": "Զեղչով",
    "flag.is_featured": "Ընտրված",
    "badge.hit": "Հիթ",
    "badge.new": "Նորույթ",
    "badge.sale": "Ակցիա",
    "showcase.bestsellers.eyebrow": "Բեսթսելլերներ",
    "showcase.bestsellers.title": "Ամենավաճառվածները",
    "showcase.special.eyebrow": "Հատուկ առաջարկներ",
    "showcase.special.title": "Հատուկ առաջարկներ",
    "showcase.new.eyebrow": "Նորույթներ",
    "showcase.new.title": "Նորույթներ",
    "cta.allProducts": "Բոլոր ապրանքները",
    "cta.allOffers": "Բոլոր առաջարկները",
    "cta.catalog": "Կատալոգ",
    "section.partners.eyebrow": "Գործընկերներ",
    "section.partners.title": "Մեր գործընկերները",
  },
};

type I18nCtx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const Ctx = createContext<I18nCtx | null>(null);

export function getI18nDefaults(): Record<Lang, Dict> {
  return dicts;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");
  const [overlay, setOverlay] = useState<Record<Lang, Dict>>({ ru: {}, en: {}, hy: {} });
  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("smeg.lang") as Lang | null) : null;
    if (stored && stored in dicts) setLangState(stored);
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("site_content").select("key,value");
      if (cancelled || !data) return;
      const next: Record<Lang, Dict> = { ru: {}, en: {}, hy: {} };
      let stylesMap: ContentStylesMap = {};
      for (const row of data) {
        if (row.key === "__styles__") {
          stylesMap = (row.value as ContentStylesMap) ?? {};
          continue;
        }
        const value = (row.value ?? {}) as Record<string, Partial<Record<Lang, string>>>;
        for (const [k, perLang] of Object.entries(value)) {
          if (!perLang || typeof perLang !== "object") continue;
          (["ru", "en", "hy"] as Lang[]).forEach((l) => {
            const v = perLang[l];
            if (typeof v === "string" && v.trim()) next[l][k] = v;
          });
        }
      }
      setOverlay(next);
      if (typeof document !== "undefined") {
        const css = stylesToCss(stylesMap);
        let styleEl = document.getElementById("ck-runtime-styles") as HTMLStyleElement | null;
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = "ck-runtime-styles";
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = css;
        const fonts = collectGoogleFonts(stylesMap);
        document.querySelectorAll('link[data-ck-font="1"]').forEach((n) => n.remove());
        for (const f of fonts) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = `https://fonts.googleapis.com/css2?family=${f}&display=swap`;
          link.setAttribute("data-ck-font", "1");
          document.head.appendChild(link);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("smeg.lang", l);
  };
  const t = (key: string) => overlay[lang][key] ?? dicts[lang][key] ?? key;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}

/**
 * Pick a localized field with fallback to the base field (RU).
 * Example: pickLocalized(product, "name", "en")
 *   → product.name_en (if present) else product.name
 */
export function pickLocalized(
  obj: Record<string, unknown> | null | undefined,
  base: string,
  lang: Lang,
): string {
  if (!obj) return "";
  const key = lang === "ru" ? base : `${base}_${lang}`;
  const raw = obj[key];
  if (typeof raw === "string" && raw.trim()) return raw;
  const fallback = obj[base];
  return typeof fallback === "string" ? fallback : "";
}

/** Specs JSON localized with fallback. */
export function pickLocalizedSpecs(
  obj: Record<string, unknown> | null | undefined,
  lang: Lang,
): Record<string, string> {
  if (!obj) return {};
  const key = lang === "ru" ? "specs" : `specs_${lang}`;
  const raw = (obj[key] as Record<string, string> | null | undefined) ?? null;
  if (raw && Object.keys(raw).length) return raw;
  return (obj.specs as Record<string, string> | null | undefined) ?? {};
}