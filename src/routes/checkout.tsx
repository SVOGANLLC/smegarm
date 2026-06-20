import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useCart } from "@/lib/cart";
import { createOrder } from "@/lib/orders.functions";
import { startConversePayment } from "@/lib/converse.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";
import { openPaymentTab, preparePaymentTab } from "@/lib/open-payment";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Smeg Armenia" }] }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ retry: z.string().uuid().optional() }).parse(s),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const submit = useServerFn(createOrder);
  const startPay = useServerFn(startConversePayment);
  const [busy, setBusy] = useState(false);
  const { lang, t } = useI18n();

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    city: "",
    address: "",
    delivery_method: "pickup" as "pickup" | "courier_yerevan" | "courier_armenia",
    payment_method: "cash" as "cash" | "card_online",
    comment: "",
  });

  useEffect(() => {
    document.title = t("checkout.metaTitle");
  }, [t]);

  useEffect(() => {
    setForm((f) => ({ ...f, city: t("checkout.defaultCity") }));
  }, [lang, t]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    const payTab = form.payment_method === "card_online" ? preparePaymentTab() : null;
    setBusy(true);
    try {
      const res = await submit({
        data: {
          ...form,
          lang,
          items: items.map((i) => ({ sku: i.sku, qty: i.qty })),
        },
      });
      if (form.payment_method === "card_online") {
        try {
          const pay = await startPay({ data: { order_id: res.id, lang } });
          if (!pay?.formUrl) throw new Error(t("checkout.error.payment"));
          openPaymentTab(pay.formUrl, payTab);
          clear();
          navigate({
            to: "/order/$id",
            params: { id: String(res.order_no) },
            search: { oid: res.id, pay: "pending" },
            replace: true,
          });
          return;
        } catch (err) {
          payTab?.close();
          toast.error(err instanceof Error ? err.message : t("checkout.error.payment"));
          clear();
          navigate({
            to: "/order/$id",
            params: { id: String(res.order_no) },
            search: { oid: res.id, pay: "error" },
            replace: true,
          });
          return;
        }
      }
      clear();
      navigate({ to: "/order/$id", params: { id: String(res.order_no) }, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("checkout.error.submit"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-[1200px] px-6 md:px-10">
          <h1 className="font-serif text-4xl md:text-5xl">{t("checkout.title")}</h1>

          {items.length === 0 ? (
            <div className="mt-12 rounded-sm border border-border p-12 text-center">
              <p className="text-muted-foreground">{t("cart.empty")}</p>
              <Link to="/catalog" className="mt-4 inline-block underline">{t("common.shop")}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
              <div className="space-y-8">
                <Section title={t("checkout.contacts")}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("checkout.name")} value={form.customer_name} onChange={(v) => set("customer_name", v)} required maxLength={200} />
                    <Field label={t("checkout.phone")} value={form.customer_phone} onChange={(v) => set("customer_phone", v)} required type="tel" placeholder="+374 …" />
                    <Field label={t("checkout.email")} value={form.customer_email} onChange={(v) => set("customer_email", v)} type="email" className="md:col-span-2" />
                  </div>
                </Section>

                <Section title={t("checkout.delivery")}>
                  <div className="space-y-3">
                    <Radio name="delivery" value="pickup" current={form.delivery_method} onChange={(v) => set("delivery_method", v as typeof form.delivery_method)} label={t("checkout.delivery.pickup")} sub={t("checkout.delivery.pickup.sub")} />
                    <Radio name="delivery" value="courier_yerevan" current={form.delivery_method} onChange={(v) => set("delivery_method", v as typeof form.delivery_method)} label={t("checkout.delivery.yerevan")} sub={t("checkout.delivery.yerevan.sub")} />
                    <Radio name="delivery" value="courier_armenia" current={form.delivery_method} onChange={(v) => set("delivery_method", v as typeof form.delivery_method)} label={t("checkout.delivery.armenia")} sub={t("checkout.delivery.armenia.sub")} />
                  </div>
                  {form.delivery_method !== "pickup" && (
                    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr]">
                      <Field label={t("checkout.city")} value={form.city} onChange={(v) => set("city", v)} />
                      <Field label={t("checkout.address")} value={form.address} onChange={(v) => set("address", v)} maxLength={500} />
                    </div>
                  )}
                </Section>

                <Section title={t("checkout.payment")}>
                  <div className="space-y-3">
                    <Radio name="pay" value="cash" current={form.payment_method} onChange={(v) => set("payment_method", v as typeof form.payment_method)} label={t("checkout.payment.cash")} />
                    <Radio name="pay" value="card_online" current={form.payment_method} onChange={(v) => set("payment_method", v as typeof form.payment_method)} label={t("checkout.payment.card")} sub={t("checkout.payment.card.sub")} />
                  </div>
                </Section>

                <Section title={t("checkout.comment")}>
                  <textarea
                    value={form.comment}
                    onChange={(e) => set("comment", e.target.value)}
                    maxLength={2000}
                    rows={4}
                    className="w-full rounded-sm border border-border bg-background p-3 text-sm focus:border-foreground focus:outline-none"
                    placeholder={t("checkout.comment.placeholder")}
                  />
                </Section>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-sm border border-border p-6">
                  <h2 className="font-serif text-xl">{t("checkout.summary")}</h2>
                  <ul className="mt-4 space-y-3 border-b border-border pb-4">
                    {items.map((i) => (
                      <li key={i.sku} className="flex justify-between gap-4 text-sm">
                        <div className="flex-1">
                          <p className="line-clamp-2">{i.name}</p>
                          <p className="text-xs text-muted-foreground">{i.qty} × {(i.price ?? 0).toLocaleString("ru-RU")} ֏</p>
                        </div>
                        <p className="font-medium">{((i.price ?? 0) * i.qty).toLocaleString("ru-RU")} ֏</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex justify-between text-base">
                    <span className="text-muted-foreground">{t("cart.total")}</span>
                    <span className="font-serif text-2xl">{total.toLocaleString("ru-RU")} ֏</span>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90 disabled:opacity-50"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("checkout.confirm")}
                  </button>
                  <p className="mt-3 text-xs text-muted-foreground">{t("checkout.disclaimer")}</p>
                </div>
              </aside>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label, value, onChange, required, type = "text", maxLength, placeholder, className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={"block " + (className ?? "")}>
      <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
      />
    </label>
  );
}

function Radio({
  name, value, current, onChange, label, sub,
}: { name: string; value: string; current: string; onChange: (v: string) => void; label: string; sub?: string }) {
  const active = current === value;
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition ${active ? "border-foreground bg-secondary/40" : "border-border hover:border-foreground/40"}`}>
      <input type="radio" name={name} value={value} checked={active} onChange={() => onChange(value)} className="mt-0.5 accent-foreground" />
      <div>
        <p className="text-sm">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </label>
  );
}
