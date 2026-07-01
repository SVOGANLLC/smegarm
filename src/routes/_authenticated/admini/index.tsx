import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ChevronRight, FileText, Inbox, Layers, Package, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admini/")({
  component: AdminHome,
});

type RowProps = {
  to: string;
  label: string;
  hint?: string;
  count?: number;
  urgent?: boolean;
  icon: typeof ShoppingCart;
};

function MenuRow({ to, label, hint, count, urgent, icon: Icon }: RowProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 border-b border-border px-4 py-4 transition last:border-b-0 hover:bg-secondary/40"
    >
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium leading-tight">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {count != null && count > 0 && (
          <span
            className={`min-w-[1.5rem] rounded-full px-2 py-0.5 text-center text-xs font-medium tabular-nums ${
              urgent ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
            }`}
          >
            {count}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function MenuGroup({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-border bg-background">{children}</div>;
}

function AdminHome() {
  const { t } = useI18n();
  const stats = useQuery({
    queryKey: ["admin-today"],
    queryFn: async () => {
      const [newOrders, newInq, hidden, noPrice] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase
          .from("products")
          .select("sku", { count: "exact", head: true })
          .eq("is_published", false),
        supabase
          .from("products")
          .select("sku", { count: "exact", head: true })
          .eq("is_published", true)
          .is("price_amd", null),
      ]);
      return {
        newOrders: newOrders.count ?? 0,
        newInq: newInq.count ?? 0,
        hidden: hidden.count ?? 0,
        noPrice: noPrice.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  const s = stats.data;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl">{t("admin.nav.home")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.home.simpleIntro")}</p>

      <div className="mt-8 space-y-4">
        <MenuGroup>
          <MenuRow
            to="/admini/orders"
            icon={ShoppingCart}
            label={t("admin.nav.orders")}
            hint={t("admin.home.ordersHint")}
            count={s?.newOrders}
            urgent={(s?.newOrders ?? 0) > 0}
          />
          <MenuRow
            to="/admini/inquiries"
            icon={Inbox}
            label={t("admin.nav.inquiries")}
            hint={t("admin.home.inquiriesHint")}
            count={s?.newInq}
            urgent={(s?.newInq ?? 0) > 0}
          />
        </MenuGroup>

        <MenuGroup>
          <MenuRow to="/admini/products" icon={Package} label={t("admin.nav.products")} hint={t("admin.home.productsHint")} />
          <MenuRow to="/admini/collections" icon={Layers} label={t("admin.nav.collections")} hint={t("admin.home.collectionsHint")} />
          <MenuRow to="/admini/content" icon={FileText} label={t("admin.nav.content")} hint={t("admin.home.contentHint")} />
        </MenuGroup>

        {(s?.hidden ?? 0) > 0 || (s?.noPrice ?? 0) > 0 ? (
          <MenuGroup>
            {(s?.hidden ?? 0) > 0 && (
              <MenuRow
                to="/admini/products"
                icon={Package}
                label={t("admin.home.actionHiddenProducts")}
                count={s?.hidden}
              />
            )}
            {(s?.noPrice ?? 0) > 0 && (
              <MenuRow
                to="/admini/products"
                icon={Package}
                label={t("admin.home.actionNoPrice")}
                count={s?.noPrice}
                urgent
              />
            )}
          </MenuGroup>
        ) : null}
      </div>

      {stats.isLoading ? (
        <div className="mt-6 h-12 animate-pulse rounded-xl bg-secondary" />
      ) : (s?.newOrders ?? 0) === 0 && (s?.newInq ?? 0) === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">{t("admin.home.allClear")}</p>
      ) : null}
    </div>
  );
}
