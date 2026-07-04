import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Section";
import { useI18n, getI18nDefaults } from "@/lib/i18n";
import { breadcrumbJsonLd, canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";

const hy = getI18nDefaults().hy;

const UNITS = [
  {
    id: "professional",
    border: "border-white/80",
    image:
      "https://www.smeg.com/binaries/content/gallery/smeg/stories/marchio-globale-1.jpg/marchio-globale-1.jpg",
    titleKey: "business.professional.title",
    bodyKey: "business.professional.body",
    ctaKey: "business.professional.cta",
    href: "https://www.smeg.com/professional",
  },
  {
    id: "instruments",
    border: "border-emerald-500/80",
    image:
      "https://www.smeg.com/binaries/content/gallery/smeg/stories/1smegconnect_news1.jpg/1smegconnect_news1.jpg",
    titleKey: "business.instruments.title",
    bodyKey: "business.instruments.body",
    ctaKey: "business.instruments.cta",
    href: "https://www.smeginstruments.com/",
  },
  {
    id: "pavoni",
    border: "border-red-600/80",
    image:
      "https://www.smeg.com/binaries/content/gallery/smeg/stories/smeg_milk_frother_mff01pbeu_l202_2.jpg/smeg_milk_frother_mff01pbeu_l202_2.jpg",
    titleKey: "business.pavoni.title",
    bodyKey: "business.pavoni.body",
    ctaKey: "business.pavoni.cta",
    href: "https://www.lapavoni.com/",
  },
] as const;

export const Route = createFileRoute("/business")({
  head: () => {
    const path = "/business";
    const title = hy["business.metaTitle"] ?? "Smeg for Business — Smeg Armenia";
    const description = hy["business.metaDesc"] ?? title;
    return {
      meta: seoMeta({ title, description, path, locale: "hy_AM" }),
      links: [...hreflangLinks(path), ...canonicalLink(path)],
      scripts: [
        {
          type: "application/ld+json" as const,
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Smeg Armenia", path: "/" },
              { name: hy["nav.business"] ?? "Business", path },
            ]),
          ),
        },
      ],
    };
  },
  component: BusinessPage,
});

function BusinessPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-14 md:pt-20">
        <section className="bg-[#0a0a0a] text-white">
          <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-10 md:py-20">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">{t("business.eyebrow")}</p>
            <h1 className="mt-3 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-tight">
              {t("business.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
              {t("business.intro")}
            </p>

            <div className="mt-12 grid grid-cols-1 gap-10 md:mt-16 md:grid-cols-3 md:gap-8">
              {UNITS.map((unit, i) => (
                <Reveal key={unit.id} delay={i * 0.08}>
                  <article className="flex h-full flex-col">
                    <div className={`overflow-hidden border bg-white ${unit.border}`}>
                      <div className="aspect-[16/10]">
                        <img
                          src={unit.image}
                          alt={t(unit.titleKey)}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                    <h2 className="mt-6 text-xl font-medium tracking-tight md:text-2xl">
                      {t(unit.titleKey)}
                    </h2>
                    <p className="mt-4 flex-1 text-sm leading-relaxed text-white/70 md:text-[15px]">
                      {t(unit.bodyKey)}
                    </p>
                    <a
                      href={unit.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-8 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white transition hover:opacity-80"
                    >
                      <span className="h-px w-8 bg-white/70" aria-hidden />
                      {t(unit.ctaKey)}
                    </a>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
