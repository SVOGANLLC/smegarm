import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, Loader2, Phone, MessageCircle, LayoutGrid, List, History, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

const STATUS: Array<{ value: string; label: string; cls: string }> = [
  { value: "new", label: "Новый", cls: "bg-blue-100 text-blue-800" },
  { value: "in_progress", label: "В работе", cls: "bg-amber-100 text-amber-800" },
  { value: "confirmed", label: "Подтверждён", cls: "bg-purple-100 text-purple-800" },
  { value: "shipped", label: "Отправлен", cls: "bg-indigo-100 text-indigo-800" },
  { value: "done", label: "Выполнен", cls: "bg-emerald-100 text-emerald-800" },
  { value: "cancelled", label: "Отменён", cls: "bg-rose-100 text-rose-800" },
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

function AdminOrders() {
  const [filter, setFilter] = useState<string>("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

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
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Статус обновлён");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl">Заказы</h1>
        <p className="mt-2 text-sm text-muted-foreground">Все заказы из корзины.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск: имя, телефон, №"
          className="rounded-sm border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => setFilter("")}
          className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.15em] ${
            filter === "" ? "bg-foreground text-background" : "border border-border hover:bg-secondary"
          }`}
        >
          Все
        </button>
        {STATUS.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.15em] ${
              filter === s.value ? "bg-foreground text-background" : "border border-border hover:bg-secondary"
            }`}
          >
            {s.label}
          </button>
        ))}
        <div className="ml-auto inline-flex rounded-sm border border-border p-0.5">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs ${view === "list" ? "bg-foreground text-background" : "text-foreground/70"}`}
          >
            <List className="h-3.5 w-3.5" /> Список
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs ${view === "kanban" ? "bg-foreground text-background" : "text-foreground/70"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Доска
          </button>
        </div>
      </div>

      {orders.isLoading && (
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Загрузка…
        </p>
      )}

      {orders.data?.length === 0 && (
        <p className="rounded-sm border border-border p-12 text-center text-muted-foreground">
          Пока нет заказов
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
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {STATUS.map((col) => {
        const items = orders.filter((o) => o.status === col.value);
        return (
          <div key={col.value} className="rounded-sm border border-border bg-secondary/20">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${col.cls}`}>{col.label}</span>
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
                      <option key={s.value} value={s.value}>{s.label}</option>
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
                Перетащить сюда
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderRow({ order, onStatusChange }: { order: Order; onStatusChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(order.internal_notes ?? "");
  const qc = useQueryClient();
  useEffect(() => setNotes(order.internal_notes ?? ""), [order.id, order.internal_notes]);
  const status = STATUS.find((s) => s.value === order.status) ?? STATUS[0];
  const wa = `https://wa.me/${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent("Здравствуйте! По вашему заказу №" + order.order_no)}`;

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
      toast.success("Заметки сохранены");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  return (
    <div className="rounded-sm border border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-secondary/30"
      >
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <span className="font-mono text-sm">#{order.order_no}</span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${status.cls}`}>
            {status.label}
          </span>
          <span className="text-sm">{order.customer_name}</span>
          <span className="text-xs text-muted-foreground">{order.customer_phone}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString("ru-RU")}
          </span>
          <span className="font-medium">{order.total_amd.toLocaleString("ru-RU")} ֏</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border bg-secondary/20 p-5 space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <Info label="Контакт">
              <p>{order.customer_name}</p>
              <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
              {order.customer_email && <p className="text-xs text-muted-foreground">{order.customer_email}</p>}
              <div className="mt-2 flex gap-2">
                <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs hover:bg-background">
                  <Phone className="h-3 w-3" /> Позвонить
                </a>
                <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs hover:bg-background">
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </a>
              </div>
            </Info>
            <Info label="Доставка">
              <p>{deliveryLabel(order.delivery_method)}</p>
              {order.city && <p className="text-xs text-muted-foreground">{order.city}</p>}
              {order.address && <p className="text-xs text-muted-foreground">{order.address}</p>}
            </Info>
            <Info label="Оплата">
              <p>{paymentLabel(order.payment_method)}</p>
            </Info>
          </div>
          {order.comment && (
            <Info label="Комментарий клиента">
              <p className="whitespace-pre-line text-muted-foreground">{order.comment}</p>
            </Info>
          )}

          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Позиции</p>
            {items.isLoading ? (
              <Loader2 className="mt-2 inline h-4 w-4 animate-spin" />
            ) : (
              <table className="mt-2 w-full">
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
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.15em] text-muted-foreground">Изменить статус</label>
            <select
              value={order.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="mt-1 rounded-sm border border-border bg-background px-3 py-2 text-sm"
            >
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Внутренние заметки (видны только команде)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Договорённости, нюансы, контакты курьера…"
              className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={() => saveNotes.mutate()}
              disabled={saveNotes.isPending || notes === (order.internal_notes ?? "")}
              className="mt-2 inline-flex items-center gap-2 rounded-sm bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-40"
            >
              {saveNotes.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Сохранить
            </button>
          </div>

          {order.status_history && order.status_history.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
                <History className="h-3 w-3" /> История статусов
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {order.status_history.map((h, i) => (
                  <li key={i}>
                    {new Date(h.at).toLocaleString("ru-RU")} ·{" "}
                    {STATUS.find((s) => s.value === h.from)?.label ?? h.from} →{" "}
                    <span className="text-foreground">
                      {STATUS.find((s) => s.value === h.to)?.label ?? h.to}
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

function deliveryLabel(v: string) {
  if (v === "pickup") return "Самовывоз";
  if (v === "courier_yerevan") return "Курьер по Еревану";
  return "Доставка по Армении";
}
function paymentLabel(v: string) {
  if (v === "cash") return "Наличные при получении";
  if (v === "card_transfer") return "Перевод на карту";
  return "Idram";
}