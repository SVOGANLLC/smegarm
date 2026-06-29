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
] as const;

export const ACCESSORY_CATEGORIES = [
  "Accessories",
  "Accessory",
  "Spare parts",
] as const;

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
