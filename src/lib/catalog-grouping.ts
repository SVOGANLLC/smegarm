import type { Variant } from "@/lib/products";

export type GroupSkuRow = {
  sku: string;
  model_group: string | null;
  price_amd: number | null;
  name?: string;
};

export type ProductGroup = {
  key: string;
  skus: string[];
  representativeSku: string;
  priceFrom: number | null;
};

export function groupKeyFor(row: GroupSkuRow): string {
  const mg = row.model_group?.trim();
  return mg ? mg : row.sku;
}

/** Pick one SKU per model_group; lowest price, then alphabetical. */
export function buildProductGroups(rows: GroupSkuRow[]): ProductGroup[] {
  const map = new Map<string, GroupSkuRow[]>();
  for (const row of rows) {
    const key = groupKeyFor(row);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  const groups: ProductGroup[] = [];
  for (const [key, members] of map) {
    const sorted = [...members].sort((a, b) => {
      const pa = a.price_amd ?? Number.MAX_SAFE_INTEGER;
      const pb = b.price_amd ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return a.sku.localeCompare(b.sku);
    });
    const prices = members.map((m) => m.price_amd).filter((p): p is number => p != null);
    groups.push({
      key,
      skus: members.map((m) => m.sku),
      representativeSku: sorted[0].sku,
      priceFrom: prices.length ? Math.min(...prices) : null,
    });
  }
  return groups;
}

export function sortGroups(
  groups: ProductGroup[],
  rowsBySku: Map<string, GroupSkuRow>,
  sort?: "name" | "price-asc" | "price-desc",
  shuffleSeed?: number,
): ProductGroup[] {
  if (!sort) {
    if (shuffleSeed == null) return groups;
    let state = shuffleSeed >>> 0;
    const rand = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0xffffffff;
    };
    const arr = [...groups];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const rep = (g: ProductGroup) => rowsBySku.get(g.representativeSku);
  return [...groups].sort((a, b) => {
    if (sort === "price-asc") return (a.priceFrom ?? 0) - (b.priceFrom ?? 0);
    if (sort === "price-desc") return (b.priceFrom ?? 0) - (a.priceFrom ?? 0);
    const na = rep(a)?.name ?? "";
    const nb = rep(b)?.name ?? "";
    return na.localeCompare(nb);
  });
}

/** Deduplicate colour variants (same logic as ColorSwitcher). */
export function dedupeVariants(variants: Variant[]): Variant[] {
  const seen = new Set<string>();
  const out: Variant[] = [];
  for (const v of variants) {
    const colourKey = v.colour_en ?? v.colour ?? "";
    const key = colourKey === "Decorated / Special" ? v.sku : colourKey;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}
