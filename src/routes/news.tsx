import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Section";
import { useI18n, getI18nDefaults } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  fetchPublishedNews,
  formatNewsDate,
  newsCategory,
  newsExcerpt,
  newsTitle,
  type NewsRow,
} from "@/lib/news";
import { breadcrumbJsonLd, canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";

const hy = getI18nDefaults().hy;

const FILTERS = ["all", "Events", "Products", "Awards", "Corporate"] as const;

export const Route = createFileRoute("/news")({
  head: () => {
    const path = "/news";
    const title = hy["news.metaTitle"] ?? "News — Smeg Armenia";
    const description = hy["news.metaDesc"] ?? title;
    return {
      meta: seoMeta({ title, description, path, locale: "hy_AM" }),
      links: [...hreflangLinks(path), ...canonicalLink(path)],
      scripts: [
        {
          type: "application/ld+json" as const,
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Smeg Armenia", path: "/" },
              { name: hy["nav.news"] ?? "News", path },
            ]),
          ),
        },
      ],
    };
  },
  component: NewsPage,
});

function NewsBlock({ item, index }: { item: NewsRow; index: number }) {
  const { lang } = useI18n();
  const title = newsTitle(item, lang);
  const excerpt = newsExcerpt(item, lang);
  const category = newsCategory(item, lang);
  const date = formatNewsDate(item.published_at, lang);

  return (
    <Reveal delay={Math.min(index * 0.05, 0.2)}>
      <Link
        to="/news/$slug"
        params={{ slug: item.slug }}
        className="group grid grid-cols-1 items-center gap-8 border-b border-border/60 py-12 md:grid-cols-12 md:gap-12 md:py-16"
      >
        {/* Text left */}
        <div className="order-2 md:order-1 md:col-span-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {category && <span>{category}</span>}
            {category && date && <span aria-hidden>·</span>}
            <time dateTime={item.published_at}>{date}</time>
          </div>
          <h2 className="mt-4 font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.15] tracking-tight transition group-hover:opacity-80">
            {title}
          </h2>
          {excerpt && (
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">{excerpt}</p>
          )}
          <span className="mt-6 inline-block text-xs uppercase tracking-[0.18em] text-foreground/70 transition group-hover:text-foreground">
            →
          </span>
        </div>
        {/* Photo right */}
        <div className="order-1 md:order-2 md:col-span-7">
          <div className="aspect-[16/10] w-full overflow-hidden bg-secondary">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
              />
            ) : null}
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

function NewsPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const newsQ = useQuery({
    queryKey: ["news-public"],
    queryFn: fetchPublishedNews,
    staleTime: 60_000,
  });

  const items = useMemo(() => {
    const all = newsQ.data ?? [];
    if (filter === "all") return all;
    return all.filter((n) => (n.category_en || n.category || "").toLowerCase() === filter.toLowerCase());
  }, [newsQ.data, filter]);

  const filterLabel = (key: (typeof FILTERS)[number]) =>
    ({
      all: t("news.filter.all"),
      Events: t("news.filter.events"),
      Products: t("news.filter.products"),
      Awards: t("news.filter.awards"),
      Corporate: t("news.filter.corporate"),
    })[key];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-14 md:pt-20">
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-10 md:py-16">
            <p className="eyebrow text-muted-foreground">{t("news.eyebrow")}</p>
            <h1 className="mt-3 font-serif text-[clamp(2.25rem,5vw,3.75rem)] leading-tight">
              {t("news.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">{t("news.intro")}</p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "text-[11px] uppercase tracking-[0.16em] transition",
                    filter === key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {filterLabel(key)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 md:px-10">
          {newsQ.isLoading ? (
            <div className="space-y-8 py-12">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-56 animate-pulse bg-secondary" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t("news.empty")}</p>
          ) : (
            items.map((item, i) => <NewsBlock key={item.id} item={item} index={i} />)
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
