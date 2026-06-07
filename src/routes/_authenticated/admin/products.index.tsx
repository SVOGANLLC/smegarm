type ToggleableField = "is_published" | "is_bestseller" | "is_new" | "is_special_offer" | "is_featured";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Sparkles, Flame, Tag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/products/")({
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
      const term = q.trim();
      let skuFilter: string[] | null = null;
      if (term) {
        const { data: hits, error: e1 } = await supabase.rpc("search_products", {
          q: term,
          only_published: false,
          max_rows: 500,
        });
        if (e1) throw e1;
        skuFilter = (hits ?? []).map((r: { sku: string }) => r.sku);
        if (skuFilter.length === 0) return { items: [], total: 0 };
      }
      let qb = supabase
        .from("products")
        .select(
          "sku,name,category,main_image,price_amd,discount_percent,availability,stock_qty,stock_reserved,lead_time_days,is_published,is_bestseller,is_new,is_special_offer",
          {
          count: "exact",
          },
        )
        .order("name", { ascending: true })
        .range((page - 1) * PAGE, page * PAGE - 1);
      if (skuFilter) qb = qb.in("sku", skuFilter);
      const { data, count, error } = await qb;
      if (error) throw error;
      return { items: data ?? [], total: count ?? 0 };
    },
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ sku, field, value }: { sku: string; field: ToggleableField; value: boolean }) => {
      const patch: Record<ToggleableField, boolean | undefined> = {
        is_published: undefined,
        is_bestseller: undefined,
        is_new: undefined,
        is_special_offer: undefined,
        is_featured: undefined,
      };
      patch[field] = value;
      const update = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      ) as { [K in ToggleableField]?: boolean };
      const { error } = await supabase.from("products").update(update).eq("sku", sku);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
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

      <div className="mt-8 overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="w-16 p-3"></th>
              <th className="p-3">Артикул / название</th>
              <th className="p-3">Категория</th>
              <th className="p-3">Цена, ֏</th>
              <th className="p-3">Остаток</th>
              <th className="p-3">Наличие</th>
              <th className="p-3 text-center">Метки</th>
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
                  <StockCell qty={p.stock_qty ?? 0} reserved={p.stock_reserved ?? 0} lead={p.lead_time_days ?? null} />
                </td>
                <td className="p-3 text-xs">
                  <AvailBadge value={p.availability} />
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <FlagToggle
                      active={p.is_bestseller}
                      onClick={() => toggleFlag.mutate({ sku: p.sku, field: "is_bestseller", value: !p.is_bestseller })}
                      title="Хит продаж"
                    >
                      <Flame className="h-3.5 w-3.5" />
                    </FlagToggle>
                    <FlagToggle
                      active={p.is_new}
                      onClick={() => toggleFlag.mutate({ sku: p.sku, field: "is_new", value: !p.is_new })}
                      title="Новинка"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </FlagToggle>
                    <FlagToggle
                      active={p.is_special_offer}
                      onClick={() => toggleFlag.mutate({ sku: p.sku, field: "is_special_offer", value: !p.is_special_offer })}
                      title="Спецпредложение"
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </FlagToggle>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => toggleFlag.mutate({ sku: p.sku, field: "is_published", value: !p.is_published })}
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

function StockCell({ qty, reserved, lead }: { qty: number; reserved: number; lead: number | null }) {
  const avail = Math.max(0, qty - reserved);
  return (
    <div className="space-y-0.5">
      <div>
        <span className="font-medium text-foreground">{avail}</span>
        <span className="text-muted-foreground"> / {qty}</span>
        {reserved > 0 && <span className="text-amber-700"> (рез. {reserved})</span>}
      </div>
      {lead != null && lead > 0 && (
        <div className="text-[10px] text-muted-foreground">~{lead} дн.</div>
      )}
    </div>
  );
}

function FlagToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}