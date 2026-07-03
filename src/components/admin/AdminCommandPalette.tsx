import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type Result = {
  id: string;
  label: string;
  hint?: string;
  to: string;
  params?: Record<string, string>;
};

const STATIC: Result[] = [
  { id: "home", label: "Главная", to: "/admini" },
  { id: "orders", label: "Заказы", to: "/admini/orders" },
  { id: "analytics", label: "Аналитика", to: "/admini/analytics" },
  { id: "inquiries", label: "Заявки", to: "/admini/inquiries" },
  { id: "products", label: "Товары", to: "/admini/products" },
  { id: "collections", label: "Коллекции", to: "/admini/collections" },
  { id: "menu", label: "Подборки меню", to: "/admini/menu" },
  { id: "groups", label: "Цветовые группы", to: "/admini/groups" },
  { id: "content", label: "Контент сайта", to: "/admini/content" },
  { id: "help", label: "Справка", to: "/admini/help" },
];

export function AdminCommandPalette() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("admin-open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("admin-open-search", onOpen);
    };
  }, []);

  const term = q.trim();
  const enabled = open && term.length >= 2;

  const searchQ = useQuery({
    queryKey: ["admin-cmd-search", term],
    queryFn: async () => {
      const results: Result[] = [];
      const lower = term.toLowerCase();

      for (const s of STATIC) {
        if (s.label.toLowerCase().includes(lower)) results.push(s);
      }

      const orderNum = /^\d+$/.test(term) ? parseInt(term, 10) : null;
      if (orderNum != null) {
        const { data } = await supabase.from("orders").select("id,status").eq("id", orderNum).maybeSingle();
        if (data) {
          results.unshift({
            id: `order-${data.id}`,
            label: `Заказ #${data.id}`,
            hint: data.status ?? undefined,
            to: "/admini/orders",
          });
        }
      }

      const { data: products } = await supabase.rpc("search_products", {
        q: term,
        only_published: false,
        max_rows: 8,
      });
      for (const row of (products ?? []) as Array<{ sku: string; name?: string }>) {
        results.push({
          id: `sku-${row.sku}`,
          label: row.name || row.sku,
          hint: row.sku,
          to: "/admini/products/$sku",
          params: { sku: row.sku },
        });
      }

      const { data: cols } = await supabase
        .from("collections")
        .select("slug,name")
        .or(`name.ilike.%${term}%,slug.ilike.%${term}%`)
        .limit(6);
      for (const c of cols ?? []) {
        results.push({
          id: `col-${c.slug}`,
          label: c.name,
          hint: c.slug,
          to: "/admini/collections",
        });
      }

      return results.slice(0, 12);
    },
    enabled,
    staleTime: 10_000,
  });

  const items = useMemo(() => {
    if (!term) return STATIC;
    return searchQ.data ?? STATIC.filter((s) => s.label.toLowerCase().includes(term.toLowerCase()));
  }, [term, searchQ.data]);

  if (!open) return null;

  const go = (item: Result) => {
    setOpen(false);
    setQ("");
    if (item.params) navigate({ to: item.to as "/admini/products/$sku", params: item.params });
    else navigate({ to: item.to as "/admini" });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.search.placeholder")}
            className="flex-1 bg-transparent py-3.5 text-sm outline-none"
          />
          <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {searchQ.isFetching && term.length >= 2 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">{t("admin.loading")}</li>
          ) : items.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">{t("admin.search.empty")}</li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(item)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-secondary/60"
                >
                  <span>{item.label}</span>
                  {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">⌘K</p>
      </div>
    </div>
  );
}
