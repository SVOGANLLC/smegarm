/** YouTube video for House of Coffee hero (Smeg official). */
export const HOUSE_OF_COFFEE_YOUTUBE_ID = "1jxQfFTH6-U";

const CDN = "https://cdn.jsdelivr.net/gh/edmanukyan1994/smeg-catalog-images@main";

function img(sku: string) {
  return `${CDN}/${sku}/${sku}_1.jpg`;
}

export type CoffeeCatalogLink = {
  titleKey: string;
  descKey?: string;
  category?: string;
  family?: string;
  q?: string;
  image?: string;
};

export const HOUSE_OF_COFFEE_SPOTLIGHT = {
  sku: "ECF03PGEU",
  image: img("ECF03PGEU"),
  catalog: { category: "espresso-coffee-machines", q: "cold brew" } as const,
};

export const HOUSE_OF_COFFEE_BUILTIN_IMAGE = img("CMS4104B3");

export const COFFEE_TYPE_LINKS: CoffeeCatalogLink[] = [
  {
    titleKey: "hoc.link.manualEspresso",
    q: "Manual",
    image: img("ECF03PGEU"),
  },
  {
    titleKey: "hoc.link.automatic",
    category: "espresso-coffee-machines",
    q: "BCC",
    image: img("BCC13SBMEU"),
  },
  {
    titleKey: "hoc.link.dripFilter",
    category: "espresso-coffee-machines",
    family: "Drip filter Coffee Machine",
    image: img("DCF02BLEU"),
  },
  {
    titleKey: "hoc.link.grinder",
    category: "coffee-grinders",
    image: img("CGF03CREU"),
  },
  {
    titleKey: "hoc.link.builtin",
    category: "espresso-coffee-machines",
    family: "Coffee machine",
    image: img("CMS4104B3"),
  },
  {
    titleKey: "hoc.link.milkFrother",
    category: "milk-frothers",
    image: img("MFF11CREU"),
  },
  {
    titleKey: "hoc.link.manualGrinder",
    q: "grinder",
    category: "espresso-coffee-machines",
    image: img("EGF03PBEU"),
  },
  {
    titleKey: "hoc.link.allEspresso",
    category: "espresso-coffee-machines",
    image: img("ECF12BLEU"),
  },
];

export function coffeeLinkToSearch(link: Pick<CoffeeCatalogLink, "category" | "family" | "q">) {
  return {
    category: link.category,
    family: link.family,
    q: link.q,
    page: 1 as const,
  };
}
