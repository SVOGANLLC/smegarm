import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductGrid } from "@/components/site/ProductCard";
import type { ProductCard as ProductCardType } from "@/lib/products";

export const Route = createFileRoute("/sale")({
  head: () => ({
    meta: [
      { title: "Акции и скидки — Smeg Armenia" },
      { name: "description", content: "Все актуальные акции и спецпредложения на технику Smeg в Армении." },
      { property: "og:title", content: "Акции Smeg Armenia" },
      { property: "og:description", content: "Скидки и спецпредложения на итальянскую технику Smeg." },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/sale" }],
  }),
  component: Sale,
});

function Sale() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["sale-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "sku,name,category,colour,main_image,price_amd,price_old,discount_percent,availability,is_published,is_featured,is_new,is_bestseller,is_special_offer,badge_text",
        )
        .eq("is_published", true)
        .or("is_special_offer.eq.true,discount_percent.gt.0")
        .order("discount_percent", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as ProductCardType[];
    },
  });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted-foreground">Special offers</p>
            <h1 className="mt-3 font-serif text-5xl md:text-6xl">Акции и скидки</h1>
          </div>
          <Link to="/catalog" className="smeg-underline text-sm uppercase tracking-[0.2em] text-foreground/70">
            Весь каталог →
          </Link>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">Сейчас активных акций нет. Загляните позже.</p>
        ) : (
          <ProductGrid items={items} />
        )}
      </main>
      <Footer />
    </div>
  );
}