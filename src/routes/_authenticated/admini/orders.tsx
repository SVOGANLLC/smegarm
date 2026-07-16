import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, Loader2, Phone, MessageCircle, LayoutGrid, List, History, Save, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useI18n } from "@/lib/i18n";
import { updateOrderStatus } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/admini/orders")({
  component: AdminOrders,
});

const STATUS: Array<{ value: string; key: string; cls: string }> = [
  { value: "new", key: "admin.orders.status.new", cls: "bg-blue-100 text-blue-800" },
  { value: "in_progress", key: "admin.orders.status.in_progress", cls: "bg-amber-100 text-amber-800" },
  { value: "confirmed", key: "admin.orders.status.confirmed", cls: "bg-purple-100 text-purple-800" },
  { value: "shipped", key: "admin.orders.status.shipped", cls: "bg-indigo-100 text-indigo-800" },
  { value: "done", key: "admin.orders.status.done", cls: "bg-emerald-100 text-emerald-800" },
  { value: "cancelled", key: "admin.orders.status.cancelled", cls: "bg-rose-100 text-rose-800" },
];

type Order = {
  id: string;
  order_no: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  city: string | null;
  address: string | null;
  delivery_method: string;
  payment_method: string;
  payment_status: string | null;
  px_number: string | null;
  comment: string | null;
  status: string;
  admin_notes: string | null;
  internal_notes: string | null;
  status_history: Array<{ from: string; to: string; at: string; by: string | null }> | null;
  lang: string | null;
  total_amd: number;
  items_count: number;
  created_at: string;
};

type Item = {
  id: string;
  product_sku: string | null;
  name: string;
  image: string | null;
  unit_price_amd: number;
  qty: number;
  subtotal_amd: number;
};

function statusLabel(value: string, t: (key: string) => string) {
  return t(STATUS.find((s) => s.value === value)?.key ?? value);
}

function deliveryLabel(v: string, t: (key: string) => string) {
  if (v === "pickup") return t("admin.orders.delivery.pickup");
  if (v === "courier_yerevan") return t("admin.orders.delivery.yerevan");
  return t("admin.orders.delivery.armenia");
}

function paymentLabel(v: string, t: (key: string) => string) {
  if (v === "cash") return t("admin.orders.payment.cash");
  if (v === "card_online") return t("admin.orders.payment.cardOnline");
  if (v === "card_transfer") return t("admin.orders.payment.card");
  return v;
}

function paymentStatusLabel(v: string | null | undefined, t: (key: string) => string) {
  if (!v || v === "unknown") return t("admin.orders.paymentStatus.unknown");
  if (v === "paid") return t("admin.orders.paymentStatus.paid");
  if (v === "pending") return t("admin.orders.paymentStatus.pending");
  if (v === "failed") return t("admin.orders.paymentStatus.failed");
  if (v === "cancelled") return t("admin.orders.paymentStatus.cancelled");
  if (v === "refunded") return t("admin.orders.paymentStatus.refunded");
  return v;
}

