import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { collectGoogleFonts, stylesToCss, type ContentStylesMap } from "@/lib/content-styles";
import type { Lang } from "@/lib/i18n";

export type ContentBlock = Record<string, Partial<Record<Lang, string>>>;

export type SiteContentBundle = {
  overlay: Record<Lang, Record<string, string>>;
  styles: ContentStylesMap;
  blocks: Record<string, ContentBlock>;
};

export const siteContentQueryKey = ["site-content-bundle"] as const;

/** Invalidate admin + storefront caches after site_content changes (menu, groups, homepage). */
export function invalidateSiteContentQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["site-content"] });
  qc.invalidateQueries({ queryKey: siteContentQueryKey });
  qc.invalidateQueries({ queryKey: ["site-content", "categories"] });
  qc.invalidateQueries({ queryKey: ["catalog"] });
  qc.invalidateQueries({ queryKey: ["catalog-categories"] });
  qc.invalidateQueries({ queryKey: ["listing-variants"] });
  qc.invalidateQueries({ queryKey: ["model-color-products"] });
  qc.invalidateQueries({ queryKey: ["admin-variant-groups"] });
}

export function buildSiteContentBundle(
  rows: Array<{ key: string; value: unknown }>,
): SiteContentBundle {
  const overlay: Record<Lang, Record<string, string>> = { ru: {}, en: {}, hy: {} };
  const blocks: Record<string, ContentBlock> = {};
  let styles: ContentStylesMap = {};

  for (const row of rows) {
    if (row.key === "__styles__") {
      styles = (row.value as ContentStylesMap) ?? {};
      continue;
    }
    const value = (row.value ?? {}) as ContentBlock;
    blocks[row.key] = value;
    for (const [k, perLang] of Object.entries(value)) {
      if (!perLang || typeof perLang !== "object") continue;
      (["ru", "en", "hy"] as Lang[]).forEach((l) => {
        const v = perLang[l];
        if (typeof v === "string" && v.trim()) overlay[l][k] = v;
      });
    }
  }

  return { overlay, styles, blocks };
}

export async function fetchSiteContentBundle(): Promise<SiteContentBundle> {
  try {
    const { data, error } = await supabase.from("site_content").select("key,value");
    if (error) {
      console.error("[site-content]", error.message);
      return buildSiteContentBundle([]);
    }
    return buildSiteContentBundle(data ?? []);
  } catch (e) {
    console.error("[site-content]", e);
    return buildSiteContentBundle([]);
  }
}

export function applySiteContentStyles(stylesMap: ContentStylesMap): void {
  if (typeof document === "undefined") return;
  const css = stylesToCss(stylesMap);
  let styleEl = document.getElementById("ck-runtime-styles") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "ck-runtime-styles";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
  const fonts = collectGoogleFonts(stylesMap);
  document.querySelectorAll('link[data-ck-font="1"]').forEach((n) => n.remove());
  for (const f of fonts) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${f}&display=swap`;
    link.setAttribute("data-ck-font", "1");
    document.head.appendChild(link);
  }
}

export function useSiteContentBundle() {
  return useQuery({
    queryKey: siteContentQueryKey,
    queryFn: fetchSiteContentBundle,
    staleTime: 60_000,
  });
}

export function useSiteContentBlock(key: string): ContentBlock | undefined {
  return useSiteContentBundle().data?.blocks[key];
}
