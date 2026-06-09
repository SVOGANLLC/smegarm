import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { checkConversePayment } from "@/lib/converse.functions";
import { Check, Loader2, XCircle } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/payment/converse/return")({
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ order: z.string().uuid().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Оплата — Smeg Armenia" }, { name: "robots", content: "noindex" }] }),
  component: ReturnPage,
});

function ReturnPage() {
  const { order } = Route.useSearch();
  const check = useServerFn(checkConversePayment);
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "paid" | "failed" | "pending">("loading");
  const [orderNo, setOrderNo] = useState<number | null>(null);

  useEffect(() => {
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
  }, [order, check, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-xl px-6 text-center md:px-10">
          {state === "loading" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
              <h1 className="mt-6 font-serif text-3xl">Проверяем оплату…</h1>
              <p className="mt-2 text-sm text-muted-foreground">Подождите, это займёт несколько секунд.</p>
            </>
          )}
          {state === "paid" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-8 w-8" />
              </div>
              <h1 className="mt-6 font-serif text-3xl">Оплата прошла</h1>
              <p className="mt-2 text-sm text-muted-foreground">Заказ № {orderNo} подтверждён. Перенаправляем…</p>
            </>
          )}
          {state === "failed" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700">
                <XCircle className="h-8 w-8" />
              </div>
              <h1 className="mt-6 font-serif text-3xl">Оплата не прошла</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Попробуйте ещё раз или выберите другой способ оплаты. Менеджер свяжется с вами.
              </p>
              {orderNo && (
                <a href={`/order/${orderNo}`} className="mt-6 inline-block rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground">
                  К заказу №{orderNo}
                </a>
              )}
            </>
          )}
          {state === "pending" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
              <h1 className="mt-6 font-serif text-3xl">Платёж обрабатывается</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Если деньги списались, статус обновится автоматически. Можно закрыть страницу — менеджер свяжется с вами.
              </p>
              {orderNo && (
                <a href={`/order/${orderNo}`} className="mt-6 inline-block rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground">
                  К заказу №{orderNo}
                </a>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}