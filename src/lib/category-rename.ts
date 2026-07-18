import type { Lang } from "@/lib/i18n";
import {
  parseMainCards,
  parseSmallCategories,
  serializeMainCards,
  serializeSmallCategories,
} from "@/lib/categories-config";
import { parseCatalogOrder, serializeCatalogOrder } from "@/lib/category-order";
import {
  parseCatalogNavGroups,
  serializeCatalogNavGroups,
  type CatalogNavGroupDef,
} from "@/lib/catalog-nav-groups";
import { slugify } from "@/lib/products";

export type CategoryLabels = { ru: string; en: string; hy: string };

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function patchAllLangs(text: string): Partial<Record<Lang, string>> {
  return { ru: text, en: text, hy: text };
}

/** Rewrite homepage/menu category keys & slugs when the English category name changes. */
export function remapCategoryReferencesInSiteContent(
  value: BlockValue,
  oldEn: string,
  newEn: string,
): BlockValue {
  const oldKey = oldEn.trim();
  const nextKey = newEn.trim();
  if (!oldKey || !nextKey || oldKey === nextKey) return value;

  const oldSlug = slugify(oldKey);
  const nextSlug = slugify(nextKey);
  let next: BlockValue = { ...value };

  const cards = parseMainCards(value).map((c) =>
    c.categoryKey === oldKey ? { ...c, categoryKey: nextKey } : c,
  );
  next = { ...next, "config.mainCards": patchAllLangs(serializeMainCards(cards)) };

  const small = parseSmallCategories(value).map((k) => (k === oldKey ? nextKey : k));
  next = { ...next, "config.smallCategories": patchAllLangs(serializeSmallCategories(small)) };

  const order = parseCatalogOrder(value).map((s) => (s === oldSlug ? nextSlug : s));
  next = { ...next, "config.catalogOrder": patchAllLangs(serializeCatalogOrder(order)) };

  const groups: CatalogNavGroupDef[] = parseCatalogNavGroups(value).map((g) => ({
    ...g,
    members: g.members.map((m) =>
      m.type === "category" && m.slug === oldSlug ? { ...m, slug: nextSlug } : m,
    ),
  }));
  if (groups.length) {
    next = { ...next, "config.groups": patchAllLangs(serializeCatalogNavGroups(groups)) };
  }

  return next;
}
