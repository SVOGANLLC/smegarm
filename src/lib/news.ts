import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n";

export type NewsRow = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  title_hy: string | null;
  excerpt: string | null;
  excerpt_en: string | null;
  excerpt_hy: string | null;
  category: string | null;
  category_en: string | null;
  category_hy: string | null;
  body: string | null;
  body_en: string | null;
  body_hy: string | null;
  image_url: string | null;
  published_at: string;
  is_published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export function newsTitle(row: NewsRow, lang: Lang): string {
  return (
    pickLocalized(row as unknown as Record<string, unknown>, "title", lang) ||
    row.title_en ||
    row.title ||
    row.slug
  );
}

export function newsExcerpt(row: NewsRow, lang: Lang): string {
  return (
    pickLocalized(row as unknown as Record<string, unknown>, "excerpt", lang) ||
    row.excerpt_en ||
    row.excerpt ||
    ""
  );
}

export function newsCategory(row: NewsRow, lang: Lang): string {
  return (
    pickLocalized(row as unknown as Record<string, unknown>, "category", lang) ||
    row.category_en ||
    row.category ||
    ""
  );
}

export function newsBody(row: NewsRow, lang: Lang): string {
  return (
    pickLocalized(row as unknown as Record<string, unknown>, "body", lang) ||
    row.body_en ||
    row.body ||
    newsExcerpt(row, lang) ||
    ""
  );
}

/** Split body into paragraphs (blank-line separated). */
export function newsBodyParagraphs(row: NewsRow, lang: Lang): string[] {
  const text = newsBody(row, lang);
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function formatNewsDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang === "hy" ? "hy-AM" : lang === "ru" ? "ru-RU" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function slugifyNewsTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || `news-${Date.now()}`;
}

export async function fetchPublishedNews(): Promise<NewsRow[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: false })
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as NewsRow[];
}

export async function fetchPublishedNewsBySlug(slug: string): Promise<NewsRow | null> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return (data as NewsRow | null) ?? null;
}
