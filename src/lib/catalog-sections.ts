/** Section presets for /catalog?section=large|small|accessories (see docs/CATALOG_ROADMAP.md) */

export type CatalogSection = "large" | "small" | "accessories";

export const LARGE_FAMILIES = [
  "Refrigerator",
  "Oven",
  "Hob",
  "Cooker",
  "Dishwashers",
  "Sink",
  "Microwave",
  "Freezers",
  "Drawer",
  "Washing Machine",
  "Washer dryer",
  "Countertop Combi Oven",
  "Hood",
  "Wine cooler",
  "Blast Chiller",
  "Taps",
  "Lighting rails",
  "Electric barbecues",
  "Built-in Coffee machines",
] as const;

export const SMALL_FAMILIES = [
  "Kettles",
  "Toaster",
  "Blenders",
  "Hand Blenders",
  "Espresso Coffee Machine",
  "Drip filter Coffee Machine",
  "Coffee Grinder",
  "Milk Frother",
  "Kitchen Scales",
  "Citrus Juicer",
  "Coffee machine",
  "Insulated bottle",
  "Stand Mixer",
  "Food Processor",
  "Hand Mixer",
  "Cookware",
  "Soda makers",
  "Portable induction",
] as const;

export const ACCESSORY_CATEGORIES = [
  "Accessories",
  "Accessory",
  "Spare parts",
  "Аксессуары",
  "Аксессуар",
] as const;

/** Match accessory rows when section=accessories (any language). */
export function isAccessoryCategory(cat: {
  category: string;
  category_en?: string | null;
  slug?: string;
}): boolean {
  const slug = (cat.slug ?? "").toLowerCase();
  const en = (cat.category_en ?? cat.category).toLowerCase();
  const ru = cat.category.toLowerCase();
  return (
    slug.includes("accessor") ||
    en.includes("accessor") ||
    en.includes("spare part") ||
    ru.includes("аксессуар") ||
    ACCESSORY_CATEGORIES.some((a) => a.toLowerCase() === en || a === cat.category)
  );
}

export function resolveAccessoryCategoryRaw(categories: Array<{ category: string; raw: string[]; slug: string; category_en?: string | null }>): string[] {
  const raw = new Set<string>();
  for (const c of categories) {
    if (isAccessoryCategory(c)) c.raw.forEach((r) => raw.add(r));
  }
  return Array.from(raw);
}

export function sectionFamilies(section?: CatalogSection): string[] | undefined {
  if (!section) return undefined;
  if (section === "large") return [...LARGE_FAMILIES];
  if (section === "small") return [...SMALL_FAMILIES];
  return undefined;
}

export function sectionCategories(section?: CatalogSection): string[] | undefined {
  if (section === "accessories") return [...ACCESSORY_CATEGORIES];
  return undefined;
}

export function sectionTitleKey(section?: CatalogSection): string | undefined {
  if (!section) return undefined;
  return `catalog.section.${section}`;
}
