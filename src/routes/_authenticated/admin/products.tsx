import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

const PAGE = 30;

function AdminProducts() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ["admin-products", q, page],
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select("sku,name,category,main_image,price_amd,discount_percent,availability,is_published", {
          count: "exact",
        })
        .order("name", { ascending: true })
        .range((page - 1) * PAGE, page * PAGE - 1);
      if (q.trim()) qb = qb.or(`sku.ilike.%${q}%,name.ilike.%${q}%`);
      const { data, count, error } = await qb;
      if (error) throw error;
      return { items: data ?? [], total: count ?? 0 };
    },
  });

  const togglePub = useMutation({
    mutationFn: async ({ sku, value }: { sku: string; value: boolean }) => {
      const { error } = await supabase.from("products").update({ is_published: value }).eq("sku", sku);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Сохранено");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Товары</h1>
          <p className="mt-2 text-sm text-muted-foreground">{total} позиций</p>
        </div>
        <input
          type="search"
          placeholder="Поиск по артикулу или названию"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="w-72 rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </div>

      <div className="mt-8 overflow-hidden rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="w-16 p-3"></th>
              <th className="p-3">Артикул / название</th>
              <th className="p-3">Категория</th>
              <th className="p-3">Цена, ֏</th>
              <th className="p-3">Наличие</th>
              <th className="p-3 text-center">Виден</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((p) => (
              <tr key={p.sku} className="border-t border-border">
                <td className="p-3">
                  {p.main_image && (
                    <img src={p.main_image} alt="" className="h-12 w-12 object-contain" />
                  )}
                </td>
                <td className="p-3">
                  <div className="font-mono text-xs text-muted-foreground">{p.sku}</div>
                  <div className="line-clamp-1">{p.name}</div>
                </td>
                <td className="p-3 text-muted-foreground">{p.category}</td>
                <td className="p-3">
                  {p.price_amd ? p.price_amd.toLocaleString("ru-RU") : <span className="text-muted-foreground">—</span>}
                  {p.discount_percent > 0 && (
                    <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] text-background">
                      -{p.discount_percent}%
                    </span>
                  )}
                </td>
                <td className="p-3 text-xs">
                  <AvailBadge value={p.availability} />
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => togglePub.mutate({ sku: p.sku, value: !p.is_published })}
                    className="inline-flex"
                    aria-label="toggle"
                  >
                    {p.is_published ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <Link
                    to="/admin/products/$sku"
                    params={{ sku: p.sku }}
                    className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" /> Изменить
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.isLoading && <div className="p-6 text-center text-sm text-muted-foreground">Загрузка…</div>}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.15em] disabled:opacity-30"
          >
            ← Назад
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.15em] disabled:opacity-30"
          >
            Дальше →
          </button>
        </div>
      )}
    </div>
  );
}

function AvailBadge({ value }: { value: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    in_stock: { label: "В наличии", cls: "bg-emerald-100 text-emerald-900" },
    pre_order: { label: "Под заказ", cls: "bg-amber-100 text-amber-900" },
    out_of_stock: { label: "Нет", cls: "bg-rose-100 text-rose-900" },
    on_request: { label: "По запросу", cls: "bg-secondary text-foreground/70" },
  };
  const v = map[value] ?? map.on_request;
  return <span className={`rounded-full px-2 py-1 ${v.cls}`}>{v.label}</span>;
}