import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ShowroomContacts } from "@/components/site/ShowroomContacts";
import { Reveal, SectionHeader } from "@/components/site/Section";
import { useI18n, getI18nDefaults } from "@/lib/i18n";
import { canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { parseHouseOfCoffeeMedia } from "@/lib/house-of-coffee-config";
import {
  COFFEE_TYPE_LINKS,
  HOUSE_OF_COFFEE_BUILTIN_IMAGE,
  HOUSE_OF_COFFEE_SPOTLIGHT,
  coffeeLinkToSearch,
} from "@/lib/house-of-coffee";

const hyMeta = getI18nDefaults().hy;

export const Route = createFileRoute("/house-of-coffee")({
  head: () => ({
    meta: seoMeta({
      title: hyMeta["hoc.metaTitle"],
      description: hyMeta["hoc.metaDesc"],
      path: "/house-of-coffee",
      keywords: "Smeg coffee machines Armenia, espresso, coffee grinders, milk frothers, House of Coffee",
      locale: "hy_AM",
    }),
    links: [...hreflangLinks("/house-of-coffee"), ...canonicalLink("/house-of-coffee")],
  }),
  component: HouseOfCoffeePage,
});

function HouseOfCoffeePage() {
  const { t } = useI18n();

  const { data: media } = useQuery({
    queryKey: ["site-content", "house-of-coffee"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "house-of-coffee").maybeSingle();
      return parseHouseOfCoffeeMedia((data?.value as Record<string, Record<string, string>>) ?? {});
    },
    staleTime: 60_000,
  });

  const spotlight = {
    ...HOUSE_OF_COFFEE_SPOTLIGHT,
    sku: media?.spotlightSku ?? HOUSE_OF_COFFEE_SPOTLIGHT.sku,
    image: media?.spotlightImage ?? HOUSE_OF_COFFEE_SPOTLIGHT.image,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pb-24 pt-14 md:pt-20">
        {media?.heroVisible && media.heroImage ? (
          <section className="w-full">
            <img
              src={media.heroImage}
              alt={t("hoc.title")}
              className="block h-auto w-full"
              loading="eager"
            />
          </section>
        ) : null}

        <section className="site-section border-b border-border/60">
          <div className="mx-auto max-w-[1400px] px-4 md:px-10">
            <Reveal>
              <p className="eyebrow text-accent">{t("hoc.eyebrow")}</p>
              <h1 className="mt-4 max-w-4xl font-serif text-[clamp(2.25rem,6vw,4.5rem)] leading-[1.05]">
                {t("hoc.title")}
              </h1>
              <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">{t("hoc.lead")}</p>
            </Reveal>
          </div>
        </section>

        <section className="site-section bg-secondary/30">
          <div className="mx-auto max-w-[1400px] px-4 md:px-10">
            <Reveal>
              <div className="relative aspect-video overflow-hidden rounded-sm bg-foreground/5 shadow-lg">
                <iframe
                  title={t("hoc.videoTitle")}
                  src={`https://www.youtube.com/embed/${media?.youtubeId ?? "1jxQfFTH6-U"}?rel=0&modestbranding=1`}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </Reveal>
          </div>
        </section>

        {media?.bannerVisible && media.bannerImage ? (
          <section className="site-section">
            <div className="mx-auto max-w-[1400px] px-4 md:px-10">
              <Reveal>
                <div className="overflow-hidden rounded-sm">
                  <img
                    src={media.bannerImage}
                    alt={t("hoc.title")}
                    className="h-auto w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </Reveal>
            </div>
          </section>
        ) : null}

        <section className="site-section">
          <div className="mx-auto max-w-[1400px] px-4 md:px-10">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <div className="aspect-[4/5] overflow-hidden rounded-sm bg-white">
                  <img
                    src={spotlight.image}
                    alt={t("hoc.spotlight.title")}
                    className="h-full w-full object-contain p-8 md:p-12"
                    loading="lazy"
                  />
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="eyebrow text-muted-foreground">{t("hoc.spotlight.eyebrow")}</p>
                <h2 className="mt-4 font-serif text-3xl md:text-4xl">{t("hoc.spotlight.title")}</h2>
                <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
                  {t("hoc.spotlight.body")}
                </p>
                <Link
                  to="/catalog"
                  search={coffeeLinkToSearch(HOUSE_OF_COFFEE_SPOTLIGHT.catalog)}
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-foreground px-6 py-3 text-xs uppercase tracking-[0.18em] transition hover:bg-foreground hover:text-background"
                >
                  {t("hoc.cta.catalog")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="site-section bg-secondary/20">
          <div className="mx-auto max-w-[1400px] px-4 md:px-10">
            <SectionHeader eyebrow={t("hoc.grid.eyebrow")} title={t("hoc.grid.title")} />
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 md:mt-14">
              {COFFEE_TYPE_LINKS.map((link, i) => (
                <Reveal key={link.titleKey} delay={i * 0.04}>
                  <Link
                    to="/catalog"
                    search={coffeeLinkToSearch(link)}
                    className="group flex h-full flex-col overflow-hidden rounded-sm border border-border bg-background transition hover:border-foreground"
                  >
                    <div className="aspect-square bg-white p-6">
                      {link.image ? (
                        <img
                          src={link.image}
                          alt=""
                          className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <h3 className="font-serif text-lg leading-snug">{t(link.titleKey)}</h3>
                      <span className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition group-hover:text-foreground">
                        {t("hoc.cta.seeAll")}
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="site-section">
          <div className="mx-auto max-w-[1400px] px-4 md:px-10">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <p className="eyebrow text-muted-foreground">{t("hoc.builtin.eyebrow")}</p>
                <h2 className="mt-4 font-serif text-3xl md:text-4xl">{t("hoc.builtin.title")}</h2>
                <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
                  {t("hoc.builtin.body")}
                </p>
                <Link
                  to="/catalog"
                  search={coffeeLinkToSearch({
                    titleKey: "hoc.link.builtin",
                    category: "espresso-coffee-machines",
                    family: "Coffee machine",
                  })}
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-foreground px-6 py-3 text-xs uppercase tracking-[0.18em] transition hover:bg-foreground hover:text-background"
                >
                  {t("hoc.cta.builtin")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="aspect-[4/3] overflow-hidden rounded-sm bg-white">
                  <img
                    src={media?.builtinImage ?? HOUSE_OF_COFFEE_BUILTIN_IMAGE}
                    alt={t("hoc.builtin.title")}
                    className="h-full w-full object-contain p-8 md:p-10"
                    loading="lazy"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <ShowroomContacts plainEyebrow />
      </main>
      <Footer />
    </div>
  );
}
