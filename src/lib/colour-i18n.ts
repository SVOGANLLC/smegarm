import type { Lang } from "@/lib/i18n";

// Canonical English colour (products.colour) → translations for UI labels.
export const COLOUR_LABELS: Record<string, { ru: string; en: string; hy: string }> = {
  Anthracite: { ru: "Антрацит", en: "Anthracite", hy: "Անտրասիտ" },
  Beige: { ru: "Бежевый", en: "Beige", hy: "Բեժ" },
  Black: { ru: "Черный", en: "Black", hy: "Սև" },
  "Black with matt black frame": { ru: "Черный с матовой черной рамкой", en: "Black with matt black frame", hy: "Սև՝ մատ սև շրջանակով" },
  "Black with stainless steel effect frame": {
    ru: "Черный с рамкой под нержавеющую сталь",
    en: "Black with stainless steel effect frame",
    hy: "Սև՝ չժանգոտվող պողպատի էֆեկտով շրջանակով",
  },
  Blue: { ru: "Синий", en: "Blue", hy: "Կապույտ" },
  Brass: { ru: "Латунь", en: "Brass", hy: "Արույր" },
  "Cement / Concrete": { ru: "Цемент / Бетон", en: "Cement / Concrete", hy: "Ցեմենտ / Բետոն" },
  Champagne: { ru: "Шампань", en: "Champagne", hy: "Շամպայն" },
  Chrome: { ru: "Хром", en: "Chrome", hy: "Քրոմ" },
  "Chrome and black matt": { ru: "Хром и матовый черный", en: "Chrome and black matt", hy: "Քրոմ և մատ սև" },
  Copper: { ru: "Медь", en: "Copper", hy: "Պղինձ" },
  Cream: { ru: "Кремовый", en: "Cream", hy: "Կրեմագույն" },
  "Dark Grey Inox Look": { ru: "Темно-серый под нержавеющую сталь", en: "Dark Grey Inox Look", hy: "Մուգ մոխրագույն՝ ինոքսի տեսքով" },
  "Dark Inox": { ru: "Темный инокс", en: "Dark Inox", hy: "Մուգ ինոքս" },
  "Dark Inox Look": { ru: "Под темный инокс", en: "Dark Inox Look", hy: "Մուգ ինոքսի տեսքով" },
  "Decorated / Special": { ru: "Декорированный / Специальный", en: "Decorated / Special", hy: "Դեկորացված / Հատուկ" },
  "Dove Gray": { ru: "Серо-голубой", en: "Dove Gray", hy: "Աղավնագույն մոխրագույն" },
  "Emerald Green": { ru: "Изумрудно-зеленый", en: "Emerald Green", hy: "Զմրուխտ կանաչ" },
  Green: { ru: "Зеленый", en: "Green", hy: "Կանաչ" },
  Grey: { ru: "Серый", en: "Grey", hy: "Մոխրագույն" },
  "Grey blue": { ru: "Серо-голубой", en: "Grey blue", hy: "Մոխրագույն-կապույտ" },
  "Inox Look": { ru: "Под нержавеющую сталь", en: "Inox Look", hy: "Ինոքսի տեսքով" },
  "Lime green": { ru: "Лаймовый зеленый", en: "Lime green", hy: "Լայմ կանաչ" },
  "Marble look": { ru: "Под мрамор", en: "Marble look", hy: "Մարմարի տեսքով" },
  "Matt Black": { ru: "Матовый черный", en: "Matt Black", hy: "Մատ սև" },
  "Matt White": { ru: "Матовый белый", en: "Matt White", hy: "Մատ սպիտակ" },
  Moonlight: { ru: "Лунный свет", en: "Moonlight", hy: "Լուսնի լույս" },
  "Navy Blue": { ru: "Темно-синий", en: "Navy Blue", hy: "Մուգ կապույտ" },
  "Neptune Grey": { ru: "Серый «Нептун»", en: "Neptune Grey", hy: "Նեպտուն մոխրագույն" },
  Nickel: { ru: "Никель", en: "Nickel", hy: "Նիկել" },
  Oak: { ru: "Дуб", en: "Oak", hy: "Կաղնի" },
  Oats: { ru: "Овсяный", en: "Oats", hy: "Վարսակագույն" },
  "Old Brass": { ru: "Состаренная латунь", en: "Old Brass", hy: "Հին արույր" },
  "Olive green": { ru: "Оливковый", en: "Olive green", hy: "Ձիթապտղի կանաչ" },
  Orange: { ru: "Оранжевый", en: "Orange", hy: "Նարնջագույն" },
  "Pastel blue": { ru: "Пастельный голубой", en: "Pastel blue", hy: "Պաստել երկնագույն" },
  "Pastel green": { ru: "Пастельный зеленый", en: "Pastel green", hy: "Պաստել կանաչ" },
  "Perfectly Pale": { ru: "Нежно-пастельный", en: "Perfectly Pale", hy: "Նուրբ գունատ" },
  Pink: { ru: "Розовый", en: "Pink", hy: "Վարդագույն" },
  Red: { ru: "Красный", en: "Red", hy: "Կարմիր" },
  "Ruby Red": { ru: "Рубиново-красный", en: "Ruby Red", hy: "Սուտակ կարմիր" },
  Rust: { ru: "Ржаво-оранжевый", en: "Rust", hy: "Ժանգագույն" },
  "Sea Salt Green": { ru: "Зеленый «морская соль»", en: "Sea Salt Green", hy: "Ծովի աղի կանաչ" },
  Silver: { ru: "Серебристый", en: "Silver", hy: "Արծաթագույն" },
  "Slate Grey": { ru: "Грифельно-серый", en: "Slate Grey", hy: "Շիֆերի մոխրագույն" },
  "Stainless steel": { ru: "Нержавеющая сталь", en: "Stainless steel", hy: "Չժանգոտվող պողպատ" },
  "Stainless Steel and Glass": { ru: "Нержавеющая сталь и стекло", en: "Stainless Steel and Glass", hy: "Չժանգոտվող պողպատ և ապակի" },
  "Stainless steel/Black": { ru: "Нержавеющая сталь/черный", en: "Stainless steel/Black", hy: "Չժանգոտվող պողպատ/սև" },
  Steel: { ru: "Сталь", en: "Steel", hy: "Պողպատ" },
  "Storm Blue": { ru: "Грозовой синий", en: "Storm Blue", hy: "Փոթորկային կապույտ" },
  Taupe: { ru: "Серо-коричневый", en: "Taupe", hy: "Մոխրագորշ" },
  Turquoise: { ru: "Бирюзовый", en: "Turquoise", hy: "Փիրուզագույն" },
  White: { ru: "Белый", en: "White", hy: "Սպիտակ" },
  Yellow: { ru: "Желтый", en: "Yellow", hy: "Դեղին" },
};

export function colourLabel(canonical: string, lang: Lang): string {
  const m = COLOUR_LABELS[canonical];
  if (m) return m[lang] ?? canonical;
  return canonical;
}

/** Localized colour name for a product row (DB stores canonical EN in `colour`). */
export function localizedProductColour(
  p: { colour?: string | null; colour_en?: string | null; colour_hy?: string | null },
  lang: Lang,
): string {
  const canonical = (p.colour_en ?? p.colour ?? "").trim();
  if (lang === "hy" && p.colour_hy?.trim()) return p.colour_hy.trim();
  if (lang === "en") return canonical;
  if (lang === "ru") return colourLabel(canonical, "ru");
  return colourLabel(canonical, lang);
}
