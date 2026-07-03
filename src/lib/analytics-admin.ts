import { supabase } from "@/integrations/supabase/client";

export type AnalyticsPeriodDays = 7 | 30 | 90;
export type AnalyticsSort = "desc" | "asc";

export const ANALYTICS_PAGE_SIZE = 50;
export const ANALYTICS_EXPORT_MAX = 5000;

export type AnalyticsOverview = {
  order_count: number;
  revenue_amd: number;
  avg_order_amd: number;
  cancelled_count: number;
};

export type DailySalesRow = {
  day: string;
  order_count: number;
  revenue_amd: number;
};

export type TopProductRow = {
  product_sku: string;
  product_name: string;
  qty: number;
  revenue_amd: number;
};

export type TopSearchRow = {
  query: string;
  search_count: number;
  zero_results_count: number;
};

export type TopViewRow = {
  sku: string;
  product_name: string;
  view_count: number;
};

type ListOpts = {
  limit?: number;
  offset?: number;
  sort?: AnalyticsSort;
};

const LEGACY_LIST_MAX = 50;

function isMissingRpc(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST202" || /function.*not exist/i.test(error.message ?? "");
}

function paginatedTotal(raw: Array<{ total_count?: number }>, offset: number): number {
  const fromRow = raw[0]?.total_count;
  if (fromRow != null) return Number(fromRow);
  if (offset === 0) return raw.length;
  return 0;
}

function sliceSorted<T>(rows: T[], offset: number, limit: number, count: (row: T) => number, desc: boolean): T[] {
  const sorted = [...rows].sort((a, b) => (desc ? count(b) - count(a) : count(a) - count(b)));
  return sorted.slice(offset, offset + limit);
}

export async function fetchAnalyticsOverview(days: AnalyticsPeriodDays): Promise<AnalyticsOverview> {
  const { data, error } = await supabase.rpc("admin_analytics_overview", { p_days: days });
  if (error) throw error;
  const row = (data ?? {}) as Record<string, number>;
  return {
    order_count: Number(row.order_count ?? 0),
    revenue_amd: Number(row.revenue_amd ?? 0),
    avg_order_amd: Number(row.avg_order_amd ?? 0),
    cancelled_count: Number(row.cancelled_count ?? 0),
  };
}

export async function fetchAnalyticsDailySales(days: AnalyticsPeriodDays): Promise<DailySalesRow[]> {
  const { data, error } = await supabase.rpc("admin_analytics_daily_sales", { p_days: days });
  if (error) throw error;
  return ((data ?? []) as DailySalesRow[]).map((r) => ({
    day: String(r.day),
    order_count: Number(r.order_count ?? 0),
    revenue_amd: Number(r.revenue_amd ?? 0),
  }));
}

export async function fetchAnalyticsTopProducts(days: AnalyticsPeriodDays, limit = 10): Promise<TopProductRow[]> {
  const { data, error } = await supabase.rpc("admin_analytics_top_products", { p_days: days, p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as TopProductRow[]).map((r) => ({
    product_sku: r.product_sku,
    product_name: r.product_name,
    qty: Number(r.qty ?? 0),
    revenue_amd: Number(r.revenue_amd ?? 0),
  }));
}

export async function fetchAnalyticsTopSearches(
  days: AnalyticsPeriodDays,
  opts: ListOpts = {},
): Promise<{ rows: TopSearchRow[]; total: number }> {
  const limit = opts.limit ?? ANALYTICS_PAGE_SIZE;
  const offset = opts.offset ?? 0;
  const sortDesc = (opts.sort ?? "desc") === "desc";
  let raw = [] as Array<TopSearchRow & { total_count?: number }>;

  const modern = await supabase.rpc("admin_analytics_top_searches", {
    p_days: days,
    p_limit: limit,
    p_offset: offset,
    p_sort_desc: sortDesc,
  });
  if (!modern.error) {
    raw = (modern.data ?? []) as typeof raw;
    const total = paginatedTotal(raw, offset);
    return {
      total,
      rows: raw.map((r) => ({
        query: r.query,
        search_count: Number(r.search_count ?? 0),
        zero_results_count: Number(r.zero_results_count ?? 0),
      })),
    };
  }
  if (isMissingRpc(modern.error)) {
    const legacy = await supabase.rpc("admin_analytics_top_searches", {
      p_days: days,
      p_limit: LEGACY_LIST_MAX,
    });
    if (legacy.error) throw legacy.error;
    const all = (legacy.data ?? []) as TopSearchRow[];
    const page = sliceSorted(all, offset, limit, (r) => r.search_count, sortDesc);
    return {
      total: all.length,
      rows: page.map((r) => ({
        query: r.query,
        search_count: Number(r.search_count ?? 0),
        zero_results_count: Number(r.zero_results_count ?? 0),
      })),
    };
  }
  throw modern.error;
}

export async function fetchAnalyticsTopViews(opts: ListOpts = {}): Promise<{ rows: TopViewRow[]; total: number }> {
  const limit = opts.limit ?? ANALYTICS_PAGE_SIZE;
  const offset = opts.offset ?? 0;
  const sortDesc = (opts.sort ?? "desc") === "desc";
  let raw = [] as Array<TopViewRow & { total_count?: number }>;

  const modern = await supabase.rpc("admin_analytics_top_views", {
    p_limit: limit,
    p_offset: offset,
    p_sort_desc: sortDesc,
  });
  if (!modern.error) {
    raw = (modern.data ?? []) as typeof raw;
    const total = paginatedTotal(raw, offset);
    return {
      total,
      rows: raw.map((r) => ({
        sku: r.sku,
        product_name: r.product_name,
        view_count: Number(r.view_count ?? 0),
      })),
    };
  }
  if (isMissingRpc(modern.error)) {
    const legacy = await supabase.rpc("admin_analytics_top_views", { p_limit: LEGACY_LIST_MAX });
    if (legacy.error) throw legacy.error;
    const all = (legacy.data ?? []) as TopViewRow[];
    const page = sliceSorted(all, offset, limit, (r) => r.view_count, sortDesc);
    return {
      total: all.length,
      rows: page.map((r) => ({
        sku: r.sku,
        product_name: r.product_name,
        view_count: Number(r.view_count ?? 0),
      })),
    };
  }
  throw modern.error;
}

export function formatAmd(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n) + " ֏";
}
