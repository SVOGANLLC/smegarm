import type { Lang } from "@/lib/i18n";

// Canonical English category name → translations.
// Keys must match what comes from the DB `category_en` (or `category` when
// `category_en` is empty). Unknown categories fall back to the canonical key.
export const CATEGORY_LABELS: Record<string, { ru: string; en: string; hy: string }> = {
  Refrigerators: { ru: "Холодильники", en: "Refrigerators", hy: "Սառնարաններ" },
  Hobs: { ru: "Варочные панели", en: "Hobs", hy: "Գազօջախներ և սալօջախներ" },
  Accessories: { ru: "Аксессуары", en: "Accessories", hy: "Աքսեսուարներ" },
  Hoods: { ru: "Вытяжки", en: "Hoods", hy: "Օդաքարշներ" },
  Oven: { ru: "Духовые шкафы", en: "Ovens", hy: "Վառարաններ" },
  Ovens: { ru: "Духовые шкафы", en: "Ovens", hy: "Վառարաններ" },
  Sinks: { ru: "Мойки", en: "Sinks", hy: "Լվացարաններ" },
  Dishwashers: { ru: "Посудомоечные машины", en: "Dishwashers", hy: "Սպասք լվացող մեքենաներ" },
  Cookers: { ru: "Плиты", en: "Cookers", hy: "Խոհանոցային վառարաններ" },
  Taps: { ru: "Смесители", en: "Taps", hy: "Ծորակներ" },
  Kettles: { ru: "Чайники", en: "Kettles", hy: "Թեյնիկներ" },
  "Espresso coffee machines": {
    ru: "Кофемашины",
    en: "Espresso coffee machines",
    hy: "Սուրճի մեքենաներ",
  },
  Toasters: { ru: "Тостеры", en: "Toasters", hy: "Տոստերներ" },
  "Microwave ovens": { ru: "Микроволновые печи", en: "Microwave ovens", hy: "Միկրոալիքային վառարաններ" },
  Cookware: { ru: "Посуда", en: "Cookware", hy: "Խոհանոցային սպասք" },
  "Milk frothers": { ru: "Капучинаторы", en: "Milk frothers", hy: "Կաթի փրփրեցուցիչներ" },
  "Tumble dryer": { ru: "Сушильные машины", en: "Tumble dryers", hy: "Չորանոցներ" },
  "Stand mixers": { ru: "Планетарные миксеры", en: "Stand mixers", hy: "Միքսերներ" },
  Blenders: { ru: "Блендеры", en: "Blenders", hy: "Բլենդերներ" },
  "Wine coolers": { ru: "Винные шкафы", en: "Wine coolers", hy: "Գինու պահարաններ" },
  "Water bottles": { ru: "Бутылки для воды", en: "Water bottles", hy: "Ջրի շշեր" },
  "Coffee grinders": { ru: "Кофемолки", en: "Coffee grinders", hy: "Սրճաղացներ" },
  "Built-in drawers": { ru: "Встраиваемые ящики", en: "Built-in drawers", hy: "Ներկառուցվող դարակներ" },
  "Hand blenders": { ru: "Погружные блендеры", en: "Hand blenders", hy: "Ձեռքի բլենդերներ" },
  "Citrus juicers": { ru: "Соковыжималки для цитрусовых", en: "Citrus juicers", hy: "Ցիտրուսի հյութահան" },
  Freezers: { ru: "Морозильники", en: "Freezers", hy: "Սառցարաններ" },
  "Tabletop ovens": { ru: "Настольные печи", en: "Tabletop ovens", hy: "Սեղանադիր վառարաններ" },
  "Soda makers": { ru: "Сифоны для газирования воды", en: "Soda makers", hy: "Գազավորման սարքեր" },
  Lighting: { ru: "Освещение", en: "Lighting", hy: "Լուսավորություն" },
  "Knife sets": { ru: "Наборы ножей", en: "Knife sets", hy: "Դանակների հավաքածուներ" },
  "Washer dryer": { ru: "Стирально-сушильные машины", en: "Washer dryer", hy: "Լվացք-չորանոց մեքենաներ" },
  "Washing Machine": { ru: "Стиральные машины", en: "Washing machine", hy: "Լվացքի մեքենաներ" },
  "Hand mixers": { ru: "Ручные миксеры", en: "Hand mixers", hy: "Ձեռքի միքսերներ" },
  "Electric barbecues": { ru: "Электрические грили", en: "Electric barbecues", hy: "Էլեկտրական բարբեքյուներ" },
  "Blast chillers": { ru: "Шокеры (быстрое охлаждение)", en: "Blast chillers", hy: "Արագ սառեցուցիչներ" },
  "Kitchen scales": { ru: "Кухонные весы", en: "Kitchen scales", hy: "Խոհանոցային կշեռքներ" },
};

export function categoryLabel(canonical: string, lang: Lang): string {
  const m = CATEGORY_LABELS[canonical];
  if (m) return m[lang] ?? canonical;
  return canonical;
}