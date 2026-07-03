import { supabase } from "@/integrations/supabase/client";

/** Client-side flag — when false, no tracking RPCs are called. */
export function isAnalyticsEnabled(): boolean {
  return import.meta.env.VITE_ANALYTICS_ENABLED === "true";
}

export type SearchLogSource = "header" | "catalog" | "admin";

const DEDUPE_MS = 10_000;

function shouldTrack(scope: string, id: string): boolean {
  if (typeof window === "undefined") return true;
  const key = `analytics:dedupe:${scope}:${id}`;
  const now = Date.now();
  try {
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (last && now - last < DEDUPE_MS) return false;
    sessionStorage.setItem(key, String(now));
  } catch {
    // Private mode / blocked storage — still track once per call.
  }
  return true;
}

/** Non-blocking product page view. Never throws to callers. */
export function trackProductView(sku: string): void {
  if (!isAnalyticsEnabled() || !sku.trim()) return;
  const normalized = sku.trim().toUpperCase();
  if (!shouldTrack("view", normalized)) return;
  void supabase.rpc("increment_product_view", { p_sku: normalized }).then(({ error }) => {
    if (error && import.meta.env.DEV) console.debug("[analytics] view", error.message);
  });
}

/** Non-blocking search log. Never throws to callers. */
export function trackSiteSearch(query: string, resultsCount: number, source: SearchLogSource): void {
  if (!isAnalyticsEnabled()) return;
  const q = query.trim();
  if (q.length < 2) return;
  const dedupeKey = q.toLowerCase();
  if (!shouldTrack("search", dedupeKey)) return;
  void supabase
    .rpc("log_site_search", {
      p_query: q,
      p_results_count: Math.max(0, resultsCount),
      p_source: source,
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) console.debug("[analytics] search", error.message);
    });
}
