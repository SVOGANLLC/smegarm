import { supabase } from "@/integrations/supabase/client";

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
    const canonical = (r.category_en?.trim() || raw).trim();
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
    .select("sku,name,category,aesthetic,colour,main_image,images")
    .in("sku", skus);
  if (error) throw error;
  return (data ?? []) as Product[];
}

const CARD_COLS =
  "sku,name,category,colour,main_image,price_amd,price_old,discount_percent,availability,is_published,is_featured,is_new,is_bestseller,is_special_offer,badge_text";

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

export type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  is_published: boolean;
  sort_weight: number;
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

export type Variant = { sku: string; colour: string | null; main_image: string | null };

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
  opts: { onlyPublished?: boolean; limit?: number } = {},
): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data, error } = await supabase.rpc("search_products", {
    q: trimmed,
    only_published: opts.onlyPublished ?? true,
    max_rows: opts.limit ?? 8,
  });
  if (error) throw error;
  return (data ?? []) as SearchSuggestion[];
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

export async function fetchProductVariants(modelGroup: string, excludeSku: string): Promise<Variant[]> {
  const { data, error } = await supabase
    .from("products")
    .select("sku,colour,main_image")
    .eq("model_group", modelGroup)
    .neq("sku", excludeSku)
    .not("colour", "is", null)
    .order("sku", { ascending: true })
    .limit(40);
  if (error) throw error;
  return (data ?? []) as Variant[];
}

export type FacetCounts = {
  families: Array<{ value: string; count: number }>;
  aesthetics: Array<{ value: string; count: number }>;
  colours: Array<{ value: string; count: number; label_en?: string | null; label_hy?: string | null }>;
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
    label_en: colourLabels.get(c.value)?.en ?? null,
    label_hy: colourLabels.get(c.value)?.hy ?? null,
  }));
  return { families: tally("family"), aesthetics: tally("aesthetic"), colours };
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
  sort?: "name" | "price-asc" | "price-desc";
  limit?: number;
  offset?: number;
};

export async function fetchCatalog(f: CatalogFilters): Promise<{ items: Product[]; total: number }> {
  let q = supabase
    .from("products")
    .select(
      "sku,name,name_en,name_hy,category,category_en,category_hy,brand,aesthetic,colour,colour_en,colour_hy,family,ean,description,description_en,description_hy,specs,specs_en,specs_hy,main_image,images,pdf,energy_label,url,price_amd,price_old,availability,stock_qty,stock_reserved,lead_time_days",
      { count: "exact" },
    );
  if (f.categoryIn?.length) q = q.in("category", f.categoryIn);
  else if (f.category) q = q.eq("category", f.category);
  if (f.search) {
    // Use the search RPC for matching SKUs, then constrain by them; keeps other filters working.
    const { data: rows, error: e } = await supabase.rpc("search_products", {
      q: f.search,
      only_published: true,
      max_rows: 500,
    });
    if (e) throw e;
    const skus = (rows ?? []).map((r: { sku: string }) => r.sku);
    if (!skus.length) return { items: [], total: 0 };
    q = q.in("sku", skus);
  }
  if (f.families?.length) q = q.in("family", f.families);
  if (f.aesthetics?.length) q = q.in("aesthetic", f.aesthetics);
  if (f.colours?.length) q = q.in("colour", f.colours);
  if (f.theme) q = q.eq("theme_key", f.theme);
  if (f.flag === "sale") q = q.not("price_old", "is", null);
  else if (f.flag) q = q.eq(f.flag, true);
  if (f.sort === "price-asc") q = q.order("price_amd", { ascending: true, nullsFirst: false });
  else if (f.sort === "price-desc") q = q.order("price_amd", { ascending: false, nullsFirst: false });
  else q = q.order("name", { ascending: true });
  const limit = f.limit ?? 36;
  const offset = f.offset ?? 0;
  q = q.range(offset, offset + limit - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { items: (data ?? []) as Product[], total: count ?? 0 };
}

export async function fetchCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("id,slug,name,name_en,name_hy,description,description_en,description_hy,cover_image,is_published,sort_weight")
    .eq("is_published", true)
    .order("sort_weight", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []) as Collection[];
}

export async function fetchCollectionWithProducts(slug: string) {
  const { data: col, error: e1 } = await supabase
    .from("collections")
    .select("id,slug,name,name_en,name_hy,description,description_en,description_hy,cover_image,is_published,sort_weight")
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
  return { collection: col as Collection, products };
}