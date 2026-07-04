import { supabase } from "@/integrations/supabase/client";
import { canonicalCategoryKey } from "@/lib/category-i18n";
import { fetchSkusMatchingSpecFilters, type SpecFilters } from "@/lib/spec-filters";
import { isFuzzySearchEnabled } from "@/lib/search";
import type { NavGroupFilters } from "@/lib/catalog-nav-groups";
import {
  buildProductGroups,
  dedupeVariants,
  normalizeShuffleSeed,
  sortGroups,
  variantGroupKey,
  variantMatchesGroupKey,
  type GroupSkuRow,
} from "@/lib/catalog-grouping";

/** Keep PostgREST GET URLs under nginx header limits (long `.in()` lists 414). */
const SKU_IN_CHUNK = 80;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type Product = {
  sku: string;
  name: string;
  category: string | null;
  brand: string | null;
  aesthetic: string | null;
  colour: string | null;
  family: string | null;
  ean: string | null;
  description: string | null;
  specs: Record<string, string>;
  main_image: string | null;
  images: string[];
  pdf: string | null;
  energy_label: string | null;
  url: string | null;
  model_group?: string | null;
  theme_key?: string | null;
  availability?: string | null;
  stock_qty?: number | null;
  stock_reserved?: number | null;
  lead_time_days?: number | null;
  price_amd?: number | null;
  price_old?: number | null;
  name_en?: string | null;
  name_hy?: string | null;
  description_en?: string | null;
  description_hy?: string | null;
  specs_en?: Record<string, string> | null;
  specs_hy?: Record<string, string> | null;
  category_en?: string | null;
  category_hy?: string | null;
  colour_en?: string | null;
  colour_hy?: string | null;
};

