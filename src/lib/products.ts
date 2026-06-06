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