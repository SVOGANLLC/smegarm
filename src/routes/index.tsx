import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { Featured } from "@/components/site/Featured";
import { Marquee } from "@/components/site/Marquee";
import { Collections } from "@/components/site/Collections";
import { Categories } from "@/components/site/Categories";
import { Benefits } from "@/components/site/Benefits";
import { Story } from "@/components/site/Story";
import { Dealer } from "@/components/site/Dealer";
import { Footer } from "@/components/site/Footer";
import { ShowcaseStrip } from "@/components/site/ShowcaseStrip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smeg Armenia — Official Italian appliances dealer in Yerevan" },
      {
        name: "description",
        content:
          "Premium Italian Smeg appliances in Armenia. Refrigerators, ovens, coffee machines and iconic 50's style — official representative in Yerevan.",
      },
      { property: "og:title", content: "Smeg Armenia — Italian appliances since 1948" },
      {
        property: "og:description",
        content:
          "Discover the official Smeg collection in Armenia. Visit our Yerevan showroom at Nar-Dos 2.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Featured />
        <Marquee />
        <ShowcaseStrip flag="is_bestseller" eyebrow="Bestsellers" title="Хиты продаж" to="/catalog" ctaLabel="Все товары" bg />
        <ShowcaseStrip flag="is_special_offer" eyebrow="Special offers" title="Спецпредложения" to="/sale" ctaLabel="Все акции" />
        <ShowcaseStrip flag="is_new" eyebrow="New arrivals" title="Новинки" to="/catalog" ctaLabel="Каталог" bg />
        <Collections />
        <Categories />
        <Benefits />
        <Story />
        <Dealer />
      </main>
      <Footer />
    </div>
  );
}
