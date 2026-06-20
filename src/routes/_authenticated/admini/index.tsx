import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admini/")({
  component: AdminHome,
});

function AdminHome() {
  const { t } = useI18n();
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [a, b, c, d] = await Promise.all([
        supabase.from("products").select("sku", { count: "exact", head: true }),
        supabase.from("products").select("sku", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("inquiries").select("id", { count: "exact", head: true }),
      ]);
      return {
        totalProducts: a.count ?? 0,
        published: b.count ?? 0,
        newInq: c.count ?? 0,
        totalInq: d.count ?? 0,
      };
    },
  });

  const cards = [
    { labelKey: "admin.home.totalProducts", value: stats.data?.totalProducts },
    { labelKey: "admin.home.published", value: stats.data?.published },
    { labelKey: "admin.home.newInquiries", value: stats.data?.newInq, accent: true },
    { labelKey: "admin.home.totalInquiries", value: stats.data?.totalInq },
  ];

  return (
    <div>
      <h1 className="font-serif text-4xl">{t("admin.home.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.home.welcome")}</p>
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.labelKey}
            className={`rounded-sm border p-6 ${c.accent ? "border-foreground bg-foreground text-background" : "border-border"}`}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">{t(c.labelKey)}</p>
            <p className="mt-3 font-serif text-4xl">{c.value ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
