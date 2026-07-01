import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ChevronRight, Inbox, Package, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admini/")({
  component: AdminHome,
});

function AdminHome() {
  const { t } = useI18n();
  const stats = useQuery({
    queryKey: ["admin-today"],
    queryFn: async () => {
      const [total, published, newOrders, newInq, noPrice] = await Promise.all([
        supabase.from("products").select("sku", { count: "exact", head: true }),
        supabase.from("products").select("sku", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("products").select("sku", { count: "exact", head: true }).eq("is_published", true).is("price_amd", null),
      ]);
      const totalN = total.count ?? 0;
      const publishedN = published.count ?? 0;
      return {
        totalProducts: totalN,
        published: publishedN,
        hidden: Math.max(0, totalN - publishedN),
        newOrders: newOrders.count ?? 0,
        newInq: newInq.count ?? 0,
        noPrice: noPrice.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  const actions = [
    {
      key: "orders",
      labelKey: "admin.home.actionNewOrders",
      count: stats.data?.newOrders ?? 0,
      to: "/admini/orders" as const,
      icon: ShoppingCart,
      urgent: (stats.data?.newOrders ?? 0) > 0,
    },
    {
      key: "inquiries",
      labelKey: "admin.home.actionNewInquiries",
      count: stats.data?.newInq ?? 0,
      to: "/admini/inquiries" as const,
      icon: Inbox,
      urgent: (stats.data?.newInq ?? 0) > 0,
    },
    {
      key: "hidden",
      labelKey: "admin.home.actionHiddenProducts",
      count: stats.data?.hidden ?? 0,
      to: "/admini/products" as const,
      icon: Package,
      urgent: false,
    },
    {
      key: "noprice",
      labelKey: "admin.home.actionNoPrice",
      count: stats.data?.noPrice ?? 0,
      to: "/admini/products" as const,
      icon: Package,
      urgent: (stats.data?.noPrice ?? 0) > 0,
    },
  ].filter((a) => a.count > 0 || a.key === "orders" || a.key === "inquiries");

  const hasUrgent = actions.some((a) => a.urgent && a.count > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">{t("admin.home.todayTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.home.todayIntro")}</p>

      <div className="mt-8 space-y-2">
        {stats.isLoading ? (
          <div className="h-24 animate-pulse rounded-sm bg-secondary" />
        ) : hasUrgent ? (
          actions.map((a) => (
            <Link
              key={a.key}
              to={a.to}
              className={`flex items-center gap-4 rounded-sm border px-4 py-4 transition hover:border-foreground ${
                a.urgent && a.count > 0 ? "border-foreground/30 bg-foreground/[0.03]" : "border-border"
              }`}
            >
              <a.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t(a.labelKey)}</p>
                <p className="text-2xl font-serif tabular-nums">{a.count}</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {t("admin.home.open")}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))
        ) : (
          <p className="rounded-sm border border-border bg-secondary/30 px-4 py-6 text-sm text-muted-foreground">
            {t("admin.home.allClear")}
          </p>
        )}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 border-t border-border pt-8">
        <div className="rounded-sm border border-border p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.home.totalProducts")}</p>
          <p className="mt-2 font-serif text-3xl tabular-nums">{stats.data?.totalProducts ?? "—"}</p>
        </div>
        <div className="rounded-sm border border-border p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.home.published")}</p>
          <p className="mt-2 font-serif text-3xl tabular-nums">{stats.data?.published ?? "—"}</p>
        </div>
      </div>

      <Link
        to="/admini/help"
        className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
      >
        {t("admin.nav.help")} →
      </Link>
    </div>
  );
}
