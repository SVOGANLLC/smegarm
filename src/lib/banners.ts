import { supabase } from "@/integrations/supabase/client";
import { pickLocalized, type Lang } from "@/lib/i18n";
import { assertRowUpdated } from "@/lib/supabase-assert";

/**
 * Promo banner rendered right under the home page hero.
 * Every content column is optional — an empty row renders nothing.
 */
export type HomeBanner = {
  id: string;
  title: string | null;
  title_en: string | null;
  title_hy: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  subtitle_hy: string | null;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  link_label_en: string | null;
  link_label_hy: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** Max number of banners rendered on the home page. */
export const HOME_BANNERS_LIMIT = 6;

/**
 * Banners live in the existing `site_content` key/value CMS table, so no schema
 * migration is involved: the row is a plain JSON payload written by admins
 * under RLS, exactly like the other editable content blocks.
 */
export const HOME_BANNERS_CONTENT_KEY = "home_banners";

type BannersPayload = { items?: unknown };

function localized(row: HomeBanner, base: "title" | "subtitle" | "link_label", lang: Lang): string {
  return pickLocalized(row as unknown as Record<string, unknown>, base, lang).trim();
}

export function bannerTitle(row: HomeBanner, lang: Lang): string {
  return localized(row, "title", lang) || (row.title_en ?? "").trim() || (row.title ?? "").trim();
}

export function bannerSubtitle(row: HomeBanner, lang: Lang): string {
  return (
    localized(row, "subtitle", lang) ||
    (row.subtitle_en ?? "").trim() ||
    (row.subtitle ?? "").trim()
  );
}

export function bannerCtaLabel(row: HomeBanner, lang: Lang): string {
  return (
    localized(row, "link_label", lang) ||
    (row.link_label_en ?? "").trim() ||
    (row.link_label ?? "").trim()
  );
}

/** True when a banner has nothing at all to show. */
export function isBannerEmpty(row: HomeBanner, lang: Lang): boolean {
  return !row.image_url?.trim() && !bannerTitle(row, lang) && !bannerSubtitle(row, lang);
}

export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) || /^(mailto|tel):/i.test(href);
}

/** Only http(s), mailto, tel and root-relative paths are accepted as links. */
export function safeBannerHref(value: string | null | undefined): string {
  const href = (value ?? "").trim();
  if (!href) return "";
  if (isExternalHref(href)) return href;
  if (href.startsWith("/")) return href;
  return "";
}

/** Coerces an unknown JSON value into a clean optional string. */
function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function optionalTimestamps(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

/** Defensive parsing: the payload is hand-editable JSON inside `site_content`. */
function normalizeBanner(raw: Record<string, unknown>): HomeBanner {
  const now = new Date().toISOString();
  const createdAt = optionalTimestamps(raw.created_at, now);
  return {
    id: optionalString(raw.id) ?? crypto.randomUUID(),
    title: optionalString(raw.title),
    title_en: optionalString(raw.title_en),
    title_hy: optionalString(raw.title_hy),
    subtitle: optionalString(raw.subtitle),
    subtitle_en: optionalString(raw.subtitle_en),
    subtitle_hy: optionalString(raw.subtitle_hy),
    image_url: optionalString(raw.image_url),
    link_url: optionalString(raw.link_url),
    link_label: optionalString(raw.link_label),
    link_label_en: optionalString(raw.link_label_en),
    link_label_hy: optionalString(raw.link_label_hy),
    is_active: raw.is_active === true,
    sort_order: Number.isFinite(Number(raw.sort_order)) ? Math.trunc(Number(raw.sort_order)) : 0,
    created_at: createdAt,
    updated_at: optionalTimestamps(raw.updated_at, createdAt),
  };
}

export function parseHomeBanners(value: unknown): HomeBanner[] {
  const items = (value as BannersPayload | null | undefined)?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(normalizeBanner);
}

function sortBanners(rows: HomeBanner[]): HomeBanner[] {
  return [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

/** A brand new draft banner appended after the existing ones. */
export function createHomeBannerDraft(existing: HomeBanner[]): HomeBanner {
  const now = new Date().toISOString();
  const maxOrder = existing.reduce((max, row) => Math.max(max, row.sort_order || 0), 0);
  return {
    id: crypto.randomUUID(),
    title: null,
    title_en: null,
    title_hy: null,
    subtitle: null,
    subtitle_en: null,
    subtitle_hy: null,
    image_url: null,
    link_url: null,
    link_label: null,
    link_label_en: null,
    link_label_hy: null,
    is_active: false,
    sort_order: maxOrder + 10,
    created_at: now,
    updated_at: now,
  };
}

/** Active banners for the storefront, ordered by `sort_order`. */
export async function fetchHomeBanners(): Promise<HomeBanner[]> {
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", HOME_BANNERS_CONTENT_KEY)
      .maybeSingle();
    if (error) {
      console.error("[banners] list", error.message);
      return [];
    }
    return sortBanners(parseHomeBanners(data?.value))
      .filter((banner) => banner.is_active)
      .slice(0, HOME_BANNERS_LIMIT);
  } catch (e) {
    console.error("[banners] list", e);
    return [];
  }
}

/** Every banner (including drafts) for the admin screen. */
export async function fetchAllHomeBanners(): Promise<HomeBanner[]> {
  const { data, error } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", HOME_BANNERS_CONTENT_KEY)
    .maybeSingle();
  if (error) throw error;
  return sortBanners(parseHomeBanners(data?.value));
}

/** Writes the whole list back as one JSON payload. */
export async function saveHomeBanners(
  rows: HomeBanner[],
  noRowMessage?: string,
): Promise<HomeBanner[]> {
  const next = sortBanners(rows);
  const { data, error } = await supabase
    .from("site_content")
    .upsert({ key: HOME_BANNERS_CONTENT_KEY, value: { items: next } }, { onConflict: "key" })
    .select("key")
    .maybeSingle();
  if (error) throw error;
  assertRowUpdated(data, noRowMessage ?? "home_banners: nothing was written");
  return next;
}
