import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useI18n, getI18nDefaults } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  fetchPublishedNews,
  newsCategory,
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

function NewsCard({ item }: { item: NewsRow }) {
  const { lang } = useI18n();
  const title = newsTitle(item, lang);
  const category = newsCategory(item, lang);

  return (
    <Link to="/news/$slug" params={{ slug: item.slug }} className="group block">
      <div className="aspect-[4/3] overflow-hidden bg-secondary">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      {category && (
        <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{category}</p>
      )}
      <h2 className="mt-1.5 text-sm font-medium leading-snug tracking-tight text-foreground transition group-hover:opacity-70 md:text-[15px]">
        {title}
      </h2>
    </Link>
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
        <section className="mx-auto max-w-[1400px] px-4 pt-10 md:px-10 md:pt-14">
          <h1 className="font-serif text-[clamp(2.5rem,6vw,4rem)] leading-none tracking-tight">
            {t("news.title")}
          </h1>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-border/60 pb-4">
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

          {newsQ.isLoading ? (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] animate-pulse bg-secondary" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t("news.empty")}</p>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 pb-20 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
              {items.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
