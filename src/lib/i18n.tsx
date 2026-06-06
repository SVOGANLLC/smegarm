import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ru" | "en" | "hy";

type Dict = Record<string, string>;

const dicts: Record<Lang, Dict> = {
  ru: {
    "nav.catalog": "Каталог",
    "nav.collections": "Коллекции",
    "nav.story": "Бренд",
    "nav.dealer": "Дилер в Армении",
    "nav.contact": "Контакты",
    "hero.eyebrow": "Официальный представитель SMEG в Армении",
    "hero.title": "Технологии,\nрождённые\nкрасотой.",
    "hero.subtitle":
      "Итальянская техника, превращающая каждое движение на кухне в ритуал.",
    "hero.cta": "Открыть каталог",
    "hero.cta2": "История бренда",
    "section.featured.eyebrow": "Избранное",
    "section.featured.title": "Иконы Smeg",
    "section.collections.eyebrow": "Коллекции",
    "section.collections.title": "Десять способов\nвыразить себя.",
    "section.categories.eyebrow": "Категории",
    "section.categories.title": "Каждая деталь\nна своём месте.",
    "section.benefits.eyebrow": "Почему Smeg",
    "section.story.eyebrow": "С 1948 года",
    "section.story.title": "Семейная история\nиз Гвасталлы.",
    "section.story.body":
      "Более семидесяти лет Smeg объединяет инженерию, дизайн и итальянскую культуру дома. Каждая модель — это диалог между функцией и формой.",
    "section.story.cta": "Узнать историю",
    "section.dealer.eyebrow": "Smeg Armenia",
    "section.dealer.title": "Showroom в Ереване",
    "section.dealer.body":
      "Приходите в наш салон, чтобы увидеть Smeg вживую, обсудить проект кухни с консультантом и оформить доставку по всей Армении.",
    "section.dealer.cta": "Записаться на визит",
    "footer.contact": "Контакты",
    "footer.address": "Адрес",
    "footer.follow": "Соцсети",
    "footer.rights": "Все права защищены.",
    "footer.designed": "Designed & Developed by",
    "common.discover": "Подробнее",
    "common.shop": "В каталог",
  },
  en: {
    "nav.catalog": "Shop",
    "nav.collections": "Collections",
    "nav.story": "Brand",
    "nav.dealer": "Armenia Dealer",
    "nav.contact": "Contact",
    "hero.eyebrow": "Official Smeg dealer in Armenia",
    "hero.title": "Technology,\nborn of\nbeauty.",
    "hero.subtitle":
      "Italian appliances that turn every kitchen gesture into a ritual.",
    "hero.cta": "Explore the catalog",
    "hero.cta2": "Our story",
    "section.featured.eyebrow": "Featured",
    "section.featured.title": "Smeg icons",
    "section.collections.eyebrow": "Collections",
    "section.collections.title": "Ten ways\nto express yourself.",
    "section.categories.eyebrow": "Categories",
    "section.categories.title": "Every detail\nin its place.",
    "section.benefits.eyebrow": "Why Smeg",
    "section.story.eyebrow": "Since 1948",
    "section.story.title": "A family story\nfrom Guastalla.",
    "section.story.body":
      "For over seventy years Smeg has united engineering, design and Italian home culture. Every model is a conversation between function and form.",
    "section.story.cta": "Discover the story",
    "section.dealer.eyebrow": "Smeg Armenia",
    "section.dealer.title": "Yerevan showroom",
    "section.dealer.body":
      "Visit our showroom to experience Smeg in person, plan your kitchen with a consultant and arrange delivery anywhere in Armenia.",
    "section.dealer.cta": "Book a visit",
    "footer.contact": "Contact",
    "footer.address": "Address",
    "footer.follow": "Follow",
    "footer.rights": "All rights reserved.",
    "footer.designed": "Designed & Developed by",
    "common.discover": "Discover",
    "common.shop": "Shop",
  },
  hy: {
    "nav.catalog": "Կատալոգ",
    "nav.collections": "Կոլեկցիաներ",
    "nav.story": "Բրենդ",
    "nav.dealer": "Հայաստան",
    "nav.contact": "Կապ",
    "hero.eyebrow": "Smeg-ի պաշտոնական ներկայացուցիչը Հայաստանում",
    "hero.title": "Տեխնոլոգիա՝\nծնված\nգեղեցկությունից։",
    "hero.subtitle":
      "Իտալական տեխնիկա, որը խոհանոցի յուրաքանչյուր շարժում վերածում է ծեսի։",
    "hero.cta": "Տեսնել կատալոգը",
    "hero.cta2": "Բրենդի պատմությունը",
    "section.featured.eyebrow": "Ընտրված",
    "section.featured.title": "Smeg-ի խորհրդանիշները",
    "section.collections.eyebrow": "Կոլեկցիաներ",
    "section.collections.title": "Տասը ձև՝\nարտահայտվելու։",
    "section.categories.eyebrow": "Կատեգորիաներ",
    "section.categories.title": "Ամեն մանրուք՝\nիր տեղում։",
    "section.benefits.eyebrow": "Ինչու Smeg",
    "section.story.eyebrow": "1948 թվականից",
    "section.story.title": "Ընտանեկան\nպատմություն Գուաստալայից։",
    "section.story.body":
      "Ավելի քան յոթանասուն տարի Smeg-ը միավորում է ինժեներիան, դիզայնը և տան իտալական մշակույթը։",
    "section.story.cta": "Բացահայտել պատմությունը",
    "section.dealer.eyebrow": "Smeg Armenia",
    "section.dealer.title": "Showroom Երևանում",
    "section.dealer.body":
      "Այցելեք մեր սրահ՝ տեսնելու Smeg-ը կենդանի, խորհրդակցելու և կազմակերպելու առաքում ողջ Հայաստանում։",
    "section.dealer.cta": "Ամրագրել այց",
    "footer.contact": "Կապ",
    "footer.address": "Հասցե",
    "footer.follow": "Հետևեք",
    "footer.rights": "Բոլոր իրավունքները պաշտպանված են։",
    "footer.designed": "Դիզայնը և մշակումը՝",
    "common.discover": "Իմանալ ավելին",
    "common.shop": "Կատալոգ",
  },
};

type I18nCtx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");
  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("smeg.lang") as Lang | null) : null;
    if (stored && stored in dicts) setLangState(stored);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("smeg.lang", l);
  };
  const t = (key: string) => dicts[lang][key] ?? key;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}