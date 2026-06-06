import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Check } from "lucide-react";

export const Route = createFileRoute("/order/$id")({
  head: () => ({ meta: [{ title: "Заказ принят — Smeg Armenia" }, { name: "robots", content: "noindex" }] }),
  component: ThankYou,
});

function ThankYou() {
  const { id } = Route.useParams();
  const wa = `https://wa.me/37410000000?text=${encodeURIComponent("Здравствуйте! Я только что оформил заказ № " + id)}`;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-2xl px-6 text-center md:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="mt-6 font-serif text-4xl md:text-5xl">Спасибо за заказ!</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Номер вашего заказа — <b className="text-foreground">#{id}</b>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Менеджер свяжется с вами в течение рабочего дня для подтверждения и согласования оплаты и доставки.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href={wa} target="_blank" rel="noreferrer" className="rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90">
              Написать в WhatsApp
            </a>
            <Link to="/catalog" className="rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground">
              Продолжить покупки
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}