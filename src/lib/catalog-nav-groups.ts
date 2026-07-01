import type { Lang } from "@/lib/i18n";
import type { CategoryStat } from "@/lib/products";
import { slugify } from "@/lib/products";
import type { CatalogSection } from "@/lib/catalog-sections";
import { familyLabel } from "@/lib/category-i18n";

export type NavGroupMember =
  | { type: "category"; slug: string }
  | { type: "family"; name: string }
  | { type: "model_group"; key: string }
  | { type: "sku"; sku: string };

export type CatalogNavGroupDef = {
  id: string;
  section: CatalogSection;
  labels: Partial<Record<Lang, string>>;
  members: NavGroupMember[];
};

export type NavGroupFilters = {
  skus: string[];
  modelGroups: string[];
  families: string[];
  categoryIn: string[];
  section?: CatalogSection;
};

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function readConfigString(block: BlockValue | undefined, key: string): string {
  const field = block?.[key];
  if (!field) return "";
  return (field.ru || field.hy || field.en || "").trim();
}

export function parseCatalogNavGroups(block: BlockValue | undefined): CatalogNavGroupDef[] {
  const raw = readConfigString(block, "config.groups");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        const r = row as Record<string, unknown>;
        const id = String(r.id ?? "").trim();
        if (!id) return null;
        const section = (r.section as CatalogSection) || "small";
        const labels = (r.labels as Partial<Record<Lang, string>>) ?? {};
        const members = Array.isArray(r.members)
          ? (r.members as NavGroupMember[]).filter((m) => m && typeof m === "object" && "type" in m)
          : [];
        return { id, section, labels, members } satisfies CatalogNavGroupDef;
      })
      .filter((x): x is CatalogNavGroupDef => !!x);
  } catch {
    return [];
  }
}

export function serializeCatalogNavGroups(groups: CatalogNavGroupDef[]): string {
  return JSON.stringify(groups, null, 2);
}

export function navGroupLabel(group: CatalogNavGroupDef, lang: Lang): string {
  return group.labels[lang] || group.labels.en || group.labels.ru || group.id;
}

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  oven: "ovens",
  ovens: "ovens",
  "food-processor": "food-processors",
  "food-processors": "food-processors",
  knives: "knife-sets",
  "knife-block": "knife-sets",
  "knife-sets": "knife-sets",
  "stand-mixer": "stand-mixers",
  "stand-mixers": "stand-mixers",
  kettles: "kettles",
  toasters: "toasters",
  hoods: "hoods",
  "wine-coolers": "wine-coolers",
  "soda-makers": "soda-makers",
  cookware: "cookware",
  taps: "taps",
  "built-in-coffee-machines": "built-in-coffee-machines",
  "portable-induction": "portable-induction",
  "countertop-ovens": "countertop-ovens",
  "blast-chillers": "blast-chillers",
};

/** DB may use slightly different family spellings. */
const FAMILY_ALIASES: Record<string, string[]> = {
  "Soda makers": ["Soda Maker"],
  "Insulated bottle": ["Insulated bottle", "Non insulated bottle"],
  Blenders: ["Blenders"],
  Toaster: ["Toaster"],
  Kettles: ["Kettles"],
};

function expandFamilies(names: string[]): string[] {
  const out = new Set<string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    out.add(trimmed);
    for (const alt of FAMILY_ALIASES[trimmed] ?? []) out.add(alt);
  }
  return Array.from(out);
}

function findCategoryStat(slug: string, categories: CategoryStat[]): CategoryStat | undefined {
  const normalized = CATEGORY_SLUG_ALIASES[slug] ?? slug;
  return (
    categories.find((c) => c.slug === normalized) ??
    categories.find((c) => c.slug === slug) ??
    categories.find((c) => c.slug === slug.toLowerCase()) ??
    categories.find((c) => slugify(c.category_en ?? c.category) === normalized)
  );
}

function categoryRawFromSlug(slug: string, categories: CategoryStat[]): string[] {
  const hit = findCategoryStat(slug, categories);
  return hit?.raw ?? [];
}

export function resolveNavGroupFilters(
  groupId: string,
  groups: CatalogNavGroupDef[],
  categories: CategoryStat[],
): NavGroupFilters | null {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  const skus = new Set<string>();
  const modelGroups = new Set<string>();
  const families = new Set<string>();
  const categoryIn = new Set<string>();

  for (const m of group.members) {
    if (m.type === "sku") skus.add(m.sku.trim().toUpperCase());
    if (m.type === "model_group") modelGroups.add(m.key.trim());
    if (m.type === "family") {
      for (const fam of expandFamilies(m.name)) families.add(fam);
    }
    if (m.type === "category") {
      for (const raw of categoryRawFromSlug(m.slug, categories)) categoryIn.add(raw);
    }
  }

  return {
    skus: Array.from(skus),
    modelGroups: Array.from(modelGroups),
    families: Array.from(families),
    categoryIn: Array.from(categoryIn),
    section: group.section,
  };
}

/** Products matching a nav group (union of members). */
export function productMatchesNavGroup(
  row: { sku: string; model_group?: string | null; family?: string | null; category?: string | null },
  filters: NavGroupFilters,
  categories: CategoryStat[],
): boolean {
  if (filters.skus.length) return filters.skus.includes(row.sku.toUpperCase());

  let any = false;
  if (filters.modelGroups.length && row.model_group && filters.modelGroups.includes(row.model_group)) {
    any = true;
  }
  if (filters.families.length && row.family && filters.families.includes(row.family)) {
    any = true;
  }
  if (filters.categoryIn.length && row.category && filters.categoryIn.includes(row.category)) {
    any = true;
  }
  if (!filters.modelGroups.length && !filters.families.length && !filters.categoryIn.length) {
    return false;
  }
  return any;
}

export function membersToNavItems(
  group: CatalogNavGroupDef,
  categories: CategoryStat[],
): Array<{ id: string; labels: Partial<Record<Lang, string>>; search: Record<string, string> }> {
  const items: Array<{ id: string; labels: Partial<Record<Lang, string>>; search: Record<string, string> }> = [];
  const seen = new Set<string>();

  for (const m of group.members) {
    if (m.type === "category") {
      const cat = findCategoryStat(m.slug, categories);
      if (!cat || seen.has(`cat:${cat.slug}`)) continue;
      seen.add(`cat:${cat.slug}`);
      items.push({
        id: `${group.id}-${cat.slug}`,
        labels: {
          ru: cat.category_ru ?? cat.category,
          en: cat.category_en ?? cat.category,
          hy: cat.category_hy ?? cat.category,
        },
        search: { category: cat.slug },
      });
    }
    if (m.type === "family" && !seen.has(`fam:${m.name}`)) {
      seen.add(`fam:${m.name}`);
      items.push({
        id: `${group.id}-fam-${slugify(m.name)}`,
        labels: {
          ru: familyLabel(m.name, "ru"),
          en: familyLabel(m.name, "en"),
          hy: familyLabel(m.name, "hy"),
        },
        search: { family: m.name },
      });
    }
  }

  return items;
}
