import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { checkConversePayment } from "@/lib/converse.functions";
import { Check, Loader2, X, ArrowRight, ShieldCheck } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/payment/converse/return")({
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ order: z.string().uuid().optional(), demo: z.enum(["loading", "paid", "failed", "pending"]).optional() }).parse(s),
  head: () => ({ meta: [{ title: "Оплата — Smeg Armenia" }, { name: "robots", content: "noindex" }] }),
  component: ReturnPage,
});

function ReturnPage() {
  const { order, demo } = Route.useSearch();
  const check = useServerFn(checkConversePayment);
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "paid" | "failed" | "pending">("loading");
  const [orderNo, setOrderNo] = useState<number | null>(null);

  useEffect(() => {
    if (demo) {
      setState(demo);
      setOrderNo(12345);
      return;
    }
    if (!order) { setState("failed"); return; }
    let cancelled = false;
    let tries = 0;
    async function poll() {
      try {
        const r = await check({ data: { order_id: order! } });
        if (cancelled) return;
        setOrderNo(r.order_no);
        if (r.payment_status === "paid") {
          setState("paid");
          setTimeout(() => navigate({ to: "/order/$id", params: { id: String(r.order_no) }, replace: true }), 1500);
          return;
        }
        if (r.payment_status === "failed" || r.payment_status === "cancelled") { setState("failed"); return; }
        if (++tries < 6) setTimeout(poll, 1500);
        else setState("pending");
      } catch {
        if (!cancelled) setState("failed");
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [order, check, navigate, demo]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="relative overflow-hidden pt-32 pb-32">
        {/* Decorative SMEG-style backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #E30613 0%, transparent 45%), radial-gradient(circle at 80% 70%, #ffffff 0%, transparent 40%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-24 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="relative mx-auto max-w-2xl px-6 md:px-10">
          {state === "loading" && <LoadingCard title="Проверяем оплату" subtitle="Соединяемся с Converse Bank. Это займёт несколько секунд." />}

          {state === "paid" && (
            <StatusCard
              eyebrow="Подтверждено"
              accent="#10b981"
              icon={<Check className="h-10 w-10" strokeWidth={2.4} />}
              title="Спасибо за&nbsp;покупку"
              lead={`Заказ №${orderNo ?? "—"} оплачен. Менеджер свяжется с вами в течение рабочего дня.`}
              note="Перенаправляем на страницу заказа…"
              cta={orderNo ? { href: `/order/${orderNo}`, label: `К заказу №${orderNo}` } : undefined}
            />
          )}

          {state === "failed" && (
            <StatusCard
              eyebrow="Платёж не выполнен"
              accent="#E30613"
              icon={<X className="h-10 w-10" strokeWidth={2.4} />}
              title="Оплата не&nbsp;прошла"
              lead="Средства не списаны. Попробуйте оплатить заново или выберите другой способ оплаты при оформлении."
              note="Если ошибка повторяется — свяжитесь с нами, мы поможем оформить заказ вручную."
              cta={orderNo ? { href: `/order/${orderNo}`, label: `Открыть заказ №${orderNo}` } : { href: "/catalog", label: "Вернуться в каталог" }}
              secondaryCta={{ href: "/contacts", label: "Связаться с нами" }}
            />
          )}

          {state === "pending" && (
            <StatusCard
              eyebrow="В обработке"
              accent="#d4a52a"
              icon={<Loader2 className="h-10 w-10 animate-spin" strokeWidth={2.2} />}
              title="Платёж обрабатывается"
              lead="Банк ещё подтверждает транзакцию. Если деньги списались — статус заказа обновится автоматически."
              note="Эту страницу можно закрыть, мы напишем вам, как только получим подтверждение."
              cta={orderNo ? { href: `/order/${orderNo}`, label: `К заказу №${orderNo}` } : undefined}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function LoadingCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 px-10 py-16 text-center backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
      <p className="mt-8 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">SMEG · Converse Bank</p>
      <h1 className="mt-3 font-serif text-3xl tracking-tight md:text-4xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

type Cta = { href: string; label: string };

function StatusCard({
  eyebrow,
  accent,
  icon,
  title,
  lead,
  note,
  cta,
  secondaryCta,
}: {
  eyebrow: string;
  accent: string;
  icon: React.ReactNode;
  title: string;
  lead: string;
  note?: string;
  cta?: Cta;
  secondaryCta?: Cta;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 backdrop-blur-sm">
      {/* Top accent bar */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

      <div className="px-8 py-14 text-center md:px-14 md:py-16">
        <div className="mx-auto flex items-center justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
            style={{ background: accent }}
          >
            {icon}
          </div>
        </div>

        <p className="mt-8 text-[11px] uppercase tracking-[0.32em]" style={{ color: accent }}>
          {eyebrow}
        </p>
        <h1
          className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">{lead}</p>

        {(cta || secondaryCta) && (
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {cta && (
              <a
                href={cta.href}
                className="group inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-[11px] uppercase tracking-[0.28em] text-background transition hover:opacity-90"
              >
                {cta.label}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
            {secondaryCta && (
              <a
                href={secondaryCta.href}
                className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-[11px] uppercase tracking-[0.28em] text-foreground/80 transition hover:border-foreground hover:text-foreground"
              >
                {secondaryCta.label}
              </a>
            )}
          </div>
        )}

        {note && (
          <p className="mx-auto mt-8 max-w-sm text-xs leading-relaxed text-muted-foreground/80">{note}</p>
        )}

        <div className="mt-12 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.32em] text-muted-foreground/70">
          <ShieldCheck className="h-3.5 w-3.5" />
          Защищённое соединение · Converse Bank
        </div>
      </div>
    </div>
  );
}