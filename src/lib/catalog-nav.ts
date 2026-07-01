import type { Lang } from "@/lib/i18n";
import type { CategoryStat } from "@/lib/products";
import { LARGE_FAMILIES, SMALL_FAMILIES } from "@/lib/catalog-sections";
import {
  type CatalogNavGroupDef,
  membersToNavItems,
  parseCatalogNavGroups,
} from "@/lib/catalog-nav-groups";
import { DEFAULT_CATALOG_NAV_GROUPS, buildDefaultNavColumns } from "@/lib/catalog-nav-defaults";

export type CatalogNavItem = {
  id: string;
  /** i18n key — omit when `labels` is set */
  labelKey?: string;
  /** Localized labels from DB category */
  labels?: Partial<Record<Lang, string>>;
  to: string;
  search?: Record<string, string | undefined>;
  /** Nested links under a group header */
  children?: CatalogNavItem[];
};

export type CatalogNavGroup = {
  id: string;
  labelKey?: string;
  labels?: Partial<Record<Lang, string>>;
  items: CatalogNavItem[];
};

export type CatalogNavColumn = {
  id: string;
  titleKey: string;
  /** smeg.com-style subgroups */
  groups?: CatalogNavGroup[];
  items: CatalogNavItem[];
};

function categoryToNavItem(cat: CategoryStat): CatalogNavItem {
  return {
    id: cat.slug,
    labels: {
      ru: cat.category_ru ?? cat.category,
      en: cat.category_en ?? cat.category,
      hy: cat.category_hy ?? cat.category,
    },
    to: "/catalog",
    search: { category: cat.slug },
  };
}

function groupDefToNavGroup(def: CatalogNavGroupDef, categories: CategoryStat[]): CatalogNavGroup {
  const childItems = membersToNavItems(def, categories).map((item) => ({
    id: item.id,
    labels: item.labels,
    to: "/catalog",
    search: item.search,
  }));
  return {
    id: def.id,
    labels: def.labels,
    items: childItems,
  };
}

/** Build mega-menu from subgroup definitions + live categories. */
export function buildCatalogNavFromGroups(
  groupDefs: CatalogNavGroupDef[],
  categories: CategoryStat[],
): CatalogNavColumn[] {
  const columns = buildDefaultNavColumns(groupDefs);
  return columns.map((col) => {
    if (!col.groups?.length) return col;
    const section = col.id === "large" ? "large" : col.id === "small" ? "small" : undefined;
    if (!section) return col;
    const defs = groupDefs.filter((g) => g.section === section);
    return {
      ...col,
      groups: defs.map((d) => groupDefToNavGroup(d, categories)),
    };
  });
}

/** Legacy: flat columns from category stats only. */
export function buildCatalogNavFromCategories(
  largeCats: CategoryStat[],
  smallCats: CategoryStat[],
): CatalogNavColumn[] {
  return [
    {
      id: "large",
      titleKey: "catalog.section.large",
      items: [
        ...largeCats.map(categoryToNavItem),
        { id: "large-all", labelKey: "nav.catalog.allLarge", to: "/catalog", search: { section: "large" } },
      ],
    },
    {
      id: "small",
      titleKey: "catalog.section.small",
      items: [
        ...smallCats.map(categoryToNavItem),
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
}

export const NAV_LARGE_FAMILIES = [...LARGE_FAMILIES];
export const NAV_SMALL_FAMILIES = [...SMALL_FAMILIES];

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function readConfigString(block: BlockValue | undefined, key: string): string {
  const field = block?.[key];
  if (!field) return "";
  return (field.ru || field.hy || field.en || "").trim();
}

export function parseCatalogNav(block: BlockValue | undefined): CatalogNavColumn[] | null {
  const raw = readConfigString(block, "config.tree");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CatalogNavColumn[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* fallback */
  }
  return null;
}

export function serializeCatalogNav(columns: CatalogNavColumn[]): string {
  return JSON.stringify(columns, null, 2);
}

export function navItemLabel(item: CatalogNavItem, lang: Lang, t: (k: string) => string): string {
  if (item.labels) {
    return item.labels[lang] || item.labels.en || item.labels.ru || item.id;
  }
  return item.labelKey ? t(item.labelKey) : item.id;
}

export function getEffectiveNavGroups(block: BlockValue | undefined): CatalogNavGroupDef[] {
  const custom = parseCatalogNavGroups(block);
  return custom.length ? custom : DEFAULT_CATALOG_NAV_GROUPS;
}

export { parseCatalogNavGroups, serializeCatalogNavGroups } from "@/lib/catalog-nav-groups";
