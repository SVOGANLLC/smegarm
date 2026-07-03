import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  ANALYTICS_EXPORT_MAX,
  ANALYTICS_PAGE_SIZE,
  fetchAnalyticsDailySales,
  fetchAnalyticsOverview,
  fetchAnalyticsTopProducts,
  fetchAnalyticsTopSearches,
  fetchAnalyticsTopViews,
  formatAmd,
  type AnalyticsPeriodDays,
  type AnalyticsSort,
} from "@/lib/analytics-admin";
import { isAnalyticsEnabled } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/admini/analytics")({
  component: AdminAnalyticsPage,
});

const PERIODS: AnalyticsPeriodDays[] = [7, 30, 90];

function AdminAnalyticsPage() {
  const { t } = useI18n();
  const [days, setDays] = useState<AnalyticsPeriodDays>(30);
  const [viewsPage, setViewsPage] = useState(1);
  const [viewsSort, setViewsSort] = useState<AnalyticsSort>("desc");
  const [searchesPage, setSearchesPage] = useState(1);
  const [searchesSort, setSearchesSort] = useState<AnalyticsSort>("desc");
  const [exportingViews, setExportingViews] = useState(false);
  const [exportingSearches, setExportingSearches] = useState(false);
  const trackingOn = isAnalyticsEnabled();

  const overview = useQuery({
    queryKey: ["admin-analytics-overview", days],
    queryFn: () => fetchAnalyticsOverview(days),
    staleTime: 60_000,
  });

  const daily = useQuery({
    queryKey: ["admin-analytics-daily", days],
    queryFn: () => fetchAnalyticsDailySales(days),
    staleTime: 60_000,
  });

  const topProducts = useQuery({
    queryKey: ["admin-analytics-top-products", days],
    queryFn: () => fetchAnalyticsTopProducts(days),
    staleTime: 60_000,
  });

  const topSearches = useQuery({
    queryKey: ["admin-analytics-top-searches", days, searchesPage, searchesSort],
    queryFn: () =>
      fetchAnalyticsTopSearches(days, {
        limit: ANALYTICS_PAGE_SIZE,
        offset: (searchesPage - 1) * ANALYTICS_PAGE_SIZE,
        sort: searchesSort,
      }),
    staleTime: 60_000,
  });

  const topViews = useQuery({
    queryKey: ["admin-analytics-top-views", viewsPage, viewsSort],
    queryFn: () =>
      fetchAnalyticsTopViews({
        limit: ANALYTICS_PAGE_SIZE,
        offset: (viewsPage - 1) * ANALYTICS_PAGE_SIZE,
        sort: viewsSort,
      }),
    staleTime: 60_000,
  });

  const maxRevenue = Math.max(...(daily.data ?? []).map((d) => d.revenue_amd), 1);
  const loading = overview.isLoading || daily.isLoading;

  const handlePeriodChange = (p: AnalyticsPeriodDays) => {
    setDays(p);
    setSearchesPage(1);
  };

  const exportViews = async () => {
    setExportingViews(true);
    try {
      const { rows } = await fetchAnalyticsTopViews({
        limit: ANALYTICS_EXPORT_MAX,
        offset: 0,
        sort: viewsSort,
      });
      const sheetRows = rows.map((r) => ({
        [t("admin.analytics.colSku")]: r.sku,
        [t("admin.analytics.colName")]: r.product_name,
        [t("admin.analytics.colViews")]: r.view_count,
      }));
      const ws = XLSX.utils.json_to_sheet(sheetRows);
      ws["!cols"] = [{ wch: 16 }, { wch: 40 }, { wch: 10 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "views");
      const stamp = new Date().toISOString().slice(0, 10);
      const sortTag = viewsSort === "desc" ? "desc" : "asc";
      XLSX.writeFile(wb, `smeg-views-${sortTag}-${stamp}.xlsx`);
      toast.success(t("admin.analytics.exportReady"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.analytics.exportError"));
    } finally {
      setExportingViews(false);
    }
  };

  const exportSearches = async () => {
    setExportingSearches(true);
    try {
      const { rows } = await fetchAnalyticsTopSearches(days, {
        limit: ANALYTICS_EXPORT_MAX,
        offset: 0,
        sort: searchesSort,
      });
      const sheetRows = rows.map((r) => ({
        [t("admin.analytics.colQuery")]: r.query,
        [t("admin.analytics.colSearches")]: r.search_count,
        [t("admin.analytics.colZeroResults")]: r.zero_results_count,
      }));
      const ws = XLSX.utils.json_to_sheet(sheetRows);
      ws["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "searches");
      const stamp = new Date().toISOString().slice(0, 10);
      const sortTag = searchesSort === "desc" ? "desc" : "asc";
      XLSX.writeFile(wb, `smeg-searches-${days}d-${sortTag}-${stamp}.xlsx`);
      toast.success(t("admin.analytics.exportReady"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.analytics.exportError"));
    } finally {
      setExportingSearches(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl">{t("admin.analytics.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.analytics.intro")}</p>

      {!trackingOn && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("admin.analytics.trackingOff")}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePeriodChange(p)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.14em] ${
              days === p ? "bg-foreground text-background" : "border border-border bg-background"
            }`}
          >
            {t(`admin.analytics.period${p}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 h-40 animate-pulse rounded-xl bg-secondary" />
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard label={t("admin.analytics.revenue")} value={formatAmd(overview.data?.revenue_amd ?? 0)} />
            <StatCard label={t("admin.analytics.orders")} value={String(overview.data?.order_count ?? 0)} />
            <StatCard
              label={t("admin.analytics.avgOrder")}
              value={formatAmd(overview.data?.avg_order_amd ?? 0)}
            />
          </div>

          {(overview.data?.cancelled_count ?? 0) > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("admin.analytics.cancelledNote", { n: overview.data?.cancelled_count ?? 0 })}
            </p>
          )}

          <section className="mt-8">
            <h2 className="eyebrow text-muted-foreground">{t("admin.analytics.dailySales")}</h2>
            {(daily.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("admin.analytics.noData")}</p>
            ) : (
              <div className="mt-3 flex items-end gap-1 overflow-x-auto rounded-xl border border-border bg-background p-4">
                {(daily.data ?? []).map((d) => {
                  const h = Math.max(8, Math.round((d.revenue_amd / maxRevenue) * 96));
                  return (
                    <div key={d.day} className="flex min-w-[28px] flex-col items-center gap-1" title={`${d.day}: ${formatAmd(d.revenue_amd)}`}>
                      <div className="w-5 rounded-sm bg-foreground/80" style={{ height: h }} />
                      <span className="text-[9px] text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                        {d.day.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="eyebrow text-muted-foreground">{t("admin.analytics.topProducts")}</h2>
            <RankTable
              empty={t("admin.analytics.noData")}
              rows={(topProducts.data ?? []).map((r) => ({
                key: r.product_sku,
                primary: (
                  <Link to="/admini/products/$sku" params={{ sku: r.product_sku }} className="hover:underline">
                    {r.product_sku}
                  </Link>
                ),
                secondary: r.product_name,
                value: `${r.qty} · ${formatAmd(r.revenue_amd)}`,
              }))}
            />
          </section>

          <PaginatedListSection
            title={t("admin.analytics.topViews")}
            empty={trackingOn ? t("admin.analytics.noViewsYet") : t("admin.analytics.trackingOffShort")}
            error={topViews.isError ? topViews.error : null}
            sort={viewsSort}
            onSortChange={(s) => {
              setViewsSort(s);
              setViewsPage(1);
            }}
            page={viewsPage}
            total={topViews.data?.total ?? 0}
            pageSize={ANALYTICS_PAGE_SIZE}
            onPageChange={setViewsPage}
            loading={topViews.isLoading}
            exporting={exportingViews}
            onExport={exportViews}
            rows={(topViews.data?.rows ?? []).map((r) => ({
              key: r.sku,
              primary: (
                <Link to="/admini/products/$sku" params={{ sku: r.sku }} className="hover:underline">
                  {r.sku}
                </Link>
              ),
              secondary: r.product_name,
              value: String(r.view_count),
            }))}
          />

          <PaginatedListSection
            title={t("admin.analytics.topSearches")}
            empty={trackingOn ? t("admin.analytics.noSearchesYet") : t("admin.analytics.trackingOffShort")}
            error={topSearches.isError ? topSearches.error : null}
            sort={searchesSort}
            onSortChange={(s) => {
              setSearchesSort(s);
              setSearchesPage(1);
            }}
            page={searchesPage}
            total={topSearches.data?.total ?? 0}
            pageSize={ANALYTICS_PAGE_SIZE}
            onPageChange={setSearchesPage}
            loading={topSearches.isLoading}
            exporting={exportingSearches}
            onExport={exportSearches}
            className="mb-8"
            rows={(topSearches.data?.rows ?? []).map((r) => ({
              key: r.query,
              primary: r.query,
              secondary:
                r.zero_results_count > 0
                  ? t("admin.analytics.zeroResults", { n: r.zero_results_count })
                  : undefined,
              value: String(r.search_count),
            }))}
          />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl tabular-nums">{value}</p>
    </div>
  );
}

function PaginatedListSection({
  title,
  rows,
  empty,
  error,
  sort,
  onSortChange,
  page,
  total,
  pageSize,
  onPageChange,
  loading,
  exporting,
  onExport,
  className,
}: {
  title: string;
  rows: Array<{ key: string; primary: ReactNode; secondary?: string; value: string }>;
  empty: string;
  error?: Error | null;
  sort: AnalyticsSort;
  onSortChange: (sort: AnalyticsSort) => void;
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  exporting?: boolean;
  onExport: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <section className={`mt-8 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="eyebrow text-muted-foreground">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase tracking-[0.12em]">{t("admin.analytics.sort")}</span>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as AnalyticsSort)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
            >
              <option value="desc">{t("admin.analytics.sortDesc")}</option>
              <option value="asc">{t("admin.analytics.sortAsc")}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={onExport}
            disabled={exporting || total === 0}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs uppercase tracking-[0.12em] disabled:opacity-50"
          >
            {exporting ? t("admin.analytics.exporting") : t("admin.analytics.exportXlsx")}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {t("admin.analytics.loadError", { msg: error.message })}
        </p>
      ) : loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-xl bg-secondary" />
      ) : (
        <RankTable empty={empty} rows={rows} />
      )}

      {total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{t("admin.analytics.pageRange", { from, to, total })}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1 || loading}
              onClick={() => onPageChange(safePage - 1)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 disabled:opacity-40"
            >
              {t("admin.analytics.prevPage")}
            </button>
            <span className="tabular-nums">
              {t("admin.analytics.pageOf", { page: safePage, total: totalPages })}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages || loading}
              onClick={() => onPageChange(safePage + 1)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 disabled:opacity-40"
            >
              {t("admin.analytics.nextPage")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function RankTable({
  rows,
  empty,
}: {
  rows: Array<{ key: string; primary: ReactNode; secondary?: string; value: string }>;
  empty: string;
}) {
  if (!rows.length) {
    return <p className="mt-3 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="mt-3 overflow-hidden rounded-xl border border-border bg-background">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{r.primary}</p>
            {r.secondary && <p className="truncate text-xs text-muted-foreground">{r.secondary}</p>}
          </div>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}
