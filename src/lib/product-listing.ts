import type { ProductCard, Variant } from "@/lib/products";
import { buildProductGroups, type GroupSkuRow } from "@/lib/catalog-grouping";
import { fetchSkusMatchingSpecFilters, type SpecFilters } from "@/lib/spec-filters";

export type ListingFilterState = {
  colours?: string[];
  aesthetics?: string[];
  inStock?: boolean;
  specFilters?: SpecFilters;
};

export function tallyListingFacet(
  products: ProductCard[],
  key: "colour" | "aesthetic" | "category",
): Array<{ value: string; count: number }> {
  const m = new Map<string, number>();
  for (const p of products) {
    const v = (p[key as keyof ProductCard] as string | null)?.trim();
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export async function filterListingProducts(
  products: ProductCard[],
  filters: ListingFilterState,
): Promise<ProductCard[]> {
  let skus: Set<string> | null = null;

  if (filters.specFilters && Object.keys(filters.specFilters).length > 0) {
    const matched = await fetchSkusMatchingSpecFilters(filters.specFilters);
    skus = new Set(matched ?? []);
    if (!skus.size) return [];
  }

  return products.filter((p) => {
    if (skus && !skus.has(p.sku)) return false;
    if (filters.colours?.length && !filters.colours.includes(p.colour ?? "")) return false;
    if (filters.aesthetics?.length && !filters.aesthetics.includes(p.aesthetic ?? "")) return false;
    if (filters.inStock && p.availability !== "in_stock") return false;
    return true;
  });
}

export type ListingDisplayItem = ProductCard & {
  variants?: Variant[];
  variantCount?: number;
  priceFrom?: number | null;
};

export function groupListingProducts(
  products: ProductCard[],
  variantsMap: Map<string, Variant[]>,
): ListingDisplayItem[] {
  const rows: GroupSkuRow[] = products.map((p) => ({
    sku: p.sku,
    model_group: p.model_group ?? null,
    price_amd: p.price_amd,
    name: p.name,
  }));
  const groups = buildProductGroups(rows);
  const bySku = new Map(products.map((p) => [p.sku, p]));

  return groups.map((g) => {
    const p = bySku.get(g.representativeSku)!;
    const mg = p.model_group?.trim();
    const groupSkuSet = new Set(g.skus);
    const variants = mg
      ? variantsMap.get(mg)?.filter((v) => groupSkuSet.has(v.sku))
      : undefined;
    const variantCount = variants?.length ?? 1;
    return {
      ...p,
      variants,
      variantCount,
      priceFrom: variantCount > 1 ? g.priceFrom : null,
    };
  });
}
