import type { CategoryStat } from "@/lib/products";

type BlockValue = Record<string, Partial<Record<"ru" | "en" | "hy", string>>>;

function readConfigString(block: BlockValue | undefined, key: string): string {
  const field = block?.[key];
  if (!field) return "";
  return (field.ru || field.hy || field.en || "").trim();
}

/** Slugs from site_content `categories.config.catalogOrder` (JSON array or newline list). */
export function parseCatalogOrder(block: BlockValue | undefined): string[] {
  const raw = readConfigString(block, "config.catalogOrder");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    /* fallback: newline / comma list */
  }
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeCatalogOrder(slugs: string[]): string {
  return JSON.stringify(slugs);
}

/** Apply admin-defined slug order; unknown categories keep their relative order at the end. */
export function sortCategoriesByOrder<T extends Pick<CategoryStat, "slug">>(
  categories: T[],
  orderSlugs: string[],
): T[] {
  if (!orderSlugs.length) return categories;
  const rank = new Map(orderSlugs.map((slug, i) => [slug, i]));
  return [...categories].sort((a, b) => {
    const ra = rank.get(a.slug);
    const rb = rank.get(b.slug);
    if (ra != null && rb != null) return ra - rb;
    if (ra != null) return -1;
    if (rb != null) return 1;
    return 0;
  });
}

/** Merge saved order with all current categories (new ones appended). */
export function mergeCategoryOrder(saved: string[], categories: CategoryStat[]): string[] {
  const all = categories.map((c) => c.slug);
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const slug of saved) {
    if (all.includes(slug) && !seen.has(slug)) {
      merged.push(slug);
      seen.add(slug);
    }
  }
  for (const slug of all) {
    if (!seen.has(slug)) merged.push(slug);
  }
  return merged;
}