export type ProductCard = Product & {
  aesthetic?: string | null;
  price_amd: number | null;
  price_old: number | null;
  discount_percent: number;
  availability: string;
  is_published: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_special_offer: boolean;
  badge_text: string | null;
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CategoryStat = {
  /** Canonical English key (falls back to raw `category` when no translation exists). */
  category: string;
  /** All raw `category` values that collapse into this canonical group. Use with `.in('category', raw)`. */
  raw: string[];
  /** Best-effort localized label snapshots collected from the DB rows in the group. */
  category_en?: string | null;
  category_hy?: string | null;
  category_ru?: string | null;
  slug: string;
  count: number;
};

export async function fetchCategories(): Promise<CategoryStat[]> {
  const { data, error } = await supabase
    .from("products")
    .select("category,category_en,category_hy")
    .not("category", "is", null);
  if (error) throw error;
  const hasCyrillic = (s: string) => /[\u0400-\u04FF]/.test(s);
  const hasArmenian = (s: string) => /[\u0530-\u058F]/.test(s);
  const groups = new Map<
    string,
    { count: number; raw: Set<string>; en?: string | null; hy?: string | null; ru?: string | null }
  >();
  for (const row of data ?? []) {
    const r = row as { category: string | null; category_en: string | null; category_hy: string | null };
    const raw = r.category?.trim();
    if (!raw) continue;
    const canonical = canonicalCategoryKey(raw, r.category_en, r.category_hy);
    const cur = groups.get(canonical) ?? { count: 0, raw: new Set<string>() };
    cur.count += 1;
    cur.raw.add(raw);
    if (!cur.en) cur.en = r.category_en?.trim() || (hasCyrillic(raw) || hasArmenian(raw) ? null : raw);
    if (!cur.hy && r.category_hy?.trim()) cur.hy = r.category_hy.trim();
    if (!cur.hy && hasArmenian(raw)) cur.hy = raw;
    if (!cur.ru && hasCyrillic(raw)) cur.ru = raw;
    groups.set(canonical, cur);
  }
  return Array.from(groups.entries())
    .map(([canonical, v]) => ({
      category: canonical,
      raw: Array.from(v.raw),
      category_en: v.en ?? canonical,
      category_hy: v.hy ?? null,
      category_ru: v.ru ?? null,
      slug: slugify(canonical),
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count);
}

type CategoryRow = { category: string | null; category_en: string | null; category_hy: string | null };

function groupCategoryRows(rows: CategoryRow[]): CategoryStat[] {
  const hasCyrillic = (s: string) => /[\u0400-\u04FF]/.test(s);
  const hasArmenian = (s: string) => /[\u0530-\u058F]/.test(s);
  const groups = new Map<
    string,
    { count: number; raw: Set<string>; en?: string | null; hy?: string | null; ru?: string | null }
  >();
  for (const row of rows) {
    const raw = row.category?.trim();
    if (!raw) continue;
    const canonical = canonicalCategoryKey(raw, row.category_en, row.category_hy);
    const cur = groups.get(canonical) ?? { count: 0, raw: new Set<string>() };
    cur.count += 1;
    cur.raw.add(raw);
    if (!cur.en) cur.en = row.category_en?.trim() || (hasCyrillic(raw) || hasArmenian(raw) ? null : raw);
    if (!cur.hy && row.category_hy?.trim()) cur.hy = row.category_hy.trim();
    if (!cur.hy && hasArmenian(raw)) cur.hy = raw;
    if (!cur.ru && hasCyrillic(raw)) cur.ru = raw;
    groups.set(canonical, cur);
  }
  return Array.from(groups.entries())
    .map(([canonical, v]) => ({
      category: canonical,
      raw: Array.from(v.raw),
      category_en: v.en ?? canonical,
      category_hy: v.hy ?? null,
      category_ru: v.ru ?? null,
      slug: slugify(canonical),
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Categories that have at least one product in the given catalog context (section, family, etc.). */
export async function fetchCategoriesScoped(opts: {
  families?: string[];
  categoryIn?: string[];
  inStock?: boolean;
}): Promise<CategoryStat[]> {
  let q = supabase
    .from("products")
    .select("category,category_en,category_hy")
    .eq("is_published", true)
    .not("category", "is", null);
  if (opts.families?.length) q = q.in("family", opts.families);
  if (opts.categoryIn?.length) q = q.in("category", opts.categoryIn);
  if (opts.inStock) q = q.eq("availability", "in_stock");
  const { data, error } = await q;
  if (error) throw error;
  return groupCategoryRows((data ?? []) as CategoryRow[]);
}

export async function fetchProducts(opts: {
  category?: string;
  aesthetic?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: Product[]; total: number }> {
  let q = supabase
    .from("products")
    .select(
      "sku,name,category,brand,aesthetic,colour,family,ean,description,specs,main_image,images,pdf,energy_label,url",
      { count: "exact" },
    );
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.aesthetic) q = q.eq("aesthetic", opts.aesthetic);
  if (opts.search) q = q.ilike("name", `%${opts.search}%`);
  q = q.order("name", { ascending: true });
  const limit = opts.limit ?? 48;
  const offset = opts.offset ?? 0;
  q = q.range(offset, offset + limit - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { items: (data ?? []) as Product[], total: count ?? 0 };
}

export async function fetchProductBySku(sku: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw error;
  return (data as Product | null) ?? null;
}

export async function fetchFeatured(skus: string[]): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "sku,name,name_en,name_hy,category,category_en,category_hy,aesthetic,colour,colour_en,colour_hy,main_image,images,price_amd,price_old,discount_percent,availability,stock_qty,stock_reserved,lead_time_days",
    )
    .in("sku", skus);
  if (error) throw error;
  return (data ?? []) as Product[];
}

export const CARD_COLS =
  "sku,name,name_en,name_hy,category,category_en,category_hy,aesthetic,colour,colour_en,colour_hy,model_group,main_image,price_amd,price_old,discount_percent,availability,stock_qty,stock_reserved,lead_time_days,is_published,is_featured,is_new,is_bestseller,is_special_offer,badge_text";

export async function fetchProductsBySkus(skus: string[]): Promise<ProductCard[]> {
  const unique = [...new Set(skus.filter(Boolean))];
  if (!unique.length) return [];
  const { data, error } = await supabase
    .from("products")
    .select(CARD_COLS)
    .in("sku", unique)
    .eq("is_published", true);
  if (error) throw error;
  const bySku = new Map(((data ?? []) as ProductCard[]).map((p) => [p.sku, p]));
  return unique.map((sku) => bySku.get(sku)).filter((p): p is ProductCard => !!p);
}

export type AdminModelGroup = {
  model_group: string;
  product_count: number;
  colour_count: number;
  sample_sku: string;
  sample_name: string;
  family: string | null;
};

/** Published product lines with 2+ variants (for admin group naming). */
export async function fetchAdminModelGroups(): Promise<AdminModelGroup[]> {
  const { data, error } = await supabase
    .from("products")
    .select("model_group, sku, name, colour, family")
    .eq("is_published", true)
    .not("model_group", "is", null);
  if (error) throw error;

  const map = new Map<
    string,
    { skus: Set<string>; colours: Set<string>; sample_sku: string; sample_name: string; family: string | null }
  >();

  for (const row of data ?? []) {
    const mg = (row.model_group as string)?.trim();
    if (!mg) continue;
    const entry = map.get(mg) ?? {
      skus: new Set<string>(),
      colours: new Set<string>(),
      sample_sku: row.sku as string,
      sample_name: (row.name as string) ?? "",
      family: (row.family as string | null) ?? null,
    };
    entry.skus.add(row.sku as string);
    const c = (row.colour as string | null)?.trim();
    if (c) entry.colours.add(c);
    map.set(mg, entry);
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.skus.size >= 2)
    .map(([model_group, v]) => ({
      model_group,
      product_count: v.skus.size,
      colour_count: v.colours.size,
      sample_sku: v.sample_sku,
      sample_name: v.sample_name,
      family: v.family,
    }))
    .sort((a, b) => a.model_group.localeCompare(b.model_group));
}

export async function fetchProductsByFlag(
  flag: "is_featured" | "is_new" | "is_bestseller" | "is_special_offer",
  limit = 8,
) {
  const { data, error } = await supabase
    .from("products")
    .select(CARD_COLS)
    .eq(flag, true)
    .eq("is_published", true)
    .order("sort_weight", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as ProductCard[];
}

export type CollectionSection = "design" | "timeless" | "special";

export type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  is_published: boolean;
  sort_weight: number;
  section?: CollectionSection | null;
  name_en?: string | null;
  name_hy?: string | null;
  description_en?: string | null;
  description_hy?: string | null;
};

export type ColorSwatch = { colour: string; hex: string; sort_order: number };

export type Theme = {
  key: string;
  name: string;
  background_image: string | null;
  background_color: string | null;
  accent_color: string | null;
  card_bg: string | null;
  description: string | null;
  name_en?: string | null;
  name_hy?: string | null;
  description_en?: string | null;
  description_hy?: string | null;
};

export type Variant = {
  sku: string;
  colour: string | null;
  colour_en: string | null;
  colour_hy: string | null;
  main_image: string | null;
  price_amd?: number | null;
  model_group?: string | null;
  name?: string | null;
  name_en?: string | null;
  name_hy?: string | null;
  availability?: string | null;
  stock_qty?: number | null;
  stock_reserved?: number | null;
  lead_time_days?: number | null;
};

export type CatalogDisplayItem = Product & {
  variants?: Variant[];
  variantCount?: number;
  priceFrom?: number | null;
};

export type SearchSuggestion = {
  sku: string;
  name: string;
  category: string | null;
  colour: string | null;
  main_image: string | null;
  price_amd: number | null;
  is_published: boolean;
  rank: number;
};

export async function searchProductsRpc(
  query: string,
  opts: { onlyPublished?: boolean; limit?: number; fuzzy?: boolean } = {},
): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const baseArgs = {
    q: trimmed,
    only_published: opts.onlyPublished ?? true,
    max_rows: opts.limit ?? 8,
  };
  const useFuzzy = opts.fuzzy ?? isFuzzySearchEnabled();

  if (!useFuzzy) {
    const { data, error } = await supabase.rpc("search_products", baseArgs);
    if (error) throw error;
    return (data ?? []) as SearchSuggestion[];
  }

  const modern = await supabase.rpc("search_products", { ...baseArgs, p_fuzzy: true });
  if (!modern.error) return (modern.data ?? []) as SearchSuggestion[];

  if (modern.error.code === "PGRST202" || /function.*not exist/i.test(modern.error.message ?? "")) {
    const legacy = await supabase.rpc("search_products", baseArgs);
    if (legacy.error) throw legacy.error;
    return (legacy.data ?? []) as SearchSuggestion[];
  }

  throw modern.error;
}

export async function fetchColorSwatches(): Promise<ColorSwatch[]> {
  const { data, error } = await supabase
    .from("color_swatches")
    .select("colour,hex,sort_order")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as ColorSwatch[];
}

export async function fetchTheme(key: string): Promise<Theme | null> {
  const { data, error } = await supabase
    .from("themes")
    .select("key,name,name_en,name_hy,background_image,background_color,accent_color,card_bg,description,description_en,description_hy")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return (data as Theme | null) ?? null;
}

const VARIANT_COLS =
  "sku,colour,colour_en,colour_hy,main_image,price_amd,model_group,name,name_en,name_hy,availability,stock_qty,stock_reserved,lead_time_days";

export async function fetchProductVariants(modelGroup: string, sku?: string): Promise<Variant[]> {
  const key = sku ? variantGroupKey({ sku, model_group: modelGroup }) : modelGroup;
  if (/^HBAC\d+$/i.test(key)) {
    const { data, error } = await supabase
      .from("products")
      .select(VARIANT_COLS)
      .ilike("sku", `${key}%`)
      .eq("is_published", true)
      .not("colour", "is", null)
      .order("sku", { ascending: true })
      .limit(40);
    if (error) throw error;
    return dedupeVariants((data ?? []) as Variant[]);
  }
  const { data, error } = await supabase
    .from("products")
    .select(VARIANT_COLS)
    .eq("model_group", key)
    .eq("is_published", true)
    .not("colour", "is", null)
    .order("sku", { ascending: true })
    .limit(40);
  if (error) throw error;
  return dedupeVariants((data ?? []) as Variant[]);
}

export async function fetchVariantsByModelGroups(modelGroups: string[]): Promise<Map<string, Variant[]>> {
  const unique = [...new Set(modelGroups.filter(Boolean))];
  const out = new Map<string, Variant[]>();
  if (!unique.length) return out;

  const standardKeys = unique.filter((k) => !/^HBAC\d+$/i.test(k));
  const hbacKeys = unique.filter((k) => /^HBAC\d+$/i.test(k));
  const allRows: Variant[] = [];

  if (standardKeys.length) {
    // Per-key queries: model_group values are long and blow up `.in()` URL length (nginx 414).
    await Promise.all(
      standardKeys.map(async (key) => {
        const { data, error } = await supabase
          .from("products")
          .select(VARIANT_COLS)
          .eq("model_group", key)
          .eq("is_published", true)
          .not("colour", "is", null)
          .order("sku", { ascending: true })
          .limit(40);
        if (error) throw error;
        allRows.push(...((data ?? []) as Variant[]));
      }),
    );
  }

  for (const prefix of hbacKeys) {
    const { data, error } = await supabase
      .from("products")
      .select(VARIANT_COLS)
      .ilike("sku", `${prefix}%`)
      .eq("is_published", true)
      .not("colour", "is", null)
      .order("sku", { ascending: true });
    if (error) throw error;
    allRows.push(...((data ?? []) as Variant[]));
  }

  for (const key of unique) {
    const rows = allRows.filter((v) => variantMatchesGroupKey(v, key));
    out.set(key, dedupeVariants(rows));
  }
  return out;
}

export type FacetCounts = {
  families: Array<{ value: string; count: number }>;
  aesthetics: Array<{ value: string; count: number }>;
  colours: Array<{ value: string; value_en?: string | null; count: number; label_en?: string | null; label_hy?: string | null }>;
};

export async function fetchFacets(): Promise<FacetCounts> {
  const { data, error } = await supabase
    .from("products")
    .select("family,aesthetic,colour,colour_en,colour_hy")
    .limit(5000);
  if (error) throw error;
  const tally = (key: "family" | "aesthetic" | "colour") => {
    const m = new Map<string, number>();
    for (const r of (data ?? []) as Array<Record<string, string | null>>) {
      const v = (r[key] ?? "").trim();
      if (!v) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  };
  const colourLabels = new Map<string, { en?: string | null; hy?: string | null }>();
  for (const r of (data ?? []) as Array<{ colour: string | null; colour_en: string | null; colour_hy: string | null }>) {
    const v = (r.colour ?? "").trim();
    if (!v) continue;
    const cur = colourLabels.get(v) ?? {};
    if (!cur.en && r.colour_en) cur.en = r.colour_en;
    if (!cur.hy && r.colour_hy) cur.hy = r.colour_hy;
    colourLabels.set(v, cur);
  }
  const colours = tally("colour").map((c) => ({
    ...c,
    value_en: colourLabels.get(c.value)?.en ?? null,
    label_en: colourLabels.get(c.value)?.en ?? null,
    label_hy: colourLabels.get(c.value)?.hy ?? null,
  }));
  return { families: tally("family"), aesthetics: tally("aesthetic"), colours };
}

export async function fetchFacetsScoped(opts: {
  families?: string[];
  categoryIn?: string[];
  inStock?: boolean;
}): Promise<FacetCounts> {
  let q = supabase
    .from("products")
    .select("family,aesthetic,colour,colour_en,colour_hy")
    .eq("is_published", true);
  if (opts.families?.length) q = q.in("family", opts.families);
  if (opts.categoryIn?.length) q = q.in("category", opts.categoryIn);
  if (opts.inStock) q = q.eq("availability", "in_stock");
  const { data, error } = await q.limit(5000);
  if (error) throw error;
  const tally = (key: "family" | "aesthetic" | "colour") => {
    const m = new Map<string, number>();
    for (const r of (data ?? []) as Array<Record<string, string | null>>) {
      const v = (r[key] ?? "").trim();
      if (!v) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  };
  const colourLabels = new Map<string, { en?: string | null; hy?: string | null }>();
  for (const r of (data ?? []) as Array<{ colour: string | null; colour_en: string | null; colour_hy: string | null }>) {
    const v = (r.colour ?? "").trim();
    if (!v) continue;
    const cur = colourLabels.get(v) ?? {};
    if (!cur.en && r.colour_en) cur.en = r.colour_en;
    if (!cur.hy && r.colour_hy) cur.hy = r.colour_hy;
    colourLabels.set(v, cur);
  }
  const colours = tally("colour").map((c) => ({
    ...c,
    value_en: colourLabels.get(c.value)?.en ?? null,
    label_en: colourLabels.get(c.value)?.en ?? null,
    label_hy: colourLabels.get(c.value)?.hy ?? null,
  }));
  return { families: tally("family"), aesthetics: tally("aesthetic"), colours };
}

function tallyFacetRows(
  data: Array<{
    family?: string | null;
    aesthetic?: string | null;
    colour?: string | null;
    colour_en?: string | null;
    colour_hy?: string | null;
  }>,
): FacetCounts {
  const tally = (key: "family" | "aesthetic" | "colour") => {
    const m = new Map<string, number>();
    for (const r of data) {
      const v = (r[key] ?? "").trim();
      if (!v) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  };
  const colourLabels = new Map<string, { en?: string | null; hy?: string | null }>();
  for (const r of data) {
    const v = (r.colour ?? "").trim();
    if (!v) continue;
    const cur = colourLabels.get(v) ?? {};
    if (!cur.en && r.colour_en) cur.en = r.colour_en;
    if (!cur.hy && r.colour_hy) cur.hy = r.colour_hy;
    colourLabels.set(v, cur);
  }
  const colours = tally("colour").map((c) => ({
    ...c,
    value_en: colourLabels.get(c.value)?.en ?? null,
    label_en: colourLabels.get(c.value)?.en ?? null,
    label_hy: colourLabels.get(c.value)?.hy ?? null,
  }));
  return { families: tally("family"), aesthetics: tally("aesthetic"), colours };
}

/** Categories present in a curated nav-group (OR union of members). */
export async function fetchCategoriesForNavGroup(
  nf: NavGroupFilters,
  opts: { inStock?: boolean } = {},
): Promise<CategoryStat[]> {
  let q = supabase
    .from("products")
    .select("category,category_en,category_hy")
    .eq("is_published", true)
    .not("category", "is", null);
  q = applyNavGroupOr(q, nf);
  if (opts.inStock) q = q.eq("availability", "in_stock");
  const { data, error } = await q.limit(5000);
  if (error) throw error;
  return groupCategoryRows((data ?? []) as CategoryRow[]);
}

/** Facet counts for a curated nav-group (OR union of members). */
export async function fetchFacetsForNavGroup(
  nf: NavGroupFilters,
  opts: { inStock?: boolean } = {},
): Promise<FacetCounts> {
  let q = supabase
    .from("products")
    .select("family,aesthetic,colour,colour_en,colour_hy")
    .eq("is_published", true);
  q = applyNavGroupOr(q, nf);
  if (opts.inStock) q = q.eq("availability", "in_stock");
  const { data, error } = await q.limit(5000);
  if (error) throw error;
  return tallyFacetRows((data ?? []) as Array<Record<string, string | null>>);
}

/** SKUs in a curated nav-group — for spec facet scoping. */
export async function fetchSkusForNavGroup(nf: NavGroupFilters): Promise<string[]> {
  let q = supabase.from("products").select("sku").eq("is_published", true);
  q = applyNavGroupOr(q, nf);
  const { data, error } = await q.limit(5000);
  if (error) throw error;
  return ((data ?? []) as Array<{ sku: string }>).map((r) => r.sku);
}

export type CatalogFilters = {
  category?: string;
  categoryIn?: string[];
  search?: string;
  families?: string[];
  aesthetics?: string[];
  colours?: string[];
  theme?: string;
  flag?: "is_featured" | "is_new" | "is_bestseller" | "is_special_offer" | "sale";
  inStock?: boolean;
  specFilters?: SpecFilters;
  groupByColor?: boolean;
  sort?: "name" | "price-asc" | "price-desc";
  shuffleSeed?: number;
  limit?: number;
  offset?: number;
  /** Explicit SKU list (nav group or manual) */
  skuIn?: string[];
  /** OR-filter for nav subgroup members */
  navGroupFilters?: NavGroupFilters;
};

function shuffleArray<T>(items: T[], seed?: number): T[] {
  const arr = [...items];
  let state = normalizeShuffleSeed(seed);
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type CatalogQuery = ReturnType<ReturnType<typeof supabase.from>["select"]>;

async function filterSkusByFacets(
  skus: string[],
  f: Pick<CatalogFilters, "colours" | "aesthetics" | "families" | "categoryIn" | "theme" | "inStock" | "flag">,
): Promise<string[]> {
  const hasFacet =
    f.colours?.length ||
    f.aesthetics?.length ||
    f.families?.length ||
    f.categoryIn?.length ||
    f.theme ||
    f.inStock ||
    f.flag;
  if (!hasFacet || !skus.length) return skus;

  const allowed = new Set<string>();
  for (const batch of chunk(skus, SKU_IN_CHUNK)) {
    let q = supabase.from("products").select("sku").in("sku", batch).eq("is_published", true);
    if (f.colours?.length) q = q.in("colour", f.colours);
    if (f.aesthetics?.length) q = q.in("aesthetic", f.aesthetics);
    if (f.families?.length) q = q.in("family", f.families);
    if (f.categoryIn?.length) q = q.in("category", f.categoryIn);
    if (f.theme) q = q.eq("theme_key", f.theme);
    if (f.inStock) q = q.eq("availability", "in_stock");
    if (f.flag === "sale") q = q.not("price_old", "is", null);
    else if (f.flag) q = q.eq(f.flag, true);

    const { data, error } = await q;
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ sku: string }>) allowed.add(row.sku);
  }
  return skus.filter((s) => allowed.has(s));
}

function applyNavGroupOr(q: CatalogQuery, nf: NavGroupFilters, skipSkuIn = false): CatalogQuery {
  // SKUs already applied via explicit skuIn (possibly chunked) — don't repeat.
  if (nf.skus.length && !skipSkuIn) return q.in("sku", nf.skus);
  if (nf.skus.length && skipSkuIn) return q;
  const parts: string[] = [];
  if (nf.modelGroups.length) {
    parts.push(`model_group.in.(${nf.modelGroups.map((v) => `"${v.replace(/"/g, "")}"`).join(",")})`);
  }
  if (nf.families.length) {
    parts.push(`family.in.(${nf.families.map((v) => `"${v.replace(/"/g, "")}"`).join(",")})`);
  }
  if (nf.categoryIn.length) {
    parts.push(`category.in.(${nf.categoryIn.map((v) => `"${v.replace(/"/g, "")}"`).join(",")})`);
  }
  if (!parts.length) return q;
  return q.or(parts.join(","));
}

function applyCatalogFilters(q: CatalogQuery, f: CatalogFilters, skuIn?: string[] | null): CatalogQuery {
  q = q.eq("is_published", true);
  const explicitSkus = resolveSkuFilter(f, skuIn);
  if (explicitSkus?.length) q = q.in("sku", explicitSkus);

  // Nav-group подборки: OR across members — never AND category ∩ family.
  if (f.navGroupFilters) {
    q = applyNavGroupOr(q, f.navGroupFilters, !!explicitSkus?.length);
  } else {
    if (f.categoryIn?.length) q = q.in("category", f.categoryIn);
    else if (f.category) q = q.eq("category", f.category);
    if (f.families?.length) q = q.in("family", f.families);
  }

  if (f.aesthetics?.length) q = q.in("aesthetic", f.aesthetics);
  if (f.colours?.length) q = q.in("colour", f.colours);
  if (f.theme) q = q.eq("theme_key", f.theme);
  if (f.inStock) q = q.eq("availability", "in_stock");
  if (f.flag === "sale") q = q.not("price_old", "is", null);
  else if (f.flag) q = q.eq(f.flag, true);
  return q;
}

/** Intersect optional SKU lists (nav group ∩ specs). */
function resolveSkuFilter(f: CatalogFilters, skuIn?: string[] | null): string[] | null {
  const a = f.skuIn?.length ? f.skuIn : null;
  const b = skuIn?.length ? skuIn : null;
  if (a && b) {
    const allowed = new Set(b);
    const inter = a.filter((s) => allowed.has(s));
    return inter;
  }
  return a ?? b;
}

async function fetchCatalogRowsBatched(
  select: string,
  f: CatalogFilters,
  skuIn: string[] | null,
): Promise<Product[]> {
  const explicitSkus = resolveSkuFilter(f, skuIn);
  if (explicitSkus && explicitSkus.length === 0) return [];
  if (explicitSkus && explicitSkus.length > SKU_IN_CHUNK) {
    const merged: Product[] = [];
    for (const batch of chunk(explicitSkus, SKU_IN_CHUNK)) {
      let q = supabase.from("products").select(select);
      q = applyCatalogFilters(q, { ...f, skuIn: batch }, null);
      const { data, error } = await q;
      if (error) throw error;
      merged.push(...((data ?? []) as Product[]));
    }
    return merged;
  }
  let q = supabase.from("products").select(select);
  q = applyCatalogFilters(q, { ...f, skuIn: explicitSkus ?? f.skuIn }, null);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Product[];
}

const PRODUCT_COLS =
  "sku,name,name_en,name_hy,category,category_en,category_hy,brand,aesthetic,colour,colour_en,colour_hy,family,model_group,ean,description,description_en,description_hy,specs,specs_en,specs_hy,main_image,images,pdf,energy_label,url,price_amd,price_old,discount_percent,availability,stock_qty,stock_reserved,lead_time_days,is_featured,is_new,is_bestseller,is_special_offer,badge_text";

const GROUP_SKU_COLS = "sku,model_group,price_amd,name";

async function fetchGroupedCatalog(
  f: CatalogFilters,
  specSkuIn: string[] | null,
): Promise<{ items: CatalogDisplayItem[]; total: number }> {
  const limit = f.limit ?? 36;
  const offset = f.offset ?? 0;

  let rows: GroupSkuRow[] = [];

  if (f.search) {
    const ranked = await searchProductsRpc(f.search, { onlyPublished: true, limit: 500 });
    let skus = ranked.map((r) => r.sku);
    if (specSkuIn) {
      const allowed = new Set(specSkuIn);
      skus = skus.filter((s) => allowed.has(s));
    }
    if (!skus.length) return { items: [], total: 0 };

    skus = await filterSkusByFacets(skus, f);
    if (!skus.length) return { items: [], total: 0 };

    const bySku = new Map<string, GroupSkuRow>();
    for (const batch of chunk(skus, SKU_IN_CHUNK)) {
      const { data, error } = await supabase
        .from("products")
        .select(GROUP_SKU_COLS)
        .in("sku", batch)
        .eq("is_published", true);
      if (error) throw error;
      for (const row of (data ?? []) as GroupSkuRow[]) bySku.set(row.sku, row);
    }
    rows = skus.map((sku) => bySku.get(sku)).filter((r): r is GroupSkuRow => !!r);
  } else {
    const explicitSkus = resolveSkuFilter(f, specSkuIn);
    if (explicitSkus && explicitSkus.length === 0) {
      rows = [];
    } else if (explicitSkus && explicitSkus.length > SKU_IN_CHUNK) {
      const merged: GroupSkuRow[] = [];
      for (const batch of chunk(explicitSkus, SKU_IN_CHUNK)) {
        let sq = supabase.from("products").select(GROUP_SKU_COLS);
        sq = applyCatalogFilters(sq, { ...f, skuIn: batch }, null);
        const { data, error } = await sq;
        if (error) throw error;
        merged.push(...((data ?? []) as GroupSkuRow[]));
      }
      rows = merged;
    } else {
      let sq = supabase.from("products").select(GROUP_SKU_COLS);
      sq = applyCatalogFilters(sq, { ...f, skuIn: explicitSkus ?? f.skuIn }, null);
      const { data, error } = await sq;
      if (error) throw error;
      rows = (data ?? []) as GroupSkuRow[];
    }
  }

  if (!rows.length) return { items: [], total: 0 };

  const rowsBySku = new Map(rows.map((r) => [r.sku, r]));
  let groups = buildProductGroups(rows);
  groups = sortGroups(groups, rowsBySku, f.sort, f.shuffleSeed);

  const total = groups.length;
  const pageGroups = groups.slice(offset, offset + limit);
  if (!pageGroups.length) return { items: [], total };

  const repSkus = pageGroups.map((g) => g.representativeSku);
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select(PRODUCT_COLS)
    .in("sku", repSkus)
    .eq("is_published", true);
  if (pErr) throw pErr;

  const modelGroups = pageGroups.map((g) => g.key).filter(Boolean);
  const variantsMap = await fetchVariantsByModelGroups(modelGroups);

  const bySku = new Map(((products ?? []) as Product[]).map((p) => [p.sku, p]));
  const items: CatalogDisplayItem[] = pageGroups
    .map((g) => {
      const p = bySku.get(g.representativeSku);
      if (!p) return null;
      const mg = g.key;
      const groupSkuSet = new Set(g.skus);
      const variants = mg ? variantsMap.get(mg)?.filter((v) => groupSkuSet.has(v.sku)) : undefined;
      const variantCount = variants?.length ?? 1;
      return {
        ...p,
        variants,
        variantCount,
        priceFrom: variantCount > 1 ? g.priceFrom : null,
      };
    })
    .filter((p): p is CatalogDisplayItem => !!p);

  return { items, total };
}

export async function fetchCatalog(f: CatalogFilters): Promise<{ items: CatalogDisplayItem[]; total: number }> {
  const limit = f.limit ?? 36;
  const offset = f.offset ?? 0;

  let specSkuIn: string[] | null = null;
  if (f.specFilters && Object.keys(f.specFilters).length > 0) {
    specSkuIn = await fetchSkusMatchingSpecFilters(f.specFilters);
    if (!specSkuIn?.length) return { items: [], total: 0 };
  }

  if (f.groupByColor) {
    return fetchGroupedCatalog(f, specSkuIn);
  }

  // Text search: global, ranked by RPC — do not intersect with category sidebar filter.
  if (f.search) {
    const ranked = await searchProductsRpc(f.search, { onlyPublished: true, limit: 500 });
    let orderedSkus = ranked.map((r) => r.sku);
    if (specSkuIn) {
      const allowed = new Set(specSkuIn);
      orderedSkus = orderedSkus.filter((s) => allowed.has(s));
    }
    if (!orderedSkus.length) return { items: [], total: 0 };

    const filteredSkus = await filterSkusByFacets(orderedSkus, f);
    const total = filteredSkus.length;
    if (!total) return { items: [], total: 0 };

    const pageSkus = filteredSkus.slice(offset, offset + limit);
    if (!pageSkus.length) return { items: [], total };

    const { data, error } = await supabase.from("products").select(PRODUCT_COLS).in("sku", pageSkus).eq("is_published", true);
    if (error) throw error;
    const bySku = new Map(((data ?? []) as Product[]).map((p) => [p.sku, p]));
    let items = pageSkus.map((sku) => bySku.get(sku)).filter((p): p is Product => !!p);

    if (f.sort === "price-asc") items.sort((a, b) => (a.price_amd ?? 0) - (b.price_amd ?? 0));
    else if (f.sort === "price-desc") items.sort((a, b) => (b.price_amd ?? 0) - (a.price_amd ?? 0));
    else items = shuffleArray(items, f.shuffleSeed);

    return { items, total };
  }

  if (!f.sort) {
    const skuRows = await fetchCatalogRowsBatched("sku", f, specSkuIn);
    const skus = shuffleArray(
      skuRows.map((r) => r.sku),
      f.shuffleSeed,
    );
    const total = skus.length;
    const pageSkus = skus.slice(offset, offset + limit);
    if (!pageSkus.length) return { items: [], total };

    const bySku = new Map<string, Product>();
    for (const batch of chunk(pageSkus, SKU_IN_CHUNK)) {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_COLS)
        .in("sku", batch)
        .eq("is_published", true);
      if (error) throw error;
      for (const p of (data ?? []) as Product[]) bySku.set(p.sku, p);
    }
    const items = pageSkus.map((sku) => bySku.get(sku)).filter((p): p is Product => !!p);
    return { items, total };
  }

  // Sorted path: batch when SKU filter is large, then sort/paginate in memory.
  const explicitSkus = resolveSkuFilter(f, specSkuIn);
  if (explicitSkus && explicitSkus.length === 0) return { items: [], total: 0 };
  if (explicitSkus && explicitSkus.length > SKU_IN_CHUNK) {
    let items = await fetchCatalogRowsBatched(PRODUCT_COLS, f, specSkuIn);
    if (f.sort === "price-asc") items.sort((a, b) => (a.price_amd ?? 0) - (b.price_amd ?? 0));
    else if (f.sort === "price-desc") items.sort((a, b) => (b.price_amd ?? 0) - (a.price_amd ?? 0));
    else items.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    const total = items.length;
    return { items: items.slice(offset, offset + limit), total };
  }

  let q = supabase.from("products").select(PRODUCT_COLS, { count: "exact" });
  q = applyCatalogFilters(q, { ...f, skuIn: explicitSkus ?? f.skuIn }, null);
  if (f.sort === "price-asc") q = q.order("price_amd", { ascending: true, nullsFirst: false });
  else if (f.sort === "price-desc") q = q.order("price_amd", { ascending: false, nullsFirst: false });
  else q = q.order("name", { ascending: true });
  q = q.range(offset, offset + limit - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { items: (data ?? []) as Product[], total: count ?? 0 };
}

export async function fetchCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("id,slug,name,name_en,name_hy,description,description_en,description_hy,cover_image,is_published,sort_weight,section")
    .eq("is_published", true)
    .order("sort_weight", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []) as Collection[];
}

export async function fetchCollectionWithProducts(slug: string) {
  const { data: col, error: e1 } = await supabase
    .from("collections")
    .select("id,slug,name,name_en,name_hy,description,description_en,description_hy,cover_image,is_published,sort_weight,section")
    .eq("slug", slug)
    .maybeSingle();
  if (e1) throw e1;
  if (!col) return null;
  const { data: links, error: e2 } = await supabase
    .from("collection_products")
    .select("product_sku,sort_weight,products!inner(" + CARD_COLS + ")")
    .eq("collection_id", col.id)
    .order("sort_weight", { ascending: false });
  if (e2) throw e2;
  const products = ((links ?? []) as unknown as Array<{ products: ProductCard | ProductCard[] | null }>)
    .map((l) => (Array.isArray(l.products) ? l.products[0] : l.products))
    .filter((p): p is ProductCard => !!p && p.is_published);
  const seen = new Set<string>();
  const unique = products.filter((p) => {
    if (seen.has(p.sku)) return false;
    seen.add(p.sku);
    return true;
  });
  return { collection: col as Collection, products: unique };
}