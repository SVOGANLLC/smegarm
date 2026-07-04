import { createFileRoute, Link } from "@tanstack/react-router";
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
      "https://www.smeg.com/binaries/content/gallery/smeg/content-elements/visual-boxes/foodservice-banner_divisioni_960x690.jpg/foodservice-banner_divisioni_960x690.jpg",
    titleKey: "business.professional.title",
    bodyKey: "business.professional.body",
  },
  {
    id: "instruments",
    border: "border-emerald-500/80",
    image:
      "https://www.smeg.com/binaries/content/gallery/smeg/content-elements/visual-boxes/instruments-banner_divisioni_960x690.jpg/instruments-banner_divisioni_960x690.jpg",
    titleKey: "business.instruments.title",
    bodyKey: "business.instruments.body",
  },
  {
    id: "pavoni",
    border: "border-red-600/80",
    image:
      "https://www.smeg.com/binaries/content/gallery/smeg/content-elements/visual-boxes/pavoni-banner_divisioni_960x690.jpg/pavoni-banner_divisioni_960x690.jpg",
    titleKey: "business.pavoni.title",
    bodyKey: "business.pavoni.body",
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
                    <Link
                      to="/"
                      hash="contact"
                      className="mt-8 inline-flex w-fit items-center justify-center rounded-full border border-white/80 bg-white px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-[#0a0a0a] transition hover:bg-transparent hover:text-white"
                    >
                      {t("business.cta")}
                    </Link>
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
