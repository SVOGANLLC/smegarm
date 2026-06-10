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
import { Partners } from "@/components/site/Partners";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smeg Armenia — Official SMEG Italian appliances in Yerevan" },
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
        <ShowcaseStrip flag="is_bestseller" eyebrow="showcase.bestsellers.eyebrow" title="showcase.bestsellers.title" to="/catalog" ctaLabel="cta.allProducts" bg />
        <ShowcaseStrip flag="is_special_offer" eyebrow="showcase.special.eyebrow" title="showcase.special.title" to="/sale" ctaLabel="cta.allOffers" />
        <ShowcaseStrip flag="is_new" eyebrow="showcase.new.eyebrow" title="showcase.new.title" to="/catalog" ctaLabel="cta.catalog" bg />
        <Collections />
        <Categories />
        <Benefits />
        <Story />
        <Dealer />
        <Partners />
      </main>
      <Footer />
    </div>
  );
}
