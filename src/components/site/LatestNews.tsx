import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { Reveal, SectionHeader } from "./Section";
import {
  fetchPublishedNews,
  formatNewsDate,
  newsCategory,
  newsExcerpt,
  newsTitle,
} from "@/lib/news";

export function LatestNews() {
  const { t, lang } = useI18n();
  const newsQ = useQuery({
    queryKey: ["news-public", "home"],
    queryFn: fetchPublishedNews,
    staleTime: 60_000,
  });

  const items = (newsQ.data ?? []).slice(0, 3);
  if (!newsQ.isLoading && items.length === 0) return null;

  return (
    <section className="site-section">
      <div className="mx-auto max-w-[1400px] px-4 md:px-10">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <SectionHeader eyebrow={t("home.news.eyebrow")} title={t("home.news.title")} />
          <Reveal>
            <Link
              to="/news"
              className="smeg-underline text-xs uppercase tracking-[0.18em] text-foreground/70 md:text-sm md:tracking-[0.2em]"
            >
              {t("home.news.viewAll")} →
            </Link>
          </Reveal>
        </div>

        <div className="mt-10 space-y-0 md:mt-14">
          {newsQ.isLoading
            ? [0, 1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse border-b border-border/60 bg-secondary/40" />
              ))
            : items.map((item, i) => {
                const title = newsTitle(item, lang);
                const excerpt = newsExcerpt(item, lang);
                const category = newsCategory(item, lang);
                const date = formatNewsDate(item.published_at, lang);
                return (
                  <Reveal key={item.id} delay={i * 0.05}>
                    <Link
                      to="/news/$slug"
                      params={{ slug: item.slug }}
                      className="group grid grid-cols-1 items-center gap-6 border-b border-border/60 py-8 md:grid-cols-12 md:gap-10 md:py-10"
                    >
                      <div className="order-2 md:order-1 md:col-span-5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          {category && <span>{category}</span>}
                          {category && date && <span aria-hidden>·</span>}
                          {date && <time dateTime={item.published_at}>{date}</time>}
                        </div>
                        <h3 className="mt-3 font-serif text-xl leading-snug tracking-tight transition group-hover:opacity-80 md:text-2xl">
                          {title}
                        </h3>
                        {excerpt && (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {excerpt}
                          </p>
                        )}
                      </div>
                      <div className="order-1 md:order-2 md:col-span-7">
                        <div className="aspect-[16/10] w-full overflow-hidden bg-secondary md:max-w-xl md:justify-self-end">
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
              })}
        </div>
      </div>
    </section>
  );
}
