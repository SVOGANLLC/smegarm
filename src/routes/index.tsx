import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { getI18nDefaults } from "@/lib/i18n";
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
import { canonicalLink, hreflangLinks, localBusinessJsonLd, organizationJsonLd, seoMeta, websiteJsonLd } from "@/lib/seo";

const hyMeta = getI18nDefaults().hy;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: seoMeta({
      title: hyMeta["home.metaTitle"],
      description: hyMeta["home.metaDesc"],
      path: "/",
      keywords: hyMeta["home.metaKeywords"],
      locale: "hy_AM",
    }),
    links: [...hreflangLinks("/"), ...canonicalLink("/")],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(organizationJsonLd()) },
      { type: "application/ld+json", children: JSON.stringify(websiteJsonLd()) },
      { type: "application/ld+json", children: JSON.stringify(localBusinessJsonLd()) },
    ],
  }),
  component: Index,
});

function HashScrollOnLoad() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HashScrollOnLoad />
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