function AdminOrders() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<string>("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const updateStatusFn = useServerFn(updateOrderStatus);

  const orders = useQuery({
    queryKey: ["admin-orders", filter, search],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter) q = q.eq("status", filter);
      if (search.trim()) {
        const s = search.trim();
        const isNum = /^\d+$/.test(s);
        q = isNum
          ? q.or(`customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%,order_no.eq.${s}`)
          : q.or(`customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await updateStatusFn({
        data: {
          order_id: id,
          status: status as "new" | "in_progress" | "confirmed" | "shipped" | "done" | "cancelled",
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(t("admin.orders.statusUpdated"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const exportXlsx = useMutation({
    mutationFn: async () => {
      const list = orders.data ?? [];
      if (!list.length) throw new Error(t("admin.orders.noExport"));
      const ids = list.map((o) => o.id);
      const { data: itemsAll, error } = await supabase
        .from("order_items")
        .select("order_id, product_sku, name, qty, unit_price_amd, subtotal_amd")
        .in("order_id", ids);
      if (error) throw error;
      const byOrder = new Map<string, Item[]>();
      (itemsAll ?? []).forEach((it: Item & { order_id: string }) => {
        const arr = byOrder.get(it.order_id) ?? [];
        arr.push(it);
        byOrder.set(it.order_id, arr);
      });
      const rows = list.map((o) => {
        const its = byOrder.get(o.id) ?? [];
        const positions = its.map((it) => `${it.product_sku ?? ""} ${it.name} ×${it.qty} = ${it.subtotal_amd} ֏`).join("\n");
        return {
          [t("admin.orders.colNo")]: o.order_no,
          [t("admin.orders.colDate")]: new Date(o.created_at).toLocaleString("ru-RU"),
          [t("admin.orders.colStatus")]: statusLabel(o.status, t),
          [t("admin.orders.colClient")]: o.customer_name,
          [t("admin.orders.colPhone")]: o.customer_phone,
          [t("admin.orders.colEmail")]: o.customer_email ?? "",
          [t("admin.orders.colCity")]: o.city ?? "",
          [t("admin.orders.colAddress")]: o.address ?? "",
          [t("admin.orders.delivery")]: deliveryLabel(o.delivery_method, t),
          [t("admin.orders.payment")]: paymentLabel(o.payment_method, t),
          [t("admin.orders.items")]: positions,
          [t("admin.orders.colQty")]: its.reduce((s: number, it) => s + (it.qty ?? 0), 0),
          [t("admin.orders.colTotal")]: o.total_amd,
          [t("admin.orders.clientComment")]: o.comment ?? "",
          [t("admin.orders.internalNotes")]: o.internal_notes ?? "",
          [t("admin.orders.colLang")]: o.lang ?? "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 6 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 22 },
        { wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 40 }, { wch: 8 },
        { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 6 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `smeg-orders-${date}.xlsx`);
    },
    onSuccess: () => toast.success(t("admin.orders.exportReady")),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.orders.exportError")),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl">{t("admin.orders.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.orders.desc")}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.orders.search")}
          className="w-full rounded-sm border border-border bg-background px-3 py-1.5 text-sm sm:w-auto"
        />
        <button
          onClick={() => setFilter("")}
          className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.15em] ${
            filter === "" ? "bg-foreground text-background" : "border border-border hover:bg-secondary"
          }`}
        >
          {t("admin.all")}
        </button>
        {STATUS.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.15em] ${
              filter === s.value ? "bg-foreground text-background" : "border border-border hover:bg-secondary"
            }`}
          >
            {t(s.key)}
          </button>
        ))}
        <div className="inline-flex rounded-sm border border-border p-0.5 sm:ml-auto">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs ${view === "list" ? "bg-foreground text-background" : "text-foreground/70"}`}
          >
            <List className="h-3.5 w-3.5" /> {t("admin.orders.list")}
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs ${view === "kanban" ? "bg-foreground text-background" : "text-foreground/70"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> {t("admin.orders.kanban")}
          </button>
        </div>
        <button
          onClick={() => exportXlsx.mutate()}
          disabled={exportXlsx.isPending || !orders.data?.length}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-40"
        >
          {exportXlsx.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Excel
        </button>
      </div>

      {orders.isLoading && (
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          {t("admin.loading")}
        </p>
      )}

      {orders.data?.length === 0 && (
        <p className="rounded-sm border border-border p-12 text-center text-muted-foreground">
          {t("admin.orders.empty")}
        </p>
      )}

      {view === "list" ? (
        <div className="space-y-3">
          {orders.data?.map((o) => (
            <OrderRow key={o.id} order={o} onStatusChange={(s) => setStatus.mutate({ id: o.id, status: s })} />
          ))}
        </div>
      ) : (
        <KanbanView
          orders={orders.data ?? []}
          onStatusChange={(id, s) => setStatus.mutate({ id, status: s })}
        />
      )}
    </div>
  );
}

function KanbanView({
  orders,
  onStatusChange,
}: {
  orders: Order[];
  onStatusChange: (id: string, status: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:overflow-visible xl:grid-cols-6">
      {STATUS.map((col) => {
        const items = orders.filter((o) => o.status === col.value);
        return (
          <div key={col.value} className="w-[80vw] min-w-[260px] flex-shrink-0 snap-start rounded-sm border border-border bg-secondary/20 sm:w-72 md:w-auto">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${col.cls}`}>{t(col.key)}</span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {items.map((o) => (
                <div
                  key={o.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)}
                  className="cursor-grab rounded-sm border border-border bg-background p-3 text-xs shadow-sm hover:shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono">#{o.order_no}</span>
                    <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ru-RU")}</span>
                  </div>
                  <p className="mt-1 truncate">{o.customer_name}</p>
                  <p className="text-muted-foreground">{o.customer_phone}</p>
                  <p className="mt-1 font-medium">{o.total_amd.toLocaleString("ru-RU")} ֏</p>
                  <select
                    value={o.status}
                    onChange={(e) => onStatusChange(o.id, e.target.value)}
                    className="mt-2 w-full rounded-sm border border-border bg-background px-1.5 py-1 text-[11px]"
                  >
                    {STATUS.map((s) => (
                      <option key={s.value} value={s.value}>{t(s.key)}</option>
                    ))}
                  </select>
                </div>
              ))}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) onStatusChange(id, col.value);
                }}
                className="rounded-sm border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground/60"
              >
                {t("admin.orders.dropHere")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderRow({ order, onStatusChange }: { order: Order; onStatusChange: (s: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(order.internal_notes ?? "");
  const qc = useQueryClient();
  useEffect(() => setNotes(order.internal_notes ?? ""), [order.id, order.internal_notes]);
  const status = STATUS.find((s) => s.value === order.status) ?? STATUS[0];
  const wa = `https://wa.me/${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(t("admin.orders.waPrefill") + order.order_no)}`;

  const items = useQuery({
    queryKey: ["admin-order-items", order.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", order.id);
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").update({ internal_notes: notes || null }).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(t("admin.orders.notesSaved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  return (
    <div className="rounded-sm border border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-secondary/30"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">#{order.order_no}</span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${status.cls}`}>
              {t(status.key)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm">{order.customer_name}</div>
            <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
          </div>
          <span className="text-xs text-muted-foreground md:ml-auto">
            {new Date(order.created_at).toLocaleString("ru-RU")}
          </span>
          <span className="font-medium">{order.total_amd.toLocaleString("ru-RU")} ֏</span>
        </div>
        <ChevronDown className={`mt-1 h-4 w-4 flex-shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border bg-secondary/20 p-4 sm:p-5 space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <Info label={t("admin.orders.contact")}>
              <p>{order.customer_name}</p>
              <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
              {order.customer_email && <p className="text-xs text-muted-foreground">{order.customer_email}</p>}
              <div className="mt-2 flex gap-2">
                <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs hover:bg-background">
                  <Phone className="h-3 w-3" /> {t("admin.orders.call")}
                </a>
                <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs hover:bg-background">
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </a>
              </div>
            </Info>
            <Info label={t("admin.orders.delivery")}>
              <p>{deliveryLabel(order.delivery_method, t)}</p>
              {order.city && <p className="text-xs text-muted-foreground">{order.city}</p>}
              {order.address && <p className="text-xs text-muted-foreground">{order.address}</p>}
            </Info>
            <Info label={t("admin.orders.payment")}>
              <p>{paymentLabel(order.payment_method, t)}</p>
              {order.payment_method === "card_online" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {paymentStatusLabel(order.payment_status, t)}
                  {order.px_number ? ` · px ${order.px_number}` : ""}
                </p>
              )}
            </Info>
          </div>
          {order.comment && (
            <Info label={t("admin.orders.clientComment")}>
              <p className="whitespace-pre-line text-muted-foreground">{order.comment}</p>
            </Info>
          )}

          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("admin.orders.items")}</p>
            {items.isLoading ? (
              <Loader2 className="mt-2 inline h-4 w-4 animate-spin" />
            ) : (
              <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <tbody>
                  {items.data?.map((it) => (
                    <tr key={it.id} className="border-t border-border">
                      <td className="py-2 w-12">
                        {it.image && <img src={it.image} alt="" className="h-10 w-10 rounded-sm bg-white object-contain p-1" />}
                      </td>
                      <td className="py-2">
                        <p className="font-mono text-xs">{it.product_sku}</p>
                        <p>{it.name}</p>
                      </td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {it.qty} × {it.unit_price_amd.toLocaleString("ru-RU")} ֏
                      </td>
                      <td className="py-2 text-right font-medium">{it.subtotal_amd.toLocaleString("ru-RU")} ֏</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("admin.orders.changeStatus")}</label>
            <select
              value={order.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="mt-1 rounded-sm border border-border bg-background px-3 py-2 text-sm"
            >
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>{t(s.key)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {t("admin.orders.internalNotes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("admin.orders.notesPlaceholder")}
              className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={() => saveNotes.mutate()}
              disabled={saveNotes.isPending || notes === (order.internal_notes ?? "")}
              className="mt-2 inline-flex items-center gap-2 rounded-sm bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-40"
            >
              {saveNotes.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {t("admin.save")}
            </button>
          </div>

          {order.status_history && order.status_history.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
                <History className="h-3 w-3" /> {t("admin.orders.history")}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {order.status_history.map((h, i) => (
                  <li key={i}>
                    {new Date(h.at).toLocaleString("ru-RU")} ·{" "}
                    {statusLabel(h.from, t)} →{" "}
                    <span className="text-foreground">
                      {statusLabel(h.to, t)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
