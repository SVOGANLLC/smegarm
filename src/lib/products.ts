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

export type CategoryStat = { category: string; slug: string; count: number };

export async function fetchCategories(): Promise<CategoryStat[]> {
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .not("category", "is", null);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const c = (row as { category: string | null }).category?.trim();
    if (!c) continue;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, slug: slugify(category), count }))
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
};

export async function fetchCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("id,slug,name,description,cover_image,is_published,sort_weight")
    .eq("is_published", true)
    .order("sort_weight", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []) as Collection[];
}

export async function fetchCollectionWithProducts(slug: string) {
  const { data: col, error: e1 } = await supabase
    .from("collections")
    .select("id,slug,name,description,cover_image,is_published,sort_weight")
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