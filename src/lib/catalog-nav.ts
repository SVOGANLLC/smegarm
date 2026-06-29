import type { Lang } from "@/lib/i18n";

export type CatalogNavItem = {
  id: string;
  /** i18n key for label (nav.catalog.* or catalog.section.*) */
  labelKey: string;
  /** TanStack search object or path */
  to: string;
  search?: Record<string, string | undefined>;
};

export type CatalogNavColumn = {
  id: string;
  titleKey: string;
  items: CatalogNavItem[];
};

export const DEFAULT_CATALOG_NAV: CatalogNavColumn[] = [
  {
    id: "large",
    titleKey: "catalog.section.large",
    items: [
      { id: "refrigerators", labelKey: "nav.catalog.refrigerators", to: "/catalog", search: { category: "refrigerators" } },
      { id: "ovens", labelKey: "nav.catalog.ovens", to: "/catalog", search: { category: "ovens" } },
      { id: "hobs", labelKey: "nav.catalog.hobs", to: "/catalog", search: { category: "hobs" } },
      { id: "hoods", labelKey: "nav.catalog.hoods", to: "/catalog", search: { category: "hoods" } },
      { id: "dishwashers", labelKey: "nav.catalog.dishwashers", to: "/catalog", search: { category: "dishwashers" } },
      { id: "sinks", labelKey: "nav.catalog.sinks", to: "/catalog", search: { category: "sinks" } },
      { id: "large-all", labelKey: "nav.catalog.allLarge", to: "/catalog", search: { section: "large" } },
    ],
  },
  {
    id: "small",
    titleKey: "catalog.section.small",
    items: [
      { id: "kettles", labelKey: "nav.catalog.kettles", to: "/catalog", search: { category: "kettles" } },
      { id: "toasters", labelKey: "nav.catalog.toasters", to: "/catalog", search: { category: "toasters" } },
      { id: "coffee", labelKey: "nav.catalog.coffee", to: "/catalog", search: { category: "coffee-machines" } },
      { id: "blenders", labelKey: "nav.catalog.blenders", to: "/catalog", search: { category: "blenders" } },
      { id: "small-all", labelKey: "nav.catalog.allSmall", to: "/catalog", search: { section: "small" } },
    ],
  },
  {
    id: "more",
    titleKey: "nav.catalog.more",
    items: [
      { id: "accessories", labelKey: "catalog.section.accessories", to: "/catalog", search: { section: "accessories" } },
      { id: "sale", labelKey: "nav.catalog.sale", to: "/sale" },
      { id: "collections", labelKey: "nav.collections", to: "/#collections" },
    ],
  },
];

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function readConfigString(block: BlockValue | undefined, key: string): string {
  const field = block?.[key];
  if (!field) return "";
  return (field.ru || field.hy || field.en || "").trim();
}

export function parseCatalogNav(block: BlockValue | undefined): CatalogNavColumn[] {
  const raw = readConfigString(block, "config.tree");
  if (!raw) return DEFAULT_CATALOG_NAV;
  try {
    const parsed = JSON.parse(raw) as CatalogNavColumn[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* use default */
  }
  return DEFAULT_CATALOG_NAV;
}

export function serializeCatalogNav(columns: CatalogNavColumn[]): string {
  return JSON.stringify(columns, null, 2);
}
