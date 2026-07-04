import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Section";
import { useI18n, getI18nDefaults, pickLocalized } from "@/lib/i18n";
import { fetchPublishedNews, type NewsRow } from "@/lib/news";
import { breadcrumbJsonLd, canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";

const hy = getI18nDefaults().hy;

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
  const title =
    pickLocalized(item as unknown as Record<string, unknown>, "title", lang) || item.title;
  const excerpt =
    pickLocalized(item as unknown as Record<string, unknown>, "excerpt", lang) || item.excerpt || "";
  const date = item.published_at
    ? new Date(item.published_at).toLocaleDateString(lang === "hy" ? "hy-AM" : lang === "ru" ? "ru-RU" : "en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <Reveal delay={Math.min(index * 0.05, 0.2)}>
      <article className="grid grid-cols-1 items-center gap-8 border-b border-border/60 py-10 md:grid-cols-2 md:gap-12 md:py-16">
        <div className="order-2 md:order-1">
          {date && <p className="eyebrow text-muted-foreground">{date}</p>}
          <h2 className="mt-3 font-serif text-[clamp(1.5rem,3vw,2.25rem)] leading-tight">{title}</h2>
          {excerpt && <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{excerpt}</p>}
        </div>
        <div className="order-1 md:order-2 md:justify-self-end">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-sm bg-secondary md:max-w-xl">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function NewsPage() {
  const { t } = useI18n();
  const newsQ = useQuery({
    queryKey: ["news-public"],
    queryFn: fetchPublishedNews,
    staleTime: 60_000,
  });

  const items = newsQ.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-14 md:pt-20">
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-10 md:py-16">
            <p className="eyebrow text-muted-foreground">{t("news.eyebrow")}</p>
            <h1 className="mt-3 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-tight">{t("news.title")}</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">{t("news.intro")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 md:px-10">
          {newsQ.isLoading ? (
            <div className="space-y-8 py-12">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-sm bg-secondary" />
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
