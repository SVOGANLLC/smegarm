import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
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
    { label: "Всего товаров", value: stats.data?.totalProducts },
    { label: "Опубликовано", value: stats.data?.published },
    { label: "Новые заявки", value: stats.data?.newInq, accent: true },
    { label: "Всего заявок", value: stats.data?.totalInq },
  ];

  return (
    <div>
      <h1 className="font-serif text-4xl">Обзор</h1>
      <p className="mt-2 text-sm text-muted-foreground">Добро пожаловать в панель управления.</p>
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-sm border p-6 ${
              c.accent ? "border-foreground bg-foreground text-background" : "border-border"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">{c.label}</p>
            <p className="mt-3 font-serif text-4xl">{c.value ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}