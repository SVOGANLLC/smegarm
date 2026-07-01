type ToggleableField = "is_published" | "is_bestseller" | "is_new" | "is_special_offer" | "is_featured";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Sparkles, Flame, Tag, Plus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { z } from "zod";
import { assertRowUpdated } from "@/lib/supabase-assert";
import { invalidateProductQueries } from "@/lib/admin-product-cache";

const productsSearchSchema = z.object({
  noPrice: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export const Route = createFileRoute("/_authenticated/admini/products/")({
  validateSearch: (s) => productsSearchSchema.parse(s),
  component: AdminProducts,
});

const PAGE = 30;

function AdminProducts() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { noPrice, hidden } = Route.useSearch();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>("");
  const [visibility, setVisibility] = useState<"all" | "published" | "hidden">(hidden ? "hidden" : "all");
  const [availability, setAvailability] = useState<string>("");
  const [flagFilter, setFlagFilter] = useState<"" | "is_bestseller" | "is_new" | "is_special_offer" | "is_featured">("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setVisibility(hidden ? "hidden" : "all");
    setPage(1);
  }, [hidden, noPrice]);

  const categories = useQuery({
    queryKey: ["admin-product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("category").not("category", "is", null).limit(5000);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of data ?? []) {
        const c = (r as { category: string | null }).category?.trim();
        if (c) set.add(c);
      }
      return Array.from(set).sort();
    },
    staleTime: 5 * 60_000,
  });

  const list = useQuery({
    queryKey: ["admin-products", q, page, category, visibility, availability, flagFilter, noPrice ?? false, hidden ?? false],
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
          "sku,name,category,main_image,price_amd,discount_percent,availability,stock_qty,stock_reserved,lead_time_days,is_published,is_bestseller,is_new,is_special_offer,is_featured",
          {
          count: "exact",
          },
        )
        .order("name", { ascending: true })
        .range((page - 1) * PAGE, page * PAGE - 1);
      if (skuFilter) qb = qb.in("sku", skuFilter);
      if (noPrice) {
        qb = qb.eq("is_published", true).is("price_amd", null);
      } else {
        if (category) qb = qb.eq("category", category);
        if (visibility === "published") qb = qb.eq("is_published", true);
        else if (visibility === "hidden") qb = qb.eq("is_published", false);
      }
      if (availability) qb = qb.eq("availability", availability);
      if (flagFilter) qb = qb.eq(flagFilter, true);
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
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const savePrice = useMutation({
    mutationFn: async ({ sku, price_amd }: { sku: string; price_amd: number | null }) => {
      const { data, error } = await supabase
        .from("products")
        .update({ price_amd })
        .eq("sku", sku)
        .select("sku, price_amd")
        .maybeSingle();
      if (error) throw error;
      return assertRowUpdated(data, t("admin.saveNoRow"));
    },
    onSuccess: (_data, { sku }) => {
      invalidateProductQueries(qc, sku);
      toast.success(t("admin.saved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const createProduct = useMutation({
    mutationFn: async (input: { sku: string; name: string; category: string }) => {
      const sku = input.sku.trim().toUpperCase();
      if (!sku) throw new Error(t("admin.products.skuRequired"));
      if (!input.name.trim()) throw new Error(t("admin.products.nameRequired"));
      const { error } = await supabase.from("products").insert({
        sku,
        name: input.name.trim(),
        category: input.category.trim() || null,
        is_published: false,
      });
      if (error) throw error;
      return sku;
    },
    onSuccess: (sku) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-product-categories"] });
      setCreating(false);
      navigate({ to: "/admini/products/$sku", params: { sku } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  const resetFilters = () => {
    setCategory("");
    setVisibility("all");
    setAvailability("");
    setFlagFilter("");
    setPage(1);
    navigate({ search: {} });
  };
  const activeFilters =
    [category, visibility !== "all" ? visibility : "", availability, flagFilter, noPrice ? "noPrice" : "", hidden ? "hidden" : ""].filter(Boolean).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">{t("admin.products.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("admin.products.count", { n: total })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder={t("admin.products.search")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="w-72 rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-xs uppercase tracking-[0.18em] text-background hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> {t("admin.add")}
          </button>
        </div>
      </div>

      {(noPrice || hidden) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {noPrice && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs">
              {t("admin.home.actionNoPrice")}
              <button
                type="button"
                onClick={() => navigate({ search: (prev) => ({ ...prev, noPrice: undefined }) })}
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("admin.products.resetFilters", { n: 1 })}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {hidden && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs">
              {t("admin.home.actionHiddenProducts")}
              <button
                type="button"
                onClick={() => navigate({ search: (prev) => ({ ...prev, hidden: undefined }) })}
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("admin.products.resetFilters", { n: 1 })}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-sm border border-border bg-secondary/40 p-3">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="rounded-sm border border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.14em]"
        >
          <option value="">{t("admin.products.allCategories")}</option>
          {categories.data?.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={visibility}
          onChange={(e) => { setVisibility(e.target.value as "all" | "published" | "hidden"); setPage(1); }}
          className="rounded-sm border border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.14em]"
        >
          <option value="all">{t("admin.all")}</option>
          <option value="published">{t("admin.products.published")}</option>
          <option value="hidden">{t("admin.products.hidden")}</option>
        </select>
        <select
          value={availability}
          onChange={(e) => { setAvailability(e.target.value); setPage(1); }}
          className="rounded-sm border border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.14em]"
        >
          <option value="">{t("admin.products.anyStock")}</option>
          <option value="in_stock">{t("admin.products.inStock")}</option>
          <option value="pre_order">{t("admin.products.preOrder")}</option>
          <option value="on_request">{t("admin.products.onRequest")}</option>
          <option value="out_of_stock">{t("admin.products.outOfStock")}</option>
        </select>
        <select
          value={flagFilter}
          onChange={(e) => { setFlagFilter(e.target.value as typeof flagFilter); setPage(1); }}
          className="rounded-sm border border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.14em]"
        >
          <option value="">{t("admin.products.anyBadge")}</option>
          <option value="is_bestseller">{t("admin.products.bestseller")}</option>
          <option value="is_new">{t("admin.products.newItem")}</option>
          <option value="is_special_offer">{t("admin.products.special")}</option>
          <option value="is_featured">{t("admin.products.featured")}</option>
        </select>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-sm border border-border px-3 py-2 text-xs uppercase tracking-[0.14em] hover:border-foreground"
          >
            {t("admin.products.resetFilters", { n: activeFilters })}
          </button>
        )}
      </div>

      {creating && (
        <CreateProductDialog
          onCancel={() => setCreating(false)}
          onSubmit={(v) => createProduct.mutate(v)}
          isPending={createProduct.isPending}
          categories={categories.data ?? []}
        />
      )}

      <div className="mt-8 overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="w-16 p-3"></th>
              <th className="p-3">{t("admin.products.colSku")}</th>
              <th className="p-3">{t("admin.products.colCategory")}</th>
              <th className="p-3">{t("admin.products.colPrice")}, ֏</th>
              <th className="p-3">{t("admin.products.colStock")}</th>
              <th className="p-3">{t("admin.products.colAvail")}</th>
              <th className="p-3 text-center">{t("admin.products.colBadges")}</th>
              <th className="p-3 text-center">{t("admin.products.colVisible")}</th>
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
                  <PriceCell
                    sku={p.sku}
                    price={p.price_amd}
                    highlight={!!noPrice}
                    saving={savePrice.isPending}
                    onSave={(price_amd) => savePrice.mutate({ sku: p.sku, price_amd })}
                  />
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
                      title={t("admin.products.bestseller")}
                    >
                      <Flame className="h-3.5 w-3.5" />
                    </FlagToggle>
                    <FlagToggle
                      active={p.is_new}
                      onClick={() => toggleFlag.mutate({ sku: p.sku, field: "is_new", value: !p.is_new })}
                      title={t("admin.products.newItem")}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </FlagToggle>
                    <FlagToggle
                      active={p.is_special_offer}
                      onClick={() => toggleFlag.mutate({ sku: p.sku, field: "is_special_offer", value: !p.is_special_offer })}
                      title={t("admin.products.special")}
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
                    to="/admini/products/$sku"
                    params={{ sku: p.sku }}
                    className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" /> {t("admin.change")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.isLoading && <div className="p-6 text-center text-sm text-muted-foreground">{t("admin.loading")}</div>}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.15em] disabled:opacity-30"
          >
            {t("admin.prev")}
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.15em] disabled:opacity-30"
          >
            {t("admin.next")}
          </button>
        </div>
      )}
    </div>
  );
}

function PriceCell({
  sku,
  price,
  highlight,
  saving,
  onSave,
}: {
  sku: string;
  price: number | null;
  highlight?: boolean;
  saving?: boolean;
  onSave: (price: number | null) => void;
}) {
  const { t } = useI18n();
  const [val, setVal] = useState(price != null ? String(price) : "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setVal(price != null ? String(price) : "");
    setDirty(false);
  }, [sku, price]);

  const commit = () => {
    if (!dirty) return;
    const trimmed = val.trim();
    const next = trimmed ? parseInt(trimmed, 10) : null;
    if (trimmed && (next == null || Number.isNaN(next) || next < 0)) {
      toast.error(t("admin.product.priceInvalid"));
      setVal(price != null ? String(price) : "");
      setDirty(false);
      return;
    }
    if (next === price) {
      setDirty(false);
      return;
    }
    onSave(next);
    setDirty(false);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={val}
      disabled={saving}
      placeholder={highlight ? t("admin.products.enterPrice") : "—"}
      onChange={(e) => {
        setVal(e.target.value.replace(/[^0-9]/g, ""));
        setDirty(true);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      className={`w-28 rounded-sm border bg-background px-2 py-1.5 text-sm outline-none focus:border-foreground ${
        highlight && !price ? "border-amber-500/60" : "border-border"
      }`}
    />
  );
}

function AvailBadge({ value }: { value: string }) {
  const { t } = useI18n();
  const map: Record<string, { key: string; cls: string }> = {
    in_stock: { key: "admin.products.inStock", cls: "bg-emerald-100 text-emerald-900" },
    pre_order: { key: "admin.products.preOrder", cls: "bg-amber-100 text-amber-900" },
    out_of_stock: { key: "admin.no", cls: "bg-rose-100 text-rose-900" },
    on_request: { key: "admin.products.onRequest", cls: "bg-secondary text-foreground/70" },
  };
  const v = map[value] ?? map.on_request;
  return <span className={`rounded-full px-2 py-1 ${v.cls}`}>{t(v.key)}</span>;
}

function StockCell({ qty, reserved, lead }: { qty: number; reserved: number; lead: number | null }) {
  const { t } = useI18n();
  const avail = Math.max(0, qty - reserved);
  return (
    <div className="space-y-0.5">
      <div>
        <span className="font-medium text-foreground">{avail}</span>
        <span className="text-muted-foreground"> / {qty}</span>
        {reserved > 0 && <span className="text-amber-700"> {t("admin.products.reserved", { n: reserved })}</span>}
      </div>
      {lead != null && lead > 0 && (
        <div className="text-[10px] text-muted-foreground">{t("admin.products.leadDays", { n: lead })}</div>
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

function CreateProductDialog({
  onCancel,
  onSubmit,
  isPending,
  categories,
}: {
  onCancel: () => void;
  onSubmit: (v: { sku: string; name: string; category: string }) => void;
  isPending: boolean;
  categories: string[];
}) {
  const { t } = useI18n();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-sm border border-border bg-background p-6">
        <h2 className="font-serif text-2xl">{t("admin.products.newProduct")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("admin.products.newProductDesc")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ sku, name, category });
          }}
          className="mt-5 space-y-4"
        >
          <label className="block">
            <span className="eyebrow mb-1.5 block text-muted-foreground">{t("admin.products.skuLabel")}</span>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              autoFocus
              required
              className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block text-muted-foreground">{t("admin.products.nameLabel")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block text-muted-foreground">{t("admin.products.categoryLabel")}</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="admin-new-product-categories"
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <datalist id="admin-new-product-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] hover:border-foreground"
            >
              {t("admin.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-sm bg-foreground px-4 py-2 text-xs uppercase tracking-[0.18em] text-background disabled:opacity-50"
            >
              {isPending ? "..." : t("admin.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}