import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Check, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { startConversePayment } from "@/lib/converse.functions";
import { openPaymentTab, preparePaymentTab } from "@/lib/open-payment";

export const Route = createFileRoute("/order/$id")({
  validateSearch: (s: Record<string, unknown>) =>
    z
      .object({
        oid: z.string().uuid().optional(),
        pay: z.enum(["error", "pending"]).optional(),
      })
      .parse(s),
  head: () => ({ meta: [{ title: "Order — Smeg Armenia" }, { name: "robots", content: "noindex" }] }),
  component: ThankYou,
});

function ThankYou() {
  const { id } = Route.useParams();
  const { oid, pay } = Route.useSearch();
  const { t, lang } = useI18n();
  const startPay = useServerFn(startConversePayment);
  const [payBusy, setPayBusy] = useState(false);
  const wa = `https://wa.me/37498580085?text=${encodeURIComponent(t("order.waMessage", { id }))}`;

  useEffect(() => {
    document.title = t("order.metaTitle");
  }, [t]);

  const paymentFailed = pay === "error";
  const paymentPending = pay === "pending" && !!oid;

  async function retryPayment() {
    if (!oid) return;
    const payTab = preparePaymentTab();
    setPayBusy(true);
    try {
      const res = await startPay({ data: { order_id: oid, lang } });
      if (!res?.formUrl) throw new Error(t("checkout.error.payment"));
      if (!openPaymentTab(res.formUrl, payTab)) {
        throw new Error(t("checkout.error.paymentPopup"));
      }
    } catch (e) {
      payTab?.close();
      toast.error(e instanceof Error ? e.message : t("checkout.error.payment"));
    } finally {
      setPayBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-2xl px-6 text-center md:px-10">
          {paymentFailed ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h1 className="mt-6 font-serif text-3xl md:text-4xl">{t("order.paymentErrorTitle")}</h1>
              <p className="mt-3 text-lg text-muted-foreground">{t("order.number", { id })}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("order.paymentErrorLead")}</p>
              {oid && (
                <button
                  type="button"
                  onClick={retryPayment}
                  disabled={payBusy}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90 disabled:opacity-50"
                >
                  {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  {t("order.payRetry")}
                </button>
              )}
            </>
          ) : paymentPending && oid ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-800">
                <CreditCard className="h-8 w-8" />
              </div>
              <h1 className="mt-6 font-serif text-3xl md:text-4xl">{t("order.paymentPendingTitle")}</h1>
              <p className="mt-3 text-lg text-muted-foreground">{t("order.number", { id })}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("order.paymentPendingLead")}</p>
              <button
                type="button"
                onClick={retryPayment}
                disabled={payBusy}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90 disabled:opacity-50"
              >
                {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {t("order.payNow")}
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-8 w-8" />
              </div>
              <h1 className="mt-6 font-serif text-4xl md:text-5xl">{t("order.thanks")}</h1>
              <p className="mt-3 text-lg text-muted-foreground">{t("order.number", { id })}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("order.followup")}</p>
            </>
          )}

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground"
            >
              {t("order.whatsapp")}
            </a>
            <Link
              to="/catalog"
              className="rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground"
            >
              {t("order.continue")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
