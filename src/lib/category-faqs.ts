import type { Lang } from "@/lib/i18n";
import type { FaqItem } from "@/lib/seo";

type FaqBlock = Record<string, Partial<Record<Lang, Array<{ q: string; a: string }>>>>;

const STORE_FAQS: Record<Lang, FaqItem[]> = {
  hy: [
    {
      question: "Որտե՞ղ է Smeg Armenia ցուցասրահը",
      answer: "Ցուցասրահը գտնվում է Երևանում, Նար-Դոս 2 հասցեում։ Կարող եք այցելել խորհրդատվության և տեխնիկան տեղում տեսնելու համար։",
    },
    {
      question: "Արդյո՞ք Smeg Armenia-ն պաշտոնական ներկայացուցչություն է",
      answer: "Այո, smeg.am-ը Smeg-ի պաշտոնական ներկայացուցչությունն է Հայաստանում՝ իտալական խոշոր և փոքր կենցաղային տեխնիկայի համար։",
    },
    {
      question: "Ինչպե՞ս է կատարվում առաքումը",
      answer: "Առաքումը հասանելի է Երևանում և Հայաստանի մարզերում։ Մանրամասները կարող եք ճշտել պատվեր կատարելիս կամ կապ հաստատելով ցուցասրահի հետ։",
    },
  ],
  ru: [
    {
      question: "Где находится шоурум Smeg Armenia?",
      answer: "Шоурум расположен в Ереване по адресу ул. Нар-Дос, 2. Можно приехать на консультацию и посмотреть технику вживую.",
    },
    {
      question: "Smeg Armenia — официальный представитель?",
      answer: "Да, smeg.am — официальный представитель Smeg в Армении: итальянская крупная и мелкая бытовая техника.",
    },
    {
      question: "Как работает доставка?",
      answer: "Доставка доступна по Еревану и в регионы Армении. Точные условия уточняйте при оформлении заказа или в шоуруме.",
    },
  ],
  en: [
    {
      question: "Where is the Smeg Armenia showroom?",
      answer: "The showroom is at 2 Nar-Dos St, Yerevan. Visit for a consultation and to see appliances in person.",
    },
    {
      question: "Is Smeg Armenia an official representative?",
      answer: "Yes — smeg.am is the official Smeg representative in Armenia for Italian large and small domestic appliances.",
    },
    {
      question: "How does delivery work?",
      answer: "Delivery is available in Yerevan and across Armenia. Ask for details when placing an order or at the showroom.",
    },
  ],
};

export function getStoreFaqs(lang: Lang = "hy"): FaqItem[] {
  return STORE_FAQS[lang] ?? STORE_FAQS.hy;
}

function parseFaqList(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const q = typeof row?.q === "string" ? row.q.trim() : "";
      const a = typeof row?.a === "string" ? row.a.trim() : "";
      return q && a ? { question: q, answer: a } : null;
    })
    .filter((x): x is FaqItem => x !== null);
}

export function parseCategoryFaqsFromBlock(
  block: unknown,
  categorySlug: string,
  lang: Lang = "hy",
): FaqItem[] | null {
  if (!block || typeof block !== "object") return null;
  const entry = (block as FaqBlock)[categorySlug];
  if (!entry) return null;
  const list = parseFaqList(entry[lang] ?? entry.hy ?? entry.en ?? entry.ru);
  return list.length ? list : null;
}

export async function fetchCategoryFaqs(
  categorySlug: string,
  lang: Lang = "hy",
): Promise<FaqItem[] | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("site_content")
    .select("value")
    .eq("key", "category-faqs")
    .maybeSingle();
  return parseCategoryFaqsFromBlock(data?.value, categorySlug, lang);
}
